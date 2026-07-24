import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[var(--sidebar)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-[var(--accent-soft)] blur-3xl" />
        <div className="absolute -left-10 bottom-10 h-64 w-64 rounded-full bg-[var(--brand-soft)] blur-3xl" />
        <Link href="/login" className="relative">
          <BrandMark withWordmark size="lg" />
        </Link>
        <div className="relative max-w-md">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-[var(--sidebar-ink)]">
            Controle financeiro com clareza.
          </h1>
          <p className="mt-4 text-lg text-[var(--color-ink-muted)]">
            Visão do mês, cartões, orçamento e investimentos — em um painel
            premium.
          </p>
        </div>
        <p className="relative text-sm text-[var(--color-sidebar-muted)]">
          Finanças pessoais · cuidando do que importa
        </p>
      </section>

      <section className="relative flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <Link href="/login" className="mb-2 lg:hidden">
            <BrandMark withWordmark size="md" />
          </Link>
          <h2 className="mt-4 text-[32px] font-bold tracking-tight lg:mt-0">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 text-[var(--color-ink-muted)]">{subtitle}</p>
          )}
          {children}
        </div>
      </section>
    </main>
  );
}
