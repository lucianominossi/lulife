"use client";

import { useState } from "react";
import { createIncome, createTransaction } from "@/app/actions";
import {
  yearMonthOptions,
  yearMonthToLabel,
} from "@/lib/dates";

type Meta = {
  categories: { id: string; name: string; kind: string }[];
  accounts: { id: string; name: string; type: string }[];
};

export function FabQuickAdd({
  yearMonth,
  meta,
  inline = false,
}: {
  yearMonth: string;
  meta: Meta;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [method, setMethod] = useState<"credit" | "pix_debit">("credit");
  const monthChoices = yearMonthOptions(yearMonth);

  return (
    <>
      {inline ? (
        <button type="button" onClick={() => setOpen(true)} className="btn-primary">
          + Novo lançamento
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-2xl text-white shadow-lg shadow-[var(--color-coral)]/25 lg:hidden"
          aria-label="Adicionar"
        >
          +
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
          <div className="panel max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl p-6 sm:rounded-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">
                Novo lançamento
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)]"
              >
                Fechar
              </button>
            </div>

            <div className="mb-5 flex gap-2">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    tab === t
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-surface-2)] text-[var(--color-ink-muted)]"
                  }`}
                >
                  {t === "expense" ? "Gasto" : "Entrada"}
                </button>
              ))}
            </div>

            {tab === "expense" ? (
              <form
                action={async (fd) => {
                  await createTransaction(fd);
                  setOpen(false);
                }}
                className="grid gap-3 sm:grid-cols-2"
              >
                <div className="sm:col-span-2">
                  <Field label="Descrição" name="description" required />
                </div>
                <Field label="Valor" name="amount" type="number" step="0.01" required />
                <label className="block space-y-1 text-sm">
                  <span className="text-[var(--color-ink-muted)]">Método</span>
                  <select
                    name="method"
                    value={method}
                    onChange={(e) =>
                      setMethod(e.target.value as "credit" | "pix_debit")
                    }
                    className="input-field"
                  >
                    <option value="credit">Cartão de crédito</option>
                    <option value="pix_debit">Pix / Débito</option>
                  </select>
                </label>
                <Select
                  label="Categoria"
                  name="categoryId"
                  options={meta.categories
                    .filter((c) => c.kind === "expense")
                    .map((c) => ({ value: c.id, label: c.name }))}
                />
                {method === "credit" ? (
                  <>
                    <Select
                      label="Cartão"
                      name="accountId"
                      options={meta.accounts
                        .filter((a) => a.type === "credit_card")
                        .map((a) => ({ value: a.id, label: a.name }))}
                    />
                    <label className="block space-y-1 text-sm sm:col-span-2">
                      <span className="text-[var(--color-ink-muted)]">
                        Faturas (Cmd/Ctrl para várias)
                      </span>
                      <select
                        name="invoices"
                        multiple
                        required
                        defaultValue={[yearMonth]}
                        className="input-field h-36"
                      >
                        {monthChoices.map((ym) => (
                          <option key={ym} value={ym}>
                            {yearMonthToLabel(ym)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="block space-y-1 text-sm">
                      <span className="text-[var(--color-ink-muted)]">
                        Mês do gasto
                      </span>
                      <select
                        name="yearMonth"
                        required
                        defaultValue={yearMonth}
                        className="input-field"
                      >
                        {monthChoices.map((ym) => (
                          <option key={ym} value={ym}>
                            {yearMonthToLabel(ym)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Select
                      label="Conta (opcional)"
                      name="accountId"
                      optional
                      options={meta.accounts.map((a) => ({
                        value: a.id,
                        label: a.name,
                      }))}
                    />
                  </>
                )}
                <Field label="Data" name="date" type="date" />
                <button type="submit" className="btn-primary sm:col-span-2">
                  Salvar gasto
                </button>
              </form>
            ) : (
              <form
                action={async (fd) => {
                  await createIncome(fd);
                  setOpen(false);
                }}
                className="grid gap-3 sm:grid-cols-2"
              >
                <div className="sm:col-span-2">
                  <Field label="Descrição" name="description" required />
                </div>
                <Field label="Valor" name="amount" type="number" step="0.01" required />
                <label className="block space-y-1 text-sm">
                  <span className="text-[var(--color-ink-muted)]">Mês</span>
                  <select
                    name="yearMonth"
                    required
                    defaultValue={yearMonth}
                    className="input-field"
                  >
                    {monthChoices.map((ym) => (
                      <option key={ym} value={ym}>
                        {yearMonthToLabel(ym)}
                      </option>
                    ))}
                  </select>
                </label>
                <Select
                  label="Tipo"
                  name="categoryId"
                  options={meta.categories
                    .filter((c) => c.kind === "income")
                    .map((c) => ({ value: c.id, label: c.name }))}
                />
                <Select
                  label="Conta"
                  name="accountId"
                  optional
                  options={meta.accounts.map((a) => ({
                    value: a.id,
                    label: a.name,
                  }))}
                />
                <Field label="Data" name="date" type="date" />
                <button type="submit" className="btn-primary sm:col-span-2">
                  Salvar entrada
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        className="input-field"
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  optional,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  optional?: boolean;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <select name={name} className="input-field" defaultValue="">
        {optional && <option value="">—</option>}
        {!optional && (
          <option value="" disabled>
            Selecione
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
