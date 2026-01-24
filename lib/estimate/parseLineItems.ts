import { CATEGORY_ORDER } from './defaults';
import type { EstimateCategory, UnitType } from './types';

export type ParsedLineItem = {
  category: EstimateCategory;
  description: string;
  quantity: number;
  unitType: UnitType;
  materialUnitCost: number;
  laborHoursPerUnit: number;
};

const CATEGORY_SET = new Set<EstimateCategory>(CATEGORY_ORDER);
const UNIT_TYPE_MAP: Record<string, UnitType> = {
  E: 'E',
  EA: 'E',
  EACH: 'E',
  C: 'C',
  M: 'M',
  LOT: 'Lot',
  L: 'Lot'
};

export function parseLineItemPaste(input: string): {
  items: ParsedLineItem[];
  errors: string[];
} {
  const items: ParsedLineItem[] = [];
  const errors: string[] = [];
  const lines = input
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  lines.forEach((line, index) => {
    const delimiter = detectDelimiter(line);
    if (!delimiter) {
      errors.push(`Line ${index + 1}: Use | or comma separators.`);
      return;
    }

    const parts = line.split(delimiter).map(part => part.trim());
    if (isHeaderRow(parts)) {
      return;
    }

    let categoryValue = '';
    let description = '';
    let quantityValue = '';
    let unitValue = '';
    let materialValue = '';
    let laborValue = '';

    if (parts.length >= 6) {
      [categoryValue, description, quantityValue, unitValue, materialValue, laborValue] =
        parts;
    } else if (parts.length === 5) {
      [description, quantityValue, unitValue, materialValue, laborValue] = parts;
      categoryValue = 'GENERAL_CONDITIONS';
    } else {
      errors.push(`Line ${index + 1}: Expected 5 or 6 columns.`);
      return;
    }

    if (!description) {
      errors.push(`Line ${index + 1}: Description is required.`);
      return;
    }

    const category = normalizeCategory(categoryValue);
    const unitType = normalizeUnitType(unitValue);

    items.push({
      category,
      description,
      quantity: parseNumber(quantityValue),
      unitType,
      materialUnitCost: parseNumber(materialValue),
      laborHoursPerUnit: parseNumber(laborValue)
    });
  });

  return { items, errors };
}

function detectDelimiter(line: string): string | null {
  if (line.includes('|')) return '|';
  if (line.includes('\t')) return '\t';
  if (line.includes(',')) return ',';
  return null;
}

function isHeaderRow(parts: string[]): boolean {
  const joined = parts.join(' ').toLowerCase();
  return joined.includes('description') && joined.includes('qty');
}

function normalizeCategory(value: string): EstimateCategory {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '_');
  if (CATEGORY_SET.has(normalized as EstimateCategory)) {
    return normalized as EstimateCategory;
  }
  return 'GENERAL_CONDITIONS';
}

function normalizeUnitType(value: string): UnitType {
  const normalized = value.trim().toUpperCase();
  return UNIT_TYPE_MAP[normalized] || 'E';
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[$,]/g, '').trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
