"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { createRecurringRule } from "@/app/actions";
import { CategoryPicker } from "@/components/category-picker";
import { CurrencyInput } from "@/components/currency-input";
import { currentYearMonth } from "@/lib/dates";

type Category = { id: string; name: string; kind: string };
type Account = { id: string; name: string; type: string };

export function RecurringRuleForm({
  categories,
  accounts,
}: {
  categories: Category[];
  accounts: Account[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [method, setMethod] = useState<"credit" | "pix_debit">("pix_debit");
  const [amountKey, setAmountKey] = useState(0);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const filteredAccounts = useMemo(() => {
    if (kind === "income") {
      return accounts.filter((a) => a.type === "bank");
    }
    if (method === "credit") {
      return accounts.filter((a) => a.type === "credit_card");
    }
    return accounts.filter((a) => a.type === "bank");
  }, [accounts, kind, method]);

  const isCreditExpense = kind === "expense" && method === "credit";

  async function handleAction(formData: FormData) {
    setPending(true);
    try {
      await createRecurringRule(formData);
      formRef.current?.reset();
      setKind("expense");
      setMethod("pix_debit");
      setAmountKey((k) => k + 1);
      setToast("Recorrência cadastrada com sucesso.");
    } catch {
      setToast(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form
        ref={formRef}
        action={handleAction}
        className="panel h-fit space-y-4 p-6"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Nova regra</h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Define o que o sistema deve gerar automaticamente a cada mês.
          </p>
        </div>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--color-ink-muted)]">Tipo</span>
          <select
            name="kind"
            className="input-field"
            value={kind}
            onChange={(e) => {
              const next = e.target.value as "expense" | "income";
              setKind(next);
              if (next === "income") setMethod("pix_debit");
            }}
          >
            <option value="expense">Gasto</option>
            <option value="income">Entrada</option>
          </select>
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--color-ink-muted)]">
            Descrição
          </span>
          <input
            name="description"
            required
            placeholder="Ex.: Netflix, Aluguel, Salário"
            className="input-field"
          />
        </label>

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--color-ink-muted)]">Valor</span>
          <CurrencyInput key={amountKey} name="amount" required />
        </label>

        {kind === "expense" && (
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink-muted)]">
              Método de pagamento
            </span>
            <select
              name="method"
              className="input-field"
              value={method}
              onChange={(e) =>
                setMethod(e.target.value as "credit" | "pix_debit")
              }
            >
              <option value="pix_debit">Pix / Débito</option>
              <option value="credit">Cartão de crédito</option>
            </select>
            <span className="block text-xs text-[var(--color-ink-subtle)]">
              Pix/Débito entra no mês corrente. Crédito vai para a fatura.
            </span>
          </label>
        )}

        <CategoryPicker
          kind={kind}
          categories={categories}
          label="Categoria"
          optionalEmptyLabel="Sem categoria"
        />

        <label className="block space-y-1.5 text-sm">
          <span className="font-medium text-[var(--color-ink-muted)]">
            {kind === "income"
              ? "Conta (opcional)"
              : method === "credit"
                ? "Cartão"
                : "Conta (opcional)"}
          </span>
          <select name="accountId" className="input-field" defaultValue="">
            <option value="">
              {method === "credit" && kind === "expense"
                ? "Selecione o cartão"
                : "—"}
            </option>
            {filteredAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink-muted)]">
              Dia do mês
            </span>
            <input
              name="dayOfMonth"
              type="number"
              min={1}
              max={28}
              defaultValue={1}
              required
              className="input-field"
            />
            <span className="block text-xs text-[var(--color-ink-subtle)]">
              Dia em que o lançamento é gerado (1–28).
            </span>
          </label>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink-muted)]">
              Começar em
            </span>
            <input
              name="nextRun"
              type="month"
              defaultValue={currentYearMonth()}
              required
              className="input-field"
            />
            <span className="block text-xs text-[var(--color-ink-subtle)]">
              Primeiro mês em que a regra deve gerar.
            </span>
          </label>
        </div>

        {isCreditExpense && (
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--color-ink-muted)]">
              Número de parcelas
            </span>
            <input
              name="installmentCount"
              type="number"
              min={1}
              defaultValue={1}
              className="input-field"
            />
            <span className="block text-xs text-[var(--color-ink-subtle)]">
              Quantas faturas futuras receberão este gasto. Use 1 para
              mensalidade fixa.
            </span>
          </label>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Criando…" : "Criar regra"}
        </button>
      </form>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-[110] flex max-w-sm items-start gap-3 rounded-2xl border border-white/10 bg-[#141A23] px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
            role="status"
          >
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0 text-[var(--color-ok)]"
            />
            <p className="flex-1 text-sm font-medium text-white">{toast}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="rounded-lg p-1 text-[var(--color-ink-subtle)] transition hover:bg-white/5 hover:text-white"
              aria-label="Fechar"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
