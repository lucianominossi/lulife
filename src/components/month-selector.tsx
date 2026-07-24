"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { DashboardShimmer } from "@/components/dashboard-shimmer";
import { FabQuickAdd } from "@/components/fab-quick-add";
import { addMonths, yearMonthToLabel } from "@/lib/dates";

type Meta = {
  categories: { id: string; name: string; kind: string }[];
  accounts: { id: string; name: string; type: string }[];
};

export function MonthDashboardFrame({
  yearMonth,
  meta,
  children,
}: {
  yearMonth: string;
  meta: Meta;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeYm, setActiveYm] = useState(yearMonth);

  useEffect(() => {
    setActiveYm(yearMonth);
  }, [yearMonth]);

  // Prefetch adjacent months so arrow navigation resolves faster.
  useEffect(() => {
    router.prefetch(`/month/${addMonths(yearMonth, -1)}`);
    router.prefetch(`/month/${addMonths(yearMonth, 1)}`);
  }, [router, yearMonth]);

  function go(delta: number) {
    const next = addMonths(activeYm, delta);
    setActiveYm(next);
    startTransition(() => {
      router.push(`/month/${next}`);
    });
  }

  return (
    <div className="space-y-8">
      <div className="hidden flex-wrap items-end justify-between gap-4 lg:flex">
        <div>
          <h1 className="text-[32px] font-bold leading-tight tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Visão consolidada do seu mês financeiro ·{" "}
            {yearMonthToLabel(activeYm)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1">
            <button
              type="button"
              aria-label="Mês anterior"
              disabled={isPending}
              onClick={() => go(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition hover:bg-[var(--hover-fill)] hover:text-[var(--ink)] disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[72px] px-2 text-center text-sm font-semibold tabular-nums">
              {yearMonthToLabel(activeYm)}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              disabled={isPending}
              onClick={() => go(1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)] transition hover:bg-[var(--hover-fill)] hover:text-[var(--ink)] disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button type="button" className="btn-ghost inline-flex items-center gap-2">
            <Filter size={15} />
            Filtros
          </button>
          <FabQuickAdd yearMonth={activeYm} meta={meta} inline />
        </div>
      </div>

      {/* Mobile month switcher */}
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <div className="flex items-center gap-1 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-1">
          <button
            type="button"
            aria-label="Mês anterior"
            disabled={isPending}
            onClick={() => go(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)]"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[72px] px-2 text-center text-sm font-semibold tabular-nums">
            {yearMonthToLabel(activeYm)}
          </span>
          <button
            type="button"
            aria-label="Próximo mês"
            disabled={isPending}
            onClick={() => go(1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--color-ink-muted)]"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {isPending ? <DashboardShimmer /> : children}
    </div>
  );
}
