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

export { StatCard } from "@/components/stat-card";
