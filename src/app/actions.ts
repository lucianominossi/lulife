"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import {
  accounts,
  budgets,
  categories,
  incomes,
  investments,
  recurringRules,
  transactionInvoices,
  transactions,
} from "@/db/schema";
import { requireUser } from "@/lib/session";
import { currentYearMonth } from "@/lib/dates";
import { applyRecurringRules } from "@/lib/recurring";

function money(value: FormDataEntryValue | null): string {
  const n = parseFloat(String(value ?? "0").replace(",", "."));
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

export async function createCategory(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  await db.insert(categories).values({
    userId: user.id!,
    name: String(formData.get("name")).trim(),
    kind: String(formData.get("kind")) as "expense" | "income",
  });
  revalidatePath("/settings");
}

export async function deleteCategory(id: string) {
  const user = await requireUser();
  const db = await getDb();
  await db
    .delete(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id!)));
  revalidatePath("/settings");
}

export async function createAccount(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  await db.insert(accounts).values({
    userId: user.id!,
    name: String(formData.get("name")).trim(),
    type: String(formData.get("type")) as "credit_card" | "bank",
  });
  revalidatePath("/settings");
}

export async function deleteAccount(id: string) {
  const user = await requireUser();
  const db = await getDb();
  await db
    .delete(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id!)));
  revalidatePath("/settings");
}

export async function upsertBudget(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const categoryId = String(formData.get("categoryId"));
  const yearMonth = String(formData.get("yearMonth"));
  const plannedAmount = money(formData.get("plannedAmount"));

  const existing = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, user.id!),
        eq(budgets.categoryId, categoryId),
        eq(budgets.yearMonth, yearMonth),
      ),
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(budgets)
      .set({ plannedAmount })
      .where(eq(budgets.id, existing[0].id));
  } else {
    await db.insert(budgets).values({
      userId: user.id!,
      categoryId,
      yearMonth,
      plannedAmount,
    });
  }
  revalidatePath(`/month/${yearMonth}`);
  revalidatePath("/settings");
}

export async function deleteBudget(id: string) {
  const user = await requireUser();
  const db = await getDb();
  await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, user.id!)));
  revalidatePath("/settings");
  revalidatePath("/month");
}

export async function createIncome(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const yearMonth =
    String(formData.get("yearMonth") || "") || currentYearMonth();
  await db.insert(incomes).values({
    userId: user.id!,
    description: String(formData.get("description")).trim(),
    amount: money(formData.get("amount")),
    date: String(formData.get("date") || "") || null,
    accountId: String(formData.get("accountId") || "") || null,
    categoryId: String(formData.get("categoryId") || "") || null,
    yearMonth,
  });
  revalidatePath(`/month/${yearMonth}`);
  revalidatePath("/transactions");
}

export async function updateIncome(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const id = String(formData.get("id"));
  const yearMonth =
    String(formData.get("yearMonth") || "") || currentYearMonth();

  await db
    .update(incomes)
    .set({
      description: String(formData.get("description")).trim(),
      amount: money(formData.get("amount")),
      date: String(formData.get("date") || "") || null,
      accountId: String(formData.get("accountId") || "") || null,
      categoryId: String(formData.get("categoryId") || "") || null,
      yearMonth,
    })
    .where(and(eq(incomes.id, id), eq(incomes.userId, user.id!)));

  revalidatePath(`/month/${yearMonth}`);
  revalidatePath("/month");
  revalidatePath("/transactions");
}

export async function deleteIncome(id: string, yearMonth: string) {
  const user = await requireUser();
  const db = await getDb();
  await db
    .delete(incomes)
    .where(and(eq(incomes.id, id), eq(incomes.userId, user.id!)));
  revalidatePath(`/month/${yearMonth}`);
}

export async function createTransaction(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const method = String(formData.get("method")) as "credit" | "pix_debit";
  const yearMonth =
    String(formData.get("yearMonth") || "") || currentYearMonth();
  const invoiceMonths = formData
    .getAll("invoices")
    .map((v) => String(v).trim())
    .filter(Boolean);

  const [tx] = await db
    .insert(transactions)
    .values({
      userId: user.id!,
      description: String(formData.get("description")).trim(),
      amount: money(formData.get("amount")),
      date: String(formData.get("date") || "") || null,
      method,
      accountId: String(formData.get("accountId") || "") || null,
      categoryId: String(formData.get("categoryId") || "") || null,
      yearMonth: method === "pix_debit" ? yearMonth : null,
      notes: String(formData.get("notes") || "") || null,
    })
    .returning();

  if (method === "credit" && invoiceMonths.length) {
    await db.insert(transactionInvoices).values(
      invoiceMonths.map((ym) => ({
        transactionId: tx.id,
        yearMonth: ym,
      })),
    );
  }

  revalidatePath("/transactions");
  revalidatePath(`/month/${yearMonth}`);
  for (const ym of invoiceMonths) revalidatePath(`/month/${ym}`);
}

