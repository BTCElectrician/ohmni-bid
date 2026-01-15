import type { Estimate } from '@/lib/estimate/types';
import { formatCurrency } from '@/lib/estimate/utils';

interface EstimateSummaryProps {
  totals: Pick<Estimate, 'totalMaterial' | 'totalLaborHours' | 'totalLaborCost' | 'subtotal' | 'overheadProfit' | 'finalBid'>;
}

export function EstimateSummary({ totals }: EstimateSummaryProps) {
  return (
    <div className="glass-panel grid gap-3 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">Material</span>
        <span className="font-semibold text-slate-100 font-mono">
          {formatCurrency(totals.totalMaterial)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">Labor Hours</span>
        <span className="font-semibold text-slate-100 font-mono">
          {totals.totalLaborHours.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">Labor Cost</span>
        <span className="font-semibold text-slate-100 font-mono">
          {formatCurrency(totals.totalLaborCost)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">Subtotal</span>
        <span className="font-semibold text-slate-100 font-mono">
          {formatCurrency(totals.subtotal)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300">Overhead & Profit</span>
        <span className="font-semibold text-slate-100 font-mono">
          {formatCurrency(totals.overheadProfit)}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-dashed border-white/10 pt-3">
        <span className="text-sm text-slate-300">Final Bid</span>
        <span className="text-lg font-semibold text-slate-100 font-mono">
          {formatCurrency(totals.finalBid)}
        </span>
      </div>
    </div>
  );
}
