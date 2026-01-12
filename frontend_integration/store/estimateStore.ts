/**
 * Ohmni Estimate - Zustand Store
 * Drop into: store/estimateStore.ts
 */

'use client';

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Estimate,
  EstimateLineItem,
  EstimateCategory,
  CategoryGroup,
  EstimateTotals,
  PricingItem,
  PhotoTakeoffResult,
  CATEGORY_ORDER,
  CATEGORY_LABELS,
  CATEGORY_ICONS,
} from '@/types/estimate';

// =============================================================================
// STORE INTERFACE
// =============================================================================

interface EstimateStore {
  // Current estimate
  currentEstimate: Estimate | null;
  lineItems: EstimateLineItem[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  // UI State
  expandedCategories: Set<EstimateCategory>;
  selectedLineItemId: string | null;
  showProjectInfo: boolean;
  showAIChat: boolean;

  // Photo takeoff
  photoTakeoffResult: PhotoTakeoffResult | null;
  isAnalyzingPhoto: boolean;

  // Pricing search
  pricingSearchResults: PricingItem[];
  isSearchingPricing: boolean;

  // Estimate list (for history)
  estimates: Estimate[];
  isLoadingEstimates: boolean;

  // Computed values (cached)
  categoryGroups: CategoryGroup[];
  totals: EstimateTotals;

  // Actions - Estimate
  setCurrentEstimate: (estimate: Estimate | null) => void;
  updateEstimateField: <K extends keyof Estimate>(field: K, value: Estimate[K]) => void;
  clearCurrentEstimate: () => void;

  // Actions - Line Items
  setLineItems: (items: EstimateLineItem[]) => void;
  addLineItem: (item: EstimateLineItem) => void;
  updateLineItem: (id: string, updates: Partial<EstimateLineItem>) => void;
  removeLineItem: (id: string) => void;
  bulkAddLineItems: (items: EstimateLineItem[]) => void;

  // Actions - UI
  toggleCategory: (category: EstimateCategory) => void;
  expandAllCategories: () => void;
  collapseAllCategories: () => void;
  selectLineItem: (id: string | null) => void;
  toggleProjectInfo: () => void;
  toggleAIChat: () => void;

  // Actions - Photo Takeoff
  setPhotoTakeoffResult: (result: PhotoTakeoffResult | null) => void;
  setIsAnalyzingPhoto: (analyzing: boolean) => void;
  toggleExtractedItem: (index: number) => void;
  confirmPhotoItems: () => EstimateLineItem[];

  // Actions - Pricing
  setPricingSearchResults: (items: PricingItem[]) => void;
  setIsSearchingPricing: (searching: boolean) => void;

  // Actions - Estimates List
  setEstimates: (estimates: Estimate[]) => void;
  addEstimateToList: (estimate: Estimate) => void;
  removeEstimateFromList: (id: string) => void;

  // Actions - Status
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;

  // Computed recalculation
  recalculateTotals: () => void;
  recalculateCategoryGroups: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const CATEGORY_ORDER: EstimateCategory[] = [
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

const CATEGORY_LABELS: Record<EstimateCategory, string> = {
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

const CATEGORY_ICONS: Record<EstimateCategory, string> = {
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

function calculateTotals(
  lineItems: EstimateLineItem[],
  estimate: Estimate | null
): EstimateTotals {
  const laborRate = estimate?.labor_rate ?? 118;
  const taxRate = estimate?.material_tax_rate ?? 0.1025;
  const opRate = estimate?.overhead_profit_rate ?? 0;
  const sqft = estimate?.square_footage;

  const material = lineItems.reduce((sum, item) => sum + item.material_extension, 0);
  const laborHours = lineItems.reduce((sum, item) => sum + item.labor_extension, 0);

  const materialWithTax = material * (1 + taxRate);
  const laborCost = laborHours * laborRate;
  const subtotal = materialWithTax + laborCost;
  const overheadProfit = subtotal * opRate;
  const finalBid = Math.ceil(subtotal + overheadProfit);
  const pricePerSqft = sqft && sqft > 0 ? finalBid / sqft : undefined;

  return {
    material,
    materialWithTax,
    laborHours,
    laborCost,
    subtotal,
    overheadProfit,
    finalBid,
    pricePerSqft,
  };
}

function buildCategoryGroups(
  lineItems: EstimateLineItem[],
  expandedCategories: Set<EstimateCategory>
): CategoryGroup[] {
  const groups: CategoryGroup[] = [];

  for (const category of CATEGORY_ORDER) {
    const items = lineItems
      .filter((item) => item.category === category)
      .sort((a, b) => a.sort_order - b.sort_order);

    const total = items.reduce((sum, item) => sum + item.total_cost, 0);

    groups.push({
      category,
      label: CATEGORY_LABELS[category],
      icon: CATEGORY_ICONS[category],
      items,
      total,
      expanded: expandedCategories.has(category),
    });
  }

  return groups;
}

// =============================================================================
// STORE CREATION
// =============================================================================

const initialTotals: EstimateTotals = {
  material: 0,
  materialWithTax: 0,
  laborHours: 0,
  laborCost: 0,
  subtotal: 0,
  overheadProfit: 0,
  finalBid: 0,
  pricePerSqft: undefined,
};

export const useEstimateStore = create<EstimateStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentEstimate: null,
        lineItems: [],
        isLoading: false,
        isSaving: false,
        error: null,

        expandedCategories: new Set<EstimateCategory>([
          'ELECTRICAL_SERVICE',
          'INTERIOR_LIGHTING',
          'POWER_RECEPTACLES',
        ]),
        selectedLineItemId: null,
        showProjectInfo: true,
        showAIChat: true,

        photoTakeoffResult: null,
        isAnalyzingPhoto: false,

        pricingSearchResults: [],
        isSearchingPricing: false,

        estimates: [],
        isLoadingEstimates: false,

        categoryGroups: [],
        totals: initialTotals,

        // Estimate actions
        setCurrentEstimate: (estimate) => {
          set({ currentEstimate: estimate });
          if (estimate?.line_items) {
            get().setLineItems(estimate.line_items);
          }
        },

        updateEstimateField: (field, value) => {
          const current = get().currentEstimate;
          if (!current) return;
          set({
            currentEstimate: { ...current, [field]: value },
          });
          // Recalculate if pricing params changed
          if (['labor_rate', 'material_tax_rate', 'overhead_profit_rate', 'square_footage'].includes(field)) {
            get().recalculateTotals();
          }
        },

        clearCurrentEstimate: () => {
          set({
            currentEstimate: null,
            lineItems: [],
            categoryGroups: [],
            totals: initialTotals,
            selectedLineItemId: null,
          });
        },

        // Line item actions
        setLineItems: (items) => {
          set({ lineItems: items });
          get().recalculateCategoryGroups();
          get().recalculateTotals();
        },

        addLineItem: (item) => {
          set((state) => ({ lineItems: [...state.lineItems, item] }));
          get().recalculateCategoryGroups();
          get().recalculateTotals();
        },

        updateLineItem: (id, updates) => {
          set((state) => ({
            lineItems: state.lineItems.map((item) =>
              item.id === id ? { ...item, ...updates } : item
            ),
          }));
          get().recalculateCategoryGroups();
          get().recalculateTotals();
        },

        removeLineItem: (id) => {
          set((state) => ({
            lineItems: state.lineItems.filter((item) => item.id !== id),
            selectedLineItemId:
              state.selectedLineItemId === id ? null : state.selectedLineItemId,
          }));
          get().recalculateCategoryGroups();
          get().recalculateTotals();
        },

        bulkAddLineItems: (items) => {
          set((state) => ({ lineItems: [...state.lineItems, ...items] }));
          get().recalculateCategoryGroups();
          get().recalculateTotals();
        },

        // UI actions
        toggleCategory: (category) => {
          set((state) => {
            const newExpanded = new Set(state.expandedCategories);
            if (newExpanded.has(category)) {
              newExpanded.delete(category);
            } else {
              newExpanded.add(category);
            }
            return { expandedCategories: newExpanded };
          });
          get().recalculateCategoryGroups();
        },

        expandAllCategories: () => {
          set({ expandedCategories: new Set(CATEGORY_ORDER) });
          get().recalculateCategoryGroups();
        },

        collapseAllCategories: () => {
          set({ expandedCategories: new Set() });
          get().recalculateCategoryGroups();
        },

        selectLineItem: (id) => set({ selectedLineItemId: id }),
        toggleProjectInfo: () => set((s) => ({ showProjectInfo: !s.showProjectInfo })),
        toggleAIChat: () => set((s) => ({ showAIChat: !s.showAIChat })),

        // Photo takeoff actions
        setPhotoTakeoffResult: (result) => set({ photoTakeoffResult: result }),
        setIsAnalyzingPhoto: (analyzing) => set({ isAnalyzingPhoto: analyzing }),

        toggleExtractedItem: (index) => {
          set((state) => {
            if (!state.photoTakeoffResult) return state;
            const newItems = [...state.photoTakeoffResult.extracted_items];
            newItems[index] = {
              ...newItems[index],
              selected: !newItems[index].selected,
            };
            return {
              photoTakeoffResult: {
                ...state.photoTakeoffResult,
                extracted_items: newItems,
              },
            };
          });
        },

        confirmPhotoItems: () => {
          const result = get().photoTakeoffResult;
          if (!result) return [];

          const selectedItems = result.extracted_items
            .filter((item) => item.selected !== false)
            .map((item, index) => ({
              id: `photo-${Date.now()}-${index}`,
              estimate_id: get().currentEstimate?.id || '',
              category: item.category,
              description: item.description,
              quantity: item.quantity,
              unit_type: 'E' as const,
              material_unit_cost: 0,
              labor_hours_per_unit: 0,
              material_extension: 0,
              labor_extension: 0,
              total_cost: 0,
              source: 'photo' as const,
              ai_confidence: item.confidence,
              ai_notes: item.notes,
              sort_order: get().lineItems.length + index,
            }));

          set({ photoTakeoffResult: null });
          return selectedItems;
        },

        // Pricing actions
        setPricingSearchResults: (items) => set({ pricingSearchResults: items }),
        setIsSearchingPricing: (searching) => set({ isSearchingPricing: searching }),

        // Estimates list actions
        setEstimates: (estimates) => set({ estimates }),
        addEstimateToList: (estimate) =>
          set((state) => ({ estimates: [estimate, ...state.estimates] })),
        removeEstimateFromList: (id) =>
          set((state) => ({
            estimates: state.estimates.filter((e) => e.id !== id),
          })),

        // Status actions
        setLoading: (loading) => set({ isLoading: loading }),
        setSaving: (saving) => set({ isSaving: saving }),
        setError: (error) => set({ error }),

        // Computed recalculation
        recalculateTotals: () => {
          const { lineItems, currentEstimate } = get();
          const totals = calculateTotals(lineItems, currentEstimate);
          set({ totals });
        },

        recalculateCategoryGroups: () => {
          const { lineItems, expandedCategories } = get();
          const categoryGroups = buildCategoryGroups(lineItems, expandedCategories);
          set({ categoryGroups });
        },
      }),
      {
        name: 'ohmni-estimate-store',
        partialize: (state) => ({
          // Only persist UI preferences, not data
          expandedCategories: Array.from(state.expandedCategories),
          showProjectInfo: state.showProjectInfo,
          showAIChat: state.showAIChat,
        }),
        onRehydrateStorage: () => (state) => {
          // Convert array back to Set after rehydration
          if (state && Array.isArray(state.expandedCategories)) {
            state.expandedCategories = new Set(state.expandedCategories as unknown as EstimateCategory[]);
          }
        },
      }
    ),
    { name: 'EstimateStore' }
  )
);

// =============================================================================
// SELECTOR HOOKS (for performance)
// =============================================================================

export const useCurrentEstimate = () => useEstimateStore((s) => s.currentEstimate);
export const useLineItems = () => useEstimateStore((s) => s.lineItems);
export const useCategoryGroups = () => useEstimateStore((s) => s.categoryGroups);
export const useEstimateTotals = () => useEstimateStore((s) => s.totals);
export const useIsEstimateLoading = () => useEstimateStore((s) => s.isLoading);
export const useIsEstimateSaving = () => useEstimateStore((s) => s.isSaving);
export const usePhotoTakeoffResult = () => useEstimateStore((s) => s.photoTakeoffResult);
