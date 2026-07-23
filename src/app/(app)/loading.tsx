export default function AppLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4"
      role="status"
      aria-label="Carregando"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-lg font-bold text-[var(--accent-ink)]">
        L
      </span>
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]"
        aria-hidden
      />
      <p className="text-sm text-[var(--color-ink-muted)]">Carregando…</p>
    </div>
  );
}
