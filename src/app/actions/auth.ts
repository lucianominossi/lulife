"use server";

import bcrypt from "bcryptjs";
import { and, eq, gt, lt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { authTokens, users } from "@/db/schema";
import {
  createRawToken,
  hashToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "@/lib/email";

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
  const db = await getDb();
  await purgeExpiredTokens();

  const [existing] = await db
    .select({ id: users.id, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing?.emailVerified) {
    return { error: "Já existe uma conta com este email. Faça login." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let userId = existing?.id;

  if (existing) {
    await db
      .update(users)
      .set({
        name: parsed.data.name,
        passwordHash,
      })
      .where(eq(users.id, existing.id));
  } else {
    const [created] = await db
      .insert(users)
      .values({
        name: parsed.data.name,
        email,
        passwordHash,
      })
      .returning();
    userId = created.id;
  }

  const token = await issueToken(userId!, "email_verify", 24);
  await sendVerificationEmail({
    to: email,
    name: parsed.data.name,
    token,
  });

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
  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return {
      ok: true,
      message: "Se o email existir, enviaremos um novo link de confirmação.",
    };
  }

  if (user.emailVerified) {
    return { ok: true, message: "Este email já está confirmado. Faça login." };
  }

  const token = await issueToken(user.id, "email_verify", 24);
  await sendVerificationEmail({ to: email, name: user.name, token });

  return {
    ok: true,
    message: "Enviamos um novo link de confirmação para o seu email.",
  };
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
  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Always succeed to avoid email enumeration
  if (user) {
    const token = await issueToken(user.id, "password_reset", 1);
    await sendPasswordResetEmail({ to: email, name: user.name, token });
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
  await db
    .update(users)
    .set({ passwordHash })
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
