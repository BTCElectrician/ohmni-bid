/**
 * Ohmni Estimate - QuickAddModal
 * Drop into: components/estimate/QuickAddModal.tsx
 *
 * Search pricing database and add items to estimate
 */

'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Plus,
  Check,
  Zap,
  Server,
  Cog,
  Lightbulb,
  Sun,
  Plug,
  GitBranch,
  Shield,
  Bell,
  ClipboardList,
  Package,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { usePricingSearch } from '@/hooks/estimate/useEstimate';
import type { PricingItem, EstimateCategory, AddLineItemRequest } from '@/types/estimate';

// =============================================================================
// CONSTANTS
// =============================================================================

const CATEGORY_CONFIG: Record<
  EstimateCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  TEMP_POWER: { label: 'Temp Power', icon: Zap, color: 'text-yellow-500' },
  ELECTRICAL_SERVICE: { label: 'Electrical Service', icon: Server, color: 'text-blue-500' },
  MECHANICAL_CONNECTIONS: { label: 'Mechanical', icon: Cog, color: 'text-gray-400' },
  INTERIOR_LIGHTING: { label: 'Interior Lighting', icon: Lightbulb, color: 'text-amber-400' },
  EXTERIOR_LIGHTING: { label: 'Exterior Lighting', icon: Sun, color: 'text-orange-400' },
  POWER_RECEPTACLES: { label: 'Power & Receptacles', icon: Plug, color: 'text-green-500' },
  SITE_CONDUITS: { label: 'Site Conduits', icon: GitBranch, color: 'text-purple-400' },
  SECURITY: { label: 'Security', icon: Shield, color: 'text-red-400' },
  FIRE_ALARM: { label: 'Fire Alarm', icon: Bell, color: 'text-red-500' },
  GENERAL_CONDITIONS: { label: 'General Conditions', icon: ClipboardList, color: 'text-slate-400' },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_CONFIG) as EstimateCategory[];

