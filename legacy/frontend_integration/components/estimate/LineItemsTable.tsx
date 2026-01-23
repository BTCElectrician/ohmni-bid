/**
 * Ohmni Estimate - LineItemsTable
 * Drop into: components/estimate/LineItemsTable.tsx
 *
 * Collapsible category groups with editable line items
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit3,
  GripVertical,
  Plus,
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
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useEstimateStore } from '@/store/estimateStore';
import type { CategoryGroup, EstimateLineItem, EstimateCategory } from '@/types/estimate';

// =============================================================================
// ICON MAP
// =============================================================================

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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
};

// =============================================================================
// PROPS
// =============================================================================

interface LineItemsTableProps {
  categoryGroups: CategoryGroup[];
  onDeleteItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, data: Partial<EstimateLineItem>) => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function LineItemsTable({
  categoryGroups,
  onDeleteItem,
  onUpdateItem,
}: LineItemsTableProps) {
  const { toggleCategory, expandAllCategories, collapseAllCategories } = useEstimateStore();

  const nonEmptyGroups = categoryGroups.filter((g) => g.items.length > 0);
  const emptyGroups = categoryGroups.filter((g) => g.items.length === 0);

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-text-primary">Line Items</h2>
          <span className="px-2 py-0.5 rounded-full bg-surface-elevated text-xs text-text-secondary">
            {categoryGroups.reduce((sum, g) => sum + g.items.length, 0)} items
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={expandAllCategories}
            className="text-xs text-text-secondary hover:text-electric-blue transition-colors"
          >
            Expand All
          </button>
          <span className="text-text-secondary/30">|</span>
          <button
            onClick={collapseAllCategories}
            className="text-xs text-text-secondary hover:text-electric-blue transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Categories with items */}
      <div className="space-y-2">
        {nonEmptyGroups.map((group) => (
          <CategorySection
            key={group.category}
            group={group}
            onToggle={() => toggleCategory(group.category)}
            onDeleteItem={onDeleteItem}
            onUpdateItem={onUpdateItem}
          />
        ))}
      </div>

      {/* Empty categories (collapsed) */}
      {emptyGroups.length > 0 && (
        <div className="pt-4 border-t border-border-subtle/50">
          <p className="text-xs text-text-secondary mb-2">Empty Categories</p>
          <div className="flex flex-wrap gap-2">
            {emptyGroups.map((group) => {
              const IconComponent = CATEGORY_ICON_MAP[group.icon] || ClipboardList;
              return (
                <button
                  key={group.category}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                    'bg-surface-elevated/50 border border-border-subtle/50',
                    'text-text-secondary text-xs',
                    'hover:border-electric-blue/30 hover:text-text-primary',
                    'transition-all duration-200'
                  )}
                >
                  <IconComponent className="w-3 h-3" />
                  {group.label}
                  <Plus className="w-3 h-3 ml-1 opacity-50" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {nonEmptyGroups.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="p-4 rounded-full bg-electric-blue/10 mb-4">
            <Sparkles className="w-8 h-8 text-electric-blue" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            Ready to build your estimate
          </h3>
          <p className="text-text-secondary max-w-md">
            Add items using the buttons above, chat with AI, or upload plans for automatic takeoff.
          </p>
        </motion.div>
      )}
    </div>
  );
}

// =============================================================================
// CATEGORY SECTION
// =============================================================================

interface CategorySectionProps {
  group: CategoryGroup;
  onToggle: () => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, data: Partial<EstimateLineItem>) => void;
}

