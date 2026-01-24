import type { EstimateParameters, LineItem } from './types';
import {
  calculateLaborExtension,
  calculateLineItemTotal,
  calculateMaterialExtension
} from './calc';

export function normalizeLineItems(
  items: LineItem[],
  parameters: EstimateParameters
): LineItem[] {
  return items.map(item => {
    const quantity = toNumber(item.quantity);
    const materialUnitCost = toNumber(item.materialUnitCost);
    const laborHoursPerUnit = toNumber(item.laborHoursPerUnit);

    const materialExtension = calculateMaterialExtension(
      quantity,
      materialUnitCost,
      item.unitType
    );
    const laborExtension = calculateLaborExtension(
      quantity,
      laborHoursPerUnit,
      item.unitType
    );
    const totalCost = calculateLineItemTotal(
      materialExtension,
      laborExtension,
      parameters
    );

    return {
      ...item,
      quantity,
      materialUnitCost,
      laborHoursPerUnit,
      materialExtension,
      laborExtension,
      totalCost
    };
  });
}

function toNumber(value: number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
