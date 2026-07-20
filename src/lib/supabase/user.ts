import { eq } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";
import { getDb } from "@/db";
import { users } from "@/db/schema";

function displayName(user: User): string {
  const meta = user.user_metadata as { name?: string } | undefined;
  const fromMeta = meta?.name?.trim();
  if (fromMeta) return fromMeta;
  const local = user.email?.split("@")[0]?.trim();
  return local || "Usuário";
}

/** Upsert local profile so ledger FKs match Supabase auth.users.id. */
export async function ensureLocalUser(user: User) {
  if (!user.email) {
    throw new Error("Usuário Supabase sem email.");
  }

  const db = await getDb();
  const email = user.email.toLowerCase();
  const name = displayName(user);
  const emailVerified = user.email_confirmed_at
    ? new Date(user.email_confirmed_at)
    : null;

  const [byId] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (byId) {
    const patch: Partial<typeof users.$inferInsert> = {};
    if (byId.email !== email) patch.email = email;
    if (byId.name !== name && name) patch.name = name;
    if (emailVerified) patch.emailVerified = emailVerified;
    if (Object.keys(patch).length) {
      await db.update(users).set(patch).where(eq(users.id, user.id));
    }
    return {
      id: user.id,
      email,
      name: patch.name ?? byId.name,
    };
  }

  const [byEmail] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (byEmail && byEmail.id !== user.id) {
    // Should not happen after proper migration; avoid breaking FKs silently.
    throw new Error(
      `Email ${email} já existe localmente com outro id. Rode a migração de usuários.`,
    );
  }

  await db.insert(users).values({
    id: user.id,
    email,
    name,
    emailVerified,
    passwordHash: null,
  });

  return { id: user.id, email, name };
}
