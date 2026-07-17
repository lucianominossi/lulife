import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accounts,
  budgets,
  categories,
  incomes,
  transactionInvoices,
  transactions,
} from "@/db/schema";
import { toNumber } from "@/lib/dates";

export type MonthHealth = {
  totalIncome: number;
  totalCredit: number;
  totalPixDebit: number;
  creditByAccount: { accountId: string; accountName: string; total: number }[];
  budgetRows: {
    categoryId: string;
    categoryName: string;
    planned: number;
    spent: number;
    remaining: number;
  }[];
  budgetRemainingTotal: number;
  atual: number;
  projetado: number;
};

export async function computeMonthHealth(
  userId: string,
  yearMonth: string,
): Promise<MonthHealth> {
  const db = await getDb();

  const incomeRows = await db
    .select()
    .from(incomes)
    .where(and(eq(incomes.userId, userId), eq(incomes.yearMonth, yearMonth)));

  const totalIncome = incomeRows.reduce((s, r) => s + toNumber(r.amount), 0);

  const creditInvoiceRows = await db
    .select({
      amount: transactions.amount,
      accountId: transactions.accountId,
      accountName: accounts.name,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
    })
    .from(transactionInvoices)
    .innerJoin(
      transactions,
      eq(transactionInvoices.transactionId, transactions.id),
    )
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.method, "credit"),
        eq(transactionInvoices.yearMonth, yearMonth),
      ),
    );

  const totalCredit = creditInvoiceRows.reduce(
    (s, r) => s + toNumber(r.amount),
    0,
  );

  const byAccount = new Map<string, { accountName: string; total: number }>();
  for (const row of creditInvoiceRows) {
    const key = row.accountId ?? "none";
    const prev = byAccount.get(key) ?? {
      accountName: row.accountName ?? "Sem conta",
      total: 0,
    };
    prev.total += toNumber(row.amount);
    byAccount.set(key, prev);
  }
  const creditByAccount = [...byAccount.entries()].map(
    ([accountId, v]) => ({
      accountId,
      accountName: v.accountName,
      total: v.total,
    }),
  );

  const pixRows = await db
    .select({
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.method, "pix_debit"),
        eq(transactions.yearMonth, yearMonth),
      ),
    );

  const totalPixDebit = pixRows.reduce((s, r) => s + toNumber(r.amount), 0);

  const spentByCategory = new Map<string, { name: string; spent: number }>();

  for (const row of creditInvoiceRows) {
    if (!row.categoryId) continue;
    const prev = spentByCategory.get(row.categoryId) ?? {
      name: row.categoryName ?? "?",
      spent: 0,
    };
    prev.spent += toNumber(row.amount);
    spentByCategory.set(row.categoryId, prev);
  }

  for (const row of pixRows) {
    if (!row.categoryId) continue;
    const prev = spentByCategory.get(row.categoryId) ?? {
      name: row.categoryName ?? "?",
      spent: 0,
    };
    prev.spent += toNumber(row.amount);
    spentByCategory.set(row.categoryId, prev);
  }

  const budgetRowsDb = await db
    .select({
      categoryId: budgets.categoryId,
      planned: budgets.plannedAmount,
      categoryName: categories.name,
    })
    .from(budgets)
    .innerJoin(categories, eq(budgets.categoryId, categories.id))
    .where(and(eq(budgets.userId, userId), eq(budgets.yearMonth, yearMonth)));

  const budgetRows = budgetRowsDb.map((b) => {
    const spent = spentByCategory.get(b.categoryId)?.spent ?? 0;
    const planned = toNumber(b.planned);
    const remaining = Math.max(0, planned - spent);
    return {
      categoryId: b.categoryId,
      categoryName: b.categoryName,
      planned,
      spent,
      remaining,
    };
  });

  const budgetRemainingTotal = budgetRows.reduce(
    (s, r) => s + r.remaining,
    0,
  );

  const atual = totalIncome - totalCredit - totalPixDebit;
  const projetado = atual - budgetRemainingTotal;

  return {
    totalIncome,
    totalCredit,
    totalPixDebit,
    creditByAccount,
    budgetRows,
    budgetRemainingTotal,
    atual,
    projetado,
  };
}

export async function listMonthIncomes(userId: string, yearMonth: string) {
  const db = await getDb();
  return db
    .select({
      id: incomes.id,
      description: incomes.description,
      amount: incomes.amount,
      date: incomes.date,
      accountId: incomes.accountId,
      accountName: accounts.name,
      categoryId: incomes.categoryId,
      categoryName: categories.name,
      yearMonth: incomes.yearMonth,
    })
    .from(incomes)
    .leftJoin(accounts, eq(incomes.accountId, accounts.id))
    .leftJoin(categories, eq(incomes.categoryId, categories.id))
    .where(and(eq(incomes.userId, userId), eq(incomes.yearMonth, yearMonth)))
    .orderBy(asc(incomes.date));
}

export async function listMonthPixDebit(userId: string, yearMonth: string) {
  const db = await getDb();
  return db
    .select({
      id: transactions.id,
      description: transactions.description,
      amount: transactions.amount,
      date: transactions.date,
      accountId: transactions.accountId,
      accountName: accounts.name,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      yearMonth: transactions.yearMonth,
      method: transactions.method,
      notes: transactions.notes,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.method, "pix_debit"),
        eq(transactions.yearMonth, yearMonth),
      ),
    )
    .orderBy(asc(transactions.date));
}

export async function listMonthCredit(userId: string, yearMonth: string) {
  const db = await getDb();
  return db
    .select({
      id: transactions.id,
      description: transactions.description,
      amount: transactions.amount,
      date: transactions.date,
      accountId: transactions.accountId,
      accountName: accounts.name,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      method: transactions.method,
    })
    .from(transactionInvoices)
    .innerJoin(
      transactions,
      eq(transactionInvoices.transactionId, transactions.id),
    )
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.method, "credit"),
        eq(transactionInvoices.yearMonth, yearMonth),
      ),
    )
    .orderBy(asc(transactions.date));
}
