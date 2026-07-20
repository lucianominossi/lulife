import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) {
    const params = await searchParams;
    redirect(safeCallbackUrl(params.callbackUrl));
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
