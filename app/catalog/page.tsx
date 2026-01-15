export default function CatalogPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-cyan-400/30 blur-3xl" />
      <div className="pointer-events-none absolute right-[-120px] top-[-60px] h-96 w-96 rounded-full bg-sky-300/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-160px] left-1/3 h-96 w-96 rounded-full bg-lime-300/20 blur-[120px]" />
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="glass-panel rounded-3xl p-10 animate-rise">
          <h1 className="text-2xl font-semibold text-slate-100">Catalog</h1>
          <p className="mt-2 text-slate-300">
            Catalog browsing will be powered by Supabase + pgvector search.
          </p>
        </div>
      </div>
    </main>
  );
}
