import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { users } from "./schema";

async function seed() {
  const email = (process.env.SEED_EMAIL || "luciano@lulife.app").toLowerCase();
  const password = process.env.SEED_PASSWORD || "lulife123";
  const name = process.env.SEED_NAME || "Luciano";
  const force = process.env.SEED_FORCE === "1";

  const db = await getDb();
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const passwordHash = await bcrypt.hash(password, 12);

  if (existing.length) {
    if (force) {
      await db
        .update(users)
        .set({ passwordHash, name, emailVerified: new Date() })
        .where(eq(users.id, existing[0].id));
      console.log(`Updated password for: ${email}`);
      return;
    }
    if (!existing[0].emailVerified) {
      await db
        .update(users)
        .set({ emailVerified: new Date() })
        .where(eq(users.id, existing[0].id));
      console.log(`Marked email verified for: ${email}`);
      return;
    }
    console.log(`User already exists: ${email}`);
    return;
  }

  const [user] = await db
    .insert(users)
    .values({ email, name, passwordHash, emailVerified: new Date() })
    .returning();

  console.log(`Created user ${user.email} (${user.id})`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
