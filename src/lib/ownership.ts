import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, categories } from "@/db/schema";

export async function assertOwnedAccount(
  userId: string,
  accountId: string | null,
): Promise<string | null> {
  if (!accountId) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .limit(1);
  if (!row) {
    throw new Error("Conta inválida");
  }
  return row.id;
}

export async function assertOwnedCategory(
  userId: string,
  categoryId: string | null,
): Promise<string | null> {
  if (!categoryId) return null;
  const db = await getDb();
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);
  if (!row) {
    throw new Error("Categoria inválida");
  }
  return row.id;
}
