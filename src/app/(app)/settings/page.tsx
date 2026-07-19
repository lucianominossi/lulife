import { eq } from "drizzle-orm";
import { signOut } from "@/auth";
import {
  createAccount,
  createCategory,
  deleteAccount,
  deleteCategory,
} from "@/app/actions";
import { BudgetSection } from "@/components/budget-section";
import { getDb } from "@/db";
import { accounts, budgets, categories } from "@/db/schema";
import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  const user = await requireUser();
  const db = await getDb();

  const [cats, accs, buds] = await Promise.all([
    db.select().from(categories).where(eq(categories.userId, user.id!)),
    db.select().from(accounts).where(eq(accounts.userId, user.id!)),
    db.select().from(budgets).where(eq(budgets.userId, user.id!)),
  ]);

  const expenseCats = cats.filter((c) => c.kind === "expense");
  const incomeCats = cats.filter((c) => c.kind === "income");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight">
            Cadastros
          </h1>
          <p className="mt-1 text-[var(--color-ink-muted)]">
            Categorias, contas e orçamento mensal
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-xl border border-[#F43F5E]/25 px-4 py-2 text-sm font-medium text-[#F43F5E] transition hover:bg-[#F43F5E]/10"
          >
            Sair da conta
          </button>
        </form>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <CatalogCard
          title="Categorias de gasto"
          form={
            <form action={createCategory} className="flex gap-2">
              <input type="hidden" name="kind" value="expense" />
              <input
                name="name"
                required
                placeholder="Nova categoria"
                className="input-field flex-1"
              />
              <button type="submit" className="btn-primary px-4">
                +
              </button>
            </form>
          }
          items={expenseCats.map((c) => ({
            id: c.id,
            label: c.name,
            deleteAction: deleteCategory.bind(null, c.id),
          }))}
        />

        <CatalogCard
          title="Tipos de entrada"
          form={
            <form action={createCategory} className="flex gap-2">
              <input type="hidden" name="kind" value="income" />
              <input
                name="name"
                required
                placeholder="Novo tipo"
                className="input-field flex-1"
              />
              <button type="submit" className="btn-primary px-4">
                +
              </button>
            </form>
          }
          items={incomeCats.map((c) => ({
            id: c.id,
            label: c.name,
            deleteAction: deleteCategory.bind(null, c.id),
          }))}
        />

        <CatalogCard
          title="Contas / cartões"
          form={
            <form action={createAccount} className="flex flex-col gap-2">
              <input
                name="name"
                required
                placeholder="Nome"
                className="input-field"
              />
              <div className="flex gap-2">
                <select name="type" className="input-field">
                  <option value="credit_card">Cartão</option>
                  <option value="bank">Banco</option>
                </select>
                <button type="submit" className="btn-primary whitespace-nowrap px-4">
                  Add
                </button>
              </div>
            </form>
          }
          items={accs.map((a) => ({
            id: a.id,
            label: `${a.name} (${a.type === "credit_card" ? "cartão" : "banco"})`,
            deleteAction: deleteAccount.bind(null, a.id),
          }))}
        />
      </div>

      <BudgetSection categories={cats} budgets={buds} />
    </div>
  );
}

function CatalogCard({
  title,
  form,
  items,
}: {
  title: string;
  form: React.ReactNode;
  items: { id: string; label: string; deleteAction: () => Promise<void> }[];
}) {
  return (
    <section className="panel p-5">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="mt-3">{form}</div>
      <ul className="mt-4 max-h-64 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg bg-[var(--color-surface-2)]/60 px-3 py-2 text-sm"
          >
            {item.label}
            <form action={item.deleteAction}>
              <button
                type="submit"
                className="text-[var(--color-ink-muted)] hover:text-[var(--color-danger)]"
              >
                ×
              </button>
            </form>
          </li>
        ))}
      </ul>
    </section>
  );
}
