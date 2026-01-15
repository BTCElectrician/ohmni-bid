import type {
  Estimate,
  EstimateCategory,
  EstimateParameters,
  LineItem,
  LineItemTemplate,
  ProjectInfo,
  UnitType
} from './types';
import { generateId } from './utils';
import { CATEGORY_ORDER } from './defaults';

export function calculateLineItemTotal(
  materialExtension: number,
  laborExtension: number,
  params: EstimateParameters
): number {
  const laborCost = laborExtension * params.laborRate;
  const materialWithTax = materialExtension * (1 + params.materialTaxRate);
  const subtotal = laborCost + materialWithTax;
  return subtotal * (1 + params.overheadProfitRate);
}

export function calculateMaterialExtension(
  quantity: number,
  unitCost: number,
  unitType: UnitType
): number {
  switch (unitType) {
    case 'E':
    case 'Lot':
      return quantity * unitCost;
    case 'C':
      return (quantity * unitCost) / 100;
    case 'M':
      return (quantity * unitCost) / 1000;
    default:
      return quantity * unitCost;
  }
}

export function calculateLaborExtension(
  quantity: number,
  laborHours: number,
  unitType: UnitType
): number {
  switch (unitType) {
    case 'E':
    case 'Lot':
      return quantity * laborHours;
    case 'C':
      return (quantity * laborHours) / 100;
    case 'M':
      return (quantity * laborHours) / 1000;
    default:
      return quantity * laborHours;
  }
}

export function createLineItem(
  template: LineItemTemplate,
  quantity: number,
  params: EstimateParameters,
  id?: string
): LineItem {
  const materialExtension = calculateMaterialExtension(
    quantity,
    template.materialUnitCost,
    template.unitType
  );

  const laborExtension = calculateLaborExtension(
    quantity,
    template.laborHoursPerUnit,
    template.unitType
  );

  const totalCost = calculateLineItemTotal(
    materialExtension,
    laborExtension,
    params
  );

  return {
    id: id || generateId(),
    category: template.category,
    description: template.name,
    quantity,
    unitType: template.unitType,
    materialUnitCost: template.materialUnitCost,
    laborHoursPerUnit: template.laborHoursPerUnit,
    materialExtension,
    laborExtension,
    totalCost
  };
}

export function calculateEstimateTotals(
  lineItems: LineItem[],
  params: EstimateParameters,
  squareFootage?: number
): Omit<Estimate, 'id' | 'project' | 'parameters' | 'lineItems'> {
  const categoryTotals = {} as Record<EstimateCategory, number>;

  for (const cat of CATEGORY_ORDER) {
    categoryTotals[cat] = lineItems
      .filter(item => item.category === cat)
      .reduce((sum, item) => sum + item.totalCost, 0);
  }

  const totalMaterial = lineItems.reduce(
    (sum, item) => sum + item.materialExtension,
    0
  );
  const totalMaterialWithTax = totalMaterial * (1 + params.materialTaxRate);

  const totalLaborHours = lineItems.reduce(
    (sum, item) => sum + item.laborExtension,
    0
  );
  const totalLaborCost = totalLaborHours * params.laborRate;

  const subtotal = totalMaterialWithTax + totalLaborCost;
  const overheadProfit = subtotal * params.overheadProfitRate;
  const finalBid = Math.ceil(subtotal + overheadProfit);

  const pricePerSqFt = squareFootage ? finalBid / squareFootage : undefined;

  return {
    categoryTotals,
    totalMaterial,
    totalMaterialWithTax,
    totalLaborHours,
    totalLaborCost,
    subtotal,
    overheadProfit,
    finalBid,
    pricePerSqFt
  };
}

export function createEstimate(
  project: ProjectInfo,
  lineItems: LineItem[],
  params: EstimateParameters
): Estimate {
  const totals = calculateEstimateTotals(
    lineItems,
    params,
    project.squareFootage
  );

  return {
    id: generateId(),
    project,
    parameters: params,
    lineItems,
    ...totals
  };
}
