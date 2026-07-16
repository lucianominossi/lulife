import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyEmailAction } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthShell
        title="Link inválido"
        subtitle="Este link de confirmação está incompleto."
      >
        <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
          Solicite um novo email em{" "}
          <Link
            href="/register/check-email"
            className="font-medium text-[#C4B5FD] hover:text-white"
          >
            reenviar confirmação
          </Link>
          .
        </p>
      </AuthShell>
    );
  }

  const result = await verifyEmailAction(token);
  if (result.ok) {
    redirect("/login?verified=1");
  }

  return (
    <AuthShell title="Não foi possível confirmar" subtitle={result.error}>
      <p className="mt-8 text-sm text-[var(--color-ink-muted)]">
        <Link
          href="/register/check-email"
          className="font-medium text-[#C4B5FD] hover:text-white"
        >
          Solicitar novo email
        </Link>{" "}
        ou{" "}
        <Link
          href="/login"
          className="font-medium text-[#C4B5FD] hover:text-white"
        >
          voltar ao login
        </Link>
        .
      </p>
    </AuthShell>
  );
}
