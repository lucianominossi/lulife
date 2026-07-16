import { eq, inArray } from "drizzle-orm";
import { MonthSelector } from "@/components/month-selector";
import { FabQuickAdd } from "@/components/fab-quick-add";
import {
  EditIncomeButton,
  EditTransactionButton,
} from "@/components/edit-record";
import { Money, StatCard } from "@/components/money";
import { getDb } from "@/db";
import { accounts, categories, transactionInvoices } from "@/db/schema";
import {
  computeMonthHealth,
  listMonthCredit,
  listMonthIncomes,
  listMonthPixDebit,
} from "@/lib/finance";
import { applyRecurringRules } from "@/lib/recurring";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/dates";
import { deleteIncome, deleteTransaction } from "@/app/actions";

export default async function MonthPage({
  params,
}: {
  params: Promise<{ ym: string }>;
}) {
  const { ym } = await params;
  const user = await requireUser();
  await applyRecurringRules(user.id!, ym);

  const health = await computeMonthHealth(user.id!, ym);
  const [incomeList, pixList, creditList] = await Promise.all([
    listMonthIncomes(user.id!, ym),
    listMonthPixDebit(user.id!, ym),
    listMonthCredit(user.id!, ym),
  ]);

  const db = await getDb();
  const [cats, accs] = await Promise.all([
    db.select().from(categories).where(eq(categories.userId, user.id!)),
    db.select().from(accounts).where(eq(accounts.userId, user.id!)),
  ]);

  const creditIds = creditList.map((r) => r.id);
  const creditInvoices =
    creditIds.length > 0
      ? await db
          .select()
          .from(transactionInvoices)
          .where(inArray(transactionInvoices.transactionId, creditIds))
      : [];
  const invoicesByTx = new Map<string, string[]>();
  for (const inv of creditInvoices) {
    const list = invoicesByTx.get(inv.transactionId) ?? [];
    list.push(inv.yearMonth);
    invoicesByTx.set(inv.transactionId, list);
  }

  const meta = { categories: cats, accounts: accs };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <MonthSelector yearMonth={ym} />
        <FabQuickAdd yearMonth={ym} meta={meta} inline />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Atual"
          value={health.atual}
          tone={health.atual >= 0 ? "positive" : "negative"}
          hint="Entradas − gastos"
        />
        <StatCard
          label="Projetado"
          value={health.projetado}
          tone={health.projetado >= 0 ? "positive" : "negative"}
          hint="Desconta orçamento restante"
        />
        <StatCard label="Entradas" value={health.totalIncome} />
        <StatCard label="Cartões" value={health.totalCredit} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Panel title="Entradas" count={incomeList.length}>
            {incomeList.length === 0 && <Empty />}
            <DataTable
              headers={["Descrição", "Categoria", "Conta", "Valor", ""]}
              rows={incomeList.map((row) => [
                row.description,
                row.categoryName ?? "—",
                row.accountName ?? "—",
                <Money key="m" value={toNumber(row.amount)} tone="positive" />,
                <div key="a" className="flex items-center gap-3">
                  <EditIncomeButton
                    record={{
                      id: row.id,
                      description: row.description,
                      amount: row.amount,
                      date: row.date,
                      yearMonth: row.yearMonth,
                      accountId: row.accountId,
                      categoryId: row.categoryId,
                    }}
                    categories={cats}
                    accounts={accs}
                  />
                  <form action={deleteIncome.bind(null, row.id, ym)}>
                    <button
                      type="submit"
                      className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-danger)]"
                    >
                      excluir
                    </button>
                  </form>
                </div>,
              ])}
            />
          </Panel>

          <Panel
            title="Pix / Débito"
            count={pixList.length}
            trailing={<Money value={health.totalPixDebit} tone="muted" />}
          >
            {pixList.length === 0 && <Empty />}
            <DataTable
              headers={["Descrição", "Categoria", "Obs.", "Valor", ""]}
              rows={pixList.map((row) => [
                row.description,
                row.categoryName ?? "—",
                row.notes ?? "—",
                <Money key="m" value={toNumber(row.amount)} />,
                <div key="a" className="flex items-center gap-3">
                  <EditTransactionButton
                    record={{
                      id: row.id,
                      description: row.description,
                      amount: row.amount,
                      date: row.date,
                      method: "pix_debit",
                      yearMonth: row.yearMonth,
                      accountId: row.accountId,
                      categoryId: row.categoryId,
                      notes: row.notes,
                    }}
                    categories={cats}
                    accounts={accs}
                  />
                  <form action={deleteTransaction.bind(null, row.id)}>
                    <button
                      type="submit"
                      className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-danger)]"
                    >
                      excluir
                    </button>
                  </form>
                </div>,
              ])}
            />
          </Panel>

          <Panel title="Crédito na fatura" count={creditList.length}>
            {creditList.length === 0 && <Empty />}
            <DataTable
              headers={["Descrição", "Categoria", "Cartão", "Valor", ""]}
              rows={creditList.map((row) => [
                row.description,
                row.categoryName ?? "—",
                row.accountName ?? "—",
                <Money key="m" value={toNumber(row.amount)} />,
                <div key="a" className="flex items-center gap-3">
                  <EditTransactionButton
                    record={{
                      id: row.id,
                      description: row.description,
                      amount: row.amount,
                      date: row.date,
                      method: "credit",
                      yearMonth: ym,
                      accountId: row.accountId,
                      categoryId: row.categoryId,
                      invoices: invoicesByTx.get(row.id) ?? [ym],
                    }}
                    categories={cats}
                    accounts={accs}
                  />
                  <form action={deleteTransaction.bind(null, row.id)}>
                    <button
                      type="submit"
                      className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-danger)]"
                    >
                      excluir
                    </button>
                  </form>
                </div>,
              ])}
            />
          </Panel>
        </div>

        <div className="space-y-6">
          {health.creditByAccount.length > 0 && (
            <Panel title="Fatura por cartão">
              <ul className="divide-y divide-[var(--color-border)]">
                {health.creditByAccount.map((a) => (
                  <li
                    key={a.accountId}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <span className="font-medium">{a.accountName}</span>
                    <Money value={a.total} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Orçamento">
            {health.budgetRows.length === 0 && (
              <Empty text="Nenhum orçamento neste mês" />
            )}
            <ul className="space-y-4">
              {health.budgetRows.map((b) => {
                const pct =
                  b.planned > 0
                    ? Math.min(100, (b.spent / b.planned) * 100)
                    : 0;
                const over = b.spent > b.planned;
                return (
                  <li key={b.categoryId}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="font-medium">{b.categoryName}</span>
                      <span className="tabular-nums text-[var(--color-ink-muted)]">
                        <Money value={b.spent} /> / <Money value={b.planned} />
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                      <div
                        className={`h-full rounded-full ${over ? "bg-[var(--color-danger)]" : "bg-[var(--color-brand)]"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

      <FabQuickAdd yearMonth={ym} meta={meta} />
    </div>
  );
}

function Panel({
  title,
  count,
  trailing,
  children,
}: {
  title: string;
  count?: number;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-4">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {title}
          {typeof count === "number" && (
            <span className="ml-2 text-sm font-normal text-[var(--color-ink-muted)]">
              {count}
            </span>
          )}
        </h2>
        {trailing}
      </div>
      <div className="p-2 sm:p-3">{children}</div>
    </section>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
            {headers.map((h) => (
              <th key={h || "actions"} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cols, i) => (
            <tr
              key={i}
              className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/50"
            >
              {cols.map((c, j) => (
                <td key={j} className="px-3 py-2.5 align-middle">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ text = "Nenhum item" }: { text?: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--color-border)] px-3 py-8 text-center text-sm text-[var(--color-ink-muted)]">
      {text}
    </p>
  );
}
