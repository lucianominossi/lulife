import { eq } from "drizzle-orm";
import {
  deleteRecurringRule,
  runRecurringNow,
  toggleRecurringRule,
} from "@/app/actions";
import { RecurringRuleForm } from "@/components/recurring-rule-form";
import { getDb } from "@/db";
import { accounts, categories, recurringRules } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { toNumber, yearMonthToLabel } from "@/lib/dates";
import { Money } from "@/components/money";

export default async function RecurringPage() {
  const user = await requireUser();
  const db = await getDb();
  const [rules, cats, accs] = await Promise.all([
    db
      .select()
      .from(recurringRules)
      .where(eq(recurringRules.userId, user.id!)),
    db.select().from(categories).where(eq(categories.userId, user.id!)),
    db.select().from(accounts).where(eq(accounts.userId, user.id!)),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight">Recorrências</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Salários, assinaturas e contas fixas
          </p>
        </div>
        <form action={runRecurringNow}>
          <button type="submit" className="btn-ghost">
            Gerar agora
          </button>
        </form>
      </header>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <RecurringRuleForm categories={cats} accounts={accs} />

        <div className="panel overflow-hidden">
          <div className="border-b border-white/5 px-6 py-5">
            <h2 className="text-lg font-semibold tracking-tight">
              Regras{" "}
              <span className="text-sm font-normal text-[var(--color-ink-subtle)]">
                {rules.length}
              </span>
            </h2>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Excluir remove apenas lançamentos futuros gerados pela regra.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-subtle)]">
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Próximo</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-[var(--color-ink-muted)]"
                    >
                      Nenhuma regra cadastrada
                    </td>
                  </tr>
                )}
                {rules.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-medium">
                      {r.description}
                      {!r.active && (
                        <span className="ml-2 text-xs text-[var(--color-ink-subtle)]">
                          pausada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                      {r.kind === "income" ? "Entrada" : "Gasto"}
                      {r.method
                        ? ` · ${r.method === "credit" ? "crédito" : "pix/débito"}`
                        : ""}
                      {r.kind === "expense" &&
                      r.method === "credit" &&
                      r.installmentCount
                        ? ` · ${r.installmentCount}x`
                        : ""}
                    </td>
                    <td className="px-4 py-3">{yearMonthToLabel(r.nextRun)}</td>
                    <td className="px-4 py-3">
                      <Money value={toNumber(r.amount)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <form
                          action={toggleRecurringRule.bind(
                            null,
                            r.id,
                            !r.active,
                          )}
                        >
                          <button
                            type="submit"
                            className="text-xs font-medium text-[#C4B5FD] hover:text-white"
                          >
                            {r.active ? "Pausar" : "Ativar"}
                          </button>
                        </form>
                        <form action={deleteRecurringRule.bind(null, r.id)}>
                          <button
                            type="submit"
                            className="text-xs text-[var(--color-ink-subtle)] hover:text-[var(--color-danger)]"
                          >
                            Excluir
                          </button>
                        </form>
                      </div>
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
