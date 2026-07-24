import { BrandMark } from "@/components/brand-mark";

export default function AppLoading() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4"
      role="status"
      aria-label="Carregando"
    >
      <BrandMark size="lg" />
      <span
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--accent)]"
        aria-hidden
      />
      <p className="text-sm text-[var(--color-ink-muted)]">Carregando…</p>
    </div>
  );
}
