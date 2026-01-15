/**
 * Ohmni Bid - Electrical Estimating Engine
 *
 * Core calculation logic reverse-engineered from Excel workbook
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type UnitType = 'E' | 'C' | 'M' | 'Lot'; // Each, per100ft, per1000ft, Lump

export type EstimateCategory =
  | 'TEMP_POWER'
  | 'ELECTRICAL_SERVICE'
  | 'MECHANICAL_CONNECTIONS'
  | 'INTERIOR_LIGHTING'
  | 'EXTERIOR_LIGHTING'
  | 'POWER_RECEPTACLES'
  | 'SITE_CONDUITS'
  | 'SECURITY'
  | 'FIRE_ALARM'
  | 'GENERAL_CONDITIONS';

export type ConduitType = 'EMT_SS' | 'EMT_COMP' | 'HW' | 'IMC' | 'PVC' | 'PVC_GRC';
export type WireMaterial = 'CU' | 'AL';
export type WireType = 'THHN' | 'XHHW' | 'USE';

export interface ConduitPricing {
  type: ConduitType;
  typeName: string;
  name: string;
  size: string;
  materialCostPer100ft: number;
  laborHoursPer100ft: number;
}

export interface WirePricing {
  material: WireMaterial;
  type: WireType;
  name: string;
  size: string;
  marketPricePer1000ft: number;
  materialCostPer1000ft: number;
  laborHoursPer1000ft: number;
}

export interface LineItemTemplate {
  category: EstimateCategory;
  name: string;
  materialUnitCost: number;
  unitType: UnitType;
  laborHoursPerUnit: number;
}

export interface LineItem {
  id: string;
  category: EstimateCategory;
  description: string;
  quantity: number;
  unitType: UnitType;
  materialUnitCost: number;
  laborHoursPerUnit: number;
  materialExtension: number;
  laborExtension: number;
  totalCost: number;
}

export interface EstimateParameters {
  laborRate: number;           // Default: $118/hr
  materialTaxRate: number;     // Default: 10.25%
  overheadProfitRate: number;  // Configurable
}

export interface ProjectInfo {
  projectName: string;
  projectNumber: string;
  location: string;
  gcName: string;
  contactName: string;
  preparedBy: string;
  date: Date;
  squareFootage?: number;
}

export interface Estimate {
  id: string;
  project: ProjectInfo;
  parameters: EstimateParameters;
  lineItems: LineItem[];

  // Calculated totals
  categoryTotals: Record<EstimateCategory, number>;
  totalMaterial: number;
  totalMaterialWithTax: number;
  totalLaborHours: number;
  totalLaborCost: number;
  subtotal: number;
  overheadProfit: number;
  finalBid: number;
  pricePerSqFt?: number;
}

export interface FeederCalculation {
  materialCost: number;
  laborHours: number;
  description: string;
}

// ============================================================================
// DEFAULT PARAMETERS
// ============================================================================

export const DEFAULT_PARAMETERS: EstimateParameters = {
  laborRate: 118.00,
  materialTaxRate: 0.1025,
  overheadProfitRate: 0
};

// ============================================================================
// CORE CALCULATION ENGINE
// ============================================================================

/**
 * Calculate line item total with all markups
 * Implements: =+(((I*$I$323)+(F*(1+$E$323)))*(1+$C$329))
 */
export function calculateLineItemTotal(
  materialExtension: number,
  laborExtension: number,
  params: EstimateParameters
): number {
  const laborCost = laborExtension * params.laborRate;
  const materialWithTax = materialExtension * (1 + params.materialTaxRate);
  const subtotal = laborCost + materialWithTax;
  const total = subtotal * (1 + params.overheadProfitRate);
  return total;
}

/**
 * Calculate material extension based on unit type
 */
export function calculateMaterialExtension(
  quantity: number,
  unitCost: number,
  unitType: UnitType
): number {
  switch (unitType) {
    case 'E':
    case 'Lot':
      return quantity * unitCost;
    case 'C': // Per 100 ft
      return (quantity * unitCost) / 100;
    case 'M': // Per 1000 ft
      return (quantity * unitCost) / 1000;
    default:
      return quantity * unitCost;
  }
}

