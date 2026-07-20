import { createHash, randomBytes } from "node:crypto";

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

/** True when Brevo is configured for real delivery. */
export function hasEmailProvider() {
  return Boolean(process.env.BREVO_API_KEY?.trim());
}

function parseFromAddress(raw: string): { name: string; email: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.*)<([^>]+)>$/);
  if (match) {
    const name = match[1].trim().replace(/^"|"$/g, "") || "Lulife";
    return { name, email: match[2].trim() };
  }
  return { name: "Lulife", email: trimmed };
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
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const fromRaw =
    process.env.EMAIL_FROM?.trim() || "Lulife <noreply@example.com>";
  const sender = parseFromAddress(fromRaw);

  if (!apiKey) {
    // MVP without Brevo: deliver via server logs (Vercel Runtime Logs).
    console.info(`[email:console] To: ${to} | Subject: ${subject}\n${text}`);
    return { ok: true as const, mode: "console" as const };
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: { name: sender.name, email: sender.email },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[email] Brevo error:", response.status, detail);
    throw new Error("Falha ao enviar email.");
  }

  return { ok: true as const, mode: "brevo" as const };
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
