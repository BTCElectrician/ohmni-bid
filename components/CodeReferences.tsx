'use client';

import { useState } from 'react';

type CodeReference = {
  id?: string;
  section_number?: string;
  article_number?: string;
  section_title?: string;
  article_title?: string;
  page_number?: string;
  caption?: string;
  source_type?: string;
};

interface CodeReferencesProps {
  defaultQuery?: string;
  heading?: string;
}

export function CodeReferences({ defaultQuery = '', heading }: CodeReferencesProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CodeReference[]>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setStatus('loading');
    setError(null);
    try {
      const response = await fetch('/api/code-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, search_context: 'nfpa70' })
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'Code search failed.');
      }
      setResults(payload?.results || []);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Code search failed.');
    }
  };

  return (
    <section className="glass-panel rounded-3xl p-6 animate-rise-delayed">
      <div>
        <span className="badge">Code References</span>
        <h2 className="mt-4 text-xl font-semibold text-slate-100">
          {heading || 'Find relevant NFPA 70 sections.'}
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Describe the scope and we’ll pull relevant code references from your index.
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row">
        <input
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Example: kitchen countertop receptacles GFCI"
          className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <button
          onClick={handleSearch}
          className="btn-primary px-4 py-2 text-sm font-semibold text-slate-900"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Searching...' : 'Search code'}
        </button>
      </div>

      {error ? <p className="mt-3 text-xs text-rose-300">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {results.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            No code references yet. Run a search to populate this list.
          </div>
        ) : (
          results.map((result, index) => (
            <div
              key={`${result.id || 'code'}-${index}`}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
            >
              <div className="font-semibold text-slate-100">
                {result.section_number || result.article_number || 'Code reference'}
                {result.section_title ? ` — ${result.section_title}` : ''}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {result.article_title ? `${result.article_title}` : null}
                {result.page_number ? ` • Page ${result.page_number}` : null}
                {result.source_type ? ` • ${result.source_type}` : null}
              </div>
              {result.caption ? (
                <div className="mt-2 text-xs text-slate-300">{result.caption}</div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
