"use client";

import { useRouter } from "next/navigation";

export function CategoryFilter({
  yearMonth,
  method,
  account,
  category,
  options,
  hasUncategorized,
}: {
  yearMonth: string;
  method?: string | null;
  account?: string | null;
  category?: string | null;
  options: { id: string; name: string }[];
  hasUncategorized: boolean;
}) {
  const router = useRouter();

  function onChange(nextCategory: string) {
    const params = new URLSearchParams();
    params.set("ym", yearMonth);
    if (method) params.set("method", method);
    if (account) params.set("account", account);
    if (nextCategory) params.set("category", nextCategory);
    router.push(`/transactions?${params.toString()}`);
  }

  return (
    <label className="block space-y-1 text-sm">
      <span className="text-[var(--color-ink-muted)]">Categoria</span>
      <select
        value={category ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="input-field min-w-[180px]"
      >
        <option value="">Todas</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
        {hasUncategorized && <option value="none">Sem categoria</option>}
      </select>
    </label>
  );
}
