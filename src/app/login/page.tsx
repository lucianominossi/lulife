"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email ou senha inválidos.");
      return;
    }
    router.push(search.get("callbackUrl") || "/month");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm text-[var(--color-ink-muted)]">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input-field py-3"
          placeholder="voce@email.com"
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm text-[var(--color-ink-muted)]">Senha</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input-field py-3"
        />
      </label>
      {error && (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      )}
      {search.get("error") === "session" && !error && (
        <p className="text-sm text-[var(--color-ink-muted)]" role="status">
          Sessão expirada após reset do banco. Entre novamente.
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3.5"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#0E131C] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-[#8B5CF6]/25 blur-3xl" />
        <div className="absolute -left-10 bottom-10 h-64 w-64 rounded-full bg-[#3B82F6]/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[#C4B5FD]">
            L
          </span>
          <p className="text-2xl font-bold tracking-tight text-white">Lulife</p>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white">
            Controle financeiro com clareza.
          </h1>
          <p className="mt-4 text-lg text-[var(--color-ink-muted)]">
            Visão do mês, cartões, orçamento e investimentos — em um painel
            premium.
          </p>
        </div>
        <p className="relative text-sm text-[var(--color-sidebar-muted)]">
          Finanças pessoais · dark mode
        </p>
      </section>

      <section className="relative flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="mb-2 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-sm font-bold text-[#C4B5FD]">
              L
            </span>
            <p className="text-2xl font-bold tracking-tight">Lulife</p>
          </div>
          <h2 className="mt-4 text-[32px] font-bold tracking-tight lg:mt-0">
            Entrar na conta
          </h2>
          <p className="mt-2 text-[var(--color-ink-muted)]">
            Acesse seu painel financeiro.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
