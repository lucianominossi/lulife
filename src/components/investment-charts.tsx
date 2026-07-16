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

const COLORS = [
  "#F16744",
  "#0193A5",
  "#F6A278",
  "#027184",
  "#C73618",
  "#004A59",
];

export function InvestmentCharts({
  byType,
  byInstitution,
}: {
  byType: { name: string; value: number }[];
  byInstitution: { name: string; value: number }[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="panel p-5">
        <h3 className="mb-3 text-sm font-medium text-[var(--color-ink-muted)]">
          Por tipo
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={byType}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
              >
                {byType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatBRL(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="mt-2 grid gap-1 sm:grid-cols-2">
          {byType.map((t, i) => (
            <li key={t.name} className="flex justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                {t.name}
              </span>
              <span className="tabular-nums text-[var(--color-ink-muted)]">
                {formatBRL(t.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel p-5">
        <h3 className="mb-3 text-sm font-medium text-[var(--color-ink-muted)]">
          Por instituição
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byInstitution} margin={{ left: 0, right: 8 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--chart-grid)"
              />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--ink-muted)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--ink-muted)" }} width={56} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Bar dataKey="value" fill="#0193A5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
