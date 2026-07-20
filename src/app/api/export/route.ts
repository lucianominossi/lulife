import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import {
  accounts,
  budgets,
  categories,
  incomes,
  investments,
  recurringRules,
  transactions,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  const db = await getDb();
  const uid = user.id;

  const [
    profile,
    cats,
    accs,
    txs,
    incs,
    buds,
    invs,
    rules,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, uid))
      .limit(1),
    db.select().from(categories).where(eq(categories.userId, uid)),
    db.select().from(accounts).where(eq(accounts.userId, uid)),
    db.select().from(transactions).where(eq(transactions.userId, uid)),
    db.select().from(incomes).where(eq(incomes.userId, uid)),
    db.select().from(budgets).where(eq(budgets.userId, uid)),
    db.select().from(investments).where(eq(investments.userId, uid)),
    db.select().from(recurringRules).where(eq(recurringRules.userId, uid)),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: profile[0] ?? null,
    categories: cats,
    accounts: accs,
    transactions: txs,
    incomes: incs,
    budgets: buds,
    investments: invs,
    recurringRules: rules,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="lulife-export-${uid.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
