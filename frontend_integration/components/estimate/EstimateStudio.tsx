/**
 * Ohmni Estimate - EstimateStudio (Main Component)
 * Drop into: components/estimate/EstimateStudio.tsx
 *
 * The main estimate editing interface - where the magic happens
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  Camera,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Settings,
  Download,
  Send,
  Plus,
  Sparkles,
  TrendingUp,
  Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useEstimate } from '@/hooks/estimate/useEstimate';
import { useEstimateStore } from '@/store/estimateStore';

import { ProjectInfoPanel } from './ProjectInfoPanel';
import { LineItemsTable } from './LineItemsTable';
import { EstimateSummary } from './EstimateSummary';
import { EstimateChat } from './EstimateChat';
import { PhotoTakeoffModal } from './PhotoTakeoffModal';
import { QuickAddModal } from './QuickAddModal';

interface EstimateStudioProps {
  estimateId?: string;
  onBack?: () => void;
}

export function EstimateStudio({ estimateId, onBack }: EstimateStudioProps) {
  const {
    estimate,
    lineItems,
    totals,
    categoryGroups,
    isLoading,
    isSaving,
    createEstimate,
    updateEstimate,
    addItem,
    deleteItem,
    bulkAdd,
  } = useEstimate(estimateId);

  const {
    showProjectInfo,
    showAIChat,
    toggleProjectInfo,
    toggleAIChat,
  } = useEstimateStore();

  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  // Create new estimate if no ID provided
  useEffect(() => {
    if (!estimateId && !estimate) {
      createEstimate({
        project_name: 'New Estimate',
        labor_rate: 118,
        material_tax_rate: 0.1025,
        overhead_profit_rate: 0,
      });
    }
  }, [estimateId, estimate, createEstimate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-bg">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="w-16 h-16 border-4 border-electric-blue/30 rounded-full" />
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-electric-blue rounded-full animate-spin" />
          </div>
          <p className="text-text-secondary">Loading estimate...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-dark-bg overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border-subtle bg-abco-navy/50 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left - Back & Title */}
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-text-secondary" />
              </button>
            )}

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-electric-blue/10">
                <Calculator className="w-5 h-5 text-electric-blue" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-text-primary">
                  {estimate?.project_name || 'New Estimate'}
                </h1>
                {estimate?.project_type && (
                  <p className="text-xs text-text-secondary capitalize">
                    {estimate.project_type} • {estimate.square_footage?.toLocaleString() || '—'} SF
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Center - Quick Actions */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPhotoModal(true)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-gradient-to-r from-electric-blue/20 to-electric-glow/20',
                'border border-electric-blue/30',
                'text-electric-blue hover:text-electric-glow',
                'transition-all duration-200'
              )}
            >
              <Camera className="w-4 h-4" />
              <span className="text-sm font-medium">Photo Takeoff</span>
              <Sparkles className="w-3 h-3" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowQuickAdd(true)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-surface-elevated border border-border-subtle',
                'text-text-primary hover:border-electric-blue/50',
                'transition-all duration-200'
              )}
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Items</span>
            </motion.button>
          </div>

          {/* Right - View Toggles & Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleProjectInfo}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showProjectInfo
                  ? 'bg-electric-blue/20 text-electric-blue'
                  : 'text-text-secondary hover:bg-surface-elevated'
              )}
              title="Project Info"
            >
              <Building2 className="w-5 h-5" />
            </button>

            <button
              onClick={toggleAIChat}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showAIChat
                  ? 'bg-electric-blue/20 text-electric-blue'
                  : 'text-text-secondary hover:bg-surface-elevated'
              )}
              title="AI Assistant"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-border-subtle mx-2" />

            <button
              className="p-2 rounded-lg text-text-secondary hover:bg-surface-elevated transition-colors"
              title="Export"
            >
              <Download className="w-5 h-5" />
            </button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-gradient-to-r from-electric-blue to-electric-glow',
                'text-white font-medium shadow-lg shadow-electric-blue/25',
                'hover:shadow-electric-blue/40 transition-shadow'
              )}
            >
              <Send className="w-4 h-4" />
              <span className="text-sm">Generate Proposal</span>
            </motion.button>
          </div>
        </div>

        {/* Saving indicator */}
        <AnimatePresence>
          {isSaving && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 2 }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-electric-blue"
            >
              <motion.div
                className="h-full bg-electric-glow"
                animate={{ x: ['0%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ width: '30%' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Project Info */}
        <AnimatePresence mode="wait">
          {showProjectInfo && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-shrink-0 border-r border-border-subtle bg-abco-navy/30 overflow-hidden"
            >
              <ProjectInfoPanel
                estimate={estimate}
                onUpdate={updateEstimate}
                isSaving={isSaving}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Center - Line Items */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Line Items Table */}
          <div className="flex-1 overflow-auto">
            <LineItemsTable
              categoryGroups={categoryGroups}
              onDeleteItem={deleteItem}
              onUpdateItem={(id, data) => {
                // Handle inline updates
              }}
            />
          </div>

          {/* Bottom Summary Bar */}
          <EstimateSummary
            totals={totals}
            itemCount={lineItems.length}
            categoryCount={categoryGroups.filter((g) => g.items.length > 0).length}
          />
        </main>

        {/* Right Panel - AI Chat */}
        <AnimatePresence mode="wait">
          {showAIChat && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex-shrink-0 border-l border-border-subtle bg-abco-navy/30 overflow-hidden"
            >
              <EstimateChat
                estimateId={estimate?.id}
                onItemsAdded={(items) => {
                  bulkAdd({ items, source: 'chat' });
                }}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <PhotoTakeoffModal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onItemsExtracted={(items) => {
          bulkAdd({ items, source: 'photo' });
          setShowPhotoModal(false);
        }}
      />

      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAddItems={(items) => {
          bulkAdd({ items, source: 'manual' });
          setShowQuickAdd(false);
        }}
      />
    </div>
  );
}

export default EstimateStudio;
