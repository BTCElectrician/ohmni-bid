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

export async function POST(req: Request) {
  const { messages } = await req.json();
  const model = process.env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini';

  const result = await streamText({
    model: openai(model),
    system:
      'You are an estimating assistant. The agent interprets intent, but code computes prices. ' +
      'Always call tools for pricing, validation, and totals. Never guess numbers.',
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
