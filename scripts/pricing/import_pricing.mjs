import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const batchSize = Number(process.env.PRICING_BATCH_SIZE || 500);
const pricingPath =
  process.env.PRICING_JSON_PATH ||
  path.join(process.cwd(), 'data', 'pricing_database.json');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars for pricing import.');
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function externalRefForConduit(item) {
  return item.externalRef || `conduit-${slug(item.type)}-${slug(item.size)}`;
}

function externalRefForWire(item) {
  return item.externalRef || `wire-${slug(item.material)}-${slug(item.type)}-${slug(item.size)}`;
}

function externalRefForLineItem(item) {
  return item.externalRef || `line-${slug(item.category)}-${slug(item.description)}`;
}

function toWireName(item) {
  return `${item.material} ${item.type} ${item.size}`;
}

function materialCostPer1000ft(item) {
  if (item.materialCostPer1000ft) return item.materialCostPer1000ft;
  return item.marketPricePer1000ft * (1 + item.markupPercent);
}

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function loadPricingDatabase() {
  const raw = await readFile(pricingPath, 'utf-8');
  return JSON.parse(raw);
}

async function importPricingDatabase() {
  const data = await loadPricingDatabase();
  const now = new Date().toISOString();

  const rows = [
    ...data.conduit.map(item => ({
      external_ref: externalRefForConduit(item),
      category: 'CONDUIT',
      subcategory: item.type,
      name: item.name,
      description: null,
      size: item.size,
      unit_type: 'C',
      material_cost: item.materialCostPer100ft,
      labor_hours: item.laborHoursPer100ft,
      updated_at: now
    })),
    ...data.wire.map(item => ({
      external_ref: externalRefForWire(item),
      category: 'WIRE',
      subcategory: `${item.material}_${item.type}`,
      name: toWireName(item),
      description: null,
      size: item.size,
      unit_type: 'M',
      material_cost: materialCostPer1000ft(item),
      labor_hours: item.laborHoursPer1000ft,
      market_price: item.marketPricePer1000ft,
      markup_percent: item.markupPercent,
      updated_at: now
    })),
    ...data.lineItems.map(item => ({
      external_ref: externalRefForLineItem(item),
      category: item.category,
      subcategory: null,
      name: item.description,
      description: item.description,
      size: null,
      unit_type: item.unitType || 'E',
      material_cost: item.materialUnitCost,
      labor_hours: item.laborHoursPerUnit,
      updated_at: now
    }))
  ];

  const batches = chunk(rows, batchSize);
  let processed = 0;

  for (const batch of batches) {
    const { error } = await supabase
      .from('pricing_items')
      .upsert(batch, { onConflict: 'external_ref' });
    if (error) {
      throw new Error(`Upsert failed: ${error.message}`);
    }
    processed += batch.length;
    process.stdout.write(`Upserted ${processed}\r`);
  }

  process.stdout.write('\n');
  console.log(`Done. Upserted ${processed} pricing items.`);
}

importPricingDatabase().catch(error => {
  console.error(error);
  process.exit(1);
});
