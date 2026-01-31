import Link from 'next/link';

import { WalkthroughStarter } from '@/components/WalkthroughStarter';

export default function StarterPage() {
  return (
    <main className="relative min-h-safe overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-24 h-56 w-56 rounded-full bg-[var(--accent)]/25 blur-[120px] animate-float sm:h-80 sm:w-80 sm:blur-[140px]" />
      <div className="pointer-events-none absolute right-[-120px] top-[-80px] h-[300px] w-[300px] rounded-full bg-[var(--accent-2)]/25 blur-[140px] animate-float sm:h-[420px] sm:w-[420px] sm:blur-[160px]" />
      <div className="pointer-events-none absolute bottom-[-140px] left-1/4 h-[320px] w-[320px] rounded-full bg-[var(--accent-3)]/25 blur-[160px] animate-float sm:h-[420px] sm:w-[420px] sm:blur-[180px]" />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/estimate"
            className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100"
          >
            Back to Estimate
          </Link>
          <Link
            href="/walkthrough"
            className="btn-ghost inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-100"
          >
            Walkthrough
          </Link>
        </div>

        <div className="mt-6">
          <WalkthroughStarter />
        </div>
      </div>
    </main>
  );
}
