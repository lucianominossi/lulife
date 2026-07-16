import { and, eq, lte } from "drizzle-orm";
import { getDb } from "@/db";
import {
  incomes,
  recurringRules,
  transactionInvoices,
  transactions,
} from "@/db/schema";
import { addMonths, currentYearMonth } from "@/lib/dates";

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

        if (method === "credit") {
          const count = rule.installmentCount || 1;
          const months = Array.from({ length: count }, (_, i) =>
            addMonths(cursor, i),
          );
          await db.insert(transactionInvoices).values(
            months.map((ym) => ({
              transactionId: tx.id,
              yearMonth: ym,
            })),
          );
        }
      }
      created += 1;
      cursor = addMonths(cursor, 1);
    }

    await db
      .update(recurringRules)
      .set({ nextRun: cursor })
      .where(eq(recurringRules.id, rule.id));
  }

  return created;
}
