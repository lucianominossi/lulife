import Link from "next/link";
import { resendVerificationAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function CheckEmailPage() {
  return (
    <AuthShell
      title="Confirme seu email"
      subtitle="Enviamos um link de confirmação. Sem confirmar, não é possível entrar."
    >
      <div className="mt-8 space-y-4">
        <p className="rounded-xl border border-[var(--dashed-border)] bg-[var(--hover-fill)] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
          Verifique sua caixa de entrada (e o spam). O email é enviado pelo
          Supabase Auth.
        </p>

        <AuthForm
          action={resendVerificationAction}
          submitLabel="Reenviar email"
          pendingLabel="Enviando…"
        >
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
        </AuthForm>

        <p className="text-center text-sm text-[var(--color-ink-muted)]">
          Já confirmou?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--accent-ink)] hover:text-[var(--ink)]"
          >
            Entrar
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
