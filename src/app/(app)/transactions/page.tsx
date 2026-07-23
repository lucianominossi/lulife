import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { deleteTransaction } from "@/app/actions";
import { CategoryFilter } from "@/components/category-filter";
import { DeleteButton } from "@/components/delete-button";
import { EditTransactionButton } from "@/components/edit-record";
import { FaturaSelector } from "@/components/fatura-selector";
import { Money } from "@/components/money";
import { DescriptionWithNotes } from "@/components/notes-hint";
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

function transactionsHref(opts: {
  ym: string;
  method?: string | null;
  account?: string | null;
  category?: string | null;
}) {
  const params = new URLSearchParams();
  params.set("ym", opts.ym);
  if (opts.method) params.set("method", opts.method);
  if (opts.account) params.set("account", opts.account);
  if (opts.category) params.set("category", opts.category);
  return `/transactions?${params.toString()}`;
}

const ACCOUNT_ACCENTS = [
  "#3b82f6",
  "#22c55e",
  "#f43f5e",
  "#fb923c",
  "#facc15",
  "#2dd4bf",
] as const;

const NONE_ACCENT = "#64748b";

/** Stable distinct colors by display order (avoids hash collisions). */
function buildAccentMap(accountIds: string[]): Map<string, string> {
  const map = new Map<string, string>();
  accountIds.forEach((id, i) => {
    map.set(id, ACCOUNT_ACCENTS[i % ACCOUNT_ACCENTS.length]);
  });
  return map;
}

function accentFor(
  accountId: string | null,
  accents: Map<string, string>,
): string {
  if (!accountId) return NONE_ACCENT;
  return accents.get(accountId) ?? ACCOUNT_ACCENTS[0];
}

function softAccent(color: string, amount = 16): string {
  return `color-mix(in srgb, ${color} ${amount}%, transparent)`;
}

type MonthTx = Awaited<ReturnType<typeof listMonthCredit>>[number];

type AccountMeta = { id: string; name: string; type: string };

type AccountGroup = {
  key: string;
  accountId: string | null;
  accountName: string;
  accountType: string;
  rows: MonthTx[];
  total: number;
};

function groupTransactionsByAccount(
  rows: MonthTx[],
  accountMeta: AccountMeta[],
): AccountGroup[] {
  const byId = new Map(accountMeta.map((a) => [a.id, a]));
  const map = new Map<string, AccountGroup>();

  for (const row of rows) {
    const key = row.accountId ?? "__none__";
    const meta = row.accountId ? byId.get(row.accountId) : null;
    let group = map.get(key);
    if (!group) {
      group = {
        key,
        accountId: row.accountId,
        accountName: row.accountName ?? meta?.name ?? "Sem conta",
        accountType: meta?.type ?? (row.method === "credit" ? "credit_card" : "bank"),
        rows: [],
        total: 0,
      };
      map.set(key, group);
    }
    group.rows.push(row);
    group.total += toNumber(row.amount);
  }

  const typeRank = (type: string) =>
    type === "credit_card" ? 0 : type === "bank" ? 1 : 2;

  return [...map.values()].sort((a, b) => {
    const rankDiff = typeRank(a.accountType) - typeRank(b.accountType);
    if (rankDiff !== 0) return rankDiff;
    if (a.key === "__none__") return 1;
    if (b.key === "__none__") return -1;
    return a.accountName.localeCompare(b.accountName, "pt-BR");
  });
}

function methodChipClass(active: boolean) {
  return `rounded-xl px-3.5 py-2 text-sm font-medium transition ${
    active
      ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
      : "border border-[var(--border-strong)] text-[var(--color-ink-muted)] hover:bg-[var(--hover-fill)] hover:text-[var(--ink)]"
  }`;
}

