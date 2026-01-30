'use client';

import Link from 'next/link';
import { Download, LogOut, Plus, Save } from 'lucide-react';

interface EstimateHeaderProps {
  projectName: string;
  onProjectNameChange: (value: string) => void;
  userEmail?: string | null;
  onAddRow: () => void;
  onSave: () => void;
  onExport: () => void;
  onSignOut: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  saveError?: string | null;
  loadError?: string | null;
  estimateLoading?: boolean;
}

export function EstimateHeader({
  projectName,
  onProjectNameChange,
  userEmail,
  onAddRow,
  onSave,
  onExport,
  onSignOut,
  saveStatus,
  saveError,
  loadError,
  estimateLoading
}: EstimateHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex-1">
        <label className="text-xs font-medium text-slate-300">Project Name</label>
        <input
          value={projectName}
          onChange={event => onProjectNameChange(event.target.value)}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <div className="mt-2 text-xs text-slate-400">
          Signed in as {userEmail || 'user'}
        </div>
      </div>
      <div className="flex flex-col items-start gap-2 md:items-end">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onAddRow}
            className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-900"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
          <Link
            href="/walkthrough"
            className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100"
          >
            Walkthrough
          </Link>
          <button
            onClick={onSave}
            className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100"
            disabled={saveStatus === 'saving'}
          >
            <Save className="h-4 w-4" />
            {saveStatus === 'saving' ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onExport}
            className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
          <button
            onClick={onSignOut}
            className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
        {saveStatus === 'saved' ? (
          <span className="text-xs text-emerald-300">Saved.</span>
        ) : null}
        {saveStatus === 'error' && saveError ? (
          <span className="text-xs text-rose-300">{saveError}</span>
        ) : null}
        {loadError ? <span className="text-xs text-rose-300">{loadError}</span> : null}
        {estimateLoading ? (
          <span className="text-xs text-slate-400">Loading estimate...</span>
        ) : null}
      </div>
    </div>
  );
}
