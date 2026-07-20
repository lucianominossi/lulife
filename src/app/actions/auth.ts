"use server";

import bcrypt from "bcryptjs";
import { and, eq, gt, lt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signOut } from "@/auth";
import { getDb } from "@/db";
import { authTokens, users } from "@/db/schema";
import {
  createRawToken,
  EmailRateLimitedError,
  hashToken,
  hasEmailProvider,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/email";
import { clientIpFromHeaders, rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";


const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
  email: z.string().trim().email("Email inválido.").max(160),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(100),
});

const emailSchema = z.string().trim().email("Email inválido.").max(160);

const resetSchema = z.object({
  token: z.string().min(20),
  password: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(100),
});

export type AuthActionState = {
  ok?: boolean;
  error?: string;
  message?: string;
};

const RATE_LIMITED =
  "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

async function purgeExpiredTokens() {
  const db = await getDb();
  await db.delete(authTokens).where(lt(authTokens.expiresAt, new Date()));
}

async function issueToken(
  userId: string,
  type: "email_verify" | "password_reset",
  hoursValid: number,
) {
  const db = await getDb();
  await db
    .delete(authTokens)
    .where(and(eq(authTokens.userId, userId), eq(authTokens.type, type)));

  const raw = createRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + hoursValid * 60 * 60 * 1000);

  await db.insert(authTokens).values({
    userId,
    tokenHash,
    type,
    expiresAt,
  });

  return raw;
}

async function clientIp() {
  const h = await headers();
  return clientIpFromHeaders(h);
}

function isEmailRateLimited(err: unknown) {
  return (
    err instanceof EmailRateLimitedError ||
    (err instanceof Error && err.name === "EmailRateLimitedError")
  );
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

  const db = await getDb();
  await purgeExpiredTokens();

  const [existing] = await db
    .select({
      id: users.id,
      name: users.name,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Never overwrite password on re-register. Always same redirect to avoid
  // email enumeration (verified → no email; unverified → resend only).
  if (existing?.emailVerified) {
    redirect(`/register/check-email?email=${encodeURIComponent(email)}`);
  }

  // Cooldown: skip re-send if a verify token was issued in the last 2 minutes.
  if (existing) {
    const [recentToken] = await db
      .select({ id: authTokens.id })
      .from(authTokens)
      .where(
        and(
          eq(authTokens.userId, existing.id),
          eq(authTokens.type, "email_verify"),
          gt(authTokens.createdAt, new Date(Date.now() - 2 * 60 * 1000)),
        ),
      )
      .limit(1);
    if (recentToken) {
      redirect(`/register/check-email?email=${encodeURIComponent(email)}`);
    }
  }

  let userId = existing?.id;
  let nameForEmail = existing?.name ?? parsed.data.name;

  if (!existing) {
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const [created] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email,
        passwordHash,
      })
      .returning();
    userId = created.id;
    nameForEmail = created.name;
  }

  try {
    const token = await issueToken(userId!, "email_verify", 24);
    await sendVerificationEmail({
      to: email,
      name: nameForEmail,
      token,
      ip,
    });
  } catch (err) {
    if (isEmailRateLimited(err)) {
      return { error: RATE_LIMITED };
    }
    throw err;
  }

  redirect(`/register/check-email?email=${encodeURIComponent(email)}`);
}

export async function resendVerificationAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const emailResult = emailSchema.safeParse(formData.get("email"));
  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message ?? "Email inválido." };
  }

  const email = emailResult.data.toLowerCase();
  const ip = await clientIp();

  if (!(await rateLimit(`resend-cooldown:${email}`, 1, 120))) {
    return { error: RATE_LIMITED };
  }
  if (!(await rateLimit(`resend:${ip}:${email}`, 3, 60 * 60))) {
    return { error: RATE_LIMITED };
  }

  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const generic = {
    ok: true as const,
    message:
      "Se o email existir e ainda não estiver confirmado, enviamos um novo link.",
  };

  if (!user || user.emailVerified) {
    return generic;
  }

  try {
    const token = await issueToken(user.id, "email_verify", 24);
    await sendVerificationEmail({ to: email, name: user.name, token, ip });
  } catch (err) {
    if (isEmailRateLimited(err)) {
      return { error: RATE_LIMITED };
    }
    throw err;
  }

  return generic;
}

export async function verifyEmailAction(token: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (!token || token.length < 20) {
    return { ok: false, error: "Link inválido." };
  }

  const db = await getDb();
  await purgeExpiredTokens();
  const tokenHash = hashToken(token);

  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, tokenHash),
        eq(authTokens.type, "email_verify"),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    return {
      ok: false,
      error: "Link inválido ou expirado. Solicite um novo email de confirmação.",
    };
  }

  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, row.userId));

  await db
    .delete(authTokens)
    .where(
      and(
        eq(authTokens.userId, row.userId),
        eq(authTokens.type, "email_verify"),
      ),
    );

  return { ok: true };
}

