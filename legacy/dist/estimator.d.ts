/**
 * Ohmni Bid - Electrical Estimating Engine
 *
 * Core calculation logic reverse-engineered from Excel workbook
 */
export type UnitType = 'E' | 'C' | 'M' | 'Lot';
export type EstimateCategory = 'TEMP_POWER' | 'ELECTRICAL_SERVICE' | 'MECHANICAL_CONNECTIONS' | 'INTERIOR_LIGHTING' | 'EXTERIOR_LIGHTING' | 'POWER_RECEPTACLES' | 'SITE_CONDUITS' | 'SECURITY' | 'FIRE_ALARM' | 'GENERAL_CONDITIONS';
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
    laborRate: number;
    materialTaxRate: number;
    overheadProfitRate: number;
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
export declare const DEFAULT_PARAMETERS: EstimateParameters;
/**
 * Calculate line item total with all markups
 * Implements: =+(((I*$I$323)+(F*(1+$E$323)))*(1+$C$329))
 */
export declare function calculateLineItemTotal(materialExtension: number, laborExtension: number, params: EstimateParameters): number;
/**
 * Calculate material extension based on unit type
 */
export declare function calculateMaterialExtension(quantity: number, unitCost: number, unitType: UnitType): number;
/**
 * Calculate labor extension based on unit type
 */
export declare function calculateLaborExtension(quantity: number, laborHours: number, unitType: UnitType): number;
/**
 * Create a line item with all calculations
 */
export declare function createLineItem(template: LineItemTemplate, quantity: number, params: EstimateParameters, id?: string): LineItem;
/**
 * Calculate feeder pricing (wire + conduit combination)
 * Implements: =((FEEDERS!$D$xxx*4)/10+FEEDERS!$D$yy)*multiplier
 */
export declare function calculateFeederPrice(wire: WirePricing, conduit: ConduitPricing, conductorCount: number, ampacityMultiplier: number): {
    materialCostPer100ft: number;
    laborHoursPer100ft: number;
};
/**
 * Calculate complete feeder run
 */
export declare function calculateFeederRun(wire: WirePricing, conduit: ConduitPricing, conductorCount: number, lengthFeet: number, ampacityMultiplier: number, params: EstimateParameters): FeederCalculation;
/**
 * Calculate all totals for an estimate
 */
export declare function calculateEstimateTotals(lineItems: LineItem[], params: EstimateParameters, squareFootage?: number): Omit<Estimate, 'id' | 'project' | 'parameters' | 'lineItems'>;
/**
 * Create a complete estimate
 */
export declare function createEstimate(project: ProjectInfo, lineItems: LineItem[], params?: EstimateParameters): Estimate;
/**
 * Format currency
 */
export declare function formatCurrency(amount: number): string;
/**
 * Format hours
 */
export declare function formatHours(hours: number): string;
export declare const AMPACITY_MULTIPLIERS: Record<string, number>;
export declare const COPPER_WIRE_SIZING: Record<string, string>;
export declare const CONDUIT_SIZING: Record<string, Record<number, string>>;
//# sourceMappingURL=estimator.d.ts.map