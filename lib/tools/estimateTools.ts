import 'server-only';

import { getServiceSupabase } from '../db/supabase';
import { getEmbedding } from '../ai/embeddings';
import {
  calculateEstimateTotals,
  calculateLaborExtension,
  calculateLineItemTotal,
  calculateMaterialExtension
} from '../estimate/calc';
import { DEFAULT_PARAMETERS } from '../estimate/defaults';
import { CONDUIT_SIZING } from '../estimate/sizing';
import type { EstimateParameters, LineItem } from '../estimate/types';

export interface ToolLineItemInput {
  category: string;
  description: string;
  quantity: number;
  unitType: 'E' | 'C' | 'M' | 'Lot';
  materialUnitCost: number;
  laborHoursPerUnit: number;
}

export async function searchCatalog(params: {
  query: string;
  category?: string;
  limit?: number;
}) {
  const supabase = getServiceSupabase();
  const embedding = await getEmbedding(params.query);

  const { data, error } = await supabase.rpc('match_pricing_items', {
    query_embedding: embedding,
    match_count: params.limit || 10,
    category_filter: params.category || null
  });

  if (error) {
    throw new Error(`Catalog search failed: ${error.message}`);
  }

  return data || [];
}

export async function getPricingItemById(id: string) {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('pricing_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Pricing item lookup failed: ${error.message}`);
  }

  return data;
}

export function calculateEstimateFromItems(
  items: ToolLineItemInput[],
  params: EstimateParameters = DEFAULT_PARAMETERS
) {
  const enriched = items.map(item => {
    const materialExtension = calculateMaterialExtension(
      item.quantity,
      item.materialUnitCost,
      item.unitType
    );
    const laborExtension = calculateLaborExtension(
      item.quantity,
      item.laborHoursPerUnit,
      item.unitType
    );
    const totalCost = calculateLineItemTotal(
      materialExtension,
      laborExtension,
      params
    );

    return {
      ...item,
      materialExtension,
      laborExtension,
      totalCost
    };
  });

  const totals = calculateEstimateTotals(enriched as LineItem[], params);

  return {
    lineItems: enriched,
    totals
  };
}

export function validateConduitFill(params: {
  wireSize: string;
  conductorCount: number;
  conduitSize: string;
}) {
  const sizing = CONDUIT_SIZING[params.wireSize];
  if (!sizing) {
    return {
      valid: null,
      reason: 'No sizing data for wire size',
      recommendedConduit: null
    };
  }

  const recommended = sizing[params.conductorCount];
  if (!recommended) {
    return {
      valid: null,
      reason: 'No sizing data for conductor count',
      recommendedConduit: null
    };
  }

  const valid = recommended === params.conduitSize || compareConduit(params.conduitSize, recommended);

  return {
    valid,
    recommendedConduit: recommended,
    reason: valid ? 'Requested conduit meets fill guidance' : 'Requested conduit undersized'
  };
}

function compareConduit(requested: string, recommended: string) {
  const parseFraction = (value: string) => {
    if (value.includes('/')) {
      const [num, den] = value.split('/').map(Number);
      return den ? num / den : 0;
    }
    return Number(value);
  };

  const parseInches = (value: string) => {
    const clean = value.replace(/"/g, '');
    if (clean.includes('-')) {
      const [whole, frac] = clean.split('-');
      return Number(whole) + parseFraction(frac);
    }
    return parseFraction(clean);
  };

  return parseInches(requested) >= parseInches(recommended);
}
