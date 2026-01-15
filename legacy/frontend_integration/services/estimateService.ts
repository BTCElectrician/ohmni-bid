/**
 * Ohmni Estimate - API Service
 * Drop into: services/estimateService.ts
 */

import { api } from '@/lib/api';
import type {
  Estimate,
  EstimateLineItem,
  PricingItem,
  CreateEstimateRequest,
  UpdateEstimateRequest,
  AddLineItemRequest,
  BulkAddLineItemsRequest,
  QuickQuoteRequest,
  QuickQuoteResponse,
  FeederCalculationRequest,
  FeederCalculationResponse,
  RecordOutcomeRequest,
} from '@/types/estimate';

// =============================================================================
// BASE URL
// =============================================================================

const BASE_URL = '/api/estimates';

// =============================================================================
// ESTIMATE CRUD
// =============================================================================

export const estimateService = {
  /**
   * Create a new estimate
   */
  async create(data: CreateEstimateRequest): Promise<Estimate> {
    const response = await api.post<{ success: boolean; estimate: Estimate }>(
      BASE_URL,
      data
    );
    return response.estimate;
  },

  /**
   * Get all estimates for current user
   */
  async list(params?: { status?: string; limit?: number }): Promise<Estimate[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const query = queryParams.toString();
    const url = query ? `${BASE_URL}?${query}` : BASE_URL;

    const response = await api.get<{ success: boolean; estimates: Estimate[] }>(url);
    return response.estimates;
  },

  /**
   * Get a single estimate with line items
   */
  async get(estimateId: string): Promise<Estimate> {
    const response = await api.get<{ success: boolean; estimate: Estimate }>(
      `${BASE_URL}/${estimateId}`
    );
    return response.estimate;
  },

  /**
   * Update an estimate
   */
  async update(estimateId: string, data: UpdateEstimateRequest): Promise<Estimate> {
    const response = await api.put<{ success: boolean; estimate: Estimate }>(
      `${BASE_URL}/${estimateId}`,
      data
    );
    return response.estimate;
  },

  /**
   * Delete an estimate
   */
  async delete(estimateId: string): Promise<void> {
    await api.delete(`${BASE_URL}/${estimateId}`);
  },

  /**
   * Duplicate an estimate
   */
  async duplicate(estimateId: string, newName?: string): Promise<Estimate> {
    const original = await this.get(estimateId);

    // Create new estimate with same data
    const newEstimate = await this.create({
      project_name: newName || `${original.project_name} (Copy)`,
      project_type: original.project_type,
      square_footage: original.square_footage,
      gc_name: original.gc_name,
      project_location: original.project_location,
      labor_rate: original.labor_rate,
      material_tax_rate: original.material_tax_rate,
      overhead_profit_rate: original.overhead_profit_rate,
    });

    // Copy line items
    if (original.line_items && original.line_items.length > 0) {
      await this.bulkAddLineItems(newEstimate.id, {
        items: original.line_items.map((item) => ({
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          material_unit_cost: item.material_unit_cost,
          labor_hours_per_unit: item.labor_hours_per_unit,
          unit_type: item.unit_type,
        })),
        source: 'import',
      });
    }

    return this.get(newEstimate.id);
  },
};

// =============================================================================
// LINE ITEMS
// =============================================================================

