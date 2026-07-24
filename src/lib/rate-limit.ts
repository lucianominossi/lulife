import { lt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";

/**
 * Atomic Postgres-backed rate limit (Neon / PGlite).
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
  const windowExpiredAt = new Date(now.getTime() - windowMs);

  // Opportunistic cleanup of expired windows (best-effort).
  await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, new Date(now.getTime() - windowMs * 2)));

  const rows = await db
    .insert(rateLimits)
    .values({
      key,
      count: 1,
      windowStart: now,
    })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE
          WHEN ${rateLimits.windowStart} <= ${windowExpiredAt} THEN 1
          WHEN ${rateLimits.count} >= ${limit} THEN ${rateLimits.count}
          ELSE ${rateLimits.count} + 1
        END`,
        windowStart: sql`CASE
          WHEN ${rateLimits.windowStart} <= ${windowExpiredAt} THEN ${now}
          ELSE ${rateLimits.windowStart}
        END`,
      },
    })
    .returning();

  const row = rows[0];
  if (!row) return true;
  if (row.windowStart.getTime() <= windowExpiredAt.getTime()) return true;
  return row.count <= limit;
}

/**
 * Prefer platform-set client IP over spoofable X-Forwarded-For prefixes.
 * On Vercel, `x-real-ip` / `x-vercel-forwarded-for` are authoritative.
 */
export async function clientIpFromHeaders(
  headersList: Headers,
): Promise<string> {
  const vercel =
    headersList.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip")?.trim();
  if (vercel) return vercel;

  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    // Rightmost hop is typically added by the trusted edge; leftmost can be spoofed.
    const parts = forwarded.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }

  return "unknown";
}
