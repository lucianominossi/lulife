"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/theme-provider";

export type ChartColors = {
  income: string;
  expense: string;
  invest: string;
  tick: string;
  label: string;
  grid: string;
};

const DARK_DEFAULTS: ChartColors = {
  income: "#22c55e",
  expense: "#f43f5e",
  invest: "#6c5cff",
  tick: "#7a8596",
  label: "#b4bdc9",
  grid: "#1e2636",
};

function readVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

export function useChartColors(): ChartColors {
  const { theme } = useTheme();
  const [colors, setColors] = useState<ChartColors>(DARK_DEFAULTS);

  useEffect(() => {
    setColors({
      income: readVar("--chart-income", DARK_DEFAULTS.income),
      expense: readVar("--chart-expense", DARK_DEFAULTS.expense),
      invest: readVar("--chart-invest", DARK_DEFAULTS.invest),
      tick: readVar("--chart-tick", DARK_DEFAULTS.tick),
      label: readVar("--chart-label", DARK_DEFAULTS.label),
      grid: readVar("--chart-grid", DARK_DEFAULTS.grid),
    });
  }, [theme]);

  return colors;
}