// =============================================================================
// PROPS
// =============================================================================

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: AddLineItemRequest[]) => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function QuickAddModal({ isOpen, onClose, onAddItems }: QuickAddModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EstimateCategory | null>(null);
  const [selectedItems, setSelectedItems] = useState<Map<string, { item: PricingItem; quantity: number }>>(
    new Map()
  );
  const [isAdding, setIsAdding] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Search hook
  const { results, isSearching } = usePricingSearch(
    searchQuery,
    selectedCategory || undefined
  );

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      // Reset on close
      setSearchQuery('');
      setSelectedCategory(null);
      setSelectedItems(new Map());
    }
  }, [isOpen]);

  // Toggle item selection
  const toggleItem = useCallback((item: PricingItem) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.set(item.id, { item, quantity: 1 });
      }
      return next;
    });
  }, []);

  // Update quantity
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const entry = next.get(itemId);
      if (entry) {
        next.set(itemId, { ...entry, quantity: Math.max(1, quantity) });
      }
      return next;
    });
  }, []);

  // Calculate totals
  const totals = useMemo(() => {
    let material = 0;
    let labor = 0;

    selectedItems.forEach(({ item, quantity }) => {
      material += item.material_unit_cost * quantity;
      labor += item.labor_hours_per_unit * quantity;
    });

    return { material, labor, count: selectedItems.size };
  }, [selectedItems]);

  // Handle add
  const handleAdd = async () => {
    if (selectedItems.size === 0) return;

    setIsAdding(true);

    const items: AddLineItemRequest[] = Array.from(selectedItems.values()).map(
      ({ item, quantity }) => ({
        category: item.category,
        description: item.description,
        quantity,
        material_unit_cost: item.material_unit_cost,
        labor_hours_per_unit: item.labor_hours_per_unit,
        unit_type: item.unit_type,
      })
    );

    onAddItems(items);
    setIsAdding(false);
  };

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && e.metaKey) {
        handleAdd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, handleAdd]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn(
            'relative w-full max-w-4xl max-h-[85vh]',
            'bg-navy rounded-2xl shadow-2xl',
            'border border-border-subtle',
            'flex flex-col overflow-hidden'
          )}
        >
          {/* Header */}
          <div className="flex-shrink-0 p-6 border-b border-border-subtle">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-electric-blue/20">
                  <Package className="w-5 h-5 text-electric-blue" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-text-primary">Add Items</h2>
                  <p className="text-sm text-text-secondary">
                    Search our pricing database
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items... (e.g., 'receptacle', '3/4 EMT', 'panel')"
                className={cn(
                  'w-full pl-12 pr-4 py-3 rounded-xl',
                  'bg-surface-elevated border border-border-subtle',
                  'text-text-primary placeholder:text-text-secondary',
                  'focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:border-electric-blue',
                  'transition-all duration-200'
                )}
              />
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-electric-blue animate-spin" />
              )}
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                  !selectedCategory
                    ? 'bg-electric-blue text-white'
                    : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                )}
              >
                All
              </button>
              {ALL_CATEGORIES.map((cat) => {
                const config = CATEGORY_CONFIG[cat];
                const IconComponent = config.icon;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                      cat === selectedCategory
                        ? 'bg-electric-blue text-white'
                        : 'bg-surface-elevated text-text-secondary hover:text-text-primary'
                    )}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-auto p-4">
            {results.length === 0 && searchQuery.length >= 2 && !isSearching ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="w-12 h-12 text-text-secondary/30 mb-4" />
                <p className="text-text-secondary">No items found</p>
                <p className="text-sm text-text-secondary/70">
                  Try different keywords or select a category
                </p>
              </div>
            ) : results.length === 0 && searchQuery.length < 2 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Sparkles className="w-12 h-12 text-electric-blue/30 mb-4" />
                <p className="text-text-secondary">Start typing to search</p>
                <p className="text-sm text-text-secondary/70">
                  Enter at least 2 characters
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                {results.map((item) => {
                  const isSelected = selectedItems.has(item.id);
                  const config = CATEGORY_CONFIG[item.category];
                  const IconComponent = config?.icon || ClipboardList;
                  const selectedEntry = selectedItems.get(item.id);

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border transition-all duration-200',
                        isSelected
                          ? 'bg-electric-blue/10 border-electric-blue/50'
                          : 'bg-surface-elevated/50 border-border-subtle hover:border-electric-blue/30'
                      )}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleItem(item)}
                        className={cn(
                          'flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200',
                          isSelected
                            ? 'bg-electric-blue border-electric-blue'
                            : 'border-border-subtle hover:border-electric-blue'
                        )}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </button>

                      {/* Icon */}
                      <div
                        className={cn(
                          'flex-shrink-0 p-2 rounded-lg bg-surface-elevated',
                          config?.color || 'text-text-secondary'
                        )}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {item.description}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-text-secondary">
                            {config?.label || item.category}
                          </span>
                          <span className="text-xs text-text-secondary">•</span>
                          <span className="text-xs text-text-secondary">
                            ${item.material_unit_cost.toFixed(2)}/
                            {item.unit_type === 'C' ? '100ft' : item.unit_type === 'M' ? '1000ft' : 'ea'}
                          </span>
                          <span className="text-xs text-text-secondary">•</span>
                          <span className="text-xs text-text-secondary">
                            {item.labor_hours_per_unit.toFixed(2)} hrs
                          </span>
                        </div>
                      </div>

                      {/* Quantity */}
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2"
                        >
                          <button
                            onClick={() => updateQuantity(item.id, (selectedEntry?.quantity || 1) - 1)}
                            className="w-8 h-8 rounded-lg bg-surface-elevated text-text-primary hover:bg-electric-blue/20 transition-colors flex items-center justify-center"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={selectedEntry?.quantity || 1}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 rounded-lg bg-surface-elevated border border-border-subtle text-center text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/50"
                          />
                          <button
                            onClick={() => updateQuantity(item.id, (selectedEntry?.quantity || 1) + 1)}
                            className="w-8 h-8 rounded-lg bg-surface-elevated text-text-primary hover:bg-electric-blue/20 transition-colors flex items-center justify-center"
                          >
                            +
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 p-4 border-t border-border-subtle bg-navy/50">
            <div className="flex items-center justify-between">
              {/* Selected Summary */}
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-text-secondary">Selected Items</p>
                  <p className="text-lg font-semibold text-text-primary">{totals.count}</p>
                </div>
                <div className="w-px h-8 bg-border-subtle" />
                <div>
                  <p className="text-xs text-text-secondary">Material</p>
                  <p className="text-lg font-semibold text-text-primary">
                    ${totals.material.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary">Labor</p>
                  <p className="text-lg font-semibold text-text-primary">
                    {totals.labor.toFixed(1)} hrs
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAdd}
                  disabled={selectedItems.size === 0 || isAdding}
                  className={cn(
                    'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all duration-200',
                    selectedItems.size > 0
                      ? 'bg-gradient-to-r from-electric-blue to-electric-glow text-white shadow-lg shadow-electric-blue/25'
                      : 'bg-surface-elevated text-text-secondary cursor-not-allowed'
                  )}
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add {totals.count} Item{totals.count !== 1 ? 's' : ''}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default QuickAddModal;
