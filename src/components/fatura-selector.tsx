"use client";

import { useRouter } from "next/navigation";
import { yearMonthOptions, yearMonthToLabel } from "@/lib/dates";

export function FaturaSelector({
  yearMonth,
  method,
}: {
  yearMonth: string;
  method?: string | null;
}) {
  const router = useRouter();
  const choices = yearMonthOptions(yearMonth);

  function onChange(nextYm: string) {
    const params = new URLSearchParams();
    params.set("ym", nextYm);
    if (method) params.set("method", method);
    router.push(`/transactions?${params.toString()}`);
  }

  return (
    <label className="block space-y-1 text-sm">
      <span className="text-[var(--color-ink-muted)]">Fatura</span>
      <select
        value={yearMonth}
        onChange={(e) => onChange(e.target.value)}
        className="input-field min-w-[180px]"
      >
        {choices.map((ym) => (
          <option key={ym} value={ym}>
            {yearMonthToLabel(ym)}
          </option>
        ))}
      </select>
    </label>
  );
}
