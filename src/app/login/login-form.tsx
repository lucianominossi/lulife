"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

export function LoginForm() {
  const search = useSearchParams();
  const callbackUrl = safeCallbackUrl(search.get("callbackUrl"));

  return (
    <>
      {search.get("reset") === "1" && (
        <p className="mt-8 rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/10 px-3 py-2 text-sm text-[#22C55E]">
          Senha atualizada. Entre com a nova senha.
        </p>
      )}
      {search.get("password") === "1" && (
        <p className="mt-8 rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/10 px-3 py-2 text-sm text-[#22C55E]">
          Senha alterada. Entre com a nova senha.
        </p>
      )}
      {search.get("verified") === "1" && (
        <p className="mt-8 rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/10 px-3 py-2 text-sm text-[#22C55E]">
          Email confirmado. Você já pode entrar.
        </p>
      )}
      {search.get("error") === "auth" && (
        <p className="mt-8 text-sm text-[var(--color-danger)]" role="alert">
          Não foi possível confirmar o link. Tente novamente.
        </p>
      )}
      {search.get("error") === "session" && (
        <p className="mt-8 text-sm text-[var(--color-ink-muted)]" role="status">
          Sessão encerrada. Entre novamente com sua senha.
        </p>
      )}

      <AuthForm
        action={loginAction}
        submitLabel="Entrar"
        pendingLabel="Entrando…"
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
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
              className="text-xs font-medium text-[var(--accent-ink)] hover:text-[var(--ink)]"
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
      </AuthForm>

      <p className="mt-4 text-center text-sm text-[var(--color-ink-muted)]">
        Não tem conta?{" "}
        <Link
          href="/register"
          className="font-medium text-[var(--accent-ink)] hover:text-[var(--ink)]"
        >
          Criar conta
        </Link>
      </p>
    </>
  );
}
