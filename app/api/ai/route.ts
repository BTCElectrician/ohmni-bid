import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import {
  calculateEstimateFromItems,
  getPricingItemById,
  searchCatalog,
  validateConduitFill
} from '@/lib/tools';
import { DEFAULT_PARAMETERS } from '@/lib/estimate/defaults';

type ChatContext = {
  project?: {
    projectName?: string;
    location?: string;
    squareFootage?: number;
  };
  parameters?: {
    laborRate?: number;
    materialTaxRate?: number;
    overheadProfitRate?: number;
  };
  totals?: {
    totalMaterial?: number;
    totalLaborHours?: number;
    totalLaborCost?: number;
    subtotal?: number;
    overheadProfit?: number;
    finalBid?: number;
  };
  lineItems?: Array<{
    category?: string;
    description?: string;
    quantity?: number;
    unitType?: string;
  }>;
};

function formatContext(context?: ChatContext) {
  if (!context) return '';
  const lines: string[] = [];

  if (context.project?.projectName) {
    lines.push(`Project: ${context.project.projectName}`);
  }
  if (context.project?.location) {
    lines.push(`Location: ${context.project.location}`);
  }
  if (typeof context.project?.squareFootage === 'number') {
    lines.push(`Square Footage: ${context.project.squareFootage}`);
  }

  if (context.parameters) {
    lines.push(
      `Labor Rate: ${context.parameters.laborRate ?? 'n/a'}, ` +
        `Material Tax: ${context.parameters.materialTaxRate ?? 'n/a'}, ` +
        `O&P: ${context.parameters.overheadProfitRate ?? 'n/a'}`
    );
  }

  if (context.totals) {
    lines.push(
      `Totals -> Material: ${context.totals.totalMaterial ?? 'n/a'}, ` +
        `Labor Hours: ${context.totals.totalLaborHours ?? 'n/a'}, ` +
        `Labor Cost: ${context.totals.totalLaborCost ?? 'n/a'}, ` +
        `Final Bid: ${context.totals.finalBid ?? 'n/a'}`
    );
  }

  if (context.lineItems?.length) {
    const maxItems = 25;
    const items = context.lineItems.slice(0, maxItems).map(item =>
      `${item.quantity ?? ''} ${item.unitType ?? ''} ${item.description ?? ''} (${item.category ?? ''})`
    );
    lines.push('Line items:');
    lines.push(...items);
    if (context.lineItems.length > maxItems) {
      lines.push(`...and ${context.lineItems.length - maxItems} more`);
    }
  }

  return lines.join('\n');
}

export async function POST(req: Request) {
  const { messages, context } = await req.json();
  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';
  const contextBlock = formatContext(context);

  const result = await streamText({
    model: openai(model),
    system:
      'You are an estimating assistant. The agent interprets intent, but code computes prices. ' +
      'Always call tools for pricing, validation, and totals. Never guess numbers.' +
      (contextBlock ? `\n\nCurrent estimate context:\n${contextBlock}` : ''),
    messages,
    tools: {
      searchCatalog: tool({
        description: 'Search the pricing catalog using semantic + filter search.',
        parameters: z.object({
          query: z.string(),
          category: z.string().optional(),
          limit: z.number().int().optional()
        }),
        execute: async input => searchCatalog(input)
      }),
      getPricingItem: tool({
        description: 'Fetch a pricing item by ID for exact costs.',
        parameters: z.object({
          id: z.string()
        }),
        execute: async ({ id }) => getPricingItemById(id)
      }),
      calculateEstimate: tool({
        description: 'Compute totals for a set of line items using code-first math.',
        parameters: z.object({
          items: z.array(
            z.object({
              category: z.string(),
              description: z.string(),
              quantity: z.number(),
              unitType: z.enum(['E', 'C', 'M', 'Lot']),
              materialUnitCost: z.number(),
              laborHoursPerUnit: z.number()
            })
          ),
          parameters: z
            .object({
              laborRate: z.number(),
              materialTaxRate: z.number(),
              overheadProfitRate: z.number()
            })
            .optional()
        }),
        execute: async ({ items, parameters }) => {
          const params = { ...DEFAULT_PARAMETERS, ...parameters };
          return calculateEstimateFromItems(items, params);
        }
      }),
      validateConduitFill: tool({
        description: 'Validate conduit fill using sizing tables.',
        parameters: z.object({
          wireSize: z.string(),
          conductorCount: z.number().int(),
          conduitSize: z.string()
        }),
        execute: async input => validateConduitFill(input)
      })
    }
  });

  return result.toDataStreamResponse();
}
