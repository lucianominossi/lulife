"use server";

import { and, eq, gt, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
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
import {
  currentYearMonth,
  dateToYearMonth,
  invoiceMonthFromDate,
  addMonths,
} from "@/lib/dates";
import {
  assertOwnedAccount,
  assertOwnedCategory,
} from "@/lib/ownership";

function parseEndsOn(formData: FormData): string | null {
  const raw = String(formData.get("endsOn") || "").trim();
  if (!raw) return null;
  return dateToYearMonth(raw) || raw || null;
}
const MONEY_ABS_MAX = 99_999_999.99;

const methodSchema = z.enum(["credit", "pix_debit"]);
const kindSchema = z.enum(["expense", "income"]);
const accountTypeSchema = z.enum(["credit_card", "bank"]);

/** Negatives allowed (refunds/estornos). Rejects non-finite and absurd magnitudes. */
function money(value: FormDataEntryValue | null): string {
  let raw = String(value ?? "0").replace(/[^\d.,-]/g, "");
  if (raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  }
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || Math.abs(n) > MONEY_ABS_MAX) {
    throw new Error("Valor inválido");
  }
  return n.toFixed(2);
}

function parseMethod(formData: FormData): "credit" | "pix_debit" {
  return methodSchema.parse(String(formData.get("method") || ""));
}

function parseKind(formData: FormData): "expense" | "income" {
  return kindSchema.parse(String(formData.get("kind") || ""));
}

/** Empty, 0, NaN, or invalid → 1; otherwise clamp to 1–48. */
function parseInstallmentCount(formData: FormData): number {
  const raw = String(formData.get("installmentCount") ?? "").trim();
  if (!raw) return 1;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(48, n);
}

