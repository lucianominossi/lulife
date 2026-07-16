import ExcelJS from "exceljs";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  accounts,
  budgets,
  categories,
  incomes,
  investments,
  transactionInvoices,
  transactions,
} from "@/db/schema";
import { invoiceLabelToYearMonth } from "@/lib/dates";

function evalSimpleFormula(formula: string): number | null {
  let expr = formula.trim();
  if (expr.startsWith("=")) expr = expr.slice(1);
  // strip whitespace
  expr = expr.replace(/\s+/g, "");
  // only allow digits, operators, dots, parentheses
  if (!/^[\d+\-*/().]+$/.test(expr)) return null;
  try {
    const result = Function(`"use strict"; return (${expr});`)() as unknown;
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function cellNum(v: ExcelJS.CellValue): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && "formula" in v) {
    const fv = v as ExcelJS.CellFormulaValue;
    if (typeof fv.result === "number") return fv.result;
    if (typeof fv.result === "string") {
      const n = parseFloat(fv.result.replace(",", "."));
      if (Number.isFinite(n)) return n;
    }
    if (typeof fv.formula === "string") {
      const evaluated = evalSimpleFormula(fv.formula);
      if (evaluated != null) return evaluated;
    }
    return null;
  }
  if (typeof v === "object" && "sharedFormula" in v) {
    const fv = v as ExcelJS.CellSharedFormulaValue;
    if (typeof fv.result === "number") return fv.result;
    return null;
  }
  if (typeof v === "string") {
    if (v.trim().startsWith("=")) return evalSimpleFormula(v);
    const n = parseFloat(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function cellStr(v: ExcelJS.CellValue): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object" && "result" in v) {
    const r = (v as ExcelJS.CellFormulaValue).result;
    if (r == null) return null;
    return String(r).trim();
  }
  return String(v).trim();
}

function cellDate(v: ExcelJS.CellValue): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (typeof v === "string" && /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(v)) {
    const [d, m, y] = v.split("/");
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseInvoiceList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .map((label) => invoiceLabelToYearMonth(label))
    .filter((x): x is string => Boolean(x));
}

function sheetYearMonth(name: string): string | null {
  const m = name.match(/^(\d{2})\.(\d{2})$/);
  if (!m) return null;
  return `20${m[1]}-${m[2]}`;
}

function isPixDebitLabel(name: string) {
  return name.toLowerCase().replace("é", "e") === "pix/debito";
}

export type ImportPreview = {
  categories: number;
  accounts: number;
  creditTransactions: number;
  pixDebit: number;
  incomes: number;
  budgets: number;
  investments: number;
  months: string[];
};

export async function previewImport(buffer: ArrayBuffer): Promise<ImportPreview> {
  const wb = new ExcelJS.Workbook();
  // exceljs typings expect Buffer-like
  await wb.xlsx.load(Buffer.from(buffer) as unknown as ExcelJS.Buffer);

  const dbSheet = wb.getWorksheet("DB");
  let catCount = 0;
  let accCount = 0;
  const months = new Set<string>();

  if (dbSheet) {
    for (let r = 2; r <= 80; r++) {
      if (cellStr(dbSheet.getCell(r, 1).value)) catCount++;
      if (cellStr(dbSheet.getCell(r, 2).value)) catCount++;
      const acc = cellStr(dbSheet.getCell(r, 3).value);
      if (acc && !isPixDebitLabel(acc)) accCount++;
      const fat = cellStr(dbSheet.getCell(r, 4).value);
      if (fat) {
        const ym = invoiceLabelToYearMonth(fat);
        if (ym) months.add(ym);
      }
    }
  }

  const creditSheet = wb.getWorksheet("Cartões de crédito");
  let credit = 0;
  if (creditSheet) {
    for (let r = 5; r <= (creditSheet.rowCount || 1000); r++) {
      if (cellStr(creditSheet.getCell(r, 1).value)) credit++;
    }
  }

  let pix = 0;
  let inc = 0;
  let bud = 0;
  for (const sheet of wb.worksheets) {
    const ym = sheetYearMonth(sheet.name);
    if (!ym) continue;
    months.add(ym);
    for (let r = 9; r <= 40; r++) {
      const desc = cellStr(sheet.getCell(r, 2).value);
      if (
        !desc ||
        ["Descrição", "Saldo", "Projetado", "Atual", "Total cartão", "Entradas"].includes(
          desc,
        )
      ) {
        continue;
      }
      const catName = cellStr(sheet.getCell(r, 3).value);
      const amount = cellNum(sheet.getCell(r, 6).value);
      if (amount != null && catName) inc++;
    }
    for (let r = 6; r <= 100; r++) {
      if (cellStr(sheet.getCell(r, 8).value)) {
        const amount = cellNum(sheet.getCell(r, 12).value);
        if (amount != null) pix++;
      }
      const cat = cellStr(sheet.getCell(r, 14).value);
      if (cat && cat !== "Categoria" && cat !== "Total") {
        const planned = cellNum(sheet.getCell(r, 15).value);
        if (planned != null) bud++;
      }
    }
  }

  const invSheet = wb.getWorksheet("Investimentos");
  let inv = 0;
  if (invSheet) {
    for (let r = 2; r <= 20; r++) {
      const name = cellStr(invSheet.getCell(r, 1).value);
      if (name && name !== "Total" && !name.startsWith("Total")) {
        const amount = cellNum(invSheet.getCell(r, 2).value);
        if (amount != null) inv++;
      }
    }
  }

  return {
    categories: catCount,
    accounts: accCount,
    creditTransactions: credit,
    pixDebit: pix,
    incomes: inc,
    budgets: bud,
    investments: inv,
    months: [...months].sort(),
  };
}

export async function importWorkbook(
  userId: string,
  buffer: ArrayBuffer,
  replace: boolean,
) {
  const db = await getDb();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(buffer) as unknown as ExcelJS.Buffer);

  if (replace) {
    const userTxs = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.userId, userId));
    for (const tx of userTxs) {
      await db
        .delete(transactionInvoices)
        .where(eq(transactionInvoices.transactionId, tx.id));
    }
    await db.delete(transactions).where(eq(transactions.userId, userId));
    await db.delete(incomes).where(eq(incomes.userId, userId));
    await db.delete(budgets).where(eq(budgets.userId, userId));
    await db.delete(investments).where(eq(investments.userId, userId));
    await db.delete(categories).where(eq(categories.userId, userId));
    await db.delete(accounts).where(eq(accounts.userId, userId));
  }

  const categoryMap = new Map<string, string>();
  const accountMap = new Map<string, string>();

  const refreshMaps = async () => {
    const allCats = await db
      .select()
      .from(categories)
      .where(eq(categories.userId, userId));
    categoryMap.clear();
    for (const c of allCats) categoryMap.set(`${c.kind}:${c.name}`, c.id);

    const allAccs = await db
      .select()
      .from(accounts)
      .where(eq(accounts.userId, userId));
    accountMap.clear();
    for (const a of allAccs) accountMap.set(a.name, a.id);
  };

  const ensureCategory = async (name: string, kind: "expense" | "income") => {
    const key = `${kind}:${name}`;
    if (categoryMap.has(key)) return categoryMap.get(key)!;
    const existing = await db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.userId, userId),
          eq(categories.name, name),
          eq(categories.kind, kind),
        ),
      )
      .limit(1);
    if (existing[0]) {
      categoryMap.set(key, existing[0].id);
      return existing[0].id;
    }
    const [row] = await db
      .insert(categories)
      .values({ userId, name, kind })
      .returning();
    categoryMap.set(key, row.id);
    return row.id;
  };

  const ensureAccount = async (
    name: string,
    type: "credit_card" | "bank" = "credit_card",
  ) => {
    if (!name || isPixDebitLabel(name)) return null;
    if (accountMap.has(name)) return accountMap.get(name)!;
    const existing = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.name, name)))
      .limit(1);
    if (existing[0]) {
      accountMap.set(name, existing[0].id);
      return existing[0].id;
    }
    const [row] = await db
      .insert(accounts)
      .values({ userId, name, type })
      .returning();
    accountMap.set(name, row.id);
    return row.id;
  };

  await refreshMaps();

  const dbSheet = wb.getWorksheet("DB");
  if (dbSheet) {
    for (let r = 2; r <= 80; r++) {
      const exp = cellStr(dbSheet.getCell(r, 1).value);
      if (exp) await ensureCategory(exp, "expense");
      const incType = cellStr(dbSheet.getCell(r, 2).value);
      if (incType) await ensureCategory(incType, "income");
      const acc = cellStr(dbSheet.getCell(r, 3).value);
      if (acc && !isPixDebitLabel(acc)) {
        await ensureAccount(acc, acc === "XP" ? "bank" : "credit_card");
      }
    }
  }

  const creditSheet = wb.getWorksheet("Cartões de crédito");
  if (creditSheet) {
    for (let r = 5; r <= (creditSheet.rowCount || 1000); r++) {
      const desc = cellStr(creditSheet.getCell(r, 1).value);
      if (!desc) continue;
      const catName = cellStr(creditSheet.getCell(r, 2).value);
      const accName = cellStr(creditSheet.getCell(r, 3).value);
      const fatRaw = cellStr(creditSheet.getCell(r, 4).value) || "";
      const date = cellDate(creditSheet.getCell(r, 5).value);
      const amount = cellNum(creditSheet.getCell(r, 6).value);
      if (amount == null) continue;

      const categoryId = catName
        ? await ensureCategory(catName, "expense")
        : null;
      const accountId = accName
        ? await ensureAccount(accName, "credit_card")
        : null;
      const invoiceMonths = parseInvoiceList(fatRaw);

      const [tx] = await db
        .insert(transactions)
        .values({
          userId,
          description: desc,
          amount: amount.toFixed(2),
          date,
          method: "credit",
          accountId,
          categoryId,
        })
        .returning();

      if (invoiceMonths.length) {
        await db.insert(transactionInvoices).values(
          invoiceMonths.map((ym) => ({
            transactionId: tx.id,
            yearMonth: ym,
          })),
        );
      }
    }
  }

  for (const sheet of wb.worksheets) {
    const ym = sheetYearMonth(sheet.name);
    if (!ym) continue;

    for (let r = 9; r <= 40; r++) {
      const desc = cellStr(sheet.getCell(r, 2).value);
      if (
        !desc ||
        ["Descrição", "Saldo", "Projetado", "Atual", "Total cartão", "Entradas"].includes(
          desc,
        )
      ) {
        continue;
      }
      const catName = cellStr(sheet.getCell(r, 3).value);
      const amount = cellNum(sheet.getCell(r, 6).value);
      if (amount == null || !catName) continue;

      const accountName = cellStr(sheet.getCell(r, 4).value);
      const date = cellDate(sheet.getCell(r, 5).value);
      const categoryId = await ensureCategory(catName, "income");
      const accountId = accountName
        ? await ensureAccount(accountName, "bank")
        : null;

      await db.insert(incomes).values({
        userId,
        description: desc,
        amount: amount.toFixed(2),
        date,
        accountId,
        categoryId,
        yearMonth: ym,
      });
    }

    for (let r = 6; r <= 100; r++) {
      const desc = cellStr(sheet.getCell(r, 8).value);
      if (!desc || desc === "Descrição" || desc === "Débitos/Pix") continue;
      const catName = cellStr(sheet.getCell(r, 9).value);
      const amount = cellNum(sheet.getCell(r, 12).value);
      if (amount == null) continue;
      const categoryId = catName
        ? await ensureCategory(catName, "expense")
        : null;
      const dateNote = cellStr(sheet.getCell(r, 11).value);

      await db.insert(transactions).values({
        userId,
        description: desc,
        amount: amount.toFixed(2),
        date: null,
        method: "pix_debit",
        accountId: null,
        categoryId,
        yearMonth: ym,
        notes: dateNote,
      });
    }

    for (let r = 6; r <= 40; r++) {
      const catName = cellStr(sheet.getCell(r, 14).value);
      if (!catName || catName === "Categoria" || catName === "Total") continue;
      const planned = cellNum(sheet.getCell(r, 15).value);
      if (planned == null) continue;
      const categoryId = await ensureCategory(catName, "expense");
      const existing = await db
        .select()
        .from(budgets)
        .where(
          and(
            eq(budgets.userId, userId),
            eq(budgets.categoryId, categoryId),
            eq(budgets.yearMonth, ym),
          ),
        )
        .limit(1);
      if (existing[0]) {
        await db
          .update(budgets)
          .set({ plannedAmount: planned.toFixed(2) })
          .where(eq(budgets.id, existing[0].id));
      } else {
        await db.insert(budgets).values({
          userId,
          categoryId,
          yearMonth: ym,
          plannedAmount: planned.toFixed(2),
        });
      }
    }
  }

  const invSheet = wb.getWorksheet("Investimentos");
  if (invSheet) {
    for (let r = 2; r <= 20; r++) {
      const name = cellStr(invSheet.getCell(r, 1).value);
      if (!name || name === "Total" || name.startsWith("Total")) continue;
      const amount = cellNum(invSheet.getCell(r, 2).value);
      if (amount == null) continue;
      await db.insert(investments).values({
        userId,
        name,
        type: "Poupança",
        institution: "A definir",
        amount: amount.toFixed(2),
      });
    }
  }

  return { ok: true as const };
}

export async function userHasData(userId: string) {
  const db = await getDb();
  const txs = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .limit(1);
  if (txs.length) return true;
  const incs = await db
    .select({ id: incomes.id })
    .from(incomes)
    .where(eq(incomes.userId, userId))
    .limit(1);
  return incs.length > 0;
}
