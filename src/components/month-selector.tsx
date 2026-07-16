"use client";

import { useRouter } from "next/navigation";
import { addMonths, yearMonthToLabel } from "@/lib/dates";

export function MonthSelector({ yearMonth }: { yearMonth: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
          Visão do mês
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight lg:text-4xl">
          {yearMonthToLabel(yearMonth)}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Mês anterior"
          onClick={() => router.push(`/month/${addMonths(yearMonth, -1)}`)}
          className="panel flex h-10 w-10 items-center justify-center text-lg text-[var(--color-ink-muted)] transition hover:border-[var(--color-brand)]"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="Próximo mês"
          onClick={() => router.push(`/month/${addMonths(yearMonth, 1)}`)}
          className="panel flex h-10 w-10 items-center justify-center text-lg text-[var(--color-ink-muted)] transition hover:border-[var(--color-brand)]"
        >
          ›
        </button>
      </div>
    </div>
  );
}
