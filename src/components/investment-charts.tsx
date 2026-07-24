"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatBRL } from "@/lib/dates";
import { useChartColors } from "@/components/use-chart-colors";

const COLORS = [
  "#6C5CFF",
  "#3B82F6",
  "#22C55E",
  "#F43F5E",
  "#FB923C",
  "#FACC15",
  "#06B6D4",
  "#EC4899",
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: {
    name: string;
    value: number;
    color?: string;
    payload?: { fill?: string };
  }[];
  label?: string;
}) {
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
            <span className="text-[var(--chart-label)]">{p.name}</span>
            <span className="tabular-nums font-medium text-[var(--ink)]">
              {formatBRL(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InvestmentCharts({
  byType,
  byInstitution,
}: {
  byType: { name: string; value: number }[];
  byInstitution: { name: string; value: number }[];
}) {
  const chart = useChartColors();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="panel p-6">
        <h3 className="text-lg font-semibold tracking-tight">Por tipo</h3>
        <p className="mt-1 mb-4 text-sm text-[var(--color-ink-muted)]">
          Distribuição da carteira
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byType}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                stroke="none"
              >
                {byType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {byType.map((t, i) => (
            <li key={t.name} className="flex justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 text-[var(--color-ink-muted)]">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                {t.name}
              </span>
              <span className="tabular-nums text-[var(--color-ink-subtle)]">
                {formatBRL(t.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel p-6">
        <h3 className="text-lg font-semibold tracking-tight">
          Por instituição
        </h3>
        <p className="mt-1 mb-4 text-sm text-[var(--color-ink-muted)]">
          Alocação por corretora
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byInstitution} margin={{ left: 0, right: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chart.grid}
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: chart.tick }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: chart.tick }}
                width={56}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="value"
                name="Valor"
                fill={chart.invest}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