export async function createCategory(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const kind = String(formData.get("kind")) as "expense" | "income";
  const result = await createCategoryInline({ name, kind });
  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function createCategoryInline({
  name,
  kind,
}: {
  name: string;
  kind: "expense" | "income";
}): Promise<
  | { ok: true; id: string; name: string; kind: "expense" | "income" }
  | { ok: false; error: string }
> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: "Informe o nome da categoria." };
  }
  if (kind !== "expense" && kind !== "income") {
    return { ok: false, error: "Tipo de categoria inválido." };
  }

  const user = await requireUser();
  const db = await getDb();

  const [existing] = await db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
    })
    .from(categories)
    .where(
      and(
        eq(categories.userId, user.id!),
        eq(categories.name, trimmed),
        eq(categories.kind, kind),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      ok: true,
      id: existing.id,
      name: existing.name,
      kind: existing.kind as "expense" | "income",
    };
  }

  const [created] = await db
    .insert(categories)
    .values({
      userId: user.id!,
      name: trimmed,
      kind,
    })
    .returning();

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/recurring");
  revalidatePath("/month");

  return {
    ok: true,
    id: created.id,
    name: created.name,
    kind: created.kind as "expense" | "income",
  };
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
  const type = accountTypeSchema.parse(String(formData.get("type") || ""));
  await db.insert(accounts).values({
    userId: user.id!,
    name: String(formData.get("name")).trim(),
    type,
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
  const categoryId = await assertOwnedCategory(
    user.id!,
    String(formData.get("categoryId") || "") || null,
  );
  if (!categoryId) throw new Error("Categoria inválida");
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
  const accountId = await assertOwnedAccount(
    user.id!,
    String(formData.get("accountId") || "") || null,
  );
  const categoryId = await assertOwnedCategory(
    user.id!,
    String(formData.get("categoryId") || "") || null,
  );
  await db.insert(incomes).values({
    userId: user.id!,
    description: String(formData.get("description")).trim(),
    amount: money(formData.get("amount")),
    date: String(formData.get("date") || "") || null,
    accountId,
    categoryId,
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
  const accountId = await assertOwnedAccount(
    user.id!,
    String(formData.get("accountId") || "") || null,
  );
  const categoryId = await assertOwnedCategory(
    user.id!,
    String(formData.get("categoryId") || "") || null,
  );

  await db
    .update(incomes)
    .set({
      description: String(formData.get("description")).trim(),
      amount: money(formData.get("amount")),
      date: String(formData.get("date") || "") || null,
      accountId,
      categoryId,
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

function resolveExpenseMonths(formData: FormData) {
  const method = parseMethod(formData);
  const date = String(formData.get("date") || "").trim();
  const faturaClosed =
    formData.get("faturaClosed") === "on" ||
    formData.get("faturaClosed") === "1" ||
    formData.get("faturaClosed") === "true";

  if (!date) {
    throw new Error("Data da compra é obrigatória");
  }

  if (method === "credit") {
    const invoiceYm = invoiceMonthFromDate(date, faturaClosed);
    if (!invoiceYm) throw new Error("Data inválida");
    return { method, date, yearMonth: null as string | null, invoiceYm };
  }

  const purchaseYm = dateToYearMonth(date);
  if (!purchaseYm) throw new Error("Data inválida");
  return { method, date, yearMonth: purchaseYm, invoiceYm: null as string | null };
}

export async function createTransaction(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const { method, date, yearMonth, invoiceYm } = resolveExpenseMonths(formData);

  const description = String(formData.get("description")).trim();
  const amount = money(formData.get("amount"));
  const accountId = await assertOwnedAccount(
    user.id!,
    String(formData.get("accountId") || "") || null,
  );
  const categoryId = await assertOwnedCategory(
    user.id!,
    String(formData.get("categoryId") || "") || null,
  );
  const notes = String(formData.get("notes") || "") || null;

  const installmentCount = parseInstallmentCount(formData);
  const recurringFlag =
    formData.get("recurring") === "on" ||
    formData.get("recurring") === "1" ||
    formData.get("recurring") === "true";
  // Parcelado (N>1) never creates an ongoing rule.
  const wantRecurring =
    recurringFlag && !(method === "credit" && installmentCount > 1);

  const dateDay = Math.min(
    28,
    Math.max(1, parseInt(date.slice(8, 10), 10) || 1),
  );
  const dayOfMonth = Math.min(
    28,
    Math.max(
      1,
      parseInt(String(formData.get("dayOfMonth") || dateDay), 10) || dateDay,
    ),
  );

  let recurringRuleId: string | null = null;
  if (wantRecurring) {
    const baseYm =
      method === "credit" && invoiceYm
        ? invoiceYm
        : yearMonth || dateToYearMonth(date);
    if (!baseYm) throw new Error("Data inválida para recorrência");
    const nextRun = addMonths(baseYm, 1);

    const [rule] = await db
      .insert(recurringRules)
      .values({
        userId: user.id!,
        kind: "expense",
        description,
        amount,
        method,
        accountId,
        categoryId,
        cadence: "monthly",
        dayOfMonth,
        nextRun,
        endsOn: parseEndsOn(formData),
        active: true,
        installmentCount: method === "credit" ? 1 : null,
      })
      .returning();
    recurringRuleId = rule.id;
  }

  const [tx] = await db
    .insert(transactions)
    .values({
      userId: user.id!,
      description,
      amount,
      date,
      method,
      accountId,
      categoryId,
      yearMonth,
      notes,
      recurringRuleId,
    })
    .returning();

  const invoiceMonths: string[] = [];
  if (method === "credit" && invoiceYm) {
    for (let i = 0; i < installmentCount; i++) {
      invoiceMonths.push(addMonths(invoiceYm, i));
    }
    await db.insert(transactionInvoices).values(
      invoiceMonths.map((ym) => ({
        transactionId: tx.id,
        yearMonth: ym,
      })),
    );
  }

  revalidatePath("/transactions");
  if (yearMonth) revalidatePath(`/month/${yearMonth}`);
  for (const ym of invoiceMonths) {
    revalidatePath(`/month/${ym}`);
  }
  if (recurringRuleId) revalidatePath("/recurring");
}

export async function updateTransaction(formData: FormData) {
  const user = await requireUser();
  const db = await getDb();
  const id = String(formData.get("id"));
  const { method, date, yearMonth, invoiceYm } = resolveExpenseMonths(formData);
  const installmentCount = parseInstallmentCount(formData);

  const [owned] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id!)))
    .limit(1);
  if (!owned) {
    throw new Error("Lançamento não encontrado");
  }

  const existingInvoices = await db
    .select({ yearMonth: transactionInvoices.yearMonth })
    .from(transactionInvoices)
    .where(eq(transactionInvoices.transactionId, id));

  await db
    .update(transactions)
    .set({
      description: String(formData.get("description")).trim(),
      amount: money(formData.get("amount")),
      date,
      method,
      accountId: await assertOwnedAccount(
        user.id!,
        String(formData.get("accountId") || "") || null,
      ),
      categoryId: await assertOwnedCategory(
        user.id!,
        String(formData.get("categoryId") || "") || null,
      ),
      yearMonth,
      notes: String(formData.get("notes") || "") || null,
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id!)));

  await db
    .delete(transactionInvoices)
    .where(eq(transactionInvoices.transactionId, id));

  const invoiceMonths: string[] = [];
  if (method === "credit" && invoiceYm) {
    for (let i = 0; i < installmentCount; i++) {
      invoiceMonths.push(addMonths(invoiceYm, i));
    }
    await db.insert(transactionInvoices).values(
      invoiceMonths.map((ym) => ({
        transactionId: id,
        yearMonth: ym,
      })),
    );
  }

  const monthsToRevalidate = new Set<string>([
    ...existingInvoices.map((r) => r.yearMonth),
    ...invoiceMonths,
  ]);
  if (yearMonth) monthsToRevalidate.add(yearMonth);

  revalidatePath("/transactions");
  revalidatePath("/month");
  for (const ym of monthsToRevalidate) {
    revalidatePath(`/month/${ym}`);
  }
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
  const kind = parseKind(formData);
  const method =
    kind === "expense" ? parseMethod(formData) : null;
  const rawNext = String(formData.get("nextRun") || "").trim();
  const nextRun = dateToYearMonth(rawNext) || rawNext || currentYearMonth();
  const dayOfMonth = Math.min(
    28,
    Math.max(1, parseInt(String(formData.get("dayOfMonth") || "1"), 10) || 1),
  );
  const accountId = await assertOwnedAccount(
    user.id!,
    String(formData.get("accountId") || "") || null,
  );
  const categoryId = await assertOwnedCategory(
    user.id!,
    String(formData.get("categoryId") || "") || null,
  );

  const installmentCount = method === "credit" ? 1 : null;

  await db.insert(recurringRules).values({
    userId: user.id!,
    kind,
    description: String(formData.get("description")).trim(),
    amount: money(formData.get("amount")),
    method,
    accountId,
    categoryId,
    cadence: "monthly",
    dayOfMonth,
    nextRun,
    endsOn: parseEndsOn(formData),
    active: true,
    installmentCount,
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
  const current = currentYearMonth();

  const [rule] = await db
    .select({ id: recurringRules.id })
    .from(recurringRules)
    .where(
      and(eq(recurringRules.id, id), eq(recurringRules.userId, user.id!)),
    )
    .limit(1);

  if (!rule) return;

  // Remove future incomes generated by this rule (keep past + current)
  await db
    .delete(incomes)
    .where(
      and(
        eq(incomes.userId, user.id!),
        eq(incomes.recurringRuleId, id),
        gt(incomes.yearMonth, current),
      ),
    );

  // Remove future Pix/Débito transactions
  await db
    .delete(transactions)
    .where(
      and(
        eq(transactions.userId, user.id!),
        eq(transactions.recurringRuleId, id),
        eq(transactions.method, "pix_debit"),
        gt(transactions.yearMonth, current),
      ),
    );

  // Credit: drop future invoice links; delete orphaned transactions
  const creditTxs = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id!),
        eq(transactions.recurringRuleId, id),
        eq(transactions.method, "credit"),
      ),
    );

  if (creditTxs.length > 0) {
    const txIds = creditTxs.map((t) => t.id);

    await db
      .delete(transactionInvoices)
      .where(
        and(
          inArray(transactionInvoices.transactionId, txIds),
          gt(transactionInvoices.yearMonth, current),
        ),
      );

    for (const txId of txIds) {
      const remaining = await db
        .select({ id: transactionInvoices.id })
        .from(transactionInvoices)
        .where(eq(transactionInvoices.transactionId, txId))
        .limit(1);

      if (remaining.length === 0) {
        await db
          .delete(transactions)
          .where(
            and(eq(transactions.id, txId), eq(transactions.userId, user.id!)),
          );
      }
    }
  }

  await db
    .delete(recurringRules)
    .where(
      and(eq(recurringRules.id, id), eq(recurringRules.userId, user.id!)),
    );

  revalidatePath("/recurring");
  revalidatePath("/transactions");
  revalidatePath("/month");
}

export async function runRecurringNow() {
  const user = await requireUser();
  const { ensureRecurringForMonth } = await import("@/lib/recurring");
  const { currentYearMonth } = await import("@/lib/dates");
  await ensureRecurringForMonth(user.id!, currentYearMonth());
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
