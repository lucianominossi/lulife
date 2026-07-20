import { and, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { getDb } from "@/db";
import {
  incomes,
  recurringRules,
  transactionInvoices,
  transactions,
} from "@/db/schema";
import { addMonths, currentYearMonth } from "@/lib/dates";

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  if (e.code === "23505" || e.cause?.code === "23505") return true;
  const msg = e.message ?? "";
  return /unique|duplicate key/i.test(msg);
}

/** Copy category from the parent rule onto generated rows that still lack one. */
async function syncCategoriesFromRules(userId: string) {
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

export async function applyRecurringRules(userId: string, untilYm?: string) {
  const db = await getDb();
  const target = untilYm || currentYearMonth();

  const rules = await db
    .select()
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.userId, userId),
        eq(recurringRules.active, true),
        lte(recurringRules.nextRun, target),
      ),
    );

  let created = 0;

  for (const rule of rules) {
    let cursor = rule.nextRun;
    while (cursor <= target) {
      let inserted = false;
      try {
        if (rule.kind === "income") {
          await db.insert(incomes).values({
            userId,
            description: rule.description,
            amount: rule.amount,
            date: `${cursor}-${String(rule.dayOfMonth).padStart(2, "0")}`,
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            yearMonth: cursor,
            recurringRuleId: rule.id,
          });
          inserted = true;
        } else {
          const method = rule.method || "pix_debit";
          const [tx] = await db
            .insert(transactions)
            .values({
              userId,
              description: rule.description,
              amount: rule.amount,
              date: `${cursor}-${String(rule.dayOfMonth).padStart(2, "0")}`,
              method,
              accountId: rule.accountId,
              categoryId: rule.categoryId,
              yearMonth: method === "pix_debit" ? cursor : null,
              recurringRuleId: rule.id,
            })
            .returning();

          inserted = true;

          if (method === "credit" && tx) {
            const count = rule.installmentCount || 1;
            const months = Array.from({ length: count }, (_, i) =>
              addMonths(cursor, i),
            );
            try {
              await db.insert(transactionInvoices).values(
                months.map((ym) => ({
                  transactionId: tx.id,
                  yearMonth: ym,
                })),
              );
            } catch (invErr) {
              if (!isUniqueViolation(invErr)) throw invErr;
            }
          }
        }
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        // Already generated for this cursor — still CAS-advance next_run.
      }

      const nextCursor = addMonths(cursor, 1);
      await db
        .update(recurringRules)
        .set({ nextRun: nextCursor })
        .where(
          and(
            eq(recurringRules.id, rule.id),
            eq(recurringRules.nextRun, cursor),
          ),
        );

      // Neon HTTP may not support UPDATE RETURNING — verify CAS via read.
      const [after] = await db
        .select({ nextRun: recurringRules.nextRun })
        .from(recurringRules)
        .where(eq(recurringRules.id, rule.id))
        .limit(1);

      if (after?.nextRun !== nextCursor) {
        // Another worker won the CAS — stop this rule.
        break;
      }

      if (inserted) created += 1;
      cursor = nextCursor;
    }
  }

  await syncCategoriesFromRules(userId);

  return created;
}
