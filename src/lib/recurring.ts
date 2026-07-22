import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accounts,
  categories,
  incomes,
  recurringRules,
  transactionInvoices,
  transactions,
  type RecurringRule,
} from "@/db/schema";
import { toNumber, currentYearMonth } from "@/lib/dates";

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  if (e.code === "23505" || e.cause?.code === "23505") return true;
  const msg = e.message ?? "";
  return /unique|duplicate key/i.test(msg);
}

function createdYearMonth(rule: RecurringRule): string {
  const d =
    rule.createdAt instanceof Date ? rule.createdAt : new Date(rule.createdAt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ruleCoversMonth(rule: RecurringRule, ym: string): boolean {
  if (!rule.active) return false;
  const n = rule.installmentCount ?? 1;
  // Parcelado N>1 is a one-shot purchase, not a monthly planned item.
  if (rule.kind === "expense" && rule.method === "credit" && n > 1) {
    return false;
  }
  if (createdYearMonth(rule) > ym) return false;
  if (rule.endsOn && ym > rule.endsOn) return false;
  return true;
}

export type PlannedItem = {
  ruleId: string;
  kind: "expense" | "income";
  description: string;
  amount: number;
  method: "credit" | "pix_debit" | null;
  dayOfMonth: number;
  accountId: string | null;
  accountName: string | null;
  categoryId: string | null;
  categoryName: string | null;
  yearMonth: string;
};

async function hasConfirmedOccurrence(
  userId: string,
  rule: RecurringRule,
  ym: string,
): Promise<boolean> {
  const db = await getDb();

  if (rule.kind === "income") {
    const rows = await db
      .select({ id: incomes.id })
      .from(incomes)
      .where(
        and(
          eq(incomes.userId, userId),
          eq(incomes.recurringRuleId, rule.id),
          eq(incomes.yearMonth, ym),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  const method = rule.method || "pix_debit";
  if (method === "pix_debit") {
    const rows = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.recurringRuleId, rule.id),
          eq(transactions.yearMonth, ym),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  // Credit: confirmed if a linked tx already has an invoice for this month.
  const rows = await db
    .select({ id: transactions.id })
    .from(transactions)
    .innerJoin(
      transactionInvoices,
      eq(transactionInvoices.transactionId, transactions.id),
    )
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.recurringRuleId, rule.id),
        eq(transactionInvoices.yearMonth, ym),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Virtual planned items for a month — does not write to the DB. */
export async function listPlannedForMonth(
  userId: string,
  yearMonth: string,
): Promise<PlannedItem[]> {
  const db = await getDb();
  const rules = await db
    .select({
      rule: recurringRules,
      accountName: accounts.name,
      categoryName: categories.name,
    })
    .from(recurringRules)
    .leftJoin(accounts, eq(recurringRules.accountId, accounts.id))
    .leftJoin(categories, eq(recurringRules.categoryId, categories.id))
    .where(
      and(eq(recurringRules.userId, userId), eq(recurringRules.active, true)),
    );

  const planned: PlannedItem[] = [];
  for (const row of rules) {
    const rule = row.rule;
    if (!ruleCoversMonth(rule, yearMonth)) continue;
    if (await hasConfirmedOccurrence(userId, rule, yearMonth)) continue;

    planned.push({
      ruleId: rule.id,
      kind: rule.kind as "expense" | "income",
      description: rule.description,
      amount: toNumber(rule.amount),
      method: (rule.method as "credit" | "pix_debit" | null) ?? null,
      dayOfMonth: rule.dayOfMonth,
      accountId: rule.accountId,
      accountName: row.accountName,
      categoryId: rule.categoryId,
      categoryName: row.categoryName,
      yearMonth,
    });
  }

  planned.sort(
    (a, b) =>
      a.dayOfMonth - b.dayOfMonth || a.description.localeCompare(b.description),
  );
  return planned;
}

export async function sumPlannedNet(
  userId: string,
  yearMonth: string,
): Promise<{ plannedIncome: number; plannedExpense: number }> {
  const items = await listPlannedForMonth(userId, yearMonth);
  let plannedIncome = 0;
  let plannedExpense = 0;
  for (const item of items) {
    if (item.kind === "income") plannedIncome += item.amount;
    else plannedExpense += item.amount;
  }
  return { plannedIncome, plannedExpense };
}

/**
 * Materialize missing recurring occurrences for a month.
 * Future months are never written — only projected in totals.
 */
export async function ensureRecurringForMonth(
  userId: string,
  yearMonth: string,
): Promise<number> {
  const current = currentYearMonth();
  if (yearMonth > current) return 0;

  const db = await getDb();
  const rules = await db
    .select()
    .from(recurringRules)
    .where(
      and(eq(recurringRules.userId, userId), eq(recurringRules.active, true)),
    );

  let created = 0;
  for (const rule of rules) {
    if (!ruleCoversMonth(rule, yearMonth)) continue;
    if (await hasConfirmedOccurrence(userId, rule, yearMonth)) continue;

    const result = await materializeOccurrence(userId, rule, yearMonth);
    if (result) created += 1;
  }

  return created;
}

async function materializeOccurrence(
  userId: string,
  rule: RecurringRule,
  yearMonth: string,
  amountOverride?: number,
): Promise<boolean> {
  const db = await getDb();
  const amount =
    amountOverride != null && Number.isFinite(amountOverride)
      ? amountOverride.toFixed(2)
      : rule.amount;
  const date = `${yearMonth}-${String(rule.dayOfMonth).padStart(2, "0")}`;

  try {
    if (rule.kind === "income") {
      await db.insert(incomes).values({
        userId,
        description: rule.description,
        amount,
        date,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        yearMonth,
        recurringRuleId: rule.id,
      });
    } else {
      const method = rule.method || "pix_debit";
      const [tx] = await db
        .insert(transactions)
        .values({
          userId,
          description: rule.description,
          amount,
          date,
          method,
          accountId: rule.accountId,
          categoryId: rule.categoryId,
          yearMonth: method === "pix_debit" ? yearMonth : null,
          recurringRuleId: rule.id,
        })
        .returning();

      if (method === "credit" && tx) {
        await db.insert(transactionInvoices).values({
          transactionId: tx.id,
          yearMonth,
        });
      }
    }
  } catch (err) {
    if (isUniqueViolation(err)) return false;
    throw err;
  }

  return true;
}

/** @deprecated Manual confirm path; prefer ensureRecurringForMonth. */
export async function confirmPlanned(
  userId: string,
  ruleId: string,
  yearMonth: string,
  amountOverride?: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = await getDb();
  const [rule] = await db
    .select()
    .from(recurringRules)
    .where(
      and(eq(recurringRules.id, ruleId), eq(recurringRules.userId, userId)),
    )
    .limit(1);

  if (!rule) return { ok: false, error: "Regra não encontrada" };
  if (!ruleCoversMonth(rule, yearMonth)) {
    return { ok: false, error: "Regra não cobre este mês" };
  }
  if (await hasConfirmedOccurrence(userId, rule, yearMonth)) {
    return { ok: false, error: "Já confirmado neste mês" };
  }

  const inserted = await materializeOccurrence(
    userId,
    rule,
    yearMonth,
    amountOverride,
  );
  if (!inserted) return { ok: false, error: "Já confirmado neste mês" };

  const amount =
    amountOverride != null && Number.isFinite(amountOverride)
      ? amountOverride.toFixed(2)
      : rule.amount;
  await db
    .update(recurringRules)
    .set({ amount })
    .where(eq(recurringRules.id, rule.id));

  return { ok: true };
}

export async function applyRecurringRules(
  userId: string,
  untilYm?: string,
): Promise<number> {
  const target = untilYm || currentYearMonth();
  const current = currentYearMonth();
  const ym = target > current ? current : target;
  return ensureRecurringForMonth(userId, ym);
}

/** Copy category from the parent rule onto generated rows that still lack one. */
export async function syncCategoriesFromRules(userId: string) {
  const db = await getDb();

  const rulesWithCategory = await db
    .select({
      id: recurringRules.id,
      categoryId: recurringRules.categoryId,
    })
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.userId, userId),
        isNotNull(recurringRules.categoryId),
      ),
    );

  for (const rule of rulesWithCategory) {
    if (!rule.categoryId) continue;
    await db
      .update(transactions)
      .set({ categoryId: rule.categoryId })
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.recurringRuleId, rule.id),
          isNull(transactions.categoryId),
        ),
      );
    await db
      .update(incomes)
      .set({ categoryId: rule.categoryId })
      .where(
        and(
          eq(incomes.userId, userId),
          eq(incomes.recurringRuleId, rule.id),
          isNull(incomes.categoryId),
        ),
      );
  }
}
