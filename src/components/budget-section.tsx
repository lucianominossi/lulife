"use client";

import { useMemo, useState } from "react";
import { upsertBudget } from "@/app/actions";
import { CurrencyInput } from "@/components/currency-input";
import { SuccessToast, useSuccessToast } from "@/components/success-toast";
import {
  currentYearMonth,
  toNumber,
  yearMonthOptions,
  yearMonthToLabel,
} from "@/lib/dates";

type Category = { id: string; name: string; kind: string };
type Budget = {
  id: string;
  categoryId: string | null;
  yearMonth: string;
  plannedAmount: string | number;
};

export function BudgetSection({
  categories,
  budgets,
}: {
  categories: Category[];
  budgets: Budget[];
}) {
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [amountKey, setAmountKey] = useState(0);
  const { toast, setToast, clearToast } = useSuccessToast();
  const monthChoices = yearMonthOptions(currentYearMonth());
  const expenseCats = categories.filter((c) => c.kind === "expense");

  const monthBudgets = useMemo(
    () => budgets.filter((b) => b.yearMonth === yearMonth),
    [budgets, yearMonth],
  );

  return (
    <>
      <section className="panel p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Orçamento</h2>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--color-ink-muted)]">Mês</span>
            <select
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="input-field min-w-[180px]"
            >
              {monthChoices.map((ym) => (
                <option key={ym} value={ym}>
                  {yearMonthToLabel(ym)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Planeje o orçamento de {yearMonthToLabel(yearMonth)} (mês atual ou
          futuros).
        </p>
        <div className="mt-4 grid gap-6 lg:grid-cols-[320px_1fr]">
          <form
            action={async (fd) => {
              await upsertBudget(fd);
              setAmountKey((k) => k + 1);
              setToast("Orçamento salvo com sucesso.");
            }}
            className="space-y-3"
          >
            <input type="hidden" name="yearMonth" value={yearMonth} />
            <select
              name="categoryId"
              required
              className="input-field"
              defaultValue=""
            >
              <option value="" disabled>
                Categoria
              </option>
              {expenseCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <CurrencyInput
              key={amountKey}
              name="plannedAmount"
              required
              placeholder="Valor planejado"
            />
            <button type="submit" className="btn-primary w-full">
              Salvar orçamento
            </button>
          </form>
          <ul className="divide-y divide-[var(--color-border)]">
            {monthBudgets.length === 0 && (
              <li className="py-6 text-sm text-[var(--color-ink-muted)]">
                Nenhum orçamento para este mês.
              </li>
            )}
            {monthBudgets.map((b) => {
              const cat = categories.find((c) => c.id === b.categoryId);
              return (
                <li key={b.id} className="flex justify-between py-3 text-sm">
                  <span className="font-medium">{cat?.name ?? "?"}</span>
                  <span className="tabular-nums text-[var(--color-ink-muted)]">
                    {toNumber(b.plannedAmount).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <SuccessToast message={toast} onClose={clearToast} />
    </>
  );
}
