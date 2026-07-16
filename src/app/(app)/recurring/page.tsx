import { eq } from "drizzle-orm";
import {
  createRecurringRule,
  deleteRecurringRule,
  runRecurringNow,
  toggleRecurringRule,
} from "@/app/actions";
import { getDb } from "@/db";
import { accounts, categories, recurringRules } from "@/db/schema";
import { requireUser } from "@/lib/session";
import { toNumber, yearMonthToLabel, currentYearMonth } from "@/lib/dates";
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
          <h1 className="text-[32px] font-bold tracking-tight">
            Recorrências
          </h1>
          <p className="mt-1 text-[var(--color-ink-muted)]">
            Salários, assinaturas e contas fixas
          </p>
        </div>
        <form action={runRecurringNow}>
          <button
            type="submit"
            className="rounded-lg bg-[var(--color-brand-soft)] px-4 py-2 text-sm font-medium text-[var(--color-brand)]"
          >
            Gerar agora
          </button>
        </form>
      </header>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <form action={createRecurringRule} className="panel h-fit space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Nova regra</h2>
          <select name="kind" className="input-field" defaultValue="expense">
            <option value="expense">Gasto</option>
            <option value="income">Entrada</option>
          </select>
          <input
            name="description"
            required
            placeholder="Descrição"
            className="input-field"
          />
          <input
            name="amount"
            type="number"
            step="0.01"
            required
            placeholder="Valor"
            className="input-field"
          />
          <select name="method" className="input-field" defaultValue="pix_debit">
            <option value="pix_debit">Pix / Débito (gasto)</option>
            <option value="credit">Cartão (gasto)</option>
          </select>
          <select name="categoryId" className="input-field" defaultValue="">
            <option value="">Categoria</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.kind === "income" ? "entrada" : "gasto"})
              </option>
            ))}
          </select>
          <select name="accountId" className="input-field" defaultValue="">
            <option value="">Conta / cartão</option>
            {accs.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              name="dayOfMonth"
              type="number"
              min={1}
              max={28}
              defaultValue={1}
              placeholder="Dia"
              className="input-field"
            />
            <input
              name="nextRun"
              defaultValue={currentYearMonth()}
              placeholder="AAAA-MM"
              className="input-field"
            />
          </div>
          <input
            name="installmentCount"
            type="number"
            min={1}
            defaultValue={1}
            placeholder="Parcelas (se cartão)"
            className="input-field"
          />
          <button type="submit" className="btn-primary w-full">
            Criar regra
          </button>
        </form>

        <div className="panel overflow-hidden">
          <div className="border-b border-[var(--color-border)] px-5 py-4">
            <h2 className="font-display text-lg font-semibold">
              Regras ativas{" "}
              <span className="text-sm font-normal text-[var(--color-ink-muted)]">
                {rules.length}
              </span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Próximo</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-2)]/40"
                  >
                    <td className="px-4 py-3 font-medium">
                      {r.description}
                      {!r.active && (
                        <span className="ml-2 text-xs text-[var(--color-ink-muted)]">
                          pausada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                      {r.kind === "income" ? "Entrada" : "Gasto"}
                      {r.method
                        ? ` · ${r.method === "credit" ? "crédito" : "pix/débito"}`
                        : ""}
                    </td>
                    <td className="px-4 py-3">{yearMonthToLabel(r.nextRun)}</td>
                    <td className="px-4 py-3">
                      <Money value={toNumber(r.amount)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <form
                          action={toggleRecurringRule.bind(null, r.id, !r.active)}
                        >
                          <button
                            type="submit"
                            className="text-xs text-[var(--color-brand)]"
                          >
                            {r.active ? "Pausar" : "Ativar"}
                          </button>
                        </form>
                        <form action={deleteRecurringRule.bind(null, r.id)}>
                          <button
                            type="submit"
                            className="text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-danger)]"
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
