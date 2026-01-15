/**
 * Ohmni Estimate - TypeScript Types
 * Drop into: types/estimate.ts
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export type UnitType = 'E' | 'C' | 'M' | 'Lot';

export type EstimateStatus = 'draft' | 'submitted' | 'won' | 'lost';

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

export type ProjectType =
  | 'warehouse'
  | 'office'
  | 'retail'
  | 'industrial'
  | 'restaurant'
  | 'medical'
  | 'education'
  | 'mixed_use'
  | 'other';

export type LineItemSource = 'manual' | 'chat' | 'photo' | 'import' | 'template';

export const CATEGORY_LABELS: Record<EstimateCategory, string> = {
  TEMP_POWER: 'Temporary Power',
  ELECTRICAL_SERVICE: 'Service & Distribution',
  MECHANICAL_CONNECTIONS: 'Mechanical Connections',
  INTERIOR_LIGHTING: 'Interior Lighting',
  EXTERIOR_LIGHTING: 'Exterior Lighting',
  POWER_RECEPTACLES: 'Power & Receptacles',
  SITE_CONDUITS: 'Site Conduits',
  SECURITY: 'Security',
  FIRE_ALARM: 'Fire Alarm',
  GENERAL_CONDITIONS: 'General Conditions',
};

export const CATEGORY_ICONS: Record<EstimateCategory, string> = {
  TEMP_POWER: 'Zap',
  ELECTRICAL_SERVICE: 'Server',
  MECHANICAL_CONNECTIONS: 'Cog',
  INTERIOR_LIGHTING: 'Lightbulb',
  EXTERIOR_LIGHTING: 'Sun',
  POWER_RECEPTACLES: 'Plug',
  SITE_CONDUITS: 'GitBranch',
  SECURITY: 'Shield',
  FIRE_ALARM: 'Bell',
  GENERAL_CONDITIONS: 'ClipboardList',
};

export const CATEGORY_ORDER: EstimateCategory[] = [
  'TEMP_POWER',
  'ELECTRICAL_SERVICE',
  'MECHANICAL_CONNECTIONS',
  'INTERIOR_LIGHTING',
  'EXTERIOR_LIGHTING',
  'POWER_RECEPTACLES',
  'SITE_CONDUITS',
  'SECURITY',
  'FIRE_ALARM',
  'GENERAL_CONDITIONS',
];

// =============================================================================
// CORE INTERFACES
// =============================================================================

export interface PricingItem {
  id: string;
  category: string;
  subcategory?: string;
  name: string;
  description?: string;
  size?: string;
  material_cost: number;
  labor_hours: number;
  unit_type: UnitType;
  market_price?: number;
}

export interface EstimateLineItem {
  id: string;
  estimate_id: string;
  pricing_item_id?: string;
  category: EstimateCategory;
  description: string;
  quantity: number;
  unit_type: UnitType;
  material_unit_cost: number;
  labor_hours_per_unit: number;
  material_extension: number;
  labor_extension: number;
  total_cost: number;
  source: LineItemSource;
  ai_confidence?: number;
  ai_notes?: string;
  sort_order: number;
}

export interface Estimate {
  id: string;
  user_id: string;
  chat_session_id?: string;

  // Project info
  project_name: string;
  project_number?: string;
  project_location?: string;
  project_type?: ProjectType;
  square_footage?: number;

  // Client info
  gc_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;

  // Pricing parameters
  labor_rate: number;
  material_tax_rate: number;
  overhead_profit_rate: number;

  // Calculated totals
  total_material: number;
  total_material_with_tax: number;
  total_labor_hours: number;
  total_labor_cost: number;
  subtotal: number;
  overhead_profit: number;
  final_bid: number;
  price_per_sqft?: number;

  // Status
  status: EstimateStatus;
  created_at: string;
  updated_at: string;

  // Nested data (when include_line_items=true)
  line_items?: EstimateLineItem[];
  category_totals?: Record<EstimateCategory, number>;
}

export interface Proposal {
  id: string;
  estimate_id: string;
  title: string;
  content?: string;
  scope_of_work?: string;
  exclusions?: string;
  pdf_url?: string;
  valid_days: number;
  valid_until?: string;
  version: number;
  created_at: string;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface CreateEstimateRequest {
  project_name: string;
  project_type?: ProjectType;
  square_footage?: number;
  gc_name?: string;
  project_location?: string;
  chat_session_id?: string;
  labor_rate?: number;
  material_tax_rate?: number;
  overhead_profit_rate?: number;
}

export interface UpdateEstimateRequest {
  project_name?: string;
  project_number?: string;
  project_location?: string;
  project_type?: ProjectType;
  square_footage?: number;
  gc_name?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  labor_rate?: number;
  material_tax_rate?: number;
  overhead_profit_rate?: number;
  status?: EstimateStatus;
}

export interface AddLineItemRequest {
  category: EstimateCategory;
  description: string;
  quantity: number;
  material_unit_cost: number;
  labor_hours_per_unit: number;
  unit_type?: UnitType;
  pricing_item_id?: string;
  source?: LineItemSource;
  ai_confidence?: number;
  ai_notes?: string;
}

export interface BulkAddLineItemsRequest {
  items: AddLineItemRequest[];
  source?: LineItemSource;
}

export interface QuickQuoteRequest {
  items: Array<{ name: string; quantity: number }>;
  labor_rate?: number;
  material_tax_rate?: number;
  overhead_profit_rate?: number;
}

export interface QuickQuoteResponse {
  line_items: Array<{
    description: string;
    quantity: number;
    unit_type: UnitType;
    material_extension: number;
    labor_extension: number;
    total: number;
  }>;
  total_material: number;
  total_material_with_tax: number;
  total_labor_hours: number;
  total_labor_cost: number;
  subtotal: number;
  overhead_profit: number;
  final_total: number;
  parameters: {
    labor_rate: number;
    tax_rate: number;
    overhead_profit_rate: number;
  };
}

export interface FeederCalculationRequest {
  wire_material: 'CU' | 'AL';
  wire_size: string;
  conduit_type: string;
  conduit_size: string;
  length_feet: number;
  conductor_count?: number;
  ampacity_multiplier?: number;
}

export interface FeederCalculationResponse {
  material_cost: number;
  labor_hours: number;
  description: string;
  wire: string;
  conduit: string;
}

export interface RecordOutcomeRequest {
  won: boolean;
  won_amount?: number;
  notes?: string;
}

// =============================================================================
// PHOTO TAKEOFF TYPES
// =============================================================================

export interface ExtractedItem {
  category: EstimateCategory;
  description: string;
  quantity: number;
  confidence: number;
  notes?: string;
  selected?: boolean; // For UI selection
}

export interface PhotoTakeoffResult {
  image_type: 'electrical_plan' | 'panel_schedule' | 'fixture_schedule' | 'site_photo' | 'spec_sheet';
  confidence: number;
  extracted_items: ExtractedItem[];
  observations: string[];
  clarifications_needed: string[];
  estimated_scope?: {
    square_footage_estimate?: number;
    project_type?: ProjectType;
    complexity?: 'low' | 'medium' | 'high';
  };
}

// =============================================================================
// UI STATE TYPES
// =============================================================================

export interface EstimateTotals {
  material: number;
  materialWithTax: number;
  laborHours: number;
  laborCost: number;
  subtotal: number;
  overheadProfit: number;
  finalBid: number;
  pricePerSqft?: number;
}

export interface CategoryGroup {
  category: EstimateCategory;
  label: string;
  icon: string;
  items: EstimateLineItem[];
  total: number;
  expanded: boolean;
}

export interface EstimateFormData {
  projectName: string;
  projectType: ProjectType | '';
  squareFootage: string;
  gcName: string;
  projectLocation: string;
  laborRate: string;
  materialTaxRate: string;
  overheadProfitRate: string;
}

// =============================================================================
// SSE EVENT TYPES (for streaming estimate updates)
// =============================================================================

export type EstimateSSEEvent =
  | { type: 'item_added'; item: EstimateLineItem }
  | { type: 'item_updated'; item: EstimateLineItem }
  | { type: 'item_removed'; item_id: string }
  | { type: 'totals_updated'; totals: EstimateTotals }
  | { type: 'estimate_complete'; estimate: Estimate }
  | { type: 'ai_thinking'; message: string }
  | { type: 'error'; error: string };
