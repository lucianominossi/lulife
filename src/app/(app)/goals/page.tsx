import Link from "next/link";
import { Target } from "lucide-react";

export default function GoalsPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-ink)]">
        <Target size={28} />
      </span>
      <h1 className="mt-6 text-[28px] font-bold tracking-tight">Metas</h1>
      <p className="mt-2 max-w-sm text-sm text-[var(--color-ink-muted)]">
        Em breve você poderá definir objetivos de economia e acompanhar o
        progresso por aqui.
      </p>
      <Link href="/month" className="btn-primary mt-8">
        Voltar ao dashboard
      </Link>
    </div>
  );
}
