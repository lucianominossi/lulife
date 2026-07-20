import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import path from "node:path";
import fs from "node:fs";

type Db =
  | ReturnType<typeof drizzleNeon<typeof schema>>
  | ReturnType<typeof drizzlePglite<typeof schema>>;

type DbGlobals = {
  __lulifeDb?: Db;
  __lulifePglite?: PGlite;
  __lulifeDbPromise?: Promise<Db> | null;
};

const g = globalThis as typeof globalThis & DbGlobals;

async function migratePglite(client: PGlite) {
  await client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified TIMESTAMPTZ,
      image TEXT,
      password_hash TEXT NOT NULL,
      session_version INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_kind ON categories(user_id, name, kind);

    CREATE TABLE IF NOT EXISTS accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS accounts_user_name ON accounts(user_id, name);

    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount NUMERIC(14,2) NOT NULL,
      date DATE,
      method TEXT NOT NULL,
      account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      year_month TEXT,
      notes TEXT,
      recurring_rule_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS transactions_user_method ON transactions(user_id, method);
    CREATE INDEX IF NOT EXISTS transactions_user_year_month ON transactions(user_id, year_month);

    CREATE TABLE IF NOT EXISTS transaction_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
      year_month TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS tx_invoice_unique ON transaction_invoices(transaction_id, year_month);
    CREATE INDEX IF NOT EXISTS tx_invoice_ym ON transaction_invoices(year_month);

    CREATE TABLE IF NOT EXISTS incomes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount NUMERIC(14,2) NOT NULL,
      date DATE,
      account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      year_month TEXT NOT NULL,
      notes TEXT,
      recurring_rule_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS incomes_user_ym ON incomes(user_id, year_month);

    CREATE TABLE IF NOT EXISTS budgets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      year_month TEXT NOT NULL,
      planned_amount NUMERIC(14,2) NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS budgets_user_cat_ym ON budgets(user_id, category_id, year_month);

    CREATE TABLE IF NOT EXISTS investments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      institution TEXT NOT NULL,
      amount NUMERIC(14,2) NOT NULL,
      as_of_date DATE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS recurring_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      description TEXT NOT NULL,
      amount NUMERIC(14,2) NOT NULL,
      method TEXT,
      account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      cadence TEXT NOT NULL DEFAULT 'monthly',
      day_of_month INTEGER NOT NULL DEFAULT 1,
      next_run TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      installment_count INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL,
      type TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS auth_tokens_user_type ON auth_tokens(user_id, type);
    CREATE UNIQUE INDEX IF NOT EXISTS auth_tokens_hash ON auth_tokens(token_hash);
  `);
  await client.exec(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

    -- Drop duplicate recurring rows before unique indexes (pre-fix races)
    DELETE FROM transactions
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY recurring_rule_id, date
            ORDER BY created_at ASC, id ASC
          ) AS rn
        FROM transactions
        WHERE recurring_rule_id IS NOT NULL AND date IS NOT NULL
      ) ranked
      WHERE rn > 1
    );

    DELETE FROM incomes
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
          ROW_NUMBER() OVER (
            PARTITION BY recurring_rule_id, year_month
            ORDER BY created_at ASC, id ASC
          ) AS rn
        FROM incomes
        WHERE recurring_rule_id IS NOT NULL
      ) ranked
      WHERE rn > 1
    );

    CREATE UNIQUE INDEX IF NOT EXISTS transactions_recurring_date
      ON transactions (recurring_rule_id, date)
      WHERE recurring_rule_id IS NOT NULL AND date IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS incomes_recurring_ym
      ON incomes (recurring_rule_id, year_month)
      WHERE recurring_rule_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0,
      window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function pgliteOpenError(err: unknown, dataDir: string): Error {
  const message = err instanceof Error ? err.message : String(err);
  const corruptHint =
    /Aborted|checkpoint|PANIC|invalid page/i.test(message) ||
    message === "Aborted()."
      ? ` O banco em ${dataDir} parece corrompido. Pare o \`next dev\`, mova a pasta para um backup ` +
        `(ex.: mv .data/pglite .data/pglite-corrupt) e rode \`npm run db:seed\` para recriar.`
      : ` Pare todos os \`next dev\` nesta pasta (só pode haver um processo usando .data/pglite) e tente de novo.`;
  return new Error(`Falha ao abrir o banco local (PGlite): ${message}.${corruptHint}`, {
    cause: err,
  });
}

async function openPglite(dataDir: string): Promise<PGlite> {
  try {
    return await PGlite.create(dataDir);
  } catch (firstErr) {
    // Stale lock after crash/kill — remove pid and retry once.
    const pidFile = path.join(dataDir, "postmaster.pid");
    if (fs.existsSync(pidFile)) {
      try {
        fs.unlinkSync(pidFile);
      } catch {
        // ignore
      }
      try {
        return await PGlite.create(dataDir);
      } catch (retryErr) {
        throw pgliteOpenError(retryErr, dataDir);
      }
    }
    throw pgliteOpenError(firstErr, dataDir);
  }
}

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();

  if (url) {
    const sql = neon(url);
    return drizzleNeon(sql, { schema });
  }

  // Absolute string path — required so Node fs APIs never receive a URL object
  const dataDir = path.resolve(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dataDir, { recursive: true });

  if (!g.__lulifePglite) {
    g.__lulifePglite = await openPglite(dataDir);
  }
  await migratePglite(g.__lulifePglite);
  return drizzlePglite(g.__lulifePglite, { schema });
}

export async function getDb() {
  if (g.__lulifeDb) return g.__lulifeDb;
  if (!g.__lulifeDbPromise) {
    g.__lulifeDbPromise = createDb()
      .then((db) => {
        g.__lulifeDb = db;
        return db;
      })
      .catch((err) => {
        g.__lulifeDbPromise = null;
        throw err;
      });
  }
  return g.__lulifeDbPromise;
}
