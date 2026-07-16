"use client";

import { useState } from "react";
import { updateIncome, updateTransaction } from "@/app/actions";
import {
  currentYearMonth,
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
  const monthChoices = yearMonthOptions(
    record.yearMonth || currentYearMonth(),
  );

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
            <Field
              label="Valor"
              name="amount"
              type="number"
              step="0.01"
              required
              defaultValue={String(record.amount)}
            />
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
                  options={accounts
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
                    defaultValue={
                      record.invoices?.length
                        ? record.invoices
                        : [currentYearMonth()]
                    }
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
                    defaultValue={record.yearMonth || currentYearMonth()}
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
                  defaultValue={record.accountId ?? ""}
                  options={accounts.map((a) => ({
                    value: a.id,
                    label: a.name,
                  }))}
                />
              </>
            )}
            <Field
              label="Data"
              name="date"
              type="date"
              defaultValue={record.date ?? ""}
            />
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
  const monthChoices = yearMonthOptions(record.yearMonth);

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
            <Field
              label="Valor"
              name="amount"
              type="number"
              step="0.01"
              required
              defaultValue={String(record.amount)}
            />
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
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
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
      <select name={name} className="input-field" defaultValue={defaultValue}>
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
