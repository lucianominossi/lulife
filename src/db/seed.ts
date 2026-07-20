import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { users } from "./schema";
import { createAdminClient } from "@/lib/supabase/admin";

async function seed() {
  const email = (process.env.SEED_EMAIL || "luciano@lulife.app").toLowerCase();
  const password = process.env.SEED_PASSWORD || "lulife123";
  const name = process.env.SEED_NAME || "Luciano";
  const force = process.env.SEED_FORCE === "1";

  const admin = createAdminClient();
  const db = await getDb();

  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existingAuth = listed?.users?.find(
    (u) => u.email?.toLowerCase() === email,
  );

  let authUserId = existingAuth?.id;

  if (existingAuth && force) {
    const { error } = await admin.auth.admin.updateUserById(existingAuth.id, {
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) throw error;
    console.log(`Updated Supabase password for: ${email}`);
  } else if (!existingAuth) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error) throw error;
    authUserId = data.user.id;
    console.log(`Created Supabase user ${email} (${authUserId})`);
  } else {
    console.log(`Supabase user already exists: ${email}`);
  }

  if (!authUserId) {
    throw new Error("Could not resolve Supabase user id");
  }

  const [local] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUserId))
    .limit(1);

  if (!local) {
    const [byEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (byEmail) {
      console.log(
        `Local user exists with email ${email} but id ${byEmail.id} ≠ ${authUserId}. Run migrate-users-to-supabase or align IDs.`,
      );
      return;
    }

    await db.insert(users).values({
      id: authUserId,
      email,
      name,
      emailVerified: new Date(),
      passwordHash: null,
    });
    console.log(`Created local mirror for ${email}`);
    return;
  }

  if (force) {
    await db
      .update(users)
      .set({ name, emailVerified: new Date() })
      .where(eq(users.id, authUserId));
    console.log(`Updated local mirror for: ${email}`);
  } else {
    console.log(`Local mirror already exists: ${email}`);
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
