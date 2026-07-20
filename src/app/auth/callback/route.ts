import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureLocalUser } from "@/lib/supabase/user";
import { safeCallbackUrl } from "@/lib/safe-callback-url";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeCallbackUrl(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await ensureLocalUser(data.user);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
