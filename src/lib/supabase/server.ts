import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions } from "@/lib/supabase/cookie-options";

export async function createClient() {
  const cookieStore = await cookies();
  const cookieDefaults = authCookieOptions();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: cookieDefaults,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...cookieDefaults, ...options }),
            );
          } catch {
            // Called from a Server Component — middleware will refresh sessions.
          }
        },
      },
    },
  );
}
