"use client";

import { useMemo, useState } from "react";
import { createTransaction } from "@/app/actions";
import { CurrencyInput } from "@/components/currency-input";
import {
  invoiceMonthFromDate,
  yearMonthToLabel,
} from "@/lib/dates";

export function TransactionForm({
  categories,
  accounts,
}: {
  categories: { id: string; name: string; kind: string }[];
  accounts: { id: string; name: string; type: string }[];
}) {
  const [open, setOpen] = useState(true);
  const [method, setMethod] = useState<"credit" | "pix_debit">("credit");
  const [date, setDate] = useState("");
  const [faturaClosed, setFaturaClosed] = useState(false);

  const invoicePreview = useMemo(() => {
    if (!date || method !== "credit") return null;
    return invoiceMonthFromDate(date, faturaClosed);
  }, [date, faturaClosed, method]);

  const creditCards = accounts.filter((a) => a.type === "credit_card");
  const bankAccounts = accounts.filter((a) => a.type === "bank");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="panel w-full border-dashed py-8 text-sm font-medium text-[var(--color-brand)]"
      >
        + Novo gasto
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await createTransaction(fd);
      }}
      className="panel h-fit space-y-3 p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Novo gasto</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-[var(--color-ink-muted)]"
        >
          recolher
        </button>
      </div>
      <input
        name="description"
        required
        placeholder="Descrição"
        className="input-field"
      />
      <CurrencyInput name="amount" required placeholder="Valor (R$ 0,00)" />
      <input
        name="date"
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="input-field"
      />
      <select
        name="method"
        value={method}
        onChange={(e) => setMethod(e.target.value as "credit" | "pix_debit")}
        className="input-field"
      >
        <option value="credit">Cartão de crédito</option>
        <option value="pix_debit">Pix / Débito</option>
      </select>
      <select name="categoryId" className="input-field" defaultValue="" required>
        <option value="" disabled>
          Categoria
        </option>
        {categories
          .filter((c) => c.kind === "expense")
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
      {method === "credit" ? (
        <>
          <select name="accountId" className="input-field" defaultValue="" required>
            <option value="" disabled>
              Cartão
            </option>
            {creditCards.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <label className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm">
            <input
              type="checkbox"
              name="faturaClosed"
              checked={faturaClosed}
              onChange={(e) => setFaturaClosed(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Fatura já fechada
              <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
                Atribui à fatura do mês seguinte ao próximo
              </span>
            </span>
          </label>
          {invoicePreview && (
            <p className="rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-ink-muted)]">
              Fatura/mês:{" "}
              <strong className="text-[var(--color-ink)]">
                {yearMonthToLabel(invoicePreview)}
              </strong>
            </p>
          )}
        </>
      ) : (
        <select name="accountId" className="input-field" defaultValue="">
          <option value="">Conta (opcional)</option>
          {bankAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
      <button type="submit" className="btn-primary w-full">
        Salvar
      </button>
    </form>
  );
}
