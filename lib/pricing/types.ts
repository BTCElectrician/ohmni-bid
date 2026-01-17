export interface PricingParameters {
  laborRate: number;
  materialTaxRate: number;
  defaultOverheadProfitRate: number;
}

export interface ConduitPricingItem {
  externalRef?: string;
  type: string;
  typeName: string;
  name: string;
  size: string;
  materialCostPer100ft: number;
  laborHoursPer100ft: number;
}

export interface WirePricingItem {
  externalRef?: string;
  material: string;
  type: string;
  size: string;
  marketPricePer1000ft: number;
  markupPercent: number;
  laborHoursPer1000ft: number;
  materialCostPer1000ft?: number;
  name?: string;
}

export interface LineItemPricing {
  externalRef?: string;
  category: string;
  description: string;
  materialUnitCost: number;
  laborHoursPerUnit: number;
  unitType: string;
}

export interface PricingDatabase {
  version: string;
  source: string;
  extracted_at?: string;
  parameters: PricingParameters;
  conduit: ConduitPricingItem[];
  wire: WirePricingItem[];
  lineItems: LineItemPricing[];
}
