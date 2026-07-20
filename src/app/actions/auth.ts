"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { appUrl } from "@/lib/app-url";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureLocalUser } from "@/lib/supabase/user";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: z.string().trim().email("Email inválido.").max(160),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(100),
});

const emailSchema = z.string().trim().email("Email inválido.").max(160);

export type AuthActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

const RATE_LIMITED =
  "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

async function clientIp() {
  const h = await headers();
  return clientIpFromHeaders(h);
}

function authErrorMessage(error: { message?: string; code?: string } | null) {
  const msg = (error?.message || "").toLowerCase();
  const code = error?.code || "";
  if (
    code === "over_email_send_rate_limit" ||
    msg.includes("rate limit") ||
    msg.includes("too many")
  ) {
    return RATE_LIMITED;
  }
  if (msg.includes("already registered") || msg.includes("already been registered")) {
    return "Este email já está em uso. Tente entrar ou recuperar a senha.";
  }
  if (msg.includes("invalid login") || code === "invalid_credentials") {
    return "Email ou senha inválidos.";
  }
  return error?.message || "Não foi possível concluir. Tente novamente.";
}

export async function registerAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const email = parsed.data.email.toLowerCase();
  const ip = await clientIp();
  if (!(await rateLimit(`register:${ip}:${email}`, 5, 60 * 60))) {
    return { error: RATE_LIMITED };
  }

  const supabase = await createClient();
  const origin = appUrl();
  const { data, error } = await supabase.auth.signUp({
    email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/login?verified=1")}`,
    },
  });

  if (error) {
    return { error: authErrorMessage(error) };
  }

  // If email confirmation is disabled, session exists immediately.
  if (data.user && data.session) {
    await ensureLocalUser(data.user);
    redirect("/month");
  }

  redirect(`/register/check-email?email=${encodeURIComponent(email)}`);
}

export async function resendVerificationAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const emailParsed = emailSchema.safeParse(formData.get("email"));
  if (!emailParsed.success) {
    return { error: emailParsed.error.issues[0]?.message ?? "Email inválido." };
  }

  const email = emailParsed.data.toLowerCase();
  const ip = await clientIp();
  if (!(await rateLimit(`resend-verify:${ip}:${email}`, 3, 60 * 60))) {
    return { error: RATE_LIMITED };
  }

  const supabase = await createClient();
  const origin = appUrl();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/login?verified=1")}`,
    },
  });

  if (error) {
    return { error: authErrorMessage(error) };
  }

  return {
    ok: true,
    message: "Se o email existir e ainda não estiver confirmado, reenviamos o link.",
  };
}

export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const emailParsed = emailSchema.safeParse(formData.get("email"));
  if (!emailParsed.success) {
    return { error: emailParsed.error.issues[0]?.message ?? "Email inválido." };
  }

  const email = emailParsed.data.toLowerCase();
  const ip = await clientIp();
  if (!(await rateLimit(`forgot:${ip}:${email}`, 5, 60 * 60))) {
    return { error: RATE_LIMITED };
  }

  const supabase = await createClient();
  const origin = appUrl();
  // Always show success to avoid email enumeration.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
  });

  return {
    ok: true,
    message:
      "Se existir uma conta com este email, enviamos um link para redefinir a senha.",
  };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z
    .object({
      password: z
        .string()
        .min(8, "A senha deve ter pelo menos 8 caracteres.")
        .max(100),
    })
    .safeParse({ password: formData.get("password") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Senha inválida." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      error:
        "Sessão de redefinição expirada. Solicite um novo link em “Esqueceu a senha?”.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { error: authErrorMessage(error) };
  }

  await supabase.auth.signOut();
  redirect("/login?reset=1");
}

export async function signOutAndInvalidate() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Permanently delete the signed-in user and all cascaded financial data. */
export async function deleteMyAccount(formData: FormData) {
  if (formData.get("confirm") !== "on") {
    throw new Error("Confirmação obrigatória para excluir a conta.");
  }
  const sessionUser = await requireUser();
  const db = await getDb();
  await db.delete(users).where(eq(users.id, sessionUser.id));

  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(sessionUser.id);
  } catch (err) {
    console.error("[deleteMyAccount] Supabase delete failed:", err);
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateProfileNameAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const name = z
    .string()
    .trim()
    .min(2, "Informe seu nome.")
    .max(80)
    .safeParse(formData.get("name"));
  if (!name.success) {
    return { error: name.error.issues[0]?.message ?? "Nome inválido." };
  }

  const user = await requireUser();
  const db = await getDb();
  await db
    .update(users)
    .set({ name: name.data })
    .where(eq(users.id, user.id));

  const supabase = await createClient();
  await supabase.auth.updateUser({ data: { name: name.data } });

  revalidatePath("/profile");
  revalidatePath("/month");

  return { ok: true, message: "Nome atualizado." };
}

export async function updateProfileEmailAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z
    .object({
      email: emailSchema,
      password: z.string().min(1, "Informe a senha atual."),
    })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await requireUser();
  if (!(await rateLimit(`profile-email:${user.id}`, 3, 60 * 60))) {
    return { error: RATE_LIMITED };
  }

  const email = parsed.data.email.toLowerCase();
  if (email === user.email.toLowerCase()) {
    return { error: "Este já é o seu email atual." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });
  if (signInError) {
    return { error: "Senha atual incorreta." };
  }

  const origin = appUrl();
  const { error } = await supabase.auth.updateUser(
    { email },
    {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/profile")}`,
    },
  );

  if (error) {
    return { error: authErrorMessage(error) };
  }

  revalidatePath("/profile");

  return {
    ok: true,
    message:
      "Enviamos um link de confirmação para o novo email. O endereço muda após a confirmação.",
  };
}

export async function updateProfilePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = z
    .object({
      currentPassword: z.string().min(1, "Informe a senha atual."),
      password: z
        .string()
        .min(8, "A nova senha deve ter pelo menos 8 caracteres.")
        .max(100),
      confirmPassword: z.string().min(1, "Confirme a nova senha."),
    })
    .safeParse({
      currentPassword: formData.get("currentPassword"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (parsed.data.password !== parsed.data.confirmPassword) {
    return { error: "A confirmação não confere com a nova senha." };
  }

  const user = await requireUser();
  if (!(await rateLimit(`profile-password:${user.id}`, 5, 60 * 60))) {
    return { error: RATE_LIMITED };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (signInError) {
    return { error: "Senha atual incorreta." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) {
    return { error: authErrorMessage(error) };
  }

  await supabase.auth.signOut();
  redirect("/login?password=1");
}
