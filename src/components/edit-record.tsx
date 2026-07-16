"use client";

import { useMemo, useState } from "react";
import { updateIncome, updateTransaction } from "@/app/actions";
import { CurrencyInput } from "@/components/currency-input";
import {
  addMonths,
  currentYearMonth,
  dateToYearMonth,
  invoiceMonthFromDate,
  yearMonthOptions,
  yearMonthToLabel,
} from "@/lib/dates";

type Category = { id: string; name: string; kind: string };
type Account = { id: string; name: string; type: string };

type TransactionRecord = {
  id: string;
  description: string;
  amount: string | number;
  date: string | null;
  method: "credit" | "pix_debit";
  yearMonth: string | null;
  accountId: string | null;
  categoryId: string | null;
  notes?: string | null;
  invoices?: string[];
};

type IncomeRecord = {
  id: string;
  description: string;
  amount: string | number;
  date: string | null;
  yearMonth: string;
  accountId: string | null;
  categoryId: string | null;
};

function inferFaturaClosed(date: string | null, invoices?: string[]) {
  if (!date || !invoices?.length) return false;
  const purchaseYm = dateToYearMonth(date);
  if (!purchaseYm) return false;
  const expectedClosed = addMonths(purchaseYm, 2);
  return invoices[0] === expectedClosed;
}

export function EditTransactionButton({
  record,
  categories,
  accounts,
}: {
  record: TransactionRecord;
  categories: Category[];
  accounts: Account[];
}) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState(record.method);
  const [date, setDate] = useState(record.date ?? "");
  const [faturaClosed, setFaturaClosed] = useState(
    inferFaturaClosed(record.date, record.invoices),
  );

  const invoicePreview = useMemo(() => {
    if (!date || method !== "credit") return null;
    return invoiceMonthFromDate(date, faturaClosed);
  }, [date, faturaClosed, method]);

  const creditCards = accounts.filter((a) => a.type === "credit_card");
  const bankAccounts = accounts.filter((a) => a.type === "bank");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMethod(record.method);
          setDate(record.date ?? "");
          setFaturaClosed(inferFaturaClosed(record.date, record.invoices));
          setOpen(true);
        }}
        className="text-xs text-[var(--color-brand)] hover:underline"
      >
        editar
      </button>
      {open && (
        <Modal title="Editar gasto" onClose={() => setOpen(false)}>
          <form
            action={async (fd) => {
              await updateTransaction(fd);
              setOpen(false);
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={record.id} />
            <div className="sm:col-span-2">
              <Field
                label="Descrição"
                name="description"
                required
                defaultValue={record.description}
              />
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--color-ink-muted)]">Valor</span>
              <CurrencyInput
                name="amount"
                required
                defaultValue={String(record.amount)}
              />
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
            <Select
              label="Categoria"
              name="categoryId"
              defaultValue={record.categoryId ?? ""}
              options={categories
                .filter((c) => c.kind === "expense")
                .map((c) => ({ value: c.id, label: c.name }))}
            />
            {method === "credit" ? (
              <>
                <Select
                  label="Cartão"
                  name="accountId"
                  defaultValue={record.accountId ?? ""}
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
                defaultValue={record.accountId ?? ""}
                options={bankAccounts.map((a) => ({
                  value: a.id,
                  label: a.name,
                }))}
              />
            )}
            <Field
              label="Obs."
              name="notes"
              defaultValue={record.notes ?? ""}
            />
            <button type="submit" className="btn-primary sm:col-span-2">
              Salvar alterações
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export function EditIncomeButton({
  record,
  categories,
  accounts,
}: {
  record: IncomeRecord;
  categories: Category[];
  accounts: Account[];
}) {
  const [open, setOpen] = useState(false);
  const monthChoices = yearMonthOptions(record.yearMonth || currentYearMonth());
  const bankAccounts = accounts.filter((a) => a.type === "bank");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--color-brand)] hover:underline"
      >
        editar
      </button>
      {open && (
        <Modal title="Editar entrada" onClose={() => setOpen(false)}>
          <form
            action={async (fd) => {
              await updateIncome(fd);
              setOpen(false);
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={record.id} />
            <div className="sm:col-span-2">
              <Field
                label="Descrição"
                name="description"
                required
                defaultValue={record.description}
              />
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--color-ink-muted)]">Valor</span>
              <CurrencyInput
                name="amount"
                required
                defaultValue={String(record.amount)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--color-ink-muted)]">Mês</span>
              <select
                name="yearMonth"
                required
                defaultValue={record.yearMonth}
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
              defaultValue={record.categoryId ?? ""}
              options={categories
                .filter((c) => c.kind === "income")
                .map((c) => ({ value: c.id, label: c.name }))}
            />
            <Select
              label="Conta"
              name="accountId"
              optional
              defaultValue={record.accountId ?? ""}
              options={bankAccounts.map((a) => ({
                value: a.id,
                label: a.name,
              }))}
            />
            <Field
              label="Data"
              name="date"
              type="date"
              defaultValue={record.date ?? ""}
            />
            <button type="submit" className="btn-primary sm:col-span-2">
              Salvar alterações
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
      <div className="panel max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl p-6 sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)]"
          >
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  step,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue}
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
  defaultValue = "",
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  optional?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-[var(--color-ink-muted)]">{label}</span>
      <select
        name={name}
        className="input-field"
        defaultValue={defaultValue}
        required={!optional}
      >
        {optional && <option value="">—</option>}
        {!optional && !defaultValue && (
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
