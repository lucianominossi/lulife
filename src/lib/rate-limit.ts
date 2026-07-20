import { eq, lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Simple Postgres-backed rate limit (Neon Free / PGlite).
 * Returns true if the request is allowed.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const db = await getDb();
  const now = new Date();
  const windowMs = windowSec * 1000;

  // Opportunistic cleanup of expired windows
  await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, new Date(now.getTime() - windowMs * 2)));

  const [row] = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, key))
    .limit(1);

  if (!row) {
    await db.insert(rateLimits).values({
      key,
      count: 1,
      windowStart: now,
    });
    return true;
  }

  const elapsed = now.getTime() - row.windowStart.getTime();
  if (elapsed >= windowMs) {
    await db
      .update(rateLimits)
      .set({ count: 1, windowStart: now })
      .where(eq(rateLimits.key, key));
    return true;
  }

  if (row.count >= limit) {
    return false;
  }

  await db
    .update(rateLimits)
    .set({ count: sql`${rateLimits.count} + 1` })
    .where(eq(rateLimits.key, key));
  return true;
}

export async function clientIpFromHeaders(
  headersList: Headers,
): Promise<string> {
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headersList.get("x-real-ip")?.trim() || "unknown";
}
