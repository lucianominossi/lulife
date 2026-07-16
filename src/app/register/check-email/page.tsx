import Link from "next/link";
import { resendVerificationAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthShell
      title="Confirme seu email"
      subtitle="Enviamos um link de confirmação. Sem confirmar, não é possível entrar."
    >
      <div className="mt-8 space-y-4">
        <p className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-[var(--color-ink-muted)]">
          {email ? (
            <>
              Verifique a caixa de entrada de{" "}
              <strong className="text-white">{email}</strong>. Em desenvolvimento,
              o link também aparece no terminal do servidor se Resend não
              estiver configurado.
            </>
          ) : (
            <>
              Verifique sua caixa de entrada. Em desenvolvimento, o link também
              aparece no terminal do servidor se Resend não estiver configurado.
            </>
          )}
        </p>

        <AuthForm
          action={resendVerificationAction}
          submitLabel="Reenviar email"
          pendingLabel="Enviando…"
        >
          {email ? (
            <input type="hidden" name="email" value={email} />
          ) : (
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--color-ink-muted)]">Email</span>
              <input
                name="email"
                type="email"
                required
                className="input-field py-3"
                placeholder="voce@email.com"
              />
            </label>
          )}
        </AuthForm>

        <p className="text-center text-sm text-[var(--color-ink-muted)]">
          Já confirmou?{" "}
          <Link
            href="/login"
            className="font-medium text-[#C4B5FD] hover:text-white"
          >
            Entrar
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
