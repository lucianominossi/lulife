import Link from "next/link";
import {
  CreditCard,
  LineChart,
  Plus,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Money } from "@/components/money";
import { Sparkline } from "@/components/ui/sparkline";

export function MobileDashboardHero({
  firstName,
  saldo,
  income,
  expenses,
  saldoSeries,
  incomeSeries,
  expenseSeries,
}: {
  firstName: string;
  saldo: number;
  income: number;
  expenses: number;
  saldoSeries: number[];
  incomeSeries: number[];
  expenseSeries: number[];
}) {
  return (
    <div className="space-y-5 lg:hidden">
      <header>
        <h1 className="text-[28px] font-bold tracking-tight">
          Olá, {firstName}!
        </h1>
        <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
          Resumo do mês
        </p>
      </header>

      <div
        className="relative overflow-hidden rounded-[24px] p-5 text-white shadow-[var(--shadow-card)]"
        style={{ background: "var(--hero-gradient)" }}
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white/80">Saldo atual</p>
            <p className="mt-2 text-[32px] font-bold leading-none tracking-tight">
              <Money value={saldo} className="text-white" />
            </p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Wallet size={18} />
          </span>
        </div>
        <div className="relative mt-6">
          <Sparkline
            data={saldoSeries}
            color="rgba(255,255,255,0.9)"
            className="h-10 w-full max-w-[200px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--color-ink-muted)]">
              Entradas
            </p>
            <TrendingUp size={14} className="text-[var(--ok)]" />
          </div>
          <p className="mt-2 text-lg font-bold text-[var(--ok)]">
            <Money value={income} tone="positive" />
          </p>
          <Sparkline
            data={incomeSeries}
            color="var(--ok)"
            className="mt-2 h-6 w-full"
          />
        </div>
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-[var(--color-ink-muted)]">
              Gastos
            </p>
            <CreditCard size={14} className="text-[var(--danger)]" />
          </div>
          <p className="mt-2 text-lg font-bold text-[var(--danger)]">
            <Money value={expenses} tone="negative" />
          </p>
          <Sparkline
            data={expenseSeries}
            color="var(--danger)"
            className="mt-2 h-6 w-full"
          />
        </div>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold">Acesso rápido</p>
        <div className="grid grid-cols-4 gap-2">
          {[
            {
              href: "/transactions",
              label: "Lançar",
              icon: Plus,
              tone: "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
            },
            {
              href: "/transactions",
              label: "Gastos",
              icon: CreditCard,
              tone: "bg-[#F43F5E]/12 text-[#F43F5E]",
            },
            {
              href: "/goals",
              label: "Metas",
              icon: Target,
              tone: "bg-[#FACC15]/15 text-[#CA8A04]",
            },
            {
              href: "/investments",
              label: "Invest.",
              icon: LineChart,
              tone: "bg-[#3B82F6]/12 text-[#3B82F6]",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center gap-2 rounded-2xl px-1 py-2 text-center transition hover:bg-[var(--hover-fill)]"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}
                >
                  <Icon size={20} />
                </span>
                <span className="text-[11px] font-medium text-[var(--color-ink-muted)]">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
