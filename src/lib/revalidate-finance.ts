import { revalidatePath } from "next/cache";

type RevalidateFinanceOptions = {
  yearMonths?: string[];
  includeInvestments?: boolean;
  includeSettings?: boolean;
  includeRecurring?: boolean;
  includeProfile?: boolean;
  /** When false, skip default /month + /transactions (rare). Default true. */
  includeMonthAndTransactions?: boolean;
};

/**
 * Invalidate Client Router Cache for finance-related routes after mutations.
 */
export function revalidateFinance(opts: RevalidateFinanceOptions = {}) {
  const {
    yearMonths = [],
    includeInvestments = false,
    includeSettings = false,
    includeRecurring = false,
    includeProfile = false,
    includeMonthAndTransactions = true,
  } = opts;

  if (includeMonthAndTransactions) {
    revalidatePath("/month");
    revalidatePath("/transactions");
  }

  for (const ym of yearMonths) {
    if (ym) revalidatePath(`/month/${ym}`);
  }

  if (includeInvestments) revalidatePath("/investments");
  if (includeSettings) revalidatePath("/settings");
  if (includeRecurring) revalidatePath("/recurring");
  if (includeProfile) revalidatePath("/profile");
}
