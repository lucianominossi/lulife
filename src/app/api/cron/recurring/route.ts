import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ensureRecurringForMonth } from "@/lib/recurring";
import { currentYearMonth } from "@/lib/dates";

function bearerMatches(header: string | null, secret: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const token = header.slice("Bearer ".length);
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const allUsers = await db.select({ id: users.id }).from(users);
  const ym = currentYearMonth();
  let total = 0;
  for (const u of allUsers) {
    total += await ensureRecurringForMonth(u.id, ym);
  }

  return NextResponse.json({ ok: true, created: total, yearMonth: ym });
}
