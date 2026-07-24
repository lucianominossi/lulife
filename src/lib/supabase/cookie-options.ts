import type { CookieOptionsWithName } from "@supabase/ssr";

/** Shared cookie flags for Supabase SSR clients. */
export function authCookieOptions(): CookieOptionsWithName {
  return {
    path: "/",
    sameSite: "lax",
    // Browser client cannot use httpOnly; keep false for SSR compatibility.
    // Secure in production so tokens are never sent over plain HTTP.
    secure: process.env.NODE_ENV === "production",
    maxAge: 400 * 24 * 60 * 60,
  };
}
