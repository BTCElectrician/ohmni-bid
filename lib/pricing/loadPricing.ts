import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { PricingDatabase } from './types';

export async function loadPricingDatabase(
  filePath: string = path.join(process.cwd(), 'data', 'pricing_database.json')
): Promise<PricingDatabase> {
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as PricingDatabase;
}
