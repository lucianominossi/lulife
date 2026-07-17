"use client";

import { Info } from "lucide-react";
import { formatDateBR } from "@/lib/dates";

export function DateWithNotes({
  date,
  notes,
}: {
  date: string | null | undefined;
  notes?: string | null;
}) {
  const label = formatDateBR(date);
  const trimmed = notes?.trim();

  if (!trimmed) {
    return <span className="tabular-nums text-[var(--color-ink-muted)]">{label}</span>;
  }

  return (
    <span className="group relative inline-flex items-center gap-1.5">
      <span className="tabular-nums text-[var(--color-ink-muted)]">{label}</span>
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-ink-subtle)] transition hover:bg-white/10 hover:text-[#C4B5FD]"
        aria-label="Ver observação"
      >
        <Info size={14} strokeWidth={2} />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-xl border border-white/10 bg-[#141A23] px-3 py-2 text-left text-xs leading-relaxed text-white opacity-0 shadow-[0_12px_40px_rgba(0,0,0,0.45)] transition group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {trimmed}
      </span>
    </span>
  );
}
