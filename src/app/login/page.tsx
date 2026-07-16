"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { useTheme } from "@/components/theme-provider";

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
      <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}

function ThemeButton() {
  const { theme, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      className="absolute right-6 top-6 rounded-lg px-3 py-2 text-sm text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-2)]"
    >
      {theme === "dark" ? "Claro" : "Escuro"}
    </button>
  );
}

export default function LoginPage() {
  return (
    <main className="relative grid min-h-dvh lg:grid-cols-2">
      <ThemeButton />
      <section className="relative hidden overflow-hidden bg-[var(--color-teal-deep)] lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute -right-20 top-20 h-72 w-72 rounded-full bg-[var(--color-teal-bright)]/20 blur-3xl" />
        <div className="absolute -left-10 bottom-10 h-64 w-64 rounded-full bg-[var(--color-coral)]/25 blur-3xl" />
        <p className="relative font-display text-4xl font-semibold tracking-tight text-white">
          Lulife
        </p>
        <div className="relative max-w-md">
          <h1 className="font-display text-5xl font-semibold leading-tight tracking-tight text-white">
            Controle financeiro com clareza.
          </h1>
          <p className="mt-4 text-lg text-[var(--color-sidebar-muted)]">
            Visão do mês, cartões, orçamento e investimentos — no desktop e no
            celular.
          </p>
        </div>
        <p className="relative text-sm text-[var(--color-sidebar-muted)]">
          Coral + teal · modo claro e escuro
        </p>
      </section>

      <section className="relative flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <p className="font-display text-4xl font-semibold tracking-tight lg:hidden">
            Lulife
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight lg:mt-0 lg:text-3xl">
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
