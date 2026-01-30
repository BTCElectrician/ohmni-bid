import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-24 h-80 w-80 rounded-full bg-[var(--accent)]/25 blur-[140px] animate-float" />
      <div className="pointer-events-none absolute right-[-140px] top-[-80px] h-[420px] w-[420px] rounded-full bg-[var(--accent-2)]/25 blur-[160px] animate-float" />
      <div className="pointer-events-none absolute bottom-[-160px] left-1/4 h-[420px] w-[420px] rounded-full bg-[var(--accent-3)]/25 blur-[180px] animate-float" />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 py-20">
        <div className="glass-panel rounded-[32px] p-10 animate-rise">
          <span className="badge">Electrical Estimating System</span>
          <h1 className="mt-6 text-4xl font-semibold text-slate-100 md:text-6xl">
            <span className="text-gradient">Ohmni Bid</span> keeps the math honest
            and the field work fast.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300 md:text-lg">
            Walk the job, capture notes and photos, and return to a spreadsheet-grade
            estimate that is recalculated by code, not guesses.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/estimate"
              className="btn-primary px-5 py-3 text-sm font-semibold text-slate-900"
            >
              Open Estimate
            </Link>
            <Link
              href="/walkthrough"
              className="btn-ghost px-5 py-3 text-sm font-semibold text-slate-100"
            >
              Walkthrough
            </Link>
            <Link
              href="/catalog"
              className="btn-ghost px-5 py-3 text-sm font-semibold text-slate-100"
            >
              Browse Catalog
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 animate-rise-delayed">
          <div className="glass-panel rounded-2xl p-6">
            <p className="pill">Workflow</p>
            <h2 className="mt-4 text-lg font-semibold text-slate-100">
              Field capture to estimate
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Walkthrough sessions keep raw notes and photos separate from
              the estimate until you approve every draft line item.
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <p className="pill">Trust boundary</p>
            <h2 className="mt-4 text-lg font-semibold text-slate-100">
              Tools do the math
            </h2>
            <p className="mt-3 text-sm text-slate-300">
              Pricing lookups, conduit checks, and totals stay deterministic
              inside the estimator engine.
            </p>
          </div>
          <div className="glass-panel rounded-2xl p-6">
            <p className="pill">Output</p>
            <h2 className="mt-4 text-lg font-semibold text-slate-100">
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
