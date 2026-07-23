"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Tema claro" : "Tema escuro";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={!isDark}
      aria-label={label}
      title={label}
      className={
        compact
          ? "btn-ghost flex h-10 w-10 items-center justify-center p-0"
          : "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-sidebar-muted)] transition hover:bg-[var(--hover-fill)] hover:text-[var(--color-sidebar-ink)]"
      }
    >
      <Icon size={compact ? 22 : 16} />
      {!compact && <span>{label}</span>}
    </button>
  );
}
