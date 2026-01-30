'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { LogOut, Search } from 'lucide-react';

import { AuthCard } from '@/components/AuthCard';
import { queueCatalogItem } from '@/lib/estimate/catalogQueue';
import { CATEGORY_ORDER } from '@/lib/estimate/defaults';
import type { EstimateCategory, UnitType } from '@/lib/estimate/types';
import { formatCurrency, formatHours } from '@/lib/estimate/utils';
import { useWorkspaceAuth } from '@/lib/hooks/useWorkspace';

type SearchMode = 'semantic' | 'text' | 'recent';

interface CatalogItem {
  id: string;
  category: string;
  subcategory?: string | null;
  name: string;
  description?: string | null;
  size?: string | null;
  unit_type?: string | null;
  material_cost?: number | string | null;
  labor_hours?: number | string | null;
  market_price?: number | string | null;
  similarity?: number | string | null;
}

const formatCategoryLabel = (value: string) =>
  value
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeUnitType = (value?: string | null): UnitType => {
  if (!value) return 'E';
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'e':
    case 'ea':
    case 'each':
      return 'E';
    case 'c':
    case 'per 100':
    case 'hundred':
      return 'C';
    case 'm':
    case 'per 1000':
    case 'thousand':
      return 'M';
    case 'lot':
      return 'Lot';
    default:
      return 'E';
  }
};

const formatUnitLabel = (value?: string | null) => {
  if (!value) return 'Unit --';
  switch (value) {
    case 'E':
      return 'Unit each';
    case 'C':
      return 'Unit per 100';
    case 'M':
      return 'Unit per 1000';
    case 'Lot':
      return 'Unit lot';
    default:
      return `Unit ${value}`;
  }
};

export default function CatalogPage() {
  const {
    user,
    loading,
    error: authError,
    signInWithEmail,
    signOut
  } = useWorkspaceAuth();
  const [authEmail, setAuthEmail] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [mode, setMode] = useState<SearchMode>('recent');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(async (queryValue: string, categoryValue: string) => {
    setStatus('loading');
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/catalog-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryValue,
          category: categoryValue
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Catalog search failed');
      }

      setItems(payload?.items || []);
      setMode((payload?.mode as SearchMode) || (queryValue ? 'text' : 'recent'));
      setNotice(payload?.notice || null);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Catalog search failed');
    }
  }, []);

  const handleAddToEstimate = useCallback((item: CatalogItem) => {
    const queuedCount = queueCatalogItem({
      id: item.id,
      pricingItemId: item.id,
      category: item.category as EstimateCategory,
      name: item.name,
      unitType: normalizeUnitType(item.unit_type),
      materialUnitCost: Number(item.material_cost || 0),
      laborHoursPerUnit: Number(item.labor_hours || 0),
      quantity: 1
    });
    setNotice(`Added to estimate. ${queuedCount} queued.`);
  }, []);

  useEffect(() => {
    void runSearch('', 'all');
  }, [runSearch]);

  const handleEmailSignIn = async () => {
    if (!authEmail) return;
    const ok = await signInWithEmail(authEmail);
    if (ok) {
      setAuthMessage('Check your email for the sign-in link.');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-md px-6 py-16">
          <div className="glass-panel rounded-3xl p-10">
            <h1 className="text-xl font-semibold text-slate-100">Loading workspace</h1>
            <p className="mt-2 text-sm text-slate-300">
              Preparing the catalog.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-md px-6 py-16">
          <AuthCard
            email={authEmail}
            onEmailChange={setAuthEmail}
            onSubmit={handleEmailSignIn}
            message={authMessage}
            error={authError}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-28 top-24 h-80 w-80 rounded-full bg-[var(--accent)]/25 blur-[140px] animate-float" />
      <div className="pointer-events-none absolute right-[-140px] top-[-80px] h-[420px] w-[420px] rounded-full bg-[var(--accent-2)]/25 blur-[160px] animate-float" />
      <div className="pointer-events-none absolute bottom-[-160px] left-1/4 h-[420px] w-[420px] rounded-full bg-[var(--accent-3)]/25 blur-[180px] animate-float" />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 animate-rise">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="badge">Pricing Catalog</span>
                <h1 className="mt-4 text-2xl font-semibold text-slate-100">
                  Find reusable line items fast.
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Semantic search + pricing metadata, always tied back to source.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/estimate"
                  className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100"
                >
                  Back to Estimate
                </Link>
                <button
                  onClick={signOut}
                  className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>

            <form
              className="mt-6 grid gap-3 md:grid-cols-[2fr_1fr_auto]"
              onSubmit={event => {
                event.preventDefault();
                void runSearch(query, category);
              }}
            >
              <div>
                <label className="text-xs font-medium text-slate-300">Search</label>
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Cable tray, GFCI, conduit, panels..."
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-300">Category</label>
                <select
                  value={category}
                  onChange={event => {
                    const nextCategory = event.target.value;
                    setCategory(nextCategory);
                    void runSearch(query, nextCategory);
                  }}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="all">All categories</option>
                  {CATEGORY_ORDER.map(value => (
                    <option key={value} value={value}>
                      {formatCategoryLabel(value)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="btn-primary mt-6 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-slate-900"
                disabled={status === 'loading'}
              >
                <Search className="h-4 w-4" />
                {status === 'loading' ? 'Searching...' : 'Search'}
              </button>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>
                {items.length} items • Mode:{' '}
                {mode === 'semantic'
                  ? 'Semantic'
                  : mode === 'text'
                    ? 'Name match'
                    : 'Recent'}
              </span>
              {notice ? <span className="text-amber-200">{notice}</span> : null}
              {error ? <span className="text-rose-300">{error}</span> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {items.map(item => {
              const materialCost = Number(item.material_cost || 0);
              const laborHours = Number(item.labor_hours || 0);
              const marketPrice =
                item.market_price !== null && item.market_price !== undefined
                  ? Number(item.market_price || 0)
                  : null;
              return (
                <article
                  key={item.id}
                  className="glass-panel rounded-2xl p-5 animate-rise-delayed"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="pill">
                      {formatCategoryLabel(item.category)}
                    </span>
                    {item.subcategory ? (
                      <span className="pill">
                        {item.subcategory}
                      </span>
                    ) : null}
                    {item.size ? (
                      <span className="pill">
                        Size {item.size}
                      </span>
                    ) : null}
                    {item.unit_type ? (
                      <span className="pill">
                        {formatUnitLabel(item.unit_type)}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-slate-100">
                    {item.name}
                  </h2>
                  {item.description ? (
                    <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                  ) : null}
                  <div className="mt-4 grid gap-3 text-xs text-slate-300 md:grid-cols-3">
                    <div>
                      <span className="text-slate-400">Material</span>
                      <div className="text-slate-100">
                        {formatCurrency(materialCost)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Labor</span>
                      <div className="text-slate-100">{formatHours(laborHours)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Market</span>
                      <div className="text-slate-100">
                        {marketPrice !== null
                          ? formatCurrency(marketPrice)
                          : '--'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => handleAddToEstimate(item)}
                      className="btn-ghost inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-slate-100"
                    >
                      Add to estimate
                    </button>
                    <span className="text-xs text-slate-500">
                      Pricing shown per unit type (E each, C per 100, M per 1000).
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {status !== 'loading' && items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              No catalog items found for that search.
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
