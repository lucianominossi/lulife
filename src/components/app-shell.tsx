"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  CreditCard,
  LineChart,
  RefreshCw,
  Upload,
  Settings,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { IconBox } from "@/components/ui/icon-box";

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
  { href: "/import", label: "Importar", match: "/import", icon: Upload },
  { href: "/settings", label: "Cadastros", match: "/settings", icon: Settings },
];

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
                    ? "bg-[var(--accent-soft)] text-[#C4B5FD]"
                    : "text-[var(--color-ink-muted)] hover:bg-white/5 hover:text-white"
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
                  ? "bg-[var(--accent-soft)] text-[#C4B5FD]"
                  : "text-[var(--color-sidebar-muted)] hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon
                size={18}
                className={
                  active
                    ? "text-[#A78BFA]"
                    : "text-[var(--color-sidebar-muted)] group-hover:text-white"
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
  const initials = (name || email || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[#C4B5FD]">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {name || "Conta"}
          </p>
          {email && (
            <p className="truncate text-xs text-[var(--color-sidebar-muted)]">
              {email}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-sidebar-muted)] transition hover:bg-white/5 hover:text-[#F43F5E]"
      >
        <LogOut size={15} />
        Sair
      </button>
    </div>
  );
}

function UpgradeCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#8B5CF6]/20 via-[#3B82F6]/10 to-transparent p-4">
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[#8B5CF6]/20 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <IconBox icon={Sparkles} tone="savings" size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Lulife Pro</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-sidebar-muted)]">
            Insights avançados e metas ilimitadas.
          </p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#C4B5FD] transition hover:text-white"
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-white/5 bg-[var(--color-sidebar)] px-4 py-6 text-[var(--color-sidebar-ink)] lg:flex">
        <Link href="/month" className="mb-8 flex items-center gap-3 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[#C4B5FD]">
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
          <UserAvatar name={user?.name} email={user?.email ?? undefined} />
        </div>
      </aside>

      <div className="sticky top-0 z-40 border-b border-white/5 bg-[var(--page-bg)]/80 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/month" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-xs font-bold text-[#C4B5FD]">
              L
            </span>
            <span className="text-lg font-bold tracking-tight">Lulife</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="btn-ghost flex h-10 w-10 items-center justify-center p-0"
            aria-expanded={mobileOpen}
            aria-label="Menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/5 px-3 py-3"
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

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="animate-fade-in mx-auto w-full max-w-[1280px]">
          {children}
        </div>
      </main>
    </div>
  );
}
