"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  LineChart,
  MoreHorizontal,
} from "lucide-react";
import { FabQuickAdd } from "@/components/fab-quick-add";
import { listUserMeta } from "@/app/actions";
import { currentYearMonth } from "@/lib/dates";

const primary = [
  { href: "/month", label: "Home", match: "/month", icon: CalendarDays },
  {
    href: "/transactions",
    label: "Gastos",
    match: "/transactions",
    icon: CreditCard,
  },
  {
    href: "/investments",
    label: "Invest.",
    match: "/investments",
    icon: LineChart,
  },
  { href: "/more", label: "Mais", match: "/more", icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();
  const [meta, setMeta] = useState<{
    categories: { id: string; name: string; kind: string }[];
    accounts: { id: string; name: string; type: string }[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listUserMeta()
      .then((data) => {
        if (!cancelled) setMeta(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const ym =
    pathname.match(/^\/month\/(\d{4}-\d{2})/)?.[1] ?? currentYearMonth();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      aria-label="Navegação principal"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-1 pt-1">
        {primary.slice(0, 2).map((link) => {
          const active =
            pathname === link.match || pathname.startsWith(`${link.match}/`);
          const Icon = link.icon;
          return (
            <li key={link.href} className="flex justify-center">
              <Link
                href={link.href}
                className={`flex min-w-[4rem] flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium ${
                  active
                    ? "text-[var(--accent-ink)]"
                    : "text-[var(--color-ink-muted)]"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                {link.label}
              </Link>
            </li>
          );
        })}

        <li className="relative flex justify-center">
          <div className="-mt-5">
            {meta ? (
              <FabQuickAdd yearMonth={ym} meta={meta} dock />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-2xl text-[var(--on-accent)] opacity-60">
                +
              </span>
            )}
          </div>
        </li>

        {primary.slice(2).map((link) => {
          const active =
            pathname === link.match || pathname.startsWith(`${link.match}/`);
          const Icon = link.icon;
          return (
            <li key={link.href} className="flex justify-center">
              <Link
                href={link.href}
                className={`flex min-w-[4rem] flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium ${
                  active
                    ? "text-[var(--accent-ink)]"
                    : "text-[var(--color-ink-muted)]"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
