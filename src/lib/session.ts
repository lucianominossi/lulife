import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { redirect } from "next/navigation";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const db = await getDb();
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      sessionVersion: users.sessionVersion,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // Session JWT can outlive a DB reset — force re-login (no cookie writes here)
  if (!user) {
    redirect("/login?error=session");
  }

  // Password reset bumps sessionVersion; reject stale JWTs
  if ((session.user.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) {
    redirect("/login?error=session");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