/**
 * Calculate labor extension based on unit type
 */
export function calculateLaborExtension(
  quantity: number,
  laborHours: number,
  unitType: UnitType
): number {
  switch (unitType) {
    case 'E':
    case 'Lot':
      return quantity * laborHours;
    case 'C': // Per 100 ft
      return (quantity * laborHours) / 100;
    case 'M': // Per 1000 ft
      return (quantity * laborHours) / 1000;
    default:
      return quantity * laborHours;
  }
}

/**
 * Create a line item with all calculations
 */
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

/**
 * Calculate feeder pricing (wire + conduit combination)
 * Implements: =((FEEDERS!$D$xxx*4)/10+FEEDERS!$D$yy)*multiplier
 */
export function calculateFeederPrice(
  wire: WirePricing,
  conduit: ConduitPricing,
  conductorCount: number,
  ampacityMultiplier: number
): { materialCostPer100ft: number; laborHoursPer100ft: number } {
  // Wire cost: (price per 1000ft × conductors) / 10 converts to per 100ft
  const wireCostPer100ft = (wire.materialCostPer1000ft * conductorCount) / 10;

  // Conduit cost per 100ft (already in correct units)
  const conduitCostPer100ft = conduit.materialCostPer100ft;

  // Combined unit cost with ampacity multiplier
  const materialCostPer100ft = (wireCostPer100ft + conduitCostPer100ft) * ampacityMultiplier;

  // Labor calculation
  const wireLaborPer100ft = (wire.laborHoursPer1000ft * conductorCount) / 10;
  const conduitLaborPer100ft = conduit.laborHoursPer100ft;
  const laborHoursPer100ft = (wireLaborPer100ft + conduitLaborPer100ft) * ampacityMultiplier;

  return {
    materialCostPer100ft,
    laborHoursPer100ft
  };
}

/**
 * Calculate complete feeder run
 */
export function calculateFeederRun(
  wire: WirePricing,
  conduit: ConduitPricing,
  conductorCount: number,
  lengthFeet: number,
  ampacityMultiplier: number,
  params: EstimateParameters
): FeederCalculation {
  const unitPrices = calculateFeederPrice(
    wire,
    conduit,
    conductorCount,
    ampacityMultiplier
  );

  const materialCost = (unitPrices.materialCostPer100ft * lengthFeet) / 100;
  const laborHours = (unitPrices.laborHoursPer100ft * lengthFeet) / 100;

  return {
    materialCost,
    laborHours,
    description: `${lengthFeet}' of ${conductorCount}-${wire.size} ${wire.material} in ${conduit.size}" ${conduit.typeName}`
  };
}

// ============================================================================
// ESTIMATE CALCULATIONS
// ============================================================================

/**
 * Calculate all totals for an estimate
 */
