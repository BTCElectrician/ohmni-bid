'use client';

import { useMemo, useState } from 'react';

import type { EstimateCategory, EstimateParameters, LineItem, ProjectInfo, UnitType } from '@/lib/estimate/types';
import { parseLineItemPaste } from '@/lib/estimate/parseLineItems';
import { formatCurrency, generateId } from '@/lib/estimate/utils';

export interface DraftLineItem {
  id: string;
  category: EstimateCategory;
  description: string;
  quantity: number;
  unitType: UnitType;
  materialUnitCost?: number;
  laborHoursPerUnit?: number;
  assumptions: string[];
  confidence?: number;
  suggestedItem?: {
    id: string;
    name: string;
    category?: string;
    unit_type?: string;
    material_cost?: number;
    labor_hours?: number;
  } | null;
}

interface EstimateAssistantProps {
  project: ProjectInfo;
  parameters: EstimateParameters;
  lineItems: LineItem[];
  onApplyDrafts: (drafts: DraftLineItem[]) => void;
}

export function EstimateAssistant({
  project,
  parameters,
  lineItems,
  onApplyDrafts
}: EstimateAssistantProps) {
  const [notes, setNotes] = useState('');
  const [drafts, setDrafts] = useState<DraftLineItem[]>([]);
  const [questions, setQuestions] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [noteStatus, setNoteStatus] = useState<'idle' | 'loading'>('idle');
  const [noteError, setNoteError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const lineItemContext = useMemo(
    () =>
      lineItems.map(item => ({
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unitType: item.unitType
      })),
    [lineItems]
  );

  const handleGenerateDrafts = async () => {
    if (!notes.trim()) {
      setError('Add a short walkthrough note or transcript first.');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const response = await fetch('/api/draft-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes.trim(),
          context: {
            project,
            parameters,
            lineItems: lineItemContext
          }
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Draft generation failed');
      }

      const incoming = (payload?.items || []).map((item: DraftLineItem) => ({
        id: generateId(),
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unitType: item.unitType,
        assumptions: item.assumptions || [],
        confidence: item.confidence,
        suggestedItem: item.suggestedItem || null
      }));

      setDrafts(incoming);
      setQuestions(payload?.questions || []);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Draft generation failed');
    }
  };

  const handleLoadLatestNote = async () => {
    setNoteStatus('loading');
    setNoteError(null);

    try {
      const response = await fetch('/api/walkthrough/latest-note');
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Latest note lookup failed');
      }
      setNotes(payload.transcript || '');
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'Latest note lookup failed');
    } finally {
      setNoteStatus('idle');
    }
  };

  const handlePasteDrafts = () => {
    if (!pasteText.trim()) {
      setPasteError('Paste line items first.');
      return;
    }

    const { items, errors } = parseLineItemPaste(pasteText);
    if (errors.length) {
      setPasteError(errors.join(' '));
    } else {
      setPasteError(null);
    }

    if (!items.length) {
      return;
    }

    const incoming = items.map(item => ({
      id: generateId(),
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unitType: item.unitType,
      materialUnitCost: item.materialUnitCost,
      laborHoursPerUnit: item.laborHoursPerUnit,
      assumptions: []
    }));

    setDrafts(current => [...current, ...incoming]);
    setPasteText('');
  };

  const updateDraft = (id: string, patch: Partial<DraftLineItem>) => {
    setDrafts(items =>
      items.map(item => (item.id === id ? { ...item, ...patch } : item))
    );
  };

  const handleApply = () => {
    if (drafts.length === 0) return;
    onApplyDrafts(drafts);
    setDrafts([]);
    setQuestions([]);
  };

  return (
    <section className="glass-panel rounded-3xl p-6 animate-rise-delayed">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Assistant draft takeoff</h2>
          <p className="text-sm text-slate-300">
            Drop in a walkthrough note and review draft line items before applying.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleLoadLatestNote}
            className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100"
            disabled={noteStatus === 'loading'}
          >
            {noteStatus === 'loading' ? 'Loading...' : 'Use latest walkthrough note'}
          </button>
          <button
            onClick={handleGenerateDrafts}
            className="inline-flex items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_12px_20px_rgba(47,180,255,0.25)]"
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Generating...' : 'Generate drafts'}
          </button>
        </div>
      </div>

      <textarea
        value={notes}
        onChange={event => setNotes(event.target.value)}
        placeholder="Example: Two new 20A circuits to kitchen, 6 duplexes, 1 GFCI, homeruns to panel A."
        rows={4}
        className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
      />

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Paste line items
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Format: Category | Description | Qty | Unit | Mat Unit | Labor Hrs
        </p>
        <textarea
          value={pasteText}
          onChange={event => setPasteText(event.target.value)}
          placeholder="GENERAL_CONDITIONS | Engineered Permit Drawings | 1 | Lot | 3000 | 40"
          rows={4}
          className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={handlePasteDrafts}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100"
          >
            Create drafts from paste
          </button>
          {pasteError ? <span className="text-xs text-rose-300">{pasteError}</span> : null}
        </div>
      </div>

      {questions.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Assistant questions
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
            {questions.map(question => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {drafts.length > 0 ? (
        <div className="mt-6 space-y-4">
          {drafts.map(draft => (
            <div
              key={draft.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Description
                  </label>
                  <input
                    value={draft.description}
                    onChange={event =>
                      updateDraft(draft.id, { description: event.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={draft.quantity}
                    onChange={event =>
                      updateDraft(draft.id, {
                        quantity: Number(event.target.value || 0)
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Unit
                  </label>
                  <input
                    value={draft.unitType}
                    onChange={event =>
                      updateDraft(draft.id, {
                        unitType: event.target.value as UnitType
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>

              {typeof draft.materialUnitCost === 'number' ||
              typeof draft.laborHoursPerUnit === 'number' ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Material Unit
                    </label>
                    <input
                      type="number"
                      value={draft.materialUnitCost ?? 0}
                      onChange={event =>
                        updateDraft(draft.id, {
                          materialUnitCost: Number(event.target.value || 0)
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Labor Hrs
                    </label>
                    <input
                      type="number"
                      value={draft.laborHoursPerUnit ?? 0}
                      onChange={event =>
                        updateDraft(draft.id, {
                          laborHoursPerUnit: Number(event.target.value || 0)
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  Category: {draft.category}
                </span>
                {typeof draft.confidence === 'number' ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    Confidence: {(draft.confidence * 100).toFixed(0)}%
                  </span>
                ) : null}
              </div>

              {draft.suggestedItem ? (
                <div className="mt-3 text-xs text-slate-300">
                  Suggested catalog item:{' '}
                  <span className="text-slate-100">{draft.suggestedItem.name}</span>
                  {typeof draft.suggestedItem.material_cost === 'number' ? (
                    <span className="ml-2 text-slate-400">
                      Material {formatCurrency(draft.suggestedItem.material_cost)}
                    </span>
                  ) : null}
                  {typeof draft.suggestedItem.labor_hours === 'number' ? (
                    <span className="ml-2 text-slate-400">
                      Labor {draft.suggestedItem.labor_hours.toFixed(2)} hrs
                    </span>
                  ) : null}
                </div>
              ) : null}

              {draft.assumptions?.length ? (
                <div className="mt-3 text-xs text-slate-400">
                  Assumptions: {draft.assumptions.join(' | ')}
                </div>
              ) : null}
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleApply}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100"
            >
              Apply drafts to estimate
            </button>
            <button
              onClick={() => {
                setDrafts([]);
                setQuestions([]);
              }}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300"
            >
              Clear drafts
            </button>
          </div>
        </div>
      ) : null}

      {noteError ? <p className="mt-3 text-xs text-rose-300">{noteError}</p> : null}
      {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}
    </section>
  );
}
