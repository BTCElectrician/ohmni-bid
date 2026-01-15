import { getServiceSupabase } from '../db/supabase';
import { loadPricingDatabase } from './loadPricing';
import type { PricingDatabase } from './types';

const DEFAULT_BATCH_SIZE = 500;

function toWireName(item: PricingDatabase['wire'][number]) {
  return `${item.material} ${item.type} ${item.size}`;
}

function materialCostPer1000ft(item: PricingDatabase['wire'][number]) {
  if (item.materialCostPer1000ft) return item.materialCostPer1000ft;
  return item.marketPricePer1000ft * (1 + item.markupPercent);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function importPricingDatabase(batchSize = DEFAULT_BATCH_SIZE) {
  const supabase = getServiceSupabase();
  const data = await loadPricingDatabase();

  const rows = [
    ...data.conduit.map(item => ({
      category: 'CONDUIT',
      subcategory: item.type,
      name: item.name,
      description: null,
      size: item.size,
      unit_type: 'C',
      material_cost: item.materialCostPer100ft,
      labor_hours: item.laborHoursPer100ft
    })),
    ...data.wire.map(item => ({
      category: 'WIRE',
      subcategory: `${item.material}_${item.type}`,
      name: toWireName(item),
      description: null,
      size: item.size,
      unit_type: 'M',
      material_cost: materialCostPer1000ft(item),
      labor_hours: item.laborHoursPer1000ft,
      market_price: item.marketPricePer1000ft,
      markup_percent: item.markupPercent
    })),
    ...data.lineItems.map(item => ({
      category: item.category,
      subcategory: null,
      name: item.description,
      description: item.description,
      size: null,
      unit_type: item.unitType || 'E',
      material_cost: item.materialUnitCost,
      labor_hours: item.laborHoursPerUnit
    }))
  ];

  const batches = chunk(rows, batchSize);
  let inserted = 0;

  for (const batch of batches) {
    const { error } = await supabase.from('pricing_items').insert(batch);
    if (error) {
      throw new Error(`Insert failed: ${error.message}`);
    }
    inserted += batch.length;
  }

  return { inserted };
}