export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const emailResult = emailSchema.safeParse(formData.get("email"));
  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message ?? "Email inválido." };
  }

  const email = emailResult.data.toLowerCase();
  const ip = await clientIp();

  if (!(await rateLimit(`forgot-email:${email}`, 3, 60 * 60))) {
    return { error: RATE_LIMITED };
  }
  if (!(await rateLimit(`forgot-ip:${ip}`, 10, 60 * 60))) {
    return { error: RATE_LIMITED };
  }

  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Always succeed to avoid email enumeration (unless send is rate-limited).
  if (user) {
    try {
      const token = await issueToken(user.id, "password_reset", 1);
      await sendPasswordResetEmail({ to: email, name: user.name, token, ip });
    } catch (err) {
      if (isEmailRateLimited(err)) {
        return { error: RATE_LIMITED };
      }
      throw err;
    }
  }

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
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const db = await getDb();
  await purgeExpiredTokens();
  const tokenHash = hashToken(parsed.data.token);

  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, tokenHash),
        eq(authTokens.type, "password_reset"),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) {
    return {
      error: "Link inválido ou expirado. Solicite uma nova redefinição.",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const [current] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);

  await db
    .update(users)
    .set({
      passwordHash,
      sessionVersion: (current?.sessionVersion ?? 0) + 1,
    })
    .where(eq(users.id, row.userId));

  await db
    .delete(authTokens)
    .where(
      and(
        eq(authTokens.userId, row.userId),
        eq(authTokens.type, "password_reset"),
      ),
    );

  redirect("/login?reset=1");
}

/** Bump sessionVersion then clear Auth.js cookie — invalidates stolen JWTs. */
export async function signOutAndInvalidate() {
  const sessionUser = await requireUser();
  const db = await getDb();
  const [current] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, sessionUser.id))
    .limit(1);
  await db
    .update(users)
    .set({ sessionVersion: (current?.sessionVersion ?? 0) + 1 })
    .where(eq(users.id, sessionUser.id));
  await signOut({ redirectTo: "/login" });
}

/** Permanently delete the signed-in user and all cascaded financial data. */
export async function deleteMyAccount(formData: FormData) {
  if (formData.get("confirm") !== "on") {
    throw new Error("Confirmação obrigatória para excluir a conta.");
  }
  const sessionUser = await requireUser();
  const db = await getDb();
  await db.delete(users).where(eq(users.id, sessionUser.id));
  await signOut({ redirectTo: "/login" });
}

async function bumpSessionVersion(userId: string) {
  const db = await getDb();
  const [current] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  await db
    .update(users)
    .set({ sessionVersion: (current?.sessionVersion ?? 0) + 1 })
    .where(eq(users.id, userId));
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
  const ip = await clientIp();
  const db = await getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row) {
    return { error: "Conta não encontrada." };
  }

  if (!(await bcrypt.compare(parsed.data.password, row.passwordHash))) {
    return { error: "Senha atual incorreta." };
  }

  if (email === row.email.toLowerCase()) {
    return { error: "Este já é o seu email atual." };
  }

  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (taken) {
    return { error: "Este email já está em uso." };
  }

  // Without Brevo, auto-verify so the user is not locked out of login.
  if (!hasEmailProvider()) {
    await db
      .update(users)
      .set({
        email,
        emailVerified: new Date(),
      })
      .where(eq(users.id, user.id));

    revalidatePath("/profile");
    return {
      ok: true,
      message:
        "Email atualizado. (Envio de confirmação ainda não configurado — conta já liberada para login.)",
    };
  }

  const previousEmail = row.email;
  const previousVerified = row.emailVerified;

  await db
    .update(users)
    .set({
      email,
      emailVerified: null,
    })
    .where(eq(users.id, user.id));

  try {
    const token = await issueToken(user.id, "email_verify", 24);
    await sendVerificationEmail({
      to: email,
      name: row.name,
      token,
      ip,
    });
  } catch (err) {
    console.error("[profile-email] send failed, reverting:", err);
    await db
      .update(users)
      .set({
        email: previousEmail,
        emailVerified: previousVerified,
      })
      .where(eq(users.id, user.id));
    if (isEmailRateLimited(err)) {
      return { error: RATE_LIMITED };
    }
    return {
      error:
        "Não foi possível enviar o email de confirmação. Nenhuma alteração foi aplicada.",
    };
  }

  revalidatePath("/profile");

  return {
    ok: true,
    message:
      "Email atualizado. Enviamos um link de confirmação para o novo endereço.",
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

  const db = await getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row) {
    return { error: "Conta não encontrada." };
  }

  if (!(await bcrypt.compare(parsed.data.currentPassword, row.passwordHash))) {
    return { error: "Senha atual incorreta." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id));
  await bumpSessionVersion(user.id);

  redirect("/login?password=1");
}
