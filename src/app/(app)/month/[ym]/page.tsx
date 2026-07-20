import { Suspense } from "react";
import { eq, inArray } from "drizzle-orm";
import {
  Wallet,
  TrendingUp,
  CreditCard,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { MonthDashboardFrame } from "@/components/month-selector";
import {
  EditIncomeButton,
  EditTransactionButton,
} from "@/components/edit-record";
import { DateWithNotes, DescriptionWithNotes } from "@/components/notes-hint";
import { Money, StatCard } from "@/components/money";
import {
  ExpenseDonutChart,
  MonthTrendChart,
} from "@/components/dashboard-charts";
import { DashboardShimmer } from "@/components/dashboard-shimmer";
import { IconBox } from "@/components/ui/icon-box";
import { ProgressBar } from "@/components/ui/progress-bar";
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
import { addMonths, toNumber, yearMonthToLabel } from "@/lib/dates";
import { deleteIncome, deleteTransaction } from "@/app/actions";
import { getCategoryStyle } from "@/lib/category-style";

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default function MonthPage({
  params,
}: {
  params: Promise<{ ym: string }>;
}) {
  return (
    <Suspense fallback={<DashboardShimmer />}>
      <MonthDashboard params={params} />
    </Suspense>
  );
}

async function MonthDashboard({
  params,
}: {
  params: Promise<{ ym: string }>;
}) {
  const { ym } = await params;
  const user = await requireUser();
  await applyRecurringRules(user.id!, ym);

  const prevYm = addMonths(ym, -1);
  const trendMonths = Array.from({ length: 6 }, (_, i) =>
    addMonths(ym, i - 5),
  );

  const [health, prevHealth, incomeList, pixList, creditList, ...trendHealth] =
    await Promise.all([
      computeMonthHealth(user.id!, ym),
      computeMonthHealth(user.id!, prevYm),
      listMonthIncomes(user.id!, ym),
      listMonthPixDebit(user.id!, ym),
      listMonthCredit(user.id!, ym),
      ...trendMonths.map((m) => computeMonthHealth(user.id!, m)),
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
  const totalExpenses = health.totalCredit + health.totalPixDebit;
  const prevExpenses = prevHealth.totalCredit + prevHealth.totalPixDebit;

  const trendData = trendMonths.map((m, i) => {
    const h = trendHealth[i];
    return {
      label: yearMonthToLabel(m),
      income: h.totalIncome,
      expenses: h.totalCredit + h.totalPixDebit,
      balance: h.atual,
    };
  });

  const spentByCategory = new Map<string, number>();
  for (const row of [...creditList, ...pixList]) {
    const name = row.categoryName ?? "Outros";
    spentByCategory.set(
      name,
      (spentByCategory.get(name) ?? 0) + toNumber(row.amount),
    );
  }
  const expenseCategories = [...spentByCategory.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  type RecentItem = {
    id: string;
    kind: "income" | "expense";
    description: string;
    categoryName: string | null;
    date: string;
    amount: number;
    edit: React.ReactNode;
    remove: React.ReactNode;
  };

  const recent: RecentItem[] = [
    ...incomeList.map((row) => ({
      id: `in-${row.id}`,
      kind: "income" as const,
      description: row.description,
      categoryName: row.categoryName,
      date: row.date ?? "",
      amount: toNumber(row.amount),
      edit: (
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
      ),
      remove: (
        <form action={deleteIncome.bind(null, row.id, ym)}>
          <button
            type="submit"
            className="text-xs text-[var(--color-ink-subtle)] transition hover:text-[var(--color-danger)]"
          >
            excluir
          </button>
        </form>
      ),
    })),
    ...pixList.map((row) => ({
      id: `pix-${row.id}`,
      kind: "expense" as const,
      description: row.description,
      categoryName: row.categoryName,
      date: row.date ?? "",
      amount: toNumber(row.amount),
      edit: (
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
      ),
      remove: (
        <form action={deleteTransaction.bind(null, row.id)}>
          <button
            type="submit"
            className="text-xs text-[var(--color-ink-subtle)] transition hover:text-[var(--color-danger)]"
          >
            excluir
          </button>
        </form>
      ),
    })),
    ...creditList.map((row) => ({
      id: `cr-${row.id}`,
      kind: "expense" as const,
      description: row.description,
      categoryName: row.categoryName,
      date: row.date ?? "",
      amount: toNumber(row.amount),
      edit: (
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
            notes: row.notes,
            invoices: invoicesByTx.get(row.id) ?? [ym],
          }}
          categories={cats}
          accounts={accs}
        />
      ),
      remove: (
        <form action={deleteTransaction.bind(null, row.id)}>
          <button
            type="submit"
            className="text-xs text-[var(--color-ink-subtle)] transition hover:text-[var(--color-danger)]"
          >
            excluir
          </button>
        </form>
      ),
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8);

  return (
    <MonthDashboardFrame yearMonth={ym} meta={meta}>
      <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          className="animate-fade-in animate-delay-1"
          label="Saldo atual"
          value={health.atual}
          tone={health.atual >= 0 ? "positive" : "negative"}
          hint="Entradas − gastos"
          icon={Wallet}
          iconTone="savings"
          changePct={pctChange(health.atual, prevHealth.atual)}
        />
        <StatCard
          className="animate-fade-in animate-delay-2"
          label="Entradas"
          value={health.totalIncome}
          tone="positive"
          hint="Receitas do mês"
          icon={TrendingUp}
          iconTone="income"
          changePct={pctChange(health.totalIncome, prevHealth.totalIncome)}
        />
        <StatCard
          className="animate-fade-in animate-delay-3"
          label="Gastos"
          value={totalExpenses}
          tone="negative"
          hint="Cartões + Pix/Débito"
          icon={CreditCard}
          iconTone="expense"
          changePct={pctChange(totalExpenses, prevExpenses)}
        />
        <StatCard
          className="animate-fade-in animate-delay-4"
          label="Projetado"
          value={health.projetado}
          tone={health.projetado >= 0 ? "positive" : "negative"}
          hint="Desconta orçamento restante"
          icon={PiggyBank}
          iconTone="invest"
          changePct={pctChange(health.projetado, prevHealth.projetado)}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <MonthTrendChart data={trendData} />
        <ExpenseDonutChart data={expenseCategories} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Panel
          title="Lançamentos recentes"
          subtitle="Últimas movimentações do mês"
          className="xl:col-span-1"
        >
          {recent.length === 0 ? (
            <Empty />
          ) : (
            <ul className="divide-y divide-white/5">
              {recent.map((item) => {
                const style = getCategoryStyle(item.categoryName ?? item.description);
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
                  >
                    <IconBox
                      icon={style.icon}
                      tone={item.kind === "income" ? "income" : style.tone}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.description}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--color-ink-subtle)]">
                        {item.categoryName ?? "Sem categoria"} · {item.date}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
                        {item.kind === "income" ? (
                          <ArrowDownLeft
                            size={12}
                            className="text-[var(--color-ok)]"
                          />
                        ) : (
                          <ArrowUpRight
                            size={12}
                            className="text-[var(--color-danger)]"
                          />
                        )}
                        <Money
                          value={item.amount}
                          tone={
                            item.kind === "income" ? "positive" : "negative"
                          }
                        />
                      </span>
                      <div className="flex items-center gap-2">
                        {item.edit}
                        {item.remove}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Orçamento" subtitle="Progresso por categoria">
          {health.budgetRows.length === 0 ? (
            <Empty text="Nenhum orçamento neste mês" />
          ) : (
            <ul className="space-y-5">
              {health.budgetRows.map((b) => {
                const pct =
                  b.planned > 0
                    ? Math.min(100, (b.spent / b.planned) * 100)
                    : 0;
                const over = b.spent > b.planned;
                const style = getCategoryStyle(b.categoryName);
                return (
                  <li key={b.categoryId}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <IconBox icon={style.icon} tone={style.tone} size="sm" />
                        {b.categoryName}
                      </span>
                      <span className="text-xs tabular-nums text-[var(--color-ink-muted)]">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                    <ProgressBar
                      value={b.spent}
                      max={b.planned}
                      tone={over ? "danger" : "savings"}
                    />
                    <div className="mt-1.5 flex justify-between text-xs text-[var(--color-ink-subtle)]">
                      <span>
                        <Money value={b.spent} /> gasto
                      </span>
                      <span>
                        <Money value={b.planned} /> planejado
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Fatura por cartão" subtitle="Crédito no mês">
          {health.creditByAccount.length === 0 ? (
            <Empty text="Nenhuma fatura neste mês" />
          ) : (
            <ul className="space-y-3">
              {health.creditByAccount.map((a) => (
                <li
                  key={a.accountId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3.5 py-3"
                >
                  <span className="flex items-center gap-2.5 text-sm font-medium">
                    <IconBox icon={CreditCard} tone="expense" size="sm" />
                    {a.accountName}
                  </span>
                  <Money value={a.total} tone="negative" />
                </li>
              ))}
              <li className="flex items-center justify-between border-t border-white/5 pt-3 text-sm">
                <span className="text-[var(--color-ink-muted)]">Total cartões</span>
                <Money value={health.totalCredit} className="font-semibold" />
              </li>
            </ul>
          )}
        </Panel>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Entradas"
          count={incomeList.length}
          trailing={<Money value={health.totalIncome} tone="positive" />}
        >
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
                    className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-danger)]"
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
            headers={["Descrição", "Categoria", "Data", "Valor", ""]}
            rows={pixList.map((row) => [
              row.description,
              row.categoryName ?? "—",
              <DateWithNotes key="d" date={row.date} notes={row.notes} />,
              <Money key="m" value={toNumber(row.amount)} tone="negative" />,
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
                    className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-danger)]"
                  >
                    excluir
                  </button>
                </form>
              </div>,
            ])}
          />
        </Panel>
      </div>

      <Panel title="Crédito na fatura" count={creditList.length}>
        {creditList.length === 0 && <Empty />}
        <DataTable
          headers={["Descrição", "Categoria", "Cartão", "Valor", ""]}
          rows={creditList.map((row) => [
            <DescriptionWithNotes
              key="d"
              description={row.description}
              notes={row.notes}
            />,
            row.categoryName ?? "—",
            row.accountName ?? "—",
            <Money key="m" value={toNumber(row.amount)} tone="negative" />,
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
                  notes: row.notes,
                  invoices: invoicesByTx.get(row.id) ?? [ym],
                }}
                categories={cats}
                accounts={accs}
              />
              <form action={deleteTransaction.bind(null, row.id)}>
                <button
                  type="submit"
                  className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-danger)]"
                >
                  excluir
                </button>
              </form>
            </div>,
          ])}
        />
      </Panel>
      </div>
    </MonthDashboardFrame>
  );
}

function Panel({
  title,
  subtitle,
  count,
  trailing,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  count?: number;
  trailing?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel overflow-hidden ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/5 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {title}
            {typeof count === "number" && (
              <span className="ml-2 text-sm font-normal text-[var(--color-ink-subtle)]">
                {count}
              </span>
            )}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
              {subtitle}
            </p>
          )}
        </div>
        {trailing}
      </div>
      <div className="p-6">{children}</div>
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
    <div className="-mx-2 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
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
              className="border-t border-white/5 transition hover:bg-white/[0.02]"
            >
              {cols.map((c, j) => (
                <td key={j} className="px-3 py-3 align-middle">
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
    <p className="rounded-xl border border-dashed border-white/10 px-3 py-10 text-center text-sm text-[var(--color-ink-muted)]">
      {text}
    </p>
  );
}
