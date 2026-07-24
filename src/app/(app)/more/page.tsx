import Link from "next/link";
import {
  RefreshCw,
  Settings,
  Target,
  User,
  ChevronRight,
} from "lucide-react";

const items = [
  {
    href: "/recurring",
    label: "Recorrências",
    hint: "Assinaturas e parcelas",
    icon: RefreshCw,
  },
  {
    href: "/goals",
    label: "Metas",
    hint: "Em breve",
    icon: Target,
  },
  {
    href: "/settings",
    label: "Cadastros",
    hint: "Contas e categorias",
    icon: Settings,
  },
  {
    href: "/profile",
    label: "Perfil",
    hint: "Conta e aparência",
    icon: User,
  },
];

export default function MorePage() {
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <header>
        <h1 className="text-[28px] font-bold tracking-tight">Mais</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Atalhos e configurações
        </p>
      </header>
      <ul className="panel divide-y divide-[var(--border)] overflow-hidden p-0">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-4 py-4 transition hover:bg-[var(--hover-fill)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)]">
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {item.label}
                  </span>
                  <span className="block text-xs text-[var(--color-ink-muted)]">
                    {item.hint}
                  </span>
                </span>
                <ChevronRight
                  size={16}
                  className="text-[var(--color-ink-subtle)]"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
