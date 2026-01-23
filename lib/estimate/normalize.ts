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
      parameters
    );

    return {
      ...item,
      materialExtension,
      laborExtension,
      totalCost
    };
  });
}
