"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createIncome, createTransaction } from "@/app/actions";
import { CategoryPicker } from "@/components/category-picker";
import { CurrencyInput } from "@/components/currency-input";
import {
  invoiceMonthFromDate,
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
  const [date, setDate] = useState("");
  const [faturaClosed, setFaturaClosed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const monthChoices = yearMonthOptions(yearMonth);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const invoicePreview = useMemo(() => {
    if (!date || method !== "credit") return null;
    return invoiceMonthFromDate(date, faturaClosed);
  }, [date, faturaClosed, method]);

  const creditCards = meta.accounts.filter((a) => a.type === "credit_card");
  const bankAccounts = meta.accounts.filter((a) => a.type === "bank");

  const modal =
    open && mounted
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-add-title"
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-label="Fechar"
              onClick={() => setOpen(false)}
            />
            <div className="panel relative z-10 flex max-h-[min(90dvh,720px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.55)]">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/5 px-6 py-5">
                <h2
                  id="quick-add-title"
                  className="text-xl font-semibold tracking-tight"
                >
                  Novo lançamento
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-ink-muted)] transition hover:bg-white/5 hover:text-white"
                >
                  Fechar
                </button>
              </div>

              <div className="overflow-y-auto px-6 py-5">
                <div className="mb-5 flex gap-2">
                  {(["expense", "income"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTab(t)}
                      className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        tab === t
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-white/5 text-[var(--color-ink-muted)] hover:bg-white/10"
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
                    <label className="block space-y-1 text-sm">
                      <span className="text-[var(--color-ink-muted)]">Valor</span>
                      <CurrencyInput name="amount" required />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="text-[var(--color-ink-muted)]">Data</span>
                      <input
                        name="date"
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="input-field"
                      />
                    </label>
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
                    <div className="sm:col-span-2">
                      <CategoryPicker
                        kind="expense"
                        categories={meta.categories}
                        required
                        label="Categoria"
                      />
                    </div>
                    {method === "credit" ? (
                      <>
                        <Select
                          label="Cartão"
                          name="accountId"
                          options={creditCards.map((a) => ({
                            value: a.id,
                            label: a.name,
                          }))}
                        />
                        <label className="flex items-start gap-2 rounded-xl border border-[var(--color-border)] px-3 py-3 text-sm sm:col-span-2">
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
                          <p className="rounded-xl bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-ink-muted)] sm:col-span-2">
                            Fatura/mês:{" "}
                            <strong className="text-[var(--color-ink)]">
                              {yearMonthToLabel(invoicePreview)}
                            </strong>
                          </p>
                        )}
                      </>
                    ) : (
                      <Select
                        label="Conta (opcional)"
                        name="accountId"
                        optional
                        options={bankAccounts.map((a) => ({
                          value: a.id,
                          label: a.name,
                        }))}
                      />
                    )}
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
                    <label className="block space-y-1 text-sm">
                      <span className="text-[var(--color-ink-muted)]">Valor</span>
                      <CurrencyInput name="amount" required />
                    </label>
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
                    <CategoryPicker
                      kind="income"
                      categories={meta.categories}
                      required
                      label="Tipo"
                    />
                    <Select
                      label="Conta"
                      name="accountId"
                      optional
                      options={bankAccounts.map((a) => ({
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
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {inline ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary"
        >
          + Novo lançamento
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-2xl text-white shadow-lg shadow-[#8B5CF6]/30 transition hover:bg-[var(--color-accent-hover)] lg:hidden"
          aria-label="Adicionar"
        >
          +
        </button>
      )}
      {modal}
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
      <select
        name={name}
        className="input-field"
        defaultValue=""
        required={!optional}
      >
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
