/**
 * Ohmni Estimate - ProjectInfoPanel
 * Drop into: components/estimate/ProjectInfoPanel.tsx
 *
 * Left sidebar with project details and pricing parameters
 */

'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  Users,
  Phone,
  Mail,
  Settings,
  DollarSign,
  Percent,
  ChevronDown,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { Estimate, UpdateEstimateRequest, ProjectType } from '@/types/estimate';

// =============================================================================
// PROPS
// =============================================================================

interface ProjectInfoPanelProps {
  estimate: Estimate | null;
  onUpdate: (data: UpdateEstimateRequest) => Promise<Estimate>;
  isSaving: boolean;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ProjectInfoPanel({
  estimate,
  onUpdate,
  isSaving,
}: ProjectInfoPanelProps) {
  const [showPricingSettings, setShowPricingSettings] = useState(false);

  const handleFieldChange = useCallback(
    async (field: keyof UpdateEstimateRequest, value: string | number) => {
      if (!estimate) return;
      await onUpdate({ [field]: value });
    },
    [estimate, onUpdate]
  );

  if (!estimate) return null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border-subtle/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-electric-blue/10">
            <Building2 className="w-5 h-5 text-electric-blue" />
          </div>
          <div>
            <h2 className="font-semibold text-text-primary">Project Info</h2>
            <p className="text-xs text-text-secondary">Details & settings</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Project Details */}
        <section className="space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Project Name
            </label>
            <input
              type="text"
              value={estimate.project_name}
              onChange={(e) => handleFieldChange('project_name', e.target.value)}
              className={cn(
                'w-full px-3 py-2 rounded-lg',
                'bg-surface-elevated border border-border-subtle',
                'text-text-primary placeholder-text-secondary/50',
                'focus:outline-none focus:border-electric-blue/50 focus:ring-1 focus:ring-electric-blue/20',
                'transition-colors'
              )}
            />
          </div>

