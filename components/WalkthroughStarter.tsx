'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Home } from 'lucide-react';

import { queueRoomItems, type RoomQueuedItem } from '@/lib/estimate/roomQueue';
import { DEFAULT_PARAMETERS } from '@/lib/estimate/defaults';
import { createLineItem } from '@/lib/estimate/calc';
import type { EstimateParameters } from '@/lib/estimate/types';
import { generateId } from '@/lib/estimate/utils';
import { queueWalkthroughTemplate } from '@/lib/walkthrough/templateQueue';
import {
  buildCommercialTemplate,
  buildResidentialTemplate
} from '@/lib/walkthrough/templates';
import { normalizeUnitType } from '@/lib/estimate/unit';

const DEVICE_TO_QUERY: Record<
  keyof import('@/lib/walkthrough/types').RoomDraftCounts,
  { category: import('@/lib/estimate/types').EstimateCategory; query: string }
> = {
  outlets: { category: 'POWER_RECEPTACLES', query: 'duplex receptacle' },
  switches: { category: 'POWER_RECEPTACLES', query: 'switch' },
  cans: { category: 'INTERIOR_LIGHTING', query: 'recessed can light' },
  lights: { category: 'INTERIOR_LIGHTING', query: 'light fixture' },
  smokes: { category: 'FIRE_ALARM', query: 'smoke detector' }
};

const cardClass =
  'rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-white/20 hover:bg-white/10';

