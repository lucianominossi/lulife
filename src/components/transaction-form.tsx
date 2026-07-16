"use client";

import { useState } from "react";
import { createTransaction } from "@/app/actions";
import {
  currentYearMonth,
  yearMonthOptions,
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
  const ym = currentYearMonth();
  const monthChoices = yearMonthOptions(ym);

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
      <input
        name="amount"
        type="number"
        step="0.01"
        required
        placeholder="Valor"
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
      <select name="categoryId" className="input-field" defaultValue="">
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
          <select name="accountId" className="input-field" defaultValue="">
            <option value="" disabled>
              Cartão
            </option>
            {accounts
              .filter((a) => a.type === "credit_card")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
          <select
            name="invoices"
            multiple
            required
            defaultValue={[ym]}
            className="input-field h-32"
          >
            {monthChoices.map((m) => (
              <option key={m} value={m}>
                {yearMonthToLabel(m)}
              </option>
            ))}
          </select>
        </>
      ) : (
        <>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--color-ink-muted)]">Mês do gasto</span>
            <select
              name="yearMonth"
              required
              defaultValue={ym}
              className="input-field"
            >
              {monthChoices.map((m) => (
                <option key={m} value={m}>
                  {yearMonthToLabel(m)}
                </option>
              ))}
            </select>
          </label>
          <select name="accountId" className="input-field" defaultValue="">
            <option value="">Conta (opcional)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </>
      )}
      <button type="submit" className="btn-primary w-full">
        Salvar
      </button>
    </form>
  );
}
