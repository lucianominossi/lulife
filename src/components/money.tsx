"use client";

import { formatBRL } from "@/lib/dates";
import {
  HIDDEN_AMOUNT_LABEL,
  usePrivacy,
} from "@/components/privacy-provider";

export function Money({
  value,
  tone = "default",
  className = "",
}: {
  value: number;
  tone?: "default" | "positive" | "negative" | "muted";
  className?: string;
}) {
  const { hidden } = usePrivacy();
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
      {hidden ? HIDDEN_AMOUNT_LABEL : formatBRL(value)}
    </span>
  );
}