function accountChipClass(active: boolean) {
  return `inline-flex items-center rounded-xl px-3.5 py-2 text-sm font-medium transition border ${
    active ? "" : "hover:bg-[var(--hover-fill)]"
  }`;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    method?: string;
    q?: string;
    ym?: string;
    account?: string;
    category?: string;
  }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const db = await getDb();

  const yearMonth = isValidYearMonth(sp.ym) ? sp.ym : currentYearMonth();
  const methodFilter =
    sp.method === "credit" || sp.method === "pix_debit" ? sp.method : null;

  const [creditRows, pixRows, cats, accs] = await Promise.all([
    methodFilter === "pix_debit"
      ? Promise.resolve([] as MonthTx[])
      : listMonthCredit(user.id!, yearMonth),
    methodFilter === "credit"
      ? Promise.resolve([] as MonthTx[])
      : listMonthPixDebit(user.id!, yearMonth),
    db.select().from(categories).where(eq(categories.userId, user.id!)),
    db.select().from(accounts).where(eq(accounts.userId, user.id!)),
  ]);

  const accountMeta: AccountMeta[] = accs.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
  }));
  const ownedAccountIds = new Set(accountMeta.map((a) => a.id));
  const accountFilter =
    sp.account && ownedAccountIds.has(sp.account) ? sp.account : null;

  const ownedCategoryIds = new Set(cats.map((c) => c.id));
  const categoryFilter =
    sp.category === "none"
      ? "none"
      : sp.category && ownedCategoryIds.has(sp.category)
        ? sp.category
        : null;

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

  const searchFiltered = sp.q
    ? rows.filter((r) =>
        r.description.toLowerCase().includes(sp.q!.toLowerCase()),
      )
    : rows;

  const accountsInMonth = (() => {
    const seen = new Map<string, AccountMeta>();
    for (const row of searchFiltered) {
      if (!row.accountId) continue;
      const meta = accountMeta.find((a) => a.id === row.accountId);
      if (meta && !seen.has(meta.id)) seen.set(meta.id, meta);
    }
    return [...seen.values()].sort((a, b) => {
      const rank = (t: string) => (t === "credit_card" ? 0 : 1);
      const d = rank(a.type) - rank(b.type);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  })();

  const categoriesInMonth = (() => {
    const seen = new Map<string, { id: string; name: string }>();
    let hasUncategorized = false;
    for (const row of searchFiltered) {
      if (!row.categoryId) {
        hasUncategorized = true;
        continue;
      }
      if (!seen.has(row.categoryId)) {
        seen.set(row.categoryId, {
          id: row.categoryId,
          name: row.categoryName ?? "Categoria",
        });
      }
    }
    const options = [...seen.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
    return { options, hasUncategorized };
  })();

  const afterAccount = accountFilter
    ? searchFiltered.filter((r) => r.accountId === accountFilter)
    : searchFiltered;

  const filtered =
    categoryFilter === "none"
      ? afterAccount.filter((r) => !r.categoryId)
      : categoryFilter
        ? afterAccount.filter((r) => r.categoryId === categoryFilter)
        : afterAccount;

  const groups = groupTransactionsByAccount(filtered, accountMeta);
  const listTotal = filtered.reduce((s, r) => s + toNumber(r.amount), 0);
  const accentMap = buildAccentMap(accountsInMonth.map((a) => a.id));

  const methodLinks = [
    {
      href: transactionsHref({
        ym: yearMonth,
        account: accountFilter,
        category: categoryFilter,
      }),
      label: "Todos",
      active: !methodFilter,
    },
    {
      href: transactionsHref({
        ym: yearMonth,
        method: "credit",
        account: accountFilter,
        category: categoryFilter,
      }),
      label: "Crédito",
      active: methodFilter === "credit",
    },
    {
      href: transactionsHref({
        ym: yearMonth,
        method: "pix_debit",
        account: accountFilter,
        category: categoryFilter,
      }),
      label: "Pix/Débito",
      active: methodFilter === "pix_debit",
    },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex min-w-0 flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[32px] font-bold tracking-tight">Gastos</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Crédito e Pix/Débito · {yearMonthToLabel(yearMonth)}
          </p>
        </div>
        <div className="flex min-w-0 max-w-full flex-wrap items-end gap-3">
          <FaturaSelector
            yearMonth={yearMonth}
            method={methodFilter}
            account={accountFilter}
            category={categoryFilter}
          />
          <CategoryFilter
            yearMonth={yearMonth}
            method={methodFilter}
            account={accountFilter}
            category={categoryFilter}
            options={categoriesInMonth.options}
            hasUncategorized={categoriesInMonth.hasUncategorized}
          />
          <div className="flex max-w-full flex-wrap gap-2">
            {methodLinks.map((f) => (
              <Link
                key={f.href}
                href={f.href}
                className={methodChipClass(f.active)}
              >
                {f.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      {accountsInMonth.length > 0 && (
        <div className="flex max-w-full flex-wrap gap-2">
          <Link
            href={transactionsHref({
              ym: yearMonth,
              method: methodFilter,
              category: categoryFilter,
            })}
            className={methodChipClass(!accountFilter)}
          >
            Todas as contas
          </Link>
          {accountsInMonth.map((a, index) => {
            const color =
              accentMap.get(a.id) ??
              ACCOUNT_ACCENTS[index % ACCOUNT_ACCENTS.length];
            const active = accountFilter === a.id;
            return (
              <Link
                key={a.id}
                href={transactionsHref({
                  ym: yearMonth,
                  method: methodFilter,
                  account: a.id,
                  category: categoryFilter,
                })}
                className={accountChipClass(active)}
                style={{
                  borderColor: color,
                  color: active ? color : "var(--color-ink-muted)",
                  background: active
                    ? softAccent(color, 20)
                    : softAccent(color, 8),
                }}
              >
                <span
                  aria-hidden
                  className="inline-block shrink-0 rounded-full"
                  style={{
                    backgroundColor: color,
                    marginRight: 6,
                    width: 10,
                    height: 10,
                  }}
                />
                {a.name}
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="min-w-0 max-w-full">
          <TransactionForm categories={cats} accounts={accs} />
        </div>

        <div className="min-w-0 max-w-full space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <h2 className="font-display text-lg font-semibold">
              Lista{" "}
              <span className="text-sm font-normal text-[var(--color-ink-muted)]">
                {filtered.length}
              </span>
            </h2>
            {filtered.length > 0 && (
              <span className="text-sm text-[var(--color-ink-muted)]">
                Total{" "}
                <Money
                  value={listTotal}
                  className="font-medium text-[var(--color-ink)]"
                />
              </span>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="panel px-5 py-10 text-center text-sm text-[var(--color-ink-muted)]">
              Nenhum gasto neste filtro.
            </div>
          ) : (
            groups.map((group) => {
              const color = accentFor(group.accountId, accentMap);
              return (
                <section
                  key={group.key}
                  className="panel min-w-0 overflow-hidden border-l-4"
                  style={{ borderLeftColor: color }}
                >
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                    style={{ background: softAccent(color, 12) }}
                  >
                    <div className="min-w-0">
                      <h3
                        className="flex items-center font-medium"
                        style={{ color }}
                      >
                        <span
                          aria-hidden
                          className="inline-block shrink-0 rounded-full"
                          style={{
                            backgroundColor: color,
                            marginRight: 6,
                            width: 10,
                            height: 10,
                          }}
                        />
                        <span className="truncate">{group.accountName}</span>
                      </h3>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        {group.rows.length}{" "}
                        {group.rows.length === 1
                          ? "lançamento"
                          : "lançamentos"}
                        {group.accountType === "credit_card"
                          ? " · Cartão"
                          : group.accountType === "bank"
                            ? " · Conta"
                            : ""}
                      </p>
                    </div>
                    <Money
                      value={group.total}
                      className="shrink-0 font-semibold"
                    />
                  </div>

                  {/* Mobile cards */}
                  <ul className="divide-y divide-[var(--border)] md:hidden">
                    {group.rows.map((row) => {
                      const invs = invoicesByTx.get(row.id) ?? [];
                      return (
                        <li key={row.id} className="space-y-2 px-4 py-3.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium leading-snug">
                                <DescriptionWithNotes
                                  description={row.description}
                                  notes={row.notes}
                                />
                              </p>
                              <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                                {formatDateBR(row.date)} ·{" "}
                                {row.method === "credit"
                                  ? "Crédito"
                                  : "Pix/Débito"}
                                {row.categoryName
                                  ? ` · ${row.categoryName}`
                                  : ""}
                              </p>
                              <p className="mt-0.5 text-xs text-[var(--color-brand)]">
                                {invs.length
                                  ? invs.map(yearMonthToLabel).join(", ")
                                  : row.yearMonth
                                    ? yearMonthToLabel(row.yearMonth)
                                    : "—"}
                              </p>
                            </div>
                            <Money
                              value={toNumber(row.amount)}
                              className="shrink-0 font-semibold"
                            />
                          </div>
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
                            <form
                              action={deleteTransaction.bind(null, row.id)}
                            >
                              <DeleteButton />
                            </form>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                          <th className="px-4 py-2.5 font-medium">Descrição</th>
                          <th className="px-4 py-2.5 font-medium">Data</th>
                          <th className="px-4 py-2.5 font-medium">Método</th>
                          <th className="px-4 py-2.5 font-medium">
                            Categoria
                          </th>
                          <th className="px-4 py-2.5 font-medium">
                            Faturas / Mês
                          </th>
                          <th className="px-4 py-2.5 font-medium">Valor</th>
                          <th className="px-4 py-2.5 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => {
                          const invs = invoicesByTx.get(row.id) ?? [];
                          return (
                            <tr
                              key={row.id}
                              className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/40"
                            >
                              <td className="px-4 py-3 font-medium">
                                <DescriptionWithNotes
                                  description={row.description}
                                  notes={row.notes}
                                />
                              </td>
                              <td className="px-4 py-3 tabular-nums text-[var(--color-ink-muted)]">
                                {formatDateBR(row.date)}
                              </td>
                              <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                                {row.method === "credit"
                                  ? "Crédito"
                                  : "Pix/Débito"}
                              </td>
                              <td className="px-4 py-3">
                                {row.categoryName ?? "—"}
                              </td>
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
                                  <form
                                    action={deleteTransaction.bind(
                                      null,
                                      row.id,
                                    )}
                                  >
                                    <DeleteButton />
                                  </form>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
