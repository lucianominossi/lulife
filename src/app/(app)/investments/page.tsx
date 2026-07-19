import { eq } from "drizzle-orm";
import { createInvestment, deleteInvestment } from "@/app/actions";
import { CurrencyInput } from "@/components/currency-input";
import { InvestmentCharts } from "@/components/investment-charts";
import { Money } from "@/components/money";
import { getDb } from "@/db";
import { investments } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { toNumber } from "@/lib/dates";

export default async function InvestmentsPage() {
  const user = await requireUser();
  const db = await getDb();
  const rows = await db
    .select()
    .from(investments)
    .where(eq(investments.userId, user.id!));

  const total = rows.reduce((s, r) => s + toNumber(r.amount), 0);

  const byTypeMap = new Map<string, number>();
  const byInstMap = new Map<string, number>();
  for (const r of rows) {
    byTypeMap.set(r.type, (byTypeMap.get(r.type) ?? 0) + toNumber(r.amount));
    byInstMap.set(
      r.institution,
      (byInstMap.get(r.institution) ?? 0) + toNumber(r.amount),
    );
  }
  const byType = [...byTypeMap.entries()].map(([name, value]) => ({
    name,
    value,
  }));
  const byInstitution = [...byInstMap.entries()].map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight">
            Investimentos
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Patrimônio investido
          </p>
          <p className="mt-3 text-[34px] font-bold tracking-tight text-[#3B82F6]">
            <Money value={total} />
          </p>
        </div>
      </header>

      {rows.length > 0 && (
        <InvestmentCharts byType={byType} byInstitution={byInstitution} />
      )}

      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <form action={createInvestment} className="panel h-fit space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Nova posição</h2>
          <input name="name" required placeholder="Nome" className="input-field" />
          <div className="grid grid-cols-2 gap-2">
            <input
              name="type"
              required
              placeholder="Tipo"
              className="input-field"
            />
            <input
              name="institution"
              required
              placeholder="Instituição"
              className="input-field"
            />
          </div>
          <CurrencyInput name="amount" required placeholder="Valor" />
          <input name="asOfDate" type="date" className="input-field" />
          <button type="submit" className="btn-primary w-full">
            Adicionar
          </button>
        </form>

        <div className="panel overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-display text-lg font-semibold">Posições</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Instituição</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/40"
                  >
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.type}</td>
                    <td className="px-4 py-3">{r.institution}</td>
                    <td className="px-4 py-3">
                      <Money value={toNumber(r.amount)} />
                    </td>
                    <td className="px-4 py-3">
                      <form action={deleteInvestment.bind(null, r.id)}>
                        <button
                          type="submit"
                          className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-danger)]"
                        >
                          excluir
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
