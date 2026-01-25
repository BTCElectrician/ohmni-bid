import { NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

import { searchCatalog } from '@/lib/tools/estimateTools';

const CATEGORY_VALUES = [
  'TEMP_POWER',
  'ELECTRICAL_SERVICE',
  'MECHANICAL_CONNECTIONS',
  'INTERIOR_LIGHTING',
  'EXTERIOR_LIGHTING',
  'POWER_RECEPTACLES',
  'SITE_CONDUITS',
  'SECURITY',
  'FIRE_ALARM',
  'GENERAL_CONDITIONS'
] as const;

const UNIT_VALUES = ['E', 'C', 'M', 'Lot'] as const;

const DraftItemSchema = z.object({
  description: z.string(),
  category: z.enum(CATEGORY_VALUES),
  quantity: z.number(),
  unitType: z.enum(UNIT_VALUES),
  assumptions: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).optional()
});

const DraftResponseSchema = z.object({
  items: z.array(DraftItemSchema).default([]),
  questions: z.array(z.string()).default([])
});

const CATEGORY_SET = new Set(CATEGORY_VALUES);

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const notes = body?.notes;
  const context = body?.context || {};

  if (typeof notes !== 'string' || !notes.trim()) {
    return NextResponse.json(
      { error: 'Missing transcript or note text.' },
      { status: 400 }
    );
  }

  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';
  // Bridge type mismatch between ai SDK versions.
  const aiModel = openai.responses(model) as any;

  const prompt = [
    'Transcript or walkthrough notes:',
    notes.trim(),
    '',
    'Project context:',
    `- Name: ${context.project?.projectName || 'Unknown'}`,
    `- Location: ${context.project?.location || 'Unknown'}`,
    `- Square Footage: ${context.project?.squareFootage || 'Unknown'}`,
    '',
    'Parameters:',
    `- Labor Rate: ${context.parameters?.laborRate ?? 'Unknown'}`,
    `- Material Tax Rate: ${context.parameters?.materialTaxRate ?? 'Unknown'}`,
    `- Overhead/Profit Rate: ${context.parameters?.overheadProfitRate ?? 'Unknown'}`,
    '',
    'Existing line items:',
    JSON.stringify(context.lineItems || [], null, 2),
    '',
    'Generate draft line items only. Do not include prices or totals.',
    'Use the closest category and unit type from the allowed list.',
    'If ambiguous, add assumptions and list clarifying questions.'
  ].join('\n');

  try {
    const result = await generateObject({
      model: aiModel,
      temperature: 0.2,
      system:
        'You are an electrical estimator assistant. ' +
        'Return structured draft line items with no pricing or totals.',
      prompt,
      schema: DraftResponseSchema
    });

    const items = result.object.items.map(item => ({
      ...item,
      category: CATEGORY_SET.has(item.category) ? item.category : 'GENERAL_CONDITIONS',
      unitType: UNIT_VALUES.includes(item.unitType) ? item.unitType : 'E'
    }));

    const itemsWithSuggestions = await Promise.all(
      items.map(async item => {
        try {
          const matches = await searchCatalog({
            query: item.description,
            category: item.category,
            limit: 1
          });
          const match = matches?.[0];
          if (!match) {
            return { ...item, suggestedItem: null };
          }
          return {
            ...item,
            suggestedItem: {
              id: match.id,
              name: match.name,
              category: match.category,
              unit_type: match.unit_type,
              material_cost: Number(match.material_cost || 0),
              labor_hours: Number(match.labor_hours || 0)
            }
          };
        } catch {
          return { ...item, suggestedItem: null };
        }
      })
    );

    return NextResponse.json({
      items: itemsWithSuggestions,
      questions: result.object.questions
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Draft generation failed.' },
      { status: 500 }
    );
  }
}
