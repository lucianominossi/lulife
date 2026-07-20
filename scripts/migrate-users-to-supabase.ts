/**
 * One-shot: import local Neon/PGlite users into Supabase Auth
 * preserving UUID + bcrypt password_hash.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/migrate-users-to-supabase.ts
 *
 * Requires: DATABASE_URL (or PGlite), NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { getDb } from "../src/db";
import { users } from "../src/db/schema";
import { createAdminClient } from "../src/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();
  const db = await getDb();
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      emailVerified: users.emailVerified,
    })
    .from(users);

  console.log(`Found ${rows.length} local user(s).`);

  for (const user of rows) {
    if (!user.passwordHash) {
      console.warn(`SKIP ${user.email}: no password_hash (already Auth-only?)`);
      continue;
    }

    const { data, error } = await admin.auth.admin.createUser({
      id: user.id,
      email: user.email,
      password_hash: user.passwordHash,
      email_confirm: Boolean(user.emailVerified),
      user_metadata: { name: user.name },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("duplicate") ||
        msg.includes("exists")
      ) {
        console.log(`EXISTS ${user.email} (${user.id})`);
        continue;
      }
      console.error(`FAIL ${user.email}:`, error.message);
      continue;
    }

    console.log(`OK ${data.user.email} (${data.user.id})`);
  }

  console.log("Done. Smoke-test signInWithPassword for a known account.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
