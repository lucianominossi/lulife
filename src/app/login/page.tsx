import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { safeCallbackUrl } from "@/lib/safe-callback-url";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user && params.error !== "session") {
    redirect(safeCallbackUrl(params.callbackUrl));
  }

  if (data.user && params.error === "session") {
    await supabase.auth.signOut();
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
