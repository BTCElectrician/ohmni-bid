export type UnitType = 'E' | 'C' | 'M' | 'Lot';

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
  pricingItemId?: string | null;
}

export interface LineItem {
  id: string;
  pricingItemId?: string | null;
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
  laborRate: number;
  materialTaxRate: number;
  overheadProfitRate: number;
}

export interface ProjectInfo {
  projectName: string;
  projectNumber?: string;
  location?: string;
  gcName?: string;
  contactName?: string;
  preparedBy?: string;
  date?: Date;
  squareFootage?: number;
}

export interface Estimate {
  id: string;
  project: ProjectInfo;
  parameters: EstimateParameters;
  lineItems: LineItem[];
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
