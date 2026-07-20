/** Only same-origin relative paths — blocks open redirects via callbackUrl. */
export function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return "/month";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/month";
  try {
    const u = new URL(raw, "http://local.invalid");
    if (u.origin !== "http://local.invalid") return "/month";
    const path = `${u.pathname}${u.search}${u.hash}`;
    return path || "/month";
  } catch {
    return "/month";
  }
}