          {/* Project Type */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Project Type
            </label>
            <div className="relative">
              <select
                value={estimate.project_type || ''}
                onChange={(e) =>
                  handleFieldChange('project_type', e.target.value as ProjectType)
                }
                className={cn(
                  'w-full px-3 py-2 rounded-lg appearance-none',
                  'bg-surface-elevated border border-border-subtle',
                  'text-text-primary',
                  'focus:outline-none focus:border-electric-blue/50',
                  'transition-colors'
                )}
              >
                <option value="">Select type...</option>
                <option value="warehouse">Warehouse</option>
                <option value="office">Office</option>
                <option value="retail">Retail</option>
                <option value="industrial">Industrial</option>
                <option value="restaurant">Restaurant</option>
                <option value="medical">Medical</option>
                <option value="education">Education</option>
                <option value="mixed_use">Mixed Use</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
            </div>
          </div>

          {/* Square Footage */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Square Footage
            </label>
            <div className="relative">
              <input
                type="number"
                value={estimate.square_footage || ''}
                onChange={(e) =>
                  handleFieldChange('square_footage', parseInt(e.target.value) || 0)
                }
                placeholder="50,000"
                className={cn(
                  'w-full px-3 py-2 pr-10 rounded-lg',
                  'bg-surface-elevated border border-border-subtle',
                  'text-text-primary placeholder-text-secondary/50',
                  'focus:outline-none focus:border-electric-blue/50',
                  'transition-colors'
                )}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary">
                SF
              </span>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              <MapPin className="w-3 h-3 inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={estimate.project_location || ''}
              onChange={(e) => handleFieldChange('project_location', e.target.value)}
              placeholder="123 Main St, Chicago, IL"
              className={cn(
                'w-full px-3 py-2 rounded-lg',
                'bg-surface-elevated border border-border-subtle',
                'text-text-primary placeholder-text-secondary/50',
                'focus:outline-none focus:border-electric-blue/50',
                'transition-colors'
              )}
            />
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-subtle/50" />

        {/* Client Info */}
        <section className="space-y-4">
          <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
            <Users className="w-4 h-4 text-text-secondary" />
            Client Info
          </h3>

          {/* GC Name */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              General Contractor
            </label>
            <input
              type="text"
              value={estimate.gc_name || ''}
              onChange={(e) => handleFieldChange('gc_name', e.target.value)}
              placeholder="ABC Construction"
              className={cn(
                'w-full px-3 py-2 rounded-lg',
                'bg-surface-elevated border border-border-subtle',
                'text-text-primary placeholder-text-secondary/50',
                'focus:outline-none focus:border-electric-blue/50',
                'transition-colors'
              )}
            />
          </div>

          {/* Contact Name */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Contact Name
            </label>
            <input
              type="text"
              value={estimate.contact_name || ''}
              onChange={(e) => handleFieldChange('contact_name', e.target.value)}
              placeholder="John Smith"
              className={cn(
                'w-full px-3 py-2 rounded-lg',
                'bg-surface-elevated border border-border-subtle',
                'text-text-primary placeholder-text-secondary/50',
                'focus:outline-none focus:border-electric-blue/50',
                'transition-colors'
              )}
            />
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-border-subtle/50" />

        {/* Pricing Settings */}
        <section className="space-y-4">
          <button
            onClick={() => setShowPricingSettings(!showPricingSettings)}
            className="w-full flex items-center justify-between text-sm font-medium text-text-primary"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-text-secondary" />
              Pricing Settings
            </span>
            <motion.div
              animate={{ rotate: showPricingSettings ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-4 h-4 text-text-secondary" />
            </motion.div>
          </button>

          {showPricingSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Labor Rate */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  <DollarSign className="w-3 h-3 inline mr-1" />
                  Labor Rate ($/hr)
                </label>
                <input
                  type="number"
                  value={estimate.labor_rate}
                  onChange={(e) =>
                    handleFieldChange('labor_rate', parseFloat(e.target.value) || 118)
                  }
                  className={cn(
                    'w-full px-3 py-2 rounded-lg',
                    'bg-surface-elevated border border-border-subtle',
                    'text-text-primary',
                    'focus:outline-none focus:border-electric-blue/50',
                    'transition-colors'
                  )}
                />
              </div>

              {/* Material Tax */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  <Percent className="w-3 h-3 inline mr-1" />
                  Material Tax Rate
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={(estimate.material_tax_rate * 100).toFixed(2)}
                  onChange={(e) =>
                    handleFieldChange(
                      'material_tax_rate',
                      (parseFloat(e.target.value) || 10.25) / 100
                    )
                  }
                  className={cn(
                    'w-full px-3 py-2 rounded-lg',
                    'bg-surface-elevated border border-border-subtle',
                    'text-text-primary',
                    'focus:outline-none focus:border-electric-blue/50',
                    'transition-colors'
                  )}
                />
              </div>

              {/* Overhead & Profit */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  <Percent className="w-3 h-3 inline mr-1" />
                  Overhead & Profit
                </label>
                <input
                  type="number"
                  step="1"
                  value={(estimate.overhead_profit_rate * 100).toFixed(0)}
                  onChange={(e) =>
                    handleFieldChange(
                      'overhead_profit_rate',
                      (parseFloat(e.target.value) || 0) / 100
                    )
                  }
                  className={cn(
                    'w-full px-3 py-2 rounded-lg',
                    'bg-surface-elevated border border-border-subtle',
                    'text-text-primary',
                    'focus:outline-none focus:border-electric-blue/50',
                    'transition-colors'
                  )}
                />
              </div>
            </motion.div>
          )}
        </section>
      </div>

      {/* Footer - Save indicator */}
      <div className="flex-shrink-0 p-4 border-t border-border-subtle/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-secondary">
            {isSaving ? (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-electric-blue rounded-full animate-pulse" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                All changes saved
              </span>
            )}
          </span>
          <span className="text-text-secondary/50">
            Last updated {new Date(estimate.updated_at).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default ProjectInfoPanel;
