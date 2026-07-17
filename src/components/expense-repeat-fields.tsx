"use client";

import { useEffect, useState } from "react";

/** Campos condicionais de recorrência / parcelas no cadastro de gasto. */
export function ExpenseRepeatFields({
  method,
  date,
}: {
  method: "credit" | "pix_debit";
  date: string;
}) {
  const [installmentCount, setInstallmentCount] = useState(1);
  const [recurring, setRecurring] = useState(false);
  const dateDay = Math.min(
    28,
    Math.max(1, date ? parseInt(date.slice(8, 10), 10) || 1 : 1),
  );
  const [dayOfMonth, setDayOfMonth] = useState(dateDay);

  useEffect(() => {
    if (date) setDayOfMonth(dateDay);
  }, [date, dateDay]);

  useEffect(() => {
    setRecurring(false);
    setInstallmentCount(1);
  }, [method]);

  useEffect(() => {
    if (method === "credit" && installmentCount > 1) {
      setRecurring(false);
    }
  }, [method, installmentCount]);

  if (method === "pix_debit") {
    return (
      <div className="space-y-3 sm:col-span-2">
        <label className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm">
          <input
            type="checkbox"
            name="recurring"
            value="1"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Cobrança recorrente
            <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
              Lança todo mês na mesma data, sem data de fim (ex.: luz, celular,
              internet).
            </span>
          </span>
        </label>
        {recurring && (
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--color-ink-muted)]">Dia do mês</span>
            <input
              name="dayOfMonth"
              type="number"
              min={1}
              max={28}
              value={dayOfMonth}
              onChange={(e) =>
                setDayOfMonth(
                  Math.min(28, Math.max(1, parseInt(e.target.value, 10) || 1)),
                )
              }
              className="input-field"
            />
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:col-span-2">
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--color-ink-muted)]">Parcelas</span>
        <input
          name="installmentCount"
          type="number"
          min={1}
          max={48}
          value={installmentCount}
          onChange={(e) =>
            setInstallmentCount(
              Math.max(1, parseInt(e.target.value, 10) || 1),
            )
          }
          className="input-field"
        />
        <span className="mt-1 block text-xs text-[var(--color-ink-muted)]">
          {installmentCount > 1
            ? "A compra aparece em N faturas e termina."
            : "1 = só nesta fatura."}
        </span>
      </label>
      {installmentCount === 1 && (
        <label className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm">
          <input
            type="checkbox"
            name="recurring"
            value="1"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            Assinatura no cartão (todo mês)
            <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
              Cobra de novo todo mês até você pausar em Recorrências.
            </span>
          </span>
        </label>
      )}
    </div>
  );
}
