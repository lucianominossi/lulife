import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureLocalUser } from "@/lib/supabase/user";

/** One auth+DB lookup per request (layout + page share the same result). */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    redirect("/login");
  }

  try {
    return await ensureLocalUser(data.user);
  } catch (err) {
    console.error("[requireUser] ensureLocalUser failed:", err);
    redirect("/login?error=session");
  }
});
