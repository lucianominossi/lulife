import type { NextConfig } from "next";

function appOrigins(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.AUTH_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (!raw) return [];
  const url = raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw}`;
  try {
    return [new URL(url).origin];
  } catch {
    return [];
  }
}

const isProd = process.env.NODE_ENV === "production";
const allowedOrigins = appOrigins();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Auth forms and finance edits; avoid oversized upload DoS surface.
      bodySizeLimit: "1mb",
      ...(allowedOrigins.length > 0 ? { allowedOrigins } : {}),
    },
    // Reuse visited dynamic RSC payloads for 30 min on SPA revisits.
    // Hard refresh always refetches; mutations call revalidatePath to clear.
    staleTimes: {
      dynamic: 30 * 60,
      static: 180,
    },
  },
  // PGlite breaks when webpack/turbopack bundle it (import.meta.url → URL → path error)
  serverExternalPackages: [
    "@electric-sql/pglite",
    "@neondatabase/serverless",
  ],
  async headers() {
    const csp = [
      "default-src 'self'",
      // Next.js still needs inline scripts for bootstrap; drop unsafe-eval in production.
      isProd
        ? "script-src 'self' 'unsafe-inline'"
        : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: csp },
          ...(isProd
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
