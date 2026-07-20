export function DashboardShimmer() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="shimmer h-3 w-24 rounded" />
          <div className="shimmer h-8 w-52 rounded-lg" />
        </div>
        <div className="shimmer h-10 w-40 rounded-xl" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="panel space-y-3 p-5">
            <div className="shimmer h-3 w-20 rounded" />
            <div className="shimmer h-8 w-28 rounded-lg" />
            <div className="shimmer h-2 w-full rounded" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel space-y-4 p-5">
          <div className="shimmer h-4 w-36 rounded" />
          <div className="shimmer h-48 w-full rounded-xl" />
        </div>
        <div className="panel space-y-3 p-5">
          <div className="shimmer mb-2 h-4 w-40 rounded" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="shimmer h-3 flex-1 rounded" />
              <div className="shimmer h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>

      <div className="panel space-y-3 p-5">
        <div className="shimmer h-4 w-32 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="shimmer h-8 w-8 shrink-0 rounded-lg" />
            <div className="shimmer h-3 flex-1 rounded" />
            <div className="shimmer h-3 w-20 rounded" />
          </div>
        ))}
      </div>

      <p className="sr-only">Carregando dashboard…</p>
    </div>
  );
}
