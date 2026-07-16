import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviaremos um link para redefinir sua senha."
    >
      <AuthForm
        action={forgotPasswordAction}
        submitLabel="Enviar link"
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
      <p className="mt-4 text-center text-sm text-[var(--color-ink-muted)]">
        Lembrou a senha?{" "}
        <Link
          href="/login"
          className="font-medium text-[#C4B5FD] hover:text-white"
        >
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
