const MONTHS_PT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
] as const;

const MONTH_MAP: Record<string, number> = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12,
};

/** Convert "Jul/26" → "2026-07" */
export function invoiceLabelToYearMonth(label: string): string | null {
  const cleaned = label.trim();
  const m = cleaned.match(/^([A-Za-zÀ-ÿ]{3})\/(\d{2})$/);
  if (!m) return null;
  const month = MONTH_MAP[m[1].toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")];
  if (!month) return null;
  const year = 2000 + parseInt(m[2], 10);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Convert "2026-07" → "Jul/26" */
export function yearMonthToLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return ym;
  return `${MONTHS_PT[m - 1]}/${String(y).slice(-2)}`;
}

export function currentYearMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-").map(Number);
  return { year: y, month: m };
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function generateYearMonths(fromYm: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addMonths(fromYm, i));
}

/** Months around a center: past behind, future ahead (inclusive of center). */
export function yearMonthOptions(
  centerYm: string,
  behind = 12,
  ahead = 18,
): string[] {
  const start = addMonths(centerYm, -behind);
  return Array.from({ length: behind + ahead + 1 }, (_, i) =>
    addMonths(start, i),
  );
}
