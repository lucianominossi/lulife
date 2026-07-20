/**
 * One-off: copy app data from local PGlite (.data/pglite) into Neon.
 *
 * Usage (app local stopped; Neon schema already applied via db:push):
 *   DATABASE_URL="postgresql://...sslmode=require" npm run db:migrate-to-neon
 *
 * Does not write DATABASE_URL into .env.local — keep local on PGlite.
 * Deduplicates PGlite PK twins (heap corruption) before insert.
 */
import { PGlite } from "@electric-sql/pglite";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const TABLES = [
  "users",
  "categories",
  "accounts",
  "recurring_rules",
  "transactions",
  "transaction_invoices",
  "incomes",
  "budgets",
  "investments",
  "auth_tokens",
  "rate_limits",
] as const;

type Row = Record<string, unknown>;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function dedupeById(
  pglite: PGlite,
  table: string,
  orderBy: string,
): Promise<{ raw: number; rows: Row[] }> {
  await pglite.exec(`SET enable_indexscan = off; SET enable_bitmapscan = off;`);
  const all = await pglite.query(`SELECT * FROM ${table}`);
  const raw = all.rows.length;
  const preferred = await pglite.query(
    `SELECT DISTINCT ON (id) * FROM ${table} ORDER BY id, ${orderBy}`,
  );
  await pglite.exec(`SET enable_indexscan = on; SET enable_bitmapscan = on;`);
  return { raw, rows: preferred.rows as Row[] };
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL (Neon) is required. Do not set it in .env.local.");
  }

  const dataDir = path.resolve(process.cwd(), ".data", "pglite");
  if (!fs.existsSync(dataDir)) {
    throw new Error(`PGlite data dir missing: ${dataDir}`);
  }
  try {
    fs.unlinkSync(path.join(dataDir, "postmaster.pid"));
  } catch {
    // ignore
  }

  const pglite = await PGlite.create(dataDir);
  const remote = drizzleNeon(neon(url), { schema });

  for (const table of [...TABLES].reverse()) {
    await remote.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE`));
  }

  const users = await dedupeById(
    pglite,
    "users",
    "email_verified DESC NULLS LAST, session_version DESC, created_at DESC",
  );
  // Also ensure unique emails (corrupt twins may share email across ids)
  const usersByEmail = new Map<string, Row>();
  for (const u of users.rows) {
    const email = String(u.email).toLowerCase();
    const prev = usersByEmail.get(email);
    if (!prev) {
      usersByEmail.set(email, u);
      continue;
    }
    const prevScore =
      (prev.email_verified ? 2 : 0) + Number(prev.session_version ?? 0);
    const nextScore = (u.email_verified ? 2 : 0) + Number(u.session_version ?? 0);
    if (nextScore >= prevScore) usersByEmail.set(email, u);
  }
  const userRows = [...usersByEmail.values()].map((u) => ({
    id: u.id as string,
    name: u.name as string,
    email: u.email as string,
    emailVerified: u.email_verified ? new Date(String(u.email_verified)) : null,
    image: (u.image as string) ?? null,
    passwordHash: u.password_hash as string,
    sessionVersion: Number(u.session_version ?? 0),
    createdAt: new Date(String(u.created_at)),
  }));
  if (userRows.length) await remote.insert(schema.users).values(userRows);
  const keepUserIds = new Set(userRows.map((u) => u.id));

  const categories = await dedupeById(pglite, "categories", "created_at DESC");
  const categoryRows = categories.rows
    .filter((r) => keepUserIds.has(String(r.user_id)))
    .map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      name: r.name as string,
      kind: r.kind as "expense" | "income",
      createdAt: new Date(String(r.created_at)),
    }));
  // unique (user_id, name, kind)
  const catKey = new Set<string>();
  const categoriesUnique = categoryRows.filter((c) => {
    const k = `${c.userId}|${c.name}|${c.kind}`;
    if (catKey.has(k)) return false;
    catKey.add(k);
    return true;
  });
  if (categoriesUnique.length) {
    await remote.insert(schema.categories).values(categoriesUnique);
  }
  const keepCategoryIds = new Set(categoriesUnique.map((c) => c.id));

  const accounts = await dedupeById(pglite, "accounts", "created_at DESC");
  const accountRows = accounts.rows
    .filter((r) => keepUserIds.has(String(r.user_id)))
    .map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      name: r.name as string,
      type: r.type as "credit_card" | "bank",
      createdAt: new Date(String(r.created_at)),
    }));
  const accKey = new Set<string>();
  const accountsUnique = accountRows.filter((a) => {
    const k = `${a.userId}|${a.name}`;
    if (accKey.has(k)) return false;
    accKey.add(k);
    return true;
  });
  if (accountsUnique.length) {
    await remote.insert(schema.accounts).values(accountsUnique);
  }
  const keepAccountIds = new Set(accountsUnique.map((a) => a.id));

  const rules = await dedupeById(pglite, "recurring_rules", "created_at DESC");
  const ruleRows = rules.rows
    .filter((r) => keepUserIds.has(String(r.user_id)))
    .map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      kind: r.kind as "expense" | "income",
      description: r.description as string,
      amount: String(r.amount),
      method: (r.method as "credit" | "pix_debit" | null) ?? null,
      accountId:
        r.account_id && keepAccountIds.has(String(r.account_id))
          ? (r.account_id as string)
          : null,
      categoryId:
        r.category_id && keepCategoryIds.has(String(r.category_id))
          ? (r.category_id as string)
          : null,
      cadence: (r.cadence as "monthly") ?? "monthly",
      dayOfMonth: Number(r.day_of_month ?? 1),
      nextRun: r.next_run as string,
      active: Boolean(r.active),
      installmentCount:
        r.installment_count == null ? null : Number(r.installment_count),
      createdAt: new Date(String(r.created_at)),
    }));
  if (ruleRows.length) await remote.insert(schema.recurringRules).values(ruleRows);
  const keepRuleIds = new Set(ruleRows.map((r) => r.id));

  const txs = await dedupeById(pglite, "transactions", "created_at DESC");
  // Prefer dated rows; drop date-null orphans that collide with recurrings
  const txRows = txs.rows
    .filter((r) => keepUserIds.has(String(r.user_id)))
    .map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      description: r.description as string,
      amount: String(r.amount),
      date: (r.date as string) ?? null,
      method: r.method as "credit" | "pix_debit",
      accountId:
        r.account_id && keepAccountIds.has(String(r.account_id))
          ? (r.account_id as string)
          : null,
      categoryId:
        r.category_id && keepCategoryIds.has(String(r.category_id))
          ? (r.category_id as string)
          : null,
      yearMonth: (r.year_month as string) ?? null,
      notes: (r.notes as string) ?? null,
      recurringRuleId:
        r.recurring_rule_id && keepRuleIds.has(String(r.recurring_rule_id))
          ? (r.recurring_rule_id as string)
          : null,
      createdAt: new Date(String(r.created_at)),
    }));
  // unique (recurring_rule_id, date) when both set
  const recDateKey = new Set<string>();
  const txsUnique = txRows.filter((t) => {
    if (t.recurringRuleId && t.date) {
      const k = `${t.recurringRuleId}|${t.date}`;
      if (recDateKey.has(k)) return false;
      recDateKey.add(k);
    }
    return true;
  });
  for (const slice of chunk(txsUnique, 80)) {
    await remote.insert(schema.transactions).values(slice);
  }
  const keepTxIds = new Set(txsUnique.map((t) => t.id));

  const invoices = await dedupeById(
    pglite,
    "transaction_invoices",
    "year_month DESC",
  );
  const invKey = new Set<string>();
  const invoiceRows = invoices.rows
    .filter((r) => keepTxIds.has(String(r.transaction_id)))
    .map((r) => ({
      id: r.id as string,
      transactionId: r.transaction_id as string,
      yearMonth: r.year_month as string,
    }))
    .filter((r) => {
      const k = `${r.transactionId}|${r.yearMonth}`;
      if (invKey.has(k)) return false;
      invKey.add(k);
      return true;
    });
  for (const slice of chunk(invoiceRows, 80)) {
    await remote.insert(schema.transactionInvoices).values(slice);
  }

  const incomes = await dedupeById(pglite, "incomes", "created_at DESC");
  const incomeRecKey = new Set<string>();
  const incomeRows = incomes.rows
    .filter((r) => keepUserIds.has(String(r.user_id)))
    .map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      description: r.description as string,
      amount: String(r.amount),
      date: (r.date as string) ?? null,
      accountId:
        r.account_id && keepAccountIds.has(String(r.account_id))
          ? (r.account_id as string)
          : null,
      categoryId:
        r.category_id && keepCategoryIds.has(String(r.category_id))
          ? (r.category_id as string)
          : null,
      yearMonth: r.year_month as string,
      notes: (r.notes as string) ?? null,
      recurringRuleId:
        r.recurring_rule_id && keepRuleIds.has(String(r.recurring_rule_id))
          ? (r.recurring_rule_id as string)
          : null,
      createdAt: new Date(String(r.created_at)),
    }))
    .filter((r) => {
      if (r.recurringRuleId) {
        const k = `${r.recurringRuleId}|${r.yearMonth}`;
        if (incomeRecKey.has(k)) return false;
        incomeRecKey.add(k);
      }
      return true;
    });
  for (const slice of chunk(incomeRows, 80)) {
    await remote.insert(schema.incomes).values(slice);
  }

  const budgets = await dedupeById(pglite, "budgets", "year_month DESC");
  const budgetKey = new Set<string>();
  const budgetRows = budgets.rows
    .filter(
      (r) =>
        keepUserIds.has(String(r.user_id)) &&
        keepCategoryIds.has(String(r.category_id)),
    )
    .map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      categoryId: r.category_id as string,
      yearMonth: r.year_month as string,
      plannedAmount: String(r.planned_amount),
    }))
    .filter((r) => {
      const k = `${r.userId}|${r.categoryId}|${r.yearMonth}`;
      if (budgetKey.has(k)) return false;
      budgetKey.add(k);
      return true;
    });
  if (budgetRows.length) await remote.insert(schema.budgets).values(budgetRows);

  const investments = await dedupeById(pglite, "investments", "updated_at DESC");
  const investmentRows = investments.rows
    .filter((r) => keepUserIds.has(String(r.user_id)))
    .map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      name: r.name as string,
      type: r.type as string,
      institution: r.institution as string,
      amount: String(r.amount),
      asOfDate: (r.as_of_date as string) ?? null,
      notes: (r.notes as string) ?? null,
      createdAt: new Date(String(r.created_at)),
      updatedAt: new Date(String(r.updated_at)),
    }));
  if (investmentRows.length) {
    await remote.insert(schema.investments).values(investmentRows);
  }

  // Skip auth_tokens — force fresh login sessions in prod
  const counts: Record<string, { local_raw: number; migrated: number; neon: number }> = {
    users: { local_raw: users.raw, migrated: userRows.length, neon: 0 },
    categories: {
      local_raw: categories.raw,
      migrated: categoriesUnique.length,
      neon: 0,
    },
    accounts: {
      local_raw: accounts.raw,
      migrated: accountsUnique.length,
      neon: 0,
    },
    recurring_rules: {
      local_raw: rules.raw,
      migrated: ruleRows.length,
      neon: 0,
    },
    transactions: {
      local_raw: txs.raw,
      migrated: txsUnique.length,
      neon: 0,
    },
    transaction_invoices: {
      local_raw: invoices.raw,
      migrated: invoiceRows.length,
      neon: 0,
    },
    incomes: {
      local_raw: incomes.raw,
      migrated: incomeRows.length,
      neon: 0,
    },
    budgets: {
      local_raw: budgets.raw,
      migrated: budgetRows.length,
      neon: 0,
    },
    investments: {
      local_raw: investments.raw,
      migrated: investmentRows.length,
      neon: 0,
    },
    auth_tokens: { local_raw: 0, migrated: 0, neon: 0 },
    rate_limits: { local_raw: 0, migrated: 0, neon: 0 },
  };

  for (const table of TABLES) {
    const res = await remote.execute(
      sql.raw(`SELECT COUNT(*)::int AS n FROM ${table}`),
    );
    counts[table].neon = Number((res.rows[0] as { n: number }).n);
  }

  const emails = await remote.select({ email: schema.users.email }).from(schema.users);
  console.log("Migration complete. Counts (local_raw → migrated → neon):");
  for (const [table, c] of Object.entries(counts)) {
    const mark = c.migrated === c.neon ? "ok" : "DIFF";
    console.log(
      `  ${table}: ${c.local_raw} → ${c.migrated} → ${c.neon} [${mark}]`,
    );
  }
  console.log(
    "Users:",
    emails.map((e) => e.email).join(", ") || "(none)",
  );

  // Spot-check Aug 2026 health for main user
  const mainUser = userRows.find((u) => u.email === "luciano@lulife.app");
  if (mainUser) {
    const ym = "2026-08";
    const income = await remote.execute(sql`
      SELECT COALESCE(SUM(amount::numeric),0)::float AS s
      FROM incomes WHERE user_id = ${mainUser.id} AND year_month = ${ym}
    `);
    const credit = await remote.execute(sql`
      SELECT COALESCE(SUM(t.amount::numeric),0)::float AS s
      FROM transaction_invoices ti
      JOIN transactions t ON t.id = ti.transaction_id
      WHERE t.user_id = ${mainUser.id} AND t.method = 'credit' AND ti.year_month = ${ym}
    `);
    const pix = await remote.execute(sql`
      SELECT COUNT(*)::int AS n, COALESCE(SUM(amount::numeric),0)::float AS s
      FROM transactions
      WHERE user_id = ${mainUser.id} AND method = 'pix_debit' AND year_month = ${ym}
    `);
    const i = Number((income.rows[0] as { s: number }).s);
    const c = Number((credit.rows[0] as { s: number }).s);
    const p = pix.rows[0] as { n: number; s: number };
    console.log("Aug 2026 spot-check:", {
      income: i,
      credit: c,
      pixN: p.n,
      pix: p.s,
      atual: i - c - Number(p.s),
    });
  }

  await pglite.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
