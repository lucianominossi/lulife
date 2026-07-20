import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";

export function getAppUrl() {
  const fromEnv =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (fromEnv) {
    return fromEnv.startsWith("http") ? fromEnv.replace(/\/$/, "") : `https://${fromEnv.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function createRawToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() || "Lulife <onboarding@resend.dev>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "RESEND_API_KEY é obrigatório em produção para envio de emails.",
      );
    }
    console.info(
      `[email:dev] To: ${to} | Subject: ${subject} | (body omitted — contains secrets)`,
    );
    return { ok: true as const, mode: "console" as const };
  }

  const resend = new Resend(apiKey);
  const result = await resend.emails.send({ from, to, subject, html, text });
  if (result.error) {
    console.error("[email] Resend error:", result.error);
    throw new Error("Falha ao enviar email.");
  }
  return { ok: true as const, mode: "resend" as const };
}

export async function sendVerificationEmail({
  to,
  name,
  token,
}: {
  to: string;
  name: string;
  token: string;
}) {
  const url = `${getAppUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = "Confirme seu email — Lulife";
  const text = `Olá ${name},\n\nConfirme seu email para ativar sua conta Lulife:\n${url}\n\nEste link expira em 24 horas.`;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0B0F17">
      <h1 style="font-size:20px;margin:0 0 12px">Confirme seu email</h1>
      <p style="margin:0 0 16px;color:#4B5563">Olá ${escapeHtml(name)}, clique no botão abaixo para ativar sua conta Lulife.</p>
      <p style="margin:0 0 24px">
        <a href="${url}" style="display:inline-block;background:#8B5CF6;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">
          Confirmar email
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#6B7280">Ou abra este link: ${url}</p>
      <p style="margin:16px 0 0;font-size:12px;color:#6B7280">O link expira em 24 horas.</p>
    </div>
  `;
  return sendEmail({ to, subject, html, text });
}

export async function sendPasswordResetEmail({
  to,
  name,
  token,
}: {
  to: string;
  name: string;
  token: string;
}) {
  const url = `${getAppUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = "Redefinir senha — Lulife";
  const text = `Olá ${name},\n\nPara redefinir sua senha no Lulife, abra:\n${url}\n\nEste link expira em 1 hora. Se você não pediu isso, ignore este email.`;
  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0B0F17">
      <h1 style="font-size:20px;margin:0 0 12px">Redefinir senha</h1>
      <p style="margin:0 0 16px;color:#4B5563">Olá ${escapeHtml(name)}, use o botão abaixo para criar uma nova senha.</p>
      <p style="margin:0 0 24px">
        <a href="${url}" style="display:inline-block;background:#8B5CF6;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">
          Redefinir senha
        </a>
      </p>
      <p style="margin:0;font-size:12px;color:#6B7280">Ou abra este link: ${url}</p>
      <p style="margin:16px 0 0;font-size:12px;color:#6B7280">O link expira em 1 hora. Se você não pediu isso, ignore este email.</p>
    </div>
  `;
  return sendEmail({ to, subject, html, text });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
