"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  CreditCard,
  LineChart,
  RefreshCw,
  Settings,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";
import { signOutAndInvalidate } from "@/app/actions/auth";
import { IconBox } from "@/components/ui/icon-box";
import { PrivacyProvider, usePrivacy } from "@/components/privacy-provider";

const links = [
  { href: "/month", label: "Dashboard", match: "/month", icon: CalendarDays },
  {
    href: "/transactions",
    label: "Gastos",
    match: "/transactions",
    icon: CreditCard,
  },
  {
    href: "/investments",
    label: "Investimentos",
    match: "/investments",
    icon: LineChart,
  },
  {
    href: "/recurring",
    label: "Recorrências",
    match: "/recurring",
    icon: RefreshCw,
  },
  { href: "/settings", label: "Cadastros", match: "/settings", icon: Settings },
];

function PrivacyToggle({ compact }: { compact?: boolean }) {
  const { hidden, toggle } = usePrivacy();
  const Icon = hidden ? EyeOff : Eye;
  const label = hidden ? "Mostrar valores" : "Ocultar valores";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      aria-label={label}
      title={label}
      className={
        compact
          ? "btn-ghost flex h-11 w-11 items-center justify-center p-0"
          : "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-sidebar-muted)] transition hover:bg-[var(--hover-fill)] hover:text-[var(--color-sidebar-ink)]"
      }
    >
      <Icon size={compact ? 26 : 16} strokeWidth={compact ? 2.25 : 2} />
      {!compact && <span>{label}</span>}
    </button>
  );
}
function NavLinks({
  onNavigate,
  compact,
}: {
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const pathname = usePathname();

  if (compact) {
    return (
      <ul className="flex gap-1 overflow-x-auto pb-1">
        {links.map((link) => {
          const active =
            pathname === link.match || pathname.startsWith(`${link.match}/`);
          const Icon = link.icon;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onNavigate}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                    : "text-[var(--color-ink-muted)] hover:bg-[var(--hover-fill)] hover:text-[var(--ink)]"
                }`}
              >
                <Icon size={15} />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="space-y-1">
      {links.map((link) => {
        const active =
          pathname === link.match || pathname.startsWith(`${link.match}/`);
        const Icon = link.icon;
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent-ink)]"
                  : "text-[var(--color-sidebar-muted)] hover:bg-[var(--hover-fill)] hover:text-[var(--color-sidebar-ink)]"
              }`}
            >
              <Icon
                size={18}
                className={
                  active
                    ? "text-[var(--accent-ink)]"
                    : "text-[var(--color-sidebar-muted)] group-hover:text-[var(--color-sidebar-ink)]"
                }
              />
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserAvatar({ name, email }: { name?: string | null; email?: string }) {
  const pathname = usePathname();
  const active = pathname === "/profile" || pathname.startsWith("/profile/");
  const initials = (name || email || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-2">
      <Link
        href="/profile"
        className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition ${
          active
            ? "border-[color-mix(in_srgb,var(--accent)_40%,transparent)] bg-[var(--accent-soft)]"
            : "border-[var(--border)] bg-[var(--hover-fill)] hover:border-[var(--panel-hover-border)] hover:bg-[var(--surface-2)]"
        }`}
        aria-current={active ? "page" : undefined}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-ink)]">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-[var(--color-sidebar-ink)]">
            {name || "Conta"}
          </p>
          {email && (
            <p className="truncate text-xs text-[var(--color-sidebar-muted)]">
              {email}
            </p>
          )}
        </div>
        <ChevronRight
          size={16}
          className="shrink-0 text-[var(--color-sidebar-muted)]"
        />
      </Link>
      <form action={signOutAndInvalidate}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-sidebar-muted)] transition hover:bg-[var(--hover-fill)] hover:text-[var(--color-danger)]"
        >
          <LogOut size={15} />
          Sair
        </button>
      </form>
    </div>
  );
}

function UpgradeCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--accent-soft)] via-[var(--brand-soft)] to-transparent p-4">
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[var(--accent-soft)] blur-2xl" />
      <div className="relative flex items-start gap-3">
        <IconBox icon={Sparkles} tone="savings" size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-sidebar-ink)]">
            Lulife Pro
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-sidebar-muted)]">
            Mais opções e vantagens.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-ink)] transition hover:text-[var(--color-sidebar-ink)]"
          >
            Em breve
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { name?: string | null; email?: string | null };
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <PrivacyProvider>
      <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-[var(--border)] bg-[var(--color-sidebar)] px-4 py-6 text-[var(--color-sidebar-ink)] lg:flex">
          <Link href="/month" className="mb-8 flex items-center gap-3 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-ink)]">
              L
            </span>
            <div>
              <span className="block text-lg font-bold tracking-tight">
                Lulife
              </span>
              <span className="block text-[11px] text-[var(--color-sidebar-muted)]">
                Finanças pessoais
              </span>
            </div>
          </Link>

          <nav className="flex-1 overflow-y-auto">
            <p className="mb-2 px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-sidebar-muted)]">
              Menu
            </p>
            <NavLinks />
          </nav>

          <div className="mt-4 space-y-3">
            <UpgradeCard />
            <PrivacyToggle />
            <UserAvatar name={user?.name} email={user?.email ?? undefined} />
          </div>
        </aside>

        <div className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--page-bg)]/80 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link href="/month" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-bold text-[var(--accent-ink)]">
                L
              </span>
              <span className="text-lg font-bold tracking-tight">Lulife</span>
            </Link>
            <div className="flex items-center gap-1">
              <PrivacyToggle compact />
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className="btn-ghost flex h-11 w-11 items-center justify-center p-0"
                aria-expanded={mobileOpen}
                aria-label="Menu"
              >
                {mobileOpen ? <X size={26} strokeWidth={2.25} /> : <Menu size={26} strokeWidth={2.25} />}
              </button>
            </div>
          </div>
          <AnimatePresence>
            {mobileOpen && (
              <motion.nav
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-[var(--border)] px-3 py-3"
              >
                <NavLinks onNavigate={() => setMobileOpen(false)} compact />
                <div className="mt-3 px-1">
                  <UserAvatar
                    name={user?.name}
                    email={user?.email ?? undefined}
                  />
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </div>

        <main className="min-w-0 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="animate-fade-in mx-auto w-full min-w-0 max-w-[1280px]">
            {children}
          </div>
        </main>
      </div>
    </PrivacyProvider>
  );
}
