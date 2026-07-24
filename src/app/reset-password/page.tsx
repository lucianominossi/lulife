import Link from "next/link";
import { resetPasswordAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    return (
      <AuthShell
        title="Link inválido ou expirado"
        subtitle="Abra o link do email novamente ou solicite um novo."
      >
        <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
          <Link
            href="/forgot-password"
            className="font-medium text-[var(--accent-ink)] hover:text-[var(--ink)]"
          >
            Solicitar novo link
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Nova senha"
      subtitle="Escolha uma senha forte com letra e número."
    >
      <AuthForm
        action={resetPasswordAction}
        submitLabel="Salvar nova senha"
        pendingLabel="Salvando…"
      >
        <label className="block space-y-1.5">
          <span className="text-sm text-[var(--color-ink-muted)]">
            Nova senha
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            className="input-field py-3"
            placeholder="Mínimo 10 caracteres, com letra e número"
          />
        </label>
      </AuthForm>
    </AuthShell>
  );
}
