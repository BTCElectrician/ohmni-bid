/**
 * Ohmni Estimate - Main Hook
 * Drop into: hooks/estimate/useEstimate.ts
 *
 * Orchestrates estimate loading, saving, and mutations
 */

'use client';

import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { useEstimateStore } from '@/store/estimateStore';
import {
  estimateService,
  lineItemService,
  pricingService,
} from '@/services/estimateService';
import type {
  Estimate,
  EstimateLineItem,
  CreateEstimateRequest,
  UpdateEstimateRequest,
  AddLineItemRequest,
  BulkAddLineItemsRequest,
  EstimateCategory,
} from '@/types/estimate';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const estimateKeys = {
  all: ['estimates'] as const,
  lists: () => [...estimateKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...estimateKeys.lists(), filters] as const,
  details: () => [...estimateKeys.all, 'detail'] as const,
  detail: (id: string) => [...estimateKeys.details(), id] as const,
  pricing: () => ['pricing'] as const,
  pricingSearch: (query: string, category?: string) =>
    [...estimateKeys.pricing(), 'search', query, category] as const,
  pricingCategories: () => [...estimateKeys.pricing(), 'categories'] as const,
};

// =============================================================================
// MAIN ESTIMATE HOOK
// =============================================================================

export function useEstimate(estimateId?: string) {
  const queryClient = useQueryClient();

  const {
    setCurrentEstimate,
    setLineItems,
    setLoading,
    setSaving,
    setError,
    addLineItem,
    updateLineItem,
    removeLineItem,
    bulkAddLineItems,
    currentEstimate,
    lineItems,
    totals,
    categoryGroups,
  } = useEstimateStore();

  // ---------------------------------------------------------------------------
  // LOAD ESTIMATE
  // ---------------------------------------------------------------------------

  const {
    data: estimate,
    isLoading,
    error,
  } = useQuery({
    queryKey: estimateKeys.detail(estimateId || ''),
    queryFn: () => estimateService.get(estimateId!),
    enabled: !!estimateId,
    staleTime: 30000,
  });

  // Sync to store when data loads
  useEffect(() => {
    if (estimate) {
      setCurrentEstimate(estimate);
      if (estimate.line_items) {
        setLineItems(estimate.line_items);
      }
    }
    setLoading(isLoading);
    setError(error?.message || null);
  }, [estimate, isLoading, error, setCurrentEstimate, setLineItems, setLoading, setError]);

  // ---------------------------------------------------------------------------
  // CREATE ESTIMATE
  // ---------------------------------------------------------------------------

  const createMutation = useMutation({
    mutationFn: (data: CreateEstimateRequest) => estimateService.create(data),
    onSuccess: (newEstimate) => {
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
      setCurrentEstimate(newEstimate);
      toast.success('Estimate created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create estimate: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // UPDATE ESTIMATE
  // ---------------------------------------------------------------------------

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEstimateRequest }) =>
      estimateService.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: estimateKeys.detail(id) });
      const previous = queryClient.getQueryData(estimateKeys.detail(id));

      // Optimistic update
      if (currentEstimate && currentEstimate.id === id) {
        setCurrentEstimate({ ...currentEstimate, ...data });
      }

      return { previous };
    },
    onSuccess: (updatedEstimate) => {
      queryClient.setQueryData(
        estimateKeys.detail(updatedEstimate.id),
        updatedEstimate
      );
      setCurrentEstimate(updatedEstimate);
    },
    onError: (error: Error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(estimateKeys.detail(id), context.previous);
        setCurrentEstimate(context.previous as Estimate);
      }
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // DELETE ESTIMATE
  // ---------------------------------------------------------------------------

  const deleteMutation = useMutation({
    mutationFn: (id: string) => estimateService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
      queryClient.removeQueries({ queryKey: estimateKeys.detail(id) });
      if (currentEstimate?.id === id) {
        setCurrentEstimate(null);
        setLineItems([]);
      }
      toast.success('Estimate deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // ADD LINE ITEM
  // ---------------------------------------------------------------------------

  const addItemMutation = useMutation({
    mutationFn: ({
      estimateId,
      data,
    }: {
      estimateId: string;
      data: AddLineItemRequest;
    }) => lineItemService.add(estimateId, data),
    onSuccess: ({ lineItem }) => {
      addLineItem(lineItem);
      toast.success('Item added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add item: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // UPDATE LINE ITEM
  // ---------------------------------------------------------------------------

  const updateItemMutation = useMutation({
    mutationFn: ({
      estimateId,
      itemId,
      data,
    }: {
      estimateId: string;
      itemId: string;
      data: Partial<AddLineItemRequest>;
    }) => lineItemService.update(estimateId, itemId, data),
    onMutate: async ({ itemId, data }) => {
      // Optimistic update
      const currentItem = lineItems.find((i) => i.id === itemId);
      if (currentItem) {
        updateLineItem(itemId, data as Partial<EstimateLineItem>);
      }
      return { currentItem };
    },
    onSuccess: ({ lineItem }) => {
      updateLineItem(lineItem.id, lineItem);
    },
    onError: (error: Error, { itemId }, context) => {
      if (context?.currentItem) {
        updateLineItem(itemId, context.currentItem);
      }
      toast.error(`Failed to update item: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // DELETE LINE ITEM
  // ---------------------------------------------------------------------------

  const deleteItemMutation = useMutation({
    mutationFn: ({
      estimateId,
      itemId,
    }: {
      estimateId: string;
      itemId: string;
    }) => lineItemService.delete(estimateId, itemId),
    onMutate: async ({ itemId }) => {
      const currentItem = lineItems.find((i) => i.id === itemId);
      removeLineItem(itemId);
      return { currentItem };
    },
    onError: (error: Error, { itemId }, context) => {
      if (context?.currentItem) {
        addLineItem(context.currentItem);
      }
      toast.error(`Failed to delete item: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // BULK ADD ITEMS
  // ---------------------------------------------------------------------------

  const bulkAddMutation = useMutation({
    mutationFn: ({
      estimateId,
      data,
    }: {
      estimateId: string;
      data: BulkAddLineItemsRequest;
    }) => lineItemService.bulkAdd(estimateId, data),
    onSuccess: (updatedEstimate) => {
      setCurrentEstimate(updatedEstimate);
      if (updatedEstimate.line_items) {
        setLineItems(updatedEstimate.line_items);
      }
      toast.success(`Added ${updatedEstimate.line_items?.length || 0} items`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to add items: ${error.message}`);
    },
  });

  // ---------------------------------------------------------------------------
  // CONVENIENCE METHODS
  // ---------------------------------------------------------------------------

  const createEstimate = useCallback(
    (data: CreateEstimateRequest) => createMutation.mutateAsync(data),
    [createMutation]
  );

  const updateEstimate = useCallback(
    (data: UpdateEstimateRequest) => {
      if (!currentEstimate) return Promise.reject(new Error('No estimate loaded'));
      return updateMutation.mutateAsync({ id: currentEstimate.id, data });
    },
    [currentEstimate, updateMutation]
  );

  const deleteEstimate = useCallback(
    (id?: string) => {
      const targetId = id || currentEstimate?.id;
      if (!targetId) return Promise.reject(new Error('No estimate to delete'));
      return deleteMutation.mutateAsync(targetId);
    },
    [currentEstimate, deleteMutation]
  );

  const addItem = useCallback(
    (data: AddLineItemRequest) => {
      if (!currentEstimate) return Promise.reject(new Error('No estimate loaded'));
      return addItemMutation.mutateAsync({
        estimateId: currentEstimate.id,
        data,
      });
    },
    [currentEstimate, addItemMutation]
  );

  const updateItem = useCallback(
    (itemId: string, data: Partial<AddLineItemRequest>) => {
      if (!currentEstimate) return Promise.reject(new Error('No estimate loaded'));
      return updateItemMutation.mutateAsync({
        estimateId: currentEstimate.id,
        itemId,
        data,
      });
    },
    [currentEstimate, updateItemMutation]
  );

  const deleteItem = useCallback(
    (itemId: string) => {
      if (!currentEstimate) return Promise.reject(new Error('No estimate loaded'));
      return deleteItemMutation.mutateAsync({
        estimateId: currentEstimate.id,
        itemId,
      });
    },
    [currentEstimate, deleteItemMutation]
  );

  const bulkAdd = useCallback(
    (data: BulkAddLineItemsRequest) => {
      if (!currentEstimate) return Promise.reject(new Error('No estimate loaded'));
      return bulkAddMutation.mutateAsync({
        estimateId: currentEstimate.id,
        data,
      });
    },
    [currentEstimate, bulkAddMutation]
  );

  // ---------------------------------------------------------------------------
  // RETURN
  // ---------------------------------------------------------------------------

  return {
    // Data
    estimate: currentEstimate,
    lineItems,
    totals,
    categoryGroups,

    // Status
    isLoading,
    isSaving:
      createMutation.isPending ||
      updateMutation.isPending ||
      addItemMutation.isPending ||
      updateItemMutation.isPending ||
      deleteItemMutation.isPending ||
      bulkAddMutation.isPending,
    error: error?.message,

    // Estimate mutations
    createEstimate,
    updateEstimate,
    deleteEstimate,

    // Line item mutations
    addItem,
    updateItem,
    deleteItem,
    bulkAdd,

    // Raw mutations (for advanced use)
    mutations: {
      create: createMutation,
      update: updateMutation,
      delete: deleteMutation,
      addItem: addItemMutation,
      updateItem: updateItemMutation,
      deleteItem: deleteItemMutation,
      bulkAdd: bulkAddMutation,
    },
  };
}

// =============================================================================
// ESTIMATES LIST HOOK
// =============================================================================

export function useEstimatesList(filters?: { status?: string; limit?: number }) {
  const { setEstimates, estimates } = useEstimateStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: estimateKeys.list(filters || {}),
    queryFn: () => estimateService.list(filters),
    staleTime: 60000,
  });

  useEffect(() => {
    if (data) {
      setEstimates(data);
    }
  }, [data, setEstimates]);

  return {
    estimates: estimates.length > 0 ? estimates : data || [],
    isLoading,
    error: error?.message,
    refetch,
  };
}

// =============================================================================
// PRICING SEARCH HOOK
// =============================================================================

export function usePricingSearch(query: string, category?: string) {
  const { setPricingSearchResults, setIsSearchingPricing, pricingSearchResults } =
    useEstimateStore();

  const { data, isLoading } = useQuery({
    queryKey: estimateKeys.pricingSearch(query, category),
    queryFn: () => pricingService.search(query, category),
    enabled: query.length >= 2,
    staleTime: 300000, // Cache for 5 minutes
  });

  useEffect(() => {
    if (data) {
      setPricingSearchResults(data);
    }
    setIsSearchingPricing(isLoading);
  }, [data, isLoading, setPricingSearchResults, setIsSearchingPricing]);

  return {
    results: data || pricingSearchResults,
    isSearching: isLoading,
  };
}

export default useEstimate;
