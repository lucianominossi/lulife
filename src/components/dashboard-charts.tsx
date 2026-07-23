"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL } from "@/lib/dates";
import { categoryColor } from "@/lib/category-style";
import {
  HIDDEN_AMOUNT_LABEL,
  usePrivacy,
} from "@/components/privacy-provider";
import { useChartColors } from "@/components/use-chart-colors";

type TrendPoint = {
  label: string;
  income: number;
  expenses: number;
  balance: number;
};

type CategorySlice = {
  name: string;
  value: number;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  const { hidden } = usePrivacy();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--tooltip-border)] bg-[var(--tooltip-bg)]/95 px-3 py-2 shadow-xl backdrop-blur-md">
      {label && (
        <p className="mb-1.5 text-xs font-medium text-[var(--chart-tick)]">
          {label}
        </p>
      )}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li
            key={p.name}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="flex items-center gap-2 text-[var(--chart-label)]">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: p.color }}
              />
              {p.name}
            </span>
            <span className="tabular-nums font-medium text-[var(--ink)]">
              {hidden ? HIDDEN_AMOUNT_LABEL : formatBRL(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MonthTrendChart({ data }: { data: TrendPoint[] }) {
  const { hidden } = usePrivacy();
  const chart = useChartColors();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="panel p-6"
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Fluxo dos últimos 6 meses
          </h2>
          <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
            Entradas vs. gastos no período
          </p>
        </div>
      </div>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={chart.income}
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor={chart.income}
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={chart.expense}
                  stopOpacity={0.25}
                />
                <stop
                  offset="100%"
                  stopColor={chart.expense}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chart.grid}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: chart.tick }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: chart.tick }}
              axisLine={false}
              tickLine={false}
              width={64}
              tickFormatter={(v: number) =>
                hidden
                  ? "••••"
                  : v >= 1000
                    ? `${Math.round(v / 1000)}k`
                    : String(v)
              }
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="income"
              name="Entradas"
              stroke={chart.income}
              strokeWidth={2.5}
              fill="url(#incomeGrad)"
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Gastos"
              stroke={chart.expense}
              strokeWidth={2}
              fill="url(#expenseGrad)"
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export function ExpenseDonutChart({ data }: { data: CategorySlice[] }) {
  const { hidden } = usePrivacy();
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="panel flex h-full flex-col p-6"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Gastos por categoria
        </h2>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Distribuição do mês
        </p>
      </div>

      {data.length === 0 ? (
        <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--dashed-border)] px-3 py-12 text-center text-sm text-[var(--color-ink-muted)]">
          Nenhum gasto categorizado
        </p>
      ) : (
        <>
          <div className="relative mx-auto h-52 w-full max-w-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={82}
                  paddingAngle={3}
                  stroke="none"
                >
                  {data.map((entry, i) => (
                    <Cell key={entry.name} fill={categoryColor(i)} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-ink-subtle)]">
                Total
              </p>
              <p className="text-sm font-semibold tabular-nums">
                {hidden ? HIDDEN_AMOUNT_LABEL : formatBRL(total)}
              </p>
            </div>
          </div>

          <ul className="mt-4 space-y-2.5">
            {data.map((item, i) => {
              const pct = total > 0 ? (item.value / total) * 100 : 0;
              return (
                <li
                  key={item.name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: categoryColor(i) }}
                    />
                    <span className="truncate text-[var(--color-ink-muted)]">
                      {item.name}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-[var(--color-ink-subtle)]">
                    {pct.toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </motion.div>
  );
}
