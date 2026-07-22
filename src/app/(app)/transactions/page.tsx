import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { deleteTransaction } from "@/app/actions";
import { EditTransactionButton } from "@/components/edit-record";
import { FaturaSelector } from "@/components/fatura-selector";
import { Money } from "@/components/money";
import { TransactionForm } from "@/components/transaction-form";
import { getDb } from "@/db";
import { accounts, categories, transactionInvoices } from "@/db/schema";
import {
  currentYearMonth,
  formatDateBR,
  toNumber,
  yearMonthToLabel,
} from "@/lib/dates";
import { listMonthCredit, listMonthPixDebit } from "@/lib/finance";
import { requireUser } from "@/lib/session";

function isValidYearMonth(ym: string | undefined): ym is string {
  return !!ym && /^\d{4}-\d{2}$/.test(ym);
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string; q?: string; ym?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = await getDb();

  const yearMonth = isValidYearMonth(sp.ym) ? sp.ym : currentYearMonth();
  const methodFilter =
    sp.method === "credit" || sp.method === "pix_debit" ? sp.method : null;

  const [creditRows, pixRows] = await Promise.all([
    methodFilter === "pix_debit"
      ? Promise.resolve([])
      : listMonthCredit(user.id!, yearMonth),
    methodFilter === "credit"
      ? Promise.resolve([])
      : listMonthPixDebit(user.id!, yearMonth),
  ]);

  const rows = [...creditRows, ...pixRows].sort((a, b) => {
    const dateA = a.date ?? "";
    const dateB = b.date ?? "";
    return dateB === dateA ? 0 : dateB > dateA ? 1 : -1;
  });

  const txIds = rows.map((r) => r.id);
  const invoices =
    txIds.length > 0
      ? await db
          .select()
          .from(transactionInvoices)
          .where(inArray(transactionInvoices.transactionId, txIds))
      : [];
  const invoicesByTx = new Map<string, string[]>();
  for (const inv of invoices) {
    const list = invoicesByTx.get(inv.transactionId) ?? [];
    list.push(inv.yearMonth);
    invoicesByTx.set(inv.transactionId, list);
  }

  const [cats, accs] = await Promise.all([
    db.select().from(categories).where(eq(categories.userId, user.id!)),
    db.select().from(accounts).where(eq(accounts.userId, user.id!)),
  ]);

  const filtered = sp.q
    ? rows.filter((r) =>
        r.description.toLowerCase().includes(sp.q!.toLowerCase()),
      )
    : rows;

  const methodLinks = [
    {
      href: `/transactions?ym=${yearMonth}`,
      label: "Todos",
      active: !methodFilter,
    },
    {
      href: `/transactions?ym=${yearMonth}&method=credit`,
      label: "Crédito",
      active: methodFilter === "credit",
    },
    {
      href: `/transactions?ym=${yearMonth}&method=pix_debit`,
      label: "Pix/Débito",
      active: methodFilter === "pix_debit",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight">Gastos</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Crédito e Pix/Débito · {yearMonthToLabel(yearMonth)}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <FaturaSelector yearMonth={yearMonth} method={methodFilter} />
          <div className="flex gap-2">
            {methodLinks.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                  f.active
                    ? "bg-[var(--accent-soft)] text-[#C4B5FD]"
                    : "border border-[var(--border-strong)] text-[var(--color-ink-muted)] hover:bg-white/5 hover:text-white"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <div className="grid items-start gap-6 xl:grid-cols-[320px_1fr]">
        <TransactionForm categories={cats} accounts={accs} />

        <div className="panel overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-display text-lg font-semibold">
              Lista{" "}
              <span className="text-sm font-normal text-[var(--color-ink-muted)]">
                {filtered.length}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Método</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Conta</th>
                  <th className="px-4 py-3 font-medium">Faturas / Mês</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const invs = invoicesByTx.get(row.id) ?? [];
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/40"
                    >
                      <td className="px-4 py-3 font-medium">{row.description}</td>
                      <td className="px-4 py-3 tabular-nums text-[var(--color-ink-muted)]">
                        {formatDateBR(row.date)}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                        {row.method === "credit" ? "Crédito" : "Pix/Débito"}
                      </td>
                      <td className="px-4 py-3">{row.categoryName ?? "—"}</td>
                      <td className="px-4 py-3">{row.accountName ?? "—"}</td>
                      <td className="px-4 py-3 text-[var(--color-brand)]">
                        {invs.length
                          ? invs.map(yearMonthToLabel).join(", ")
                          : row.yearMonth
                            ? yearMonthToLabel(row.yearMonth)
                            : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Money value={toNumber(row.amount)} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <EditTransactionButton
                            record={{
                              id: row.id,
                              description: row.description,
                              amount: row.amount,
                              date: row.date,
                              method: row.method,
                              yearMonth: row.yearMonth,
                              accountId: row.accountId,
                              categoryId: row.categoryId,
                              notes: row.notes,
                              invoices: invs,
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
