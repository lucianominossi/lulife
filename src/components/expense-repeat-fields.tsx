"use client";

import { useEffect, useState } from "react";

function effectiveInstallments(raw: string): number {
  const n = parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(48, n);
}

/** Campos condicionais de recorrência / parcelas no cadastro de gasto. */
export function ExpenseRepeatFields({
  method,
  date,
  initialInstallmentCount = 1,
  hideSubscription = false,
}: {
  method: "credit" | "pix_debit";
  date: string;
  /** Preenche parcelas na edição (ex.: invoices.length). */
  initialInstallmentCount?: number;
  /** Na edição não cria/altera assinatura recorrente. */
  hideSubscription?: boolean;
}) {
  const [installmentRaw, setInstallmentRaw] = useState(
    String(Math.max(1, initialInstallmentCount || 1)),
  );
  const [recurring, setRecurring] = useState(false);
  const dateDay = Math.min(
    28,
    Math.max(1, date ? parseInt(date.slice(8, 10), 10) || 1 : 1),
  );
  const [dayOfMonth, setDayOfMonth] = useState(dateDay);

  const effectiveCount = effectiveInstallments(installmentRaw);

  useEffect(() => {
    if (date) setDayOfMonth(dateDay);
  }, [date, dateDay]);

  useEffect(() => {
    setRecurring(false);
    setInstallmentRaw(String(Math.max(1, initialInstallmentCount || 1)));
  }, [method, initialInstallmentCount]);

  useEffect(() => {
    if (method === "credit" && effectiveCount > 1) {
      setRecurring(false);
    }
  }, [method, effectiveCount]);

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
            className="checkbox-field"
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
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={installmentRaw}
          placeholder="1"
          onChange={(e) => setInstallmentRaw(e.target.value)}
          className="input-field"
        />
        <span className="mt-1 block text-xs text-[var(--color-ink-muted)]">
          {effectiveCount > 1
            ? "A compra aparece em N faturas e termina."
            : "Vazio ou inválido = 1 (só nesta fatura)."}
        </span>
      </label>
      {!hideSubscription && effectiveCount === 1 && (
        <label className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm">
          <input
            type="checkbox"
            name="recurring"
            value="1"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="checkbox-field"
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