export function WalkthroughStarter() {
  const router = useRouter();
  const [jobType, setJobType] = useState<'residential' | 'commercial'>('residential');
  const [floors, setFloors] = useState(2);
  const [includeBasement, setIncludeBasement] = useState(true);
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [living, setLiving] = useState(1);
  const [dining, setDining] = useState(1);
  const [kitchen, setKitchen] = useState(true);
  const [storefronts, setStorefronts] = useState(1);
  const [offices, setOffices] = useState(2);
  const [restrooms, setRestrooms] = useState(2);
  const [openAreas, setOpenAreas] = useState(1);
  const [serviceSize, setServiceSize] = useState('200A service');
  const [status, setStatus] = useState<string | null>(null);
  const [estimateParameters] = useState<EstimateParameters>({
    ...DEFAULT_PARAMETERS
  });

  const summary = useMemo(() => {
    if (jobType === 'residential') {
      return `${floors} floors · ${bedrooms} bed · ${bathrooms} bath`;
    }
    return `${storefronts} storefront · ${offices} offices · ${restrooms} restrooms`;
  }, [jobType, floors, bedrooms, bathrooms, storefronts, offices, restrooms]);

  const resolvePricing = async (
    key: keyof import('@/lib/walkthrough/types').RoomDraftCounts
  ) => {
    const response = await fetch('/api/catalog-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: DEVICE_TO_QUERY[key].query,
        category: DEVICE_TO_QUERY[key].category
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || 'Pricing lookup failed');
    }
    return (payload?.items || [])[0] || null;
  };

  const handleGenerate = async () => {
    const template =
      jobType === 'residential'
        ? buildResidentialTemplate({
            floors,
            includeBasement,
            bedrooms,
            bathrooms,
            kitchen,
            living,
            dining,
            serviceSize
          })
        : buildCommercialTemplate({
            storefronts,
            offices,
            restrooms,
            openAreas,
            serviceSize
          });
    queueWalkthroughTemplate(template);
    setStatus('Building estimate preview...');

    try {
      const deviceKeys = Object.keys(DEVICE_TO_QUERY) as Array<
        keyof import('@/lib/walkthrough/types').RoomDraftCounts
      >;
      const pricingResults = await Promise.all(
        deviceKeys.map(async key => ({ key, match: await resolvePricing(key) }))
      );

      const pricingMap = new Map(
        pricingResults.map(result => [result.key, result.match])
      );

      const queuedItems = template.rooms.flatMap(room =>
        deviceKeys
          .map(key => {
            const quantity = room.counts[key] || 0;
            if (!quantity) return null;
            const match = pricingMap.get(key);
            const unitType = normalizeUnitType(match?.unit_type);
            const materialUnitCost = Number(match?.material_cost || 0);
            const laborHoursPerUnit = Number(match?.labor_hours || 0);
            const item = createLineItem(
              {
                category: DEVICE_TO_QUERY[key].category,
                name: `${room.name}: ${DEVICE_TO_QUERY[key].query}`,
                materialUnitCost,
                unitType,
                laborHoursPerUnit,
                pricingItemId: match?.id ?? null
              },
              quantity,
              estimateParameters,
              generateId()
            );
            return {
              name: item.description,
              category: item.category,
              quantity: item.quantity,
              unitType: item.unitType,
              materialUnitCost: item.materialUnitCost,
              laborHoursPerUnit: item.laborHoursPerUnit,
              pricingItemId: item.pricingItemId ?? null
            };
          })
          .filter((item): item is RoomQueuedItem => Boolean(item))
      );

      if (queuedItems.length > 0) {
        queueRoomItems(queuedItems);
      }
      setStatus('Starter kit queued. Ready for walkthrough.');
      router.push('/estimate');
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Starter kit queued without pricing.'
      );
      router.push('/walkthrough');
    }
  };

  return (
    <section className="glass-panel rounded-3xl p-6 animate-rise">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="badge">Starter Kit</span>
          <h1 className="mt-4 text-2xl font-semibold text-slate-100">
            Build a structured bid in minutes.
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Tell us what you’re building and we’ll spin up rooms, counts, and a
            walkthrough-ready template.
          </p>
        </div>
        <div className="pill">{summary}</div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <button
          onClick={() => setJobType('residential')}
          className={cardClass}
        >
          <div className="flex items-center gap-3">
            <Home className="h-5 w-5 text-amber-200" />
            <div>
              <div className="text-sm font-semibold text-slate-100">Residential</div>
              <div className="text-xs text-slate-400">
                Single-family, remodels, basements, additions.
              </div>
            </div>
          </div>
        </button>
        <button
          onClick={() => setJobType('commercial')}
          className={cardClass}
        >
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-emerald-200" />
            <div>
              <div className="text-sm font-semibold text-slate-100">Commercial</div>
              <div className="text-xs text-slate-400">
                Storefronts, offices, tenant build-outs.
              </div>
            </div>
          </div>
        </button>
      </div>

      {jobType === 'residential' ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Floors
            </label>
            <input
              type="number"
              min={1}
              value={floors}
              onChange={event => setFloors(Math.max(1, Number(event.target.value)))}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Service size
            </label>
            <input
              value={serviceSize}
              onChange={event => setServiceSize(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Bedrooms
            </label>
            <input
              type="number"
              min={0}
              value={bedrooms}
              onChange={event => setBedrooms(Math.max(0, Number(event.target.value)))}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Bathrooms
            </label>
            <input
              type="number"
              min={0}
              value={bathrooms}
              onChange={event => setBathrooms(Math.max(0, Number(event.target.value)))}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Living rooms
            </label>
            <input
              type="number"
              min={0}
              value={living}
              onChange={event => setLiving(Math.max(0, Number(event.target.value)))}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Dining rooms
            </label>
            <input
              type="number"
              min={0}
              value={dining}
              onChange={event => setDining(Math.max(0, Number(event.target.value)))}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Kitchen included
            </label>
            <button
              onClick={() => setKitchen(current => !current)}
              className="btn-ghost mt-2 w-full px-3 py-2 text-sm font-semibold text-slate-100"
            >
              {kitchen ? 'Kitchen included' : 'No kitchen'}
            </button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Basement
            </label>
            <button
              onClick={() => setIncludeBasement(current => !current)}
              className="btn-ghost mt-2 w-full px-3 py-2 text-sm font-semibold text-slate-100"
            >
              {includeBasement ? 'Include basement' : 'No basement'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Storefronts
            </label>
            <input
              type="number"
              min={0}
              value={storefronts}
              onChange={event => setStorefronts(Math.max(0, Number(event.target.value)))}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Offices
            </label>
            <input
              type="number"
              min={0}
              value={offices}
              onChange={event => setOffices(Math.max(0, Number(event.target.value)))}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Restrooms
            </label>
            <input
              type="number"
              min={0}
              value={restrooms}
              onChange={event => setRestrooms(Math.max(0, Number(event.target.value)))}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Open areas
            </label>
            <input
              type="number"
              min={0}
              value={openAreas}
              onChange={event => setOpenAreas(Math.max(0, Number(event.target.value)))}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Service size
            </label>
            <input
              value={serviceSize}
              onChange={event => setServiceSize(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs text-slate-400">
          Starter kit builds a room list and baseline counts. You’ll refine in walkthrough.
        </div>
        <button
          onClick={handleGenerate}
          className="btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-900"
        >
          Build starter kit
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
      {status ? <p className="mt-3 text-xs text-slate-300">{status}</p> : null}
    </section>
  );
}
