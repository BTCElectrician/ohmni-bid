/**
 * Ohmni Estimate - PhotoTakeoffModal
 * Drop into: components/estimate/PhotoTakeoffModal.tsx
 *
 * AI-powered photo analysis for instant takeoffs - the killer feature
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Camera,
  Image as ImageIcon,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  Eye,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { useEstimateStore } from '@/store/estimateStore';
import type { AddLineItemRequest, ExtractedItem, PhotoTakeoffResult } from '@/types/estimate';

// =============================================================================
// PROPS
// =============================================================================

interface PhotoTakeoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemsExtracted: (items: AddLineItemRequest[]) => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PhotoTakeoffModal({
  isOpen,
  onClose,
  onItemsExtracted,
}: PhotoTakeoffModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<PhotoTakeoffResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setSelectedItems(new Set());
    onClose();
  }, [onClose]);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setAnalysisResult(null);
    setSelectedItems(new Set());
  }, []);

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Analyze the image
  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);

    try {
      // TODO: Replace with actual vision API call
      // const formData = new FormData();
      // formData.append('file', selectedFile);
      // const result = await visionService.analyzeForTakeoff(formData);

      // Mock result for demonstration
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const mockResult: PhotoTakeoffResult = {
        image_type: 'electrical_plan',
        confidence: 0.89,
        extracted_items: [
          {
            category: 'INTERIOR_LIGHTING',
            description: '2x4 LED Recessed Troffer',
            quantity: 24,
            confidence: 0.95,
            notes: 'Type A fixtures per legend',
          },
          {
            category: 'INTERIOR_LIGHTING',
            description: '2x2 LED Recessed',
            quantity: 8,
            confidence: 0.88,
            notes: 'Type B fixtures, corridors',
          },
          {
            category: 'INTERIOR_LIGHTING',
            description: 'Exit Sign w/ Battery',
            quantity: 6,
            confidence: 0.92,
          },
          {
            category: 'POWER_RECEPTACLES',
            description: 'Duplex Receptacle',
            quantity: 32,
            confidence: 0.85,
            notes: 'Standard 20A circuits',
          },
          {
            category: 'POWER_RECEPTACLES',
            description: 'GFI Receptacle',
            quantity: 4,
            confidence: 0.78,
            notes: 'Break room and restrooms',
          },
          {
            category: 'INTERIOR_LIGHTING',
            description: 'Single Pole Switch',
            quantity: 12,
            confidence: 0.82,
          },
          {
            category: 'INTERIOR_LIGHTING',
            description: 'Occupancy Sensor',
            quantity: 4,
            confidence: 0.75,
            notes: 'Ceiling mount, restrooms',
          },
        ],
        observations: [
          'Plan appears to show a commercial office space',
          'Lighting layout suggests 9ft ceiling height',
          'Open office area with perimeter private offices',
        ],
        clarifications_needed: [
          'Panel schedule not visible - panel size unknown',
          'Fixture schedule would confirm exact types',
        ],
        estimated_scope: {
          square_footage_estimate: 3500,
          project_type: 'office',
          complexity: 'medium',
        },
      };

      setAnalysisResult(mockResult);
      // Select all items by default
      setSelectedItems(new Set(mockResult.extracted_items.map((_, i) => i)));
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedFile]);

  // Toggle item selection
  const toggleItem = useCallback((index: number) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Confirm and add items
  const handleConfirm = useCallback(() => {
    if (!analysisResult) return;

    const items: AddLineItemRequest[] = analysisResult.extracted_items
      .filter((_, index) => selectedItems.has(index))
      .map((item) => ({
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        material_unit_cost: 0, // Will be filled from pricing DB
        labor_hours_per_unit: 0,
        unit_type: 'E',
        ai_confidence: item.confidence,
        ai_notes: item.notes,
      }));

    onItemsExtracted(items);
    handleClose();
  }, [analysisResult, selectedItems, onItemsExtracted, handleClose]);

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
          onClick={handleClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={cn(
            'relative w-full max-w-4xl max-h-[90vh]',
            'bg-deep-navy border border-border-subtle rounded-2xl',
            'shadow-2xl shadow-black/50 overflow-hidden'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-electric-blue/20 to-purple-500/20">
                <Sparkles className="w-5 h-5 text-electric-blue" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">
                  AI Photo Takeoff
                </h2>
                <p className="text-xs text-text-secondary">
                  Upload plans or photos for instant quantity extraction
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex flex-col md:flex-row h-[calc(90vh-140px)]">
            {/* Left - Upload/Preview */}
            <div className="flex-1 p-4 border-r border-border-subtle">
              {!selectedFile ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={cn(
                    'h-full flex flex-col items-center justify-center',
                    'border-2 border-dashed rounded-xl',
                    'transition-colors cursor-pointer',
                    dragOver
                      ? 'border-electric-blue bg-electric-blue/5'
                      : 'border-border-subtle hover:border-electric-blue/50'
                  )}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    className="hidden"
                  />

                  <div className="p-4 rounded-full bg-surface-elevated mb-4">
                    <Upload className="w-8 h-8 text-text-secondary" />
                  </div>

                  <p className="text-text-primary font-medium mb-2">
                    Drop your plans here
                  </p>
                  <p className="text-sm text-text-secondary mb-4">
                    or click to browse
                  </p>

                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-4 h-4" />
                      Images
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      PDFs
                    </span>
                    <span className="flex items-center gap-1">
                      <Camera className="w-4 h-4" />
                      Photos
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  {/* Preview */}
                  <div className="flex-1 relative rounded-xl overflow-hidden bg-black/30">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    )}

                    {/* Analyzing overlay */}
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                        <div className="relative">
                          <div className="w-16 h-16 border-4 border-electric-blue/30 rounded-full" />
                          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-electric-blue rounded-full animate-spin" />
                          <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-electric-blue" />
                        </div>
                        <p className="mt-4 text-text-primary font-medium">
                          Analyzing image...
                        </p>
                        <p className="text-sm text-text-secondary">
                          AI is extracting quantities
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                        setAnalysisResult(null);
                      }}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      Choose different file
                    </button>

                    {!analysisResult && !isAnalyzing && (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAnalyze}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg',
                          'bg-gradient-to-r from-electric-blue to-electric-glow',
                          'text-white font-medium',
                          'shadow-lg shadow-electric-blue/25'
                        )}
                      >
                        <Zap className="w-4 h-4" />
                        Analyze Image
                      </motion.button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right - Results */}
            <div className="flex-1 p-4 overflow-auto">
              {!analysisResult ? (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="p-3 rounded-full bg-surface-elevated mb-4">
                    <Eye className="w-6 h-6 text-text-secondary" />
                  </div>
                  <p className="text-text-secondary">
                    Upload and analyze an image to see extracted items
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-medium">
                        {analysisResult.extracted_items.length} items detected
                      </span>
                      <span className="text-xs opacity-75">
                        ({Math.round(analysisResult.confidence * 100)}% confidence)
                      </span>
                    </div>
                    {analysisResult.estimated_scope && (
                      <p className="text-xs text-emerald-400/75">
                        Estimated {analysisResult.estimated_scope.square_footage_estimate?.toLocaleString()} SF{' '}
                        {analysisResult.estimated_scope.project_type} space
                      </p>
                    )}
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    {analysisResult.extracted_items.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => toggleItem(index)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg cursor-pointer',
                          'border transition-all',
                          selectedItems.has(index)
                            ? 'bg-electric-blue/10 border-electric-blue/30'
                            : 'bg-surface-elevated/50 border-border-subtle hover:border-electric-blue/20'
                        )}
                      >
                        <div
                          className={cn(
                            'w-5 h-5 rounded flex items-center justify-center',
                            'border-2 transition-colors',
                            selectedItems.has(index)
                              ? 'bg-electric-blue border-electric-blue'
                              : 'border-border-subtle'
                          )}
                        >
                          {selectedItems.has(index) && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary truncate">
                            {item.description}
                          </p>
                          {item.notes && (
                            <p className="text-xs text-text-secondary truncate">
                              {item.notes}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-medium text-text-primary tabular-nums">
                            ×{item.quantity}
                          </p>
                          <p
                            className={cn(
                              'text-xs tabular-nums',
                              item.confidence >= 0.9
                                ? 'text-emerald-400'
                                : item.confidence >= 0.75
                                ? 'text-amber-400'
                                : 'text-red-400'
                            )}
                          >
                            {Math.round(item.confidence * 100)}%
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Clarifications */}
                  {analysisResult.clarifications_needed.length > 0 && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-2 text-amber-400 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Needs verification</span>
                      </div>
                      <ul className="space-y-1">
                        {analysisResult.clarifications_needed.map((note, i) => (
                          <li key={i} className="text-xs text-amber-400/75">
                            • {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          {analysisResult && (
            <div className="flex items-center justify-between p-4 border-t border-border-subtle">
              <p className="text-sm text-text-secondary">
                {selectedItems.size} of {analysisResult.extracted_items.length} items selected
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConfirm}
                  disabled={selectedItems.size === 0}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg',
                    'bg-gradient-to-r from-electric-blue to-electric-glow',
                    'text-white font-medium',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <Check className="w-4 h-4" />
                  Add {selectedItems.size} Items
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default PhotoTakeoffModal;
