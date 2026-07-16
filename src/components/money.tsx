import { formatBRL } from "@/lib/dates";

export function Money({
  value,
  tone = "default",
  className = "",
}: {
  value: number;
  tone?: "default" | "positive" | "negative" | "muted";
  className?: string;
}) {
  const color =
    tone === "positive"
      ? "text-[var(--color-ok)]"
      : tone === "negative"
        ? "text-[var(--color-danger)]"
        : tone === "muted"
          ? "text-[var(--color-ink-muted)]"
          : "";
  return (
    <span className={`tabular-nums ${color} ${className}`}>
      {formatBRL(value)}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "positive" | "negative";
}) {
  return (
    <div className="panel p-5">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tracking-tight lg:text-3xl">
        <Money value={value} tone={tone} />
      </p>
      {hint && (
        <p className="mt-1.5 text-xs text-[var(--color-ink-muted)]">{hint}</p>
      )}
    </div>
  );
}
