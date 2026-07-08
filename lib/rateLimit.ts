import { supabase } from "./supabase";

/**
 * Record an attempt (e.g. a failed login, or a password-reset request) against a key.
 * Keys are typically "login:<email>", "login-ip:<ip>", "reset:<email>", etc.
 */
export async function recordAttempt(key: string): Promise<void> {
  await supabase.from("rate_limit_attempts").insert({ key, created_at: new Date().toISOString() });
}

/**
 * Returns true if `key` has hit or exceeded `max` attempts within the last `windowMinutes`.
 * Fails OPEN (returns false / not limited) if the rate-limit table can't be reached, so a
 * database hiccup never locks legitimate users out.
 */
export async function isRateLimited(key: string, max: number, windowMinutes: number): Promise<boolean> {
  try {
    const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { count, error } = await supabase
      .from("rate_limit_attempts")
      .select("id", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", since);
    if (error) return false;
    return (count ?? 0) >= max;
  } catch {
    return false;
  }
}

/** Best-effort client IP extraction behind Vercel/proxies. */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
