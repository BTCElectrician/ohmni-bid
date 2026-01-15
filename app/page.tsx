import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-cyan-400/30 blur-3xl" />
      <div className="pointer-events-none absolute right-[-120px] top-[-60px] h-96 w-96 rounded-full bg-sky-300/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-160px] left-1/3 h-96 w-96 rounded-full bg-lime-300/20 blur-[120px]" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20">
        <div className="glass-panel rounded-[32px] p-10 animate-rise">
          <span className="text-xs uppercase tracking-[0.35em] text-slate-400">
            Electrical Estimating System
          </span>
          <h1 className="mt-4 text-4xl font-semibold text-slate-100 md:text-5xl">
            Ohmni Bid keeps the math honest and the field work fast.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300">
            Walk the job, capture notes and photos, and return to a spreadsheet-grade
            estimate that is recalculated by code, not guesses.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/estimate"
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-slate-900 shadow-[0_12px_20px_rgba(47,180,255,0.25)]"
            >
              Open Estimate
            </Link>
            <Link
              href="/walkthrough"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100"
            >
              Walkthrough
            </Link>
            <Link
              href="/catalog"
              className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-100"
            >
              Browse Catalog
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 animate-rise-delayed">
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-sm text-slate-400">Workflow</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-100">
              Field capture to estimate
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Walkthrough sessions keep raw notes and photos separate from
              the estimate until you approve every draft line item.
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-sm text-slate-400">Trust boundary</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-100">
              Tools do the math
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Pricing lookups, conduit checks, and totals stay deterministic
              inside the estimator engine.
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <p className="text-sm text-slate-400">Output</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-100">
              Spreadsheet-grade exports
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Excel exports always recompute server-side so totals stay
              consistent from web to file.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
