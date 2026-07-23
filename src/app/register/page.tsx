import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Criar conta"
      subtitle="Cadastre-se e confirme seu email para começar."
    >
      <AuthForm
        action={registerAction}
        submitLabel="Criar conta"
        pendingLabel="Criando…"
      >
        <label className="block space-y-1.5">
          <span className="text-sm text-[var(--color-ink-muted)]">Nome</span>
          <input
            name="name"
            type="text"
            required
            minLength={2}
            autoComplete="name"
            className="input-field py-3"
            placeholder="Seu nome"
          />
        </label>
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
            minLength={8}
            autoComplete="new-password"
            className="input-field py-3"
            placeholder="Mínimo 8 caracteres"
          />
        </label>
      </AuthForm>
      <p className="mt-4 text-center text-sm text-[var(--color-ink-muted)]">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--accent-ink)] hover:text-[var(--ink)]"
        >
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
