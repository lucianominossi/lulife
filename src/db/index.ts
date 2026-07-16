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

declare global {
  var __lulifeDb: Db | undefined;
  var __lulifePglite: PGlite | undefined;
}

async function migratePglite(client: PGlite) {
  await client.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified TIMESTAMPTZ,
      image TEXT,
      password_hash TEXT NOT NULL,
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

  if (!global.__lulifePglite) {
    global.__lulifePglite = await PGlite.create(dataDir);
  }
  await migratePglite(global.__lulifePglite);
  return drizzlePglite(global.__lulifePglite, { schema });
}

let dbPromise: Promise<Db> | null = null;

export async function getDb() {
  if (global.__lulifeDb) return global.__lulifeDb;
  if (!dbPromise) {
    dbPromise = createDb()
      .then((db) => {
        global.__lulifeDb = db;
        return db;
      })
      .catch((err) => {
        dbPromise = null;
        throw err;
      });
  }
  return dbPromise;
}
