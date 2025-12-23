/**
 * Ohmni Estimate - EstimateSummary
 * Drop into: components/estimate/EstimateSummary.tsx
 *
 * Sticky summary bar with animated totals - the money shot
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import {
  DollarSign,
  Clock,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import type { EstimateTotals } from '@/types/estimate';

// =============================================================================
// ANIMATED COUNTER
// =============================================================================

function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  className,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const spring = useSpring(0, { stiffness: 75, damping: 15 });
  const display = useTransform(spring, (current) => {
    const formatted = current.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${prefix}${formatted}${suffix}`;
  });

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span className={className}>{display}</motion.span>;
}

// =============================================================================
// PROPS
// =============================================================================

interface EstimateSummaryProps {
  totals: EstimateTotals;
  itemCount: number;
  categoryCount: number;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function EstimateSummary({
  totals,
  itemCount,
  categoryCount,
}: EstimateSummaryProps) {
  const [previousBid, setPreviousBid] = useState(totals.finalBid);
  const [bidTrend, setBidTrend] = useState<'up' | 'down' | 'same'>('same');

  // Track bid changes for trend indicator
  useEffect(() => {
    if (totals.finalBid > previousBid) {
      setBidTrend('up');
    } else if (totals.finalBid < previousBid) {
      setBidTrend('down');
    } else {
      setBidTrend('same');
    }

    const timer = setTimeout(() => {
      setPreviousBid(totals.finalBid);
      setBidTrend('same');
    }, 2000);

    return () => clearTimeout(timer);
  }, [totals.finalBid, previousBid]);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'flex-shrink-0 border-t border-border-subtle',
        'bg-gradient-to-r from-abco-navy via-deep-navy to-abco-navy',
        'backdrop-blur-xl'
      )}
    >
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left - Stats */}
        <div className="flex items-center gap-6">
          {/* Item Count */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-surface-elevated/50">
              <Package className="w-4 h-4 text-text-secondary" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Items</p>
              <p className="text-sm font-medium text-text-primary tabular-nums">
                {itemCount}
              </p>
            </div>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-surface-elevated/50">
              <BarChart3 className="w-4 h-4 text-text-secondary" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Categories</p>
              <p className="text-sm font-medium text-text-primary tabular-nums">
                {categoryCount}
              </p>
            </div>
          </div>

          {/* Material Total */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Material</p>
              <AnimatedCounter
                value={totals.materialWithTax}
                prefix="$"
                className="text-sm font-medium text-emerald-400 tabular-nums"
              />
            </div>
          </div>

          {/* Labor Hours */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Labor</p>
              <div className="flex items-baseline gap-1">
                <AnimatedCounter
                  value={totals.laborHours}
                  decimals={1}
                  className="text-sm font-medium text-blue-400 tabular-nums"
                />
                <span className="text-xs text-text-secondary">hrs</span>
              </div>
            </div>
          </div>

          {/* Labor Cost */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <DollarSign className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-text-secondary">Labor Cost</p>
              <AnimatedCounter
                value={totals.laborCost}
                prefix="$"
                className="text-sm font-medium text-purple-400 tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-12 w-px bg-gradient-to-b from-transparent via-border-subtle to-transparent" />

        {/* Right - Final Bid */}
        <div className="flex items-center gap-6">
          {/* Subtotal */}
          <div className="text-right">
            <p className="text-xs text-text-secondary">Subtotal</p>
            <AnimatedCounter
              value={totals.subtotal}
              prefix="$"
              className="text-sm font-medium text-text-primary tabular-nums"
            />
          </div>

          {/* O&P */}
          {totals.overheadProfit > 0 && (
            <div className="text-right">
              <p className="text-xs text-text-secondary">O&P</p>
              <AnimatedCounter
                value={totals.overheadProfit}
                prefix="+$"
                className="text-sm font-medium text-amber-400 tabular-nums"
              />
            </div>
          )}

          {/* Final Bid - THE BIG NUMBER */}
          <motion.div
            className={cn(
              'relative px-6 py-3 rounded-xl',
              'bg-gradient-to-br from-electric-blue/20 to-electric-glow/10',
              'border border-electric-blue/30',
              'shadow-lg shadow-electric-blue/10'
            )}
          >
            {/* Trend Indicator */}
            <AnimatePresence>
              {bidTrend !== 'same' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -10 }}
                  className={cn(
                    'absolute -top-2 -right-2 p-1 rounded-full',
                    bidTrend === 'up' ? 'bg-emerald-500' : 'bg-red-500'
                  )}
                >
                  {bidTrend === 'up' ? (
                    <TrendingUp className="w-3 h-3 text-white" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-white" />
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-xs text-electric-blue font-medium mb-1">
              TOTAL BID
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl text-electric-blue">$</span>
              <AnimatedCounter
                value={totals.finalBid}
                className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-electric-glow tabular-nums"
              />
            </div>

            {/* Price per SF */}
            {totals.pricePerSqft && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-text-secondary mt-1"
              >
                <AnimatedCounter
                  value={totals.pricePerSqft}
                  prefix="$"
                  decimals={2}
                  suffix="/SF"
                  className="tabular-nums"
                />
              </motion.p>
            )}

            {/* Glow effect */}
            <div className="absolute inset-0 rounded-xl bg-electric-blue/5 blur-xl -z-10" />
          </motion.div>
        </div>
      </div>

      {/* Progress bar showing estimate completion */}
      <div className="h-1 bg-surface-elevated">
        <motion.div
          className="h-full bg-gradient-to-r from-electric-blue to-electric-glow"
          initial={{ width: 0 }}
          animate={{
            width: `${Math.min(100, (itemCount / 50) * 100)}%`,
          }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </motion.div>
  );
}

export default EstimateSummary;
