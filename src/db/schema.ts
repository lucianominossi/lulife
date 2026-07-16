import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  date,
  boolean,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const authTokens = pgTable(
  "auth_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    type: text("type", {
      enum: ["email_verify", "password_reset"],
    }).notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("auth_tokens_user_type").on(t.userId, t.type),
    uniqueIndex("auth_tokens_hash").on(t.tokenHash),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind", { enum: ["expense", "income"] }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("categories_user_name_kind").on(t.userId, t.name, t.kind),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: ["credit_card", "bank"] }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("accounts_user_name").on(t.userId, t.name)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    date: date("date", { mode: "string" }),
    method: text("method", { enum: ["credit", "pix_debit"] }).notNull(),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    yearMonth: text("year_month"),
    notes: text("notes"),
    recurringRuleId: uuid("recurring_rule_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [
    index("transactions_user_method").on(t.userId, t.method),
    index("transactions_user_year_month").on(t.userId, t.yearMonth),
  ],
);

export const transactionInvoices = pgTable(
  "transaction_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
  },
  (t) => [
    uniqueIndex("tx_invoice_unique").on(t.transactionId, t.yearMonth),
    index("tx_invoice_ym").on(t.yearMonth),
  ],
);

export const incomes = pgTable(
  "incomes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    date: date("date", { mode: "string" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    yearMonth: text("year_month").notNull(),
    notes: text("notes"),
    recurringRuleId: uuid("recurring_rule_id"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (t) => [index("incomes_user_ym").on(t.userId, t.yearMonth)],
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    yearMonth: text("year_month").notNull(),
    plannedAmount: numeric("planned_amount", {
      precision: 14,
      scale: 2,
    }).notNull(),
  },
  (t) => [
    uniqueIndex("budgets_user_cat_ym").on(t.userId, t.categoryId, t.yearMonth),
  ],
);

export const investments = pgTable("investments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  institution: text("institution").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  asOfDate: date("as_of_date", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export const recurringRules = pgTable("recurring_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["expense", "income"] }).notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  method: text("method", { enum: ["credit", "pix_debit"] }),
  accountId: uuid("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  cadence: text("cadence", { enum: ["monthly"] }).notNull().default("monthly"),
  dayOfMonth: integer("day_of_month").notNull().default(1),
  nextRun: text("next_run").notNull(),
  active: boolean("active").notNull().default(true),
  installmentCount: integer("installment_count"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  categories: many(categories),
  accounts: many(accounts),
  transactions: many(transactions),
  incomes: many(incomes),
  budgets: many(budgets),
  investments: many(investments),
  recurringRules: many(recurringRules),
  authTokens: many(authTokens),
}));

export const authTokensRelations = relations(authTokens, ({ one }) => ({
  user: one(users, {
    fields: [authTokens.userId],
    references: [users.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  invoices: many(transactionInvoices),
}));

export const transactionInvoicesRelations = relations(
  transactionInvoices,
  ({ one }) => ({
    transaction: one(transactions, {
      fields: [transactionInvoices.transactionId],
      references: [transactions.id],
    }),
  }),
);

export const incomesRelations = relations(incomes, ({ one }) => ({
  account: one(accounts, {
    fields: [incomes.accountId],
    references: [accounts.id],
  }),
  category: one(categories, {
    fields: [incomes.categoryId],
    references: [categories.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type AuthToken = typeof authTokens.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Income = typeof incomes.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Investment = typeof investments.$inferSelect;
export type RecurringRule = typeof recurringRules.$inferSelect;