export async function updateTransaction(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const id = String(formData.get("id"));
  const method = String(formData.get("method")) as "credit" | "pix_debit";
  const yearMonth =
    String(formData.get("yearMonth") || "") || currentYearMonth();
  const invoiceMonths = formData
    .getAll("invoices")
    .map((v) => String(v).trim())
    .filter(Boolean);

  await db
    .update(transactions)
    .set({
      description: String(formData.get("description")).trim(),
      amount: money(formData.get("amount")),
      date: String(formData.get("date") || "") || null,
      method,
      accountId: String(formData.get("accountId") || "") || null,
      categoryId: String(formData.get("categoryId") || "") || null,
      yearMonth: method === "pix_debit" ? yearMonth : null,
      notes: String(formData.get("notes") || "") || null,
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id!)));

  await db
    .delete(transactionInvoices)
    .where(eq(transactionInvoices.transactionId, id));

  if (method === "credit" && invoiceMonths.length) {
    await db.insert(transactionInvoices).values(
      invoiceMonths.map((ym) => ({
        transactionId: id,
        yearMonth: ym,
      })),
    );
  }

  revalidatePath("/transactions");
  revalidatePath("/month");
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();
  const db = await getDb();
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id!)));
  revalidatePath("/transactions");
  revalidatePath("/month");
}

export async function createInvestment(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  await db.insert(investments).values({
    userId: user.id!,
    name: String(formData.get("name")).trim(),
    type: String(formData.get("type")).trim(),
    institution: String(formData.get("institution")).trim(),
    amount: money(formData.get("amount")),
    asOfDate: String(formData.get("asOfDate") || "") || null,
    notes: String(formData.get("notes") || "") || null,
  });
  revalidatePath("/investments");
}

export async function updateInvestment(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const id = String(formData.get("id"));
  await db
    .update(investments)
    .set({
      name: String(formData.get("name")).trim(),
      type: String(formData.get("type")).trim(),
      institution: String(formData.get("institution")).trim(),
      amount: money(formData.get("amount")),
      asOfDate: String(formData.get("asOfDate") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      updatedAt: new Date(),
    })
    .where(and(eq(investments.id, id), eq(investments.userId, user.id!)));
  revalidatePath("/investments");
}

export async function deleteInvestment(id: string) {
  const user = await requireUser();
  const db = await getDb();
  await db
    .delete(investments)
    .where(and(eq(investments.id, id), eq(investments.userId, user.id!)));
  revalidatePath("/investments");
}

export async function createRecurringRule(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const kind = String(formData.get("kind")) as "expense" | "income";
  const method =
    kind === "expense"
      ? (String(formData.get("method")) as "credit" | "pix_debit")
      : null;
  const nextRun =
    String(formData.get("nextRun") || "") || currentYearMonth();

  await db.insert(recurringRules).values({
    userId: user.id!,
    kind,
    description: String(formData.get("description")).trim(),
    amount: money(formData.get("amount")),
    method,
    accountId: String(formData.get("accountId") || "") || null,
    categoryId: String(formData.get("categoryId") || "") || null,
    cadence: "monthly",
    dayOfMonth: parseInt(String(formData.get("dayOfMonth") || "1"), 10) || 1,
    nextRun,
    active: true,
    installmentCount:
      method === "credit"
        ? parseInt(String(formData.get("installmentCount") || "1"), 10) || 1
        : null,
  });
  revalidatePath("/recurring");
}

export async function toggleRecurringRule(id: string, active: boolean) {
  const user = await requireUser();
  const db = await getDb();
  await db
    .update(recurringRules)
    .set({ active })
    .where(
      and(eq(recurringRules.id, id), eq(recurringRules.userId, user.id!)),
    );
  revalidatePath("/recurring");
}

export async function deleteRecurringRule(id: string) {
  const user = await requireUser();
  const db = await getDb();
  await db
    .delete(recurringRules)
    .where(
      and(eq(recurringRules.id, id), eq(recurringRules.userId, user.id!)),
    );
  revalidatePath("/recurring");
}

export async function runRecurringNow() {
  const user = await requireUser();
  await applyRecurringRules(user.id!);
  revalidatePath("/month");
  revalidatePath("/transactions");
  revalidatePath("/recurring");
}

export async function listUserMeta() {
  const user = await requireUser();
  const db = await getDb();
  const [cats, accs] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.userId, user.id!))
      .orderBy(categories.name),
    db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, user.id!))
      .orderBy(accounts.name),
  ]);
  return { categories: cats, accounts: accs };
}