export const lineItemService = {
  /**
   * Add a single line item
   */
  async add(
    estimateId: string,
    data: AddLineItemRequest
  ): Promise<{ lineItem: EstimateLineItem; totals: { final_bid: number } }> {
    const response = await api.post<{
      success: boolean;
      line_item: EstimateLineItem;
      estimate_totals: { final_bid: number };
    }>(`${BASE_URL}/${estimateId}/items`, data);

    return {
      lineItem: response.line_item,
      totals: response.estimate_totals,
    };
  },

  /**
   * Add line item from pricing database
   */
  async addFromPricing(
    estimateId: string,
    pricingItemId: string,
    quantity: number
  ): Promise<{ lineItem: EstimateLineItem; totals: { final_bid: number } }> {
    const response = await api.post<{
      success: boolean;
      line_item: EstimateLineItem;
      estimate_totals: { final_bid: number };
    }>(`${BASE_URL}/${estimateId}/items`, {
      pricing_item_id: pricingItemId,
      quantity,
      source: 'manual',
    });

    return {
      lineItem: response.line_item,
      totals: response.estimate_totals,
    };
  },

  /**
   * Bulk add line items
   */
  async bulkAdd(
    estimateId: string,
    data: BulkAddLineItemsRequest
  ): Promise<Estimate> {
    const response = await api.post<{
      success: boolean;
      items_added: number;
      estimate: Estimate;
    }>(`${BASE_URL}/${estimateId}/items/bulk`, data);

    return response.estimate;
  },

  /**
   * Update a line item
   */
  async update(
    estimateId: string,
    itemId: string,
    data: Partial<AddLineItemRequest>
  ): Promise<{ lineItem: EstimateLineItem; totals: { final_bid: number } }> {
    const response = await api.put<{
      success: boolean;
      line_item: EstimateLineItem;
      estimate_totals: { final_bid: number };
    }>(`${BASE_URL}/${estimateId}/items/${itemId}`, data);

    return {
      lineItem: response.line_item,
      totals: response.estimate_totals,
    };
  },

  /**
   * Delete a line item
   */
  async delete(
    estimateId: string,
    itemId: string
  ): Promise<{ totals: { final_bid: number } }> {
    const response = await api.delete<{
      success: boolean;
      estimate_totals: { final_bid: number };
    }>(`${BASE_URL}/${estimateId}/items/${itemId}`);

    return { totals: response.estimate_totals };
  },
};

// Alias for convenience
export const bulkAddLineItems = lineItemService.bulkAdd.bind(lineItemService);

// =============================================================================
// PRICING DATABASE
// =============================================================================

export const pricingService = {
  /**
   * Search pricing items
   */
  async search(
    query: string,
    category?: string,
    limit: number = 20
  ): Promise<PricingItem[]> {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    params.set('limit', limit.toString());

    const response = await api.get<{
      success: boolean;
      items: PricingItem[];
    }>(`${BASE_URL}/pricing/search?${params}`);

    return response.items;
  },

  /**
   * Get all categories with counts
   */
  async getCategories(): Promise<Array<{ name: string; count: number }>> {
    const response = await api.get<{
      success: boolean;
      categories: Array<{ name: string; count: number }>;
    }>(`${BASE_URL}/pricing/categories`);

    return response.categories;
  },

  /**
   * Get all items in a category
   */
  async getByCategory(category: string): Promise<PricingItem[]> {
    const response = await api.get<{
      success: boolean;
      items: PricingItem[];
    }>(`${BASE_URL}/pricing/category/${category}`);

    return response.items;
  },
};

// =============================================================================
// QUICK QUOTE
// =============================================================================

export const quickQuoteService = {
  /**
   * Generate a quick quote without saving
   */
  async calculate(data: QuickQuoteRequest): Promise<QuickQuoteResponse> {
    const response = await api.post<{
      success: boolean;
      quote: QuickQuoteResponse;
    }>(`${BASE_URL}/quick-quote`, data);

    return response.quote;
  },
};

// =============================================================================
// FEEDER CALCULATOR
// =============================================================================

export const feederService = {
  /**
   * Calculate feeder pricing
   */
  async calculate(data: FeederCalculationRequest): Promise<FeederCalculationResponse> {
    const response = await api.post<{
      success: boolean;
      feeder: FeederCalculationResponse;
    }>(`${BASE_URL}/calculate-feeder`, data);

    return response.feeder;
  },
};

// =============================================================================
// OUTCOME TRACKING
// =============================================================================

export const outcomeService = {
  /**
   * Record bid outcome (won/lost)
   */
  async record(estimateId: string, data: RecordOutcomeRequest): Promise<Estimate> {
    const response = await api.post<{
      success: boolean;
      estimate: Estimate;
    }>(`${BASE_URL}/${estimateId}/outcome`, data);

    return response.estimate;
  },
};

// =============================================================================
// COMBINED EXPORT
// =============================================================================

export default {
  estimates: estimateService,
  lineItems: lineItemService,
  pricing: pricingService,
  quickQuote: quickQuoteService,
  feeder: feederService,
  outcome: outcomeService,
};
