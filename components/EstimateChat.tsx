'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TextStreamChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';

import type { Estimate, EstimateParameters, LineItem, ProjectInfo } from '@/lib/estimate/types';
import { formatCurrency, formatHours } from '@/lib/estimate/utils';

interface EstimateChatProps {
  project: ProjectInfo;
  parameters: EstimateParameters;
  lineItems: LineItem[];
  totals: Pick<
    Estimate,
    'totalMaterial' | 'totalLaborHours' | 'totalLaborCost' | 'subtotal' | 'overheadProfit' | 'finalBid'
  >;
}

export function EstimateChat({
  project,
  parameters,
  lineItems,
  totals
}: EstimateChatProps) {
  const [input, setInput] = useState('');

  const context = useMemo(
    () => ({
      project,
      parameters,
      totals,
      lineItems: lineItems.map(item => ({
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unitType: item.unitType
      }))
    }),
    [project, parameters, totals, lineItems]
  );

  const contextRef = useRef(context);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: '/api/ai',
        body: () => ({ context: contextRef.current })
      }),
    []
  );

  const { messages, sendMessage, status, error } = useChat({ transport });
  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = async (event?: { preventDefault?: () => void }) => {
    event?.preventDefault?.();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    try {
      await sendMessage({ text });
    } catch (err) {
      setInput(text);
      console.error(err);
    }
  };

  const messageText = (message: (typeof messages)[number]) =>
    message.parts
      .filter(part => part.type === 'text')
      .map(part => part.text)
      .join('');

  return (
    <section className="glass-panel rounded-3xl p-6 animate-rise-delayed">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Estimator chat</h2>
          <p className="text-sm text-slate-300">
            Ask for takeoff guidance, calculations, or conduit checks. Drafts are applied separately.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Items: {lineItems.length}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Material: {formatCurrency(totals.totalMaterial)}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Labor: {formatHours(totals.totalLaborHours)}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            Final Bid: {formatCurrency(totals.finalBid)}
          </span>
        </div>
      </div>

      <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
        {messages.length === 0 ? (
          <div className="text-slate-400">
            No messages yet. Ask about totals, conduit fill, or catalog lookups.
          </div>
        ) : null}
        {messages.map(message => (
          <div key={message.id} className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-slate-400">
              {message.role === 'user' ? 'You' : 'Assistant'}
            </div>
            <div className="whitespace-pre-wrap">{messageText(message)}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
        <textarea
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Ask: Validate conduit fill for 8 THHN #12 in 3/4 EMT."
          rows={3}
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Tools run server-side. No AI math.
          </span>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_12px_20px_rgba(47,180,255,0.25)]"
            disabled={isLoading}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>

      {error ? <p className="mt-2 text-xs text-rose-300">{error.message}</p> : null}
    </section>
  );
}
