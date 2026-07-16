"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { AuthShell } from "@/components/auth-shell";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverifiedEmail(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const res = await signIn("credentials", {
      email,
      password: String(fd.get("password")),
      redirect: false,
    });
    setLoading(false);

    if (res?.error) {
      const code = (res as { code?: string }).code;
      if (code === "email_not_verified" || res.error === "email_not_verified") {
        setUnverifiedEmail(email);
        setError(
          "Confirme seu email antes de entrar. Verifique sua caixa de entrada.",
        );
        return;
      }
      setError("Email ou senha inválidos.");
      return;
    }

    router.push(search.get("callbackUrl") || "/month");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      {search.get("reset") === "1" && (
        <p className="rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/10 px-3 py-2 text-sm text-[#22C55E]">
          Senha atualizada. Entre com a nova senha.
        </p>
      )}
      {search.get("verified") === "1" && (
        <p className="rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/10 px-3 py-2 text-sm text-[#22C55E]">
          Email confirmado. Você já pode entrar.
        </p>
      )}
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
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-[var(--color-ink-muted)]">Senha</span>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-[#C4B5FD] hover:text-white"
          >
            Esqueceu a senha?
          </Link>
        </div>
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
      {unverifiedEmail && (
        <p className="text-sm text-[var(--color-ink-muted)]">
          Não recebeu o email?{" "}
          <Link
            href={`/register/check-email?email=${encodeURIComponent(unverifiedEmail)}`}
            className="font-medium text-[#C4B5FD] hover:text-white"
          >
            Reenviar confirmação
          </Link>
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
      <p className="text-center text-sm text-[var(--color-ink-muted)]">
        Não tem conta?{" "}
        <Link
          href="/register"
          className="font-medium text-[#C4B5FD] hover:text-white"
        >
          Criar conta
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar na conta"
      subtitle="Acesse seu painel financeiro."
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
