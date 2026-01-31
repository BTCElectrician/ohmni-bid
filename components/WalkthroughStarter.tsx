'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Home } from 'lucide-react';

import { queueWalkthroughTemplate } from '@/lib/walkthrough/templateQueue';
import {
  buildCommercialTemplate,
  buildResidentialTemplate
} from '@/lib/walkthrough/templates';

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

  const summary = useMemo(() => {
    if (jobType === 'residential') {
      return `${floors} floors · ${bedrooms} bed · ${bathrooms} bath`;
    }
    return `${storefronts} storefront · ${offices} offices · ${restrooms} restrooms`;
  }, [jobType, floors, bedrooms, bathrooms, storefronts, offices, restrooms]);

  const handleGenerate = () => {
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
    router.push('/walkthrough');
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
    </section>
  );
}
