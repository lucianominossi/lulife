"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme, type Theme } from "@/components/theme-provider";

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

const OPTIONS: { value: Theme; label: string; hint: string; icon: typeof Sun }[] =
  [
    {
      value: "light",
      label: "Claro",
      hint: "Fundo suave e cards elevados",
      icon: Sun,
    },
    {
      value: "dark",
      label: "Escuro",
      hint: "Visual atual do Lulife",
      icon: Moon,
    },
  ];

/** Preference control for the profile settings page. */
export function ThemePreference() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="grid gap-3 sm:grid-cols-2"
      role="radiogroup"
      aria-label="Tema da interface"
    >
      {OPTIONS.map((option) => {
        const selected = theme === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setTheme(option.value)}
            className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
              selected
                ? "border-[color-mix(in_srgb,var(--accent)_45%,transparent)] bg-[var(--accent-soft)]"
                : "border-[var(--border-strong)] hover:bg-[var(--hover-fill)]"
            }`}
          >
            <span
              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                selected
                  ? "bg-[var(--accent)] text-[var(--on-accent)]"
                  : "bg-[var(--hover-fill)] text-[var(--ink-muted)]"
              }`}
            >
              <Icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-[var(--ink)]">
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-[var(--color-ink-muted)]">
                {option.hint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
