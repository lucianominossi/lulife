"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/components/theme-provider";

const links = [
  { href: "/month", label: "Mês", match: "/month" },
  { href: "/transactions", label: "Gastos", match: "/transactions" },
  { href: "/investments", label: "Investimentos", match: "/investments" },
  { href: "/recurring", label: "Recorrências", match: "/recurring" },
  { href: "/import", label: "Importar", match: "/import" },
  { href: "/settings", label: "Cadastros", match: "/settings" },
];

function NavLinks({
  onNavigate,
  compact,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const pathname = usePathname();

  return (
    <ul className={compact ? "flex gap-1 overflow-x-auto" : "space-y-1"}>
      {links.map((link) => {
        const active =
          pathname === link.match || pathname.startsWith(`${link.match}/`);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-[var(--color-coral)] text-white"
                  : compact
                    ? "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)]"
                    : "text-[var(--color-sidebar-muted)] hover:bg-white/10 hover:text-[var(--color-sidebar-ink)]"
              }`}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ThemeToggle({ variant = "sidebar" }: { variant?: "sidebar" | "bar" }) {
  const { theme, toggle } = useTheme();
  const sidebar = variant === "sidebar";
  return (
    <button
      type="button"
      onClick={toggle}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        sidebar
          ? "w-full text-left text-[var(--color-sidebar-muted)] hover:bg-white/10 hover:text-[var(--color-sidebar-ink)]"
          : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)]"
      }`}
      aria-label="Alternar tema"
    >
      {theme === "dark" ? "Modo claro" : "Modo escuro"}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col bg-[var(--color-sidebar)] px-4 py-6 text-[var(--color-sidebar-ink)] lg:flex">
        <Link href="/month" className="mb-8 px-3">
          <span className="font-display text-2xl font-semibold tracking-tight">
            Lulife
          </span>
          <span className="mt-1 block text-xs text-[var(--color-sidebar-muted)]">
            Finanças pessoais
          </span>
        </Link>
        <nav className="flex-1">
          <NavLinks />
        </nav>
        <div className="space-y-1 border-t border-white/10 pt-4">
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/month" className="font-display text-xl font-semibold">
            Lulife
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="bar" />
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg bg-[var(--color-surface-2)] px-3 py-2 text-sm font-medium"
              aria-expanded={mobileOpen}
            >
              Menu
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="border-t border-[var(--color-border)] px-3 py-3">
            <NavLinks onNavigate={() => setMobileOpen(false)} compact />
          </nav>
        )}
      </div>

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-[1280px]">{children}</div>
      </main>
    </div>
  );
}
