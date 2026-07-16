"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { addMonths, yearMonthToLabel } from "@/lib/dates";

export function MonthSelector({
  yearMonth,
  subtitle = "Visão consolidada do seu mês financeiro",
}: {
  yearMonth: string;
  subtitle?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[32px] font-bold leading-tight tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          {subtitle} · {yearMonthToLabel(yearMonth)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() => router.push(`/month/${addMonths(yearMonth, -1)}`)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[72px] px-2 text-center text-sm font-semibold tabular-nums">
            {yearMonthToLabel(yearMonth)}
          </span>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() => router.push(`/month/${addMonths(yearMonth, 1)}`)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition hover:bg-white/5 hover:text-white"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <button type="button" className="btn-ghost inline-flex items-center gap-2">
          <Filter size={15} />
          Filtros
        </button>
      </div>
    </div>
  );
}