function CategorySection({
  group,
  onToggle,
  onDeleteItem,
  onUpdateItem,
}: CategorySectionProps) {
  const IconComponent = CATEGORY_ICON_MAP[group.icon] || ClipboardList;

  return (
    <motion.div
      layout
      className={cn(
        'rounded-xl border overflow-hidden',
        'bg-surface-elevated/30 border-border-subtle',
        group.expanded && 'border-electric-blue/20'
      )}
    >
      {/* Category Header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-4',
          'hover:bg-surface-elevated/50 transition-colors',
          'group'
        )}
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: group.expanded ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          </motion.div>

          <div
            className={cn(
              'p-2 rounded-lg transition-colors',
              group.expanded
                ? 'bg-electric-blue/20 text-electric-blue'
                : 'bg-surface-elevated text-text-secondary group-hover:text-text-primary'
            )}
          >
            <IconComponent className="w-4 h-4" />
          </div>

          <div className="text-left">
            <h3 className="font-medium text-text-primary">{group.label}</h3>
            <p className="text-xs text-text-secondary">
              {group.items.length} item{group.items.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <motion.span
            key={group.total}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-lg font-semibold text-text-primary tabular-nums"
          >
            ${group.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </motion.span>
        </div>
      </button>

      {/* Line Items */}
      <AnimatePresence>
        {group.expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="border-t border-border-subtle/50">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-navy/30 text-xs font-medium text-text-secondary uppercase tracking-wide">
                <div className="col-span-5">Description</div>
                <div className="col-span-1 text-right">Qty</div>
                <div className="col-span-2 text-right">Material</div>
                <div className="col-span-2 text-right">Labor</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              {/* Items */}
              <div className="divide-y divide-border-subtle/30">
                {group.items.map((item, index) => (
                  <LineItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    onDelete={() => onDeleteItem(item.id)}
                    onUpdate={(data) => onUpdateItem(item.id, data)}
                  />
                ))}
              </div>

              {/* Add Item Button */}
              <button
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-3',
                  'text-sm text-text-secondary hover:text-electric-blue',
                  'border-t border-dashed border-border-subtle/50',
                  'hover:bg-electric-blue/5 transition-colors'
                )}
              >
                <Plus className="w-4 h-4" />
                Add item to {group.label}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// LINE ITEM ROW
// =============================================================================

interface LineItemRowProps {
  item: EstimateLineItem;
  index: number;
  onDelete: () => void;
  onUpdate: (data: Partial<EstimateLineItem>) => void;
}

function LineItemRow({ item, index, onDelete, onUpdate }: LineItemRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'grid grid-cols-12 gap-2 px-4 py-3 items-center',
        'hover:bg-surface-elevated/30 transition-colors',
        'group'
      )}
    >
      {/* Description */}
      <div className="col-span-5 flex items-center gap-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          className="cursor-grab"
        >
          <GripVertical className="w-4 h-4 text-text-secondary/50" />
        </motion.div>

        <span className="text-sm text-text-primary truncate">{item.description}</span>

        {item.source === 'photo' && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
            <Sparkles className="w-3 h-3" />
            AI
          </span>
        )}
        {item.source === 'chat' && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-electric-blue/20 text-electric-blue">
            <Sparkles className="w-3 h-3" />
            AI
          </span>
        )}
      </div>

      {/* Quantity */}
      <div className="col-span-1 text-right">
        <span className="text-sm text-text-primary tabular-nums">
          {item.quantity}
        </span>
        <span className="text-xs text-text-secondary ml-0.5">
          {item.unit_type === 'C' ? '/C' : item.unit_type === 'M' ? '/M' : ''}
        </span>
      </div>

      {/* Material */}
      <div className="col-span-2 text-right">
        <span className="text-sm text-text-secondary tabular-nums">
          ${item.material_extension.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Labor */}
      <div className="col-span-2 text-right">
        <span className="text-sm text-text-secondary tabular-nums">
          {item.labor_extension.toFixed(1)} hrs
        </span>
      </div>

      {/* Total */}
      <div className="col-span-2 flex items-center justify-end gap-2">
        <span className="text-sm font-medium text-text-primary tabular-nums">
          ${item.total_cost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, width: 0 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            width: isHovered ? 'auto' : 0,
          }}
          className="flex items-center gap-1 overflow-hidden"
        >
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 rounded hover:bg-surface-elevated text-text-secondary hover:text-electric-blue transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default LineItemsTable;
