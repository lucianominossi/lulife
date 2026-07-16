import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { applyRecurringRules } from "@/lib/recurring";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const allUsers = await db.select({ id: users.id }).from(users);
  let total = 0;
  for (const u of allUsers) {
    total += await applyRecurringRules(u.id);
  }

  return NextResponse.json({ ok: true, created: total });
}