export function calculateEstimateTotals(
  lineItems: LineItem[],
  params: EstimateParameters,
  squareFootage?: number
): Omit<Estimate, 'id' | 'project' | 'parameters' | 'lineItems'> {
  // Category totals
  const categoryTotals = {} as Record<EstimateCategory, number>;
  const categories: EstimateCategory[] = [
    'TEMP_POWER', 'ELECTRICAL_SERVICE', 'MECHANICAL_CONNECTIONS',
    'INTERIOR_LIGHTING', 'EXTERIOR_LIGHTING', 'POWER_RECEPTACLES',
    'SITE_CONDUITS', 'SECURITY', 'FIRE_ALARM', 'GENERAL_CONDITIONS'
  ];

  for (const cat of categories) {
    categoryTotals[cat] = lineItems
      .filter(item => item.category === cat)
      .reduce((sum, item) => sum + item.totalCost, 0);
  }

  // Material totals
  const totalMaterial = lineItems.reduce(
    (sum, item) => sum + item.materialExtension,
    0
  );
  const totalMaterialWithTax = totalMaterial * (1 + params.materialTaxRate);

  // Labor totals
  const totalLaborHours = lineItems.reduce(
    (sum, item) => sum + item.laborExtension,
    0
  );
  const totalLaborCost = totalLaborHours * params.laborRate;

  // Final calculations
  const subtotal = totalMaterialWithTax + totalLaborCost;
  const overheadProfit = subtotal * params.overheadProfitRate;
  const finalBid = Math.ceil(subtotal + overheadProfit);

  // Price per square foot
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

/**
 * Create a complete estimate
 */
export function createEstimate(
  project: ProjectInfo,
  lineItems: LineItem[],
  params: EstimateParameters = DEFAULT_PARAMETERS
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format hours
 */
export function formatHours(hours: number): string {
  return `${hours.toFixed(2)} hrs`;
}

// ============================================================================
// AMPACITY MULTIPLIERS (for feeder sizing)
// ============================================================================

export const AMPACITY_MULTIPLIERS: Record<string, number> = {
  '4000A': 10,
  '3000A': 10,
  '2500A': 7,
  '2000A': 6,
  '1600A': 5,
  '1200A': 4,
  '1000A': 3,
  '800A': 2,
  '600A': 2,
  '400A': 1,
  '250A': 1,
  '225A': 1,
  '200A': 1,
  '150A': 1,
  '125A': 1,
  '100A': 1
};

// ============================================================================
// WIRE SIZE RECOMMENDATIONS (based on ampacity)
// ============================================================================

export const COPPER_WIRE_SIZING: Record<string, string> = {
  '15A': '#14',
  '20A': '#12',
  '30A': '#10',
  '40A': '#8',
  '50A': '#6',
  '60A': '#6',
  '70A': '#4',
  '80A': '#4',
  '90A': '#3',
  '100A': '#3',
  '110A': '#2',
  '125A': '#1',
  '150A': '#1/0',
  '175A': '#2/0',
  '200A': '#3/0',
  '225A': '#4/0',
  '250A': '#250 MCM',
  '300A': '#350 MCM',
  '350A': '#400 MCM',
  '400A': '#500 MCM',
  '500A': '#600 MCM',
  '600A': '#750 MCM'
};

// ============================================================================
// CONDUIT SIZE RECOMMENDATIONS (based on wire fill)
// ============================================================================

export const CONDUIT_SIZING: Record<string, Record<number, string>> = {
  '#12': { 3: '1/2"', 4: '1/2"', 6: '3/4"' },
  '#10': { 3: '1/2"', 4: '3/4"', 6: '1"' },
  '#8': { 3: '3/4"', 4: '1"', 6: '1-1/4"' },
  '#6': { 3: '3/4"', 4: '1"', 6: '1-1/4"' },
  '#4': { 3: '1"', 4: '1-1/4"', 6: '1-1/2"' },
  '#3': { 3: '1"', 4: '1-1/4"', 6: '1-1/2"' },
  '#2': { 3: '1-1/4"', 4: '1-1/4"', 6: '2"' },
  '#1': { 3: '1-1/4"', 4: '1-1/2"', 6: '2"' },
  '#1/0': { 3: '1-1/2"', 4: '2"', 6: '2-1/2"' },
  '#2/0': { 3: '1-1/2"', 4: '2"', 6: '2-1/2"' },
  '#3/0': { 3: '2"', 4: '2-1/2"', 6: '3"' },
  '#4/0': { 3: '2"', 4: '2-1/2"', 6: '3"' },
  '#250 MCM': { 3: '2-1/2"', 4: '3"', 6: '3-1/2"' },
  '#350 MCM': { 3: '3"', 4: '3"', 6: '4"' },
  '#500 MCM': { 3: '3"', 4: '3-1/2"', 6: '4"' },
  '#600 MCM': { 3: '3-1/2"', 4: '4"', 6: '4"' },
  '#750 MCM': { 3: '4"', 4: '4"', 6: '4"' }
};
