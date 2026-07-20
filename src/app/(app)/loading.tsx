export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="h-8 w-48 rounded-lg bg-white/10" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-white/10" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel space-y-3 p-5">
            <div className="h-3 w-20 rounded bg-white/10" />
            <div className="h-8 w-28 rounded-lg bg-white/10" />
            <div className="h-2 w-full rounded bg-white/5" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel h-64 p-5">
          <div className="mb-4 h-4 w-32 rounded bg-white/10" />
          <div className="h-40 rounded-xl bg-white/5" />
        </div>
        <div className="panel h-64 space-y-3 p-5">
          <div className="mb-2 h-4 w-40 rounded bg-white/10" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="h-3 flex-1 rounded bg-white/10" />
              <div className="h-3 w-16 rounded bg-white/10" />
            </div>
          ))}
        </div>
      </div>

      <p className="sr-only">Carregando…</p>
    </div>
  );
}
