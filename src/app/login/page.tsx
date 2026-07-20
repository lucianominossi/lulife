import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import { isSessionCurrent } from "@/lib/session";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();

  if (session?.user?.id) {
    const current = await isSessionCurrent();
    // Stale JWT after password change/reset → clear cookie or Safari loops.
    if (!current || params.error === "session") {
      await signOut({ redirect: false });
    } else {
      redirect(safeCallbackUrl(params.callbackUrl));
    }
  }

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
