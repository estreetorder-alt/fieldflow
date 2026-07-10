import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/db";
import { verifyPassword, isHashed, hashPassword } from "@/lib/password";
import { isRateLimited, recordAttempt, getClientIp } from "@/lib/rateLimit";

const MAX_ATTEMPTS_PER_EMAIL = 5;   // per 15 min
const MAX_ATTEMPTS_PER_IP = 20;     // per 15 min, across all emails (credential stuffing)
const WINDOW_MINUTES = 15;

export async function POST(request: NextRequest) {
  const { email, password, recaptchaToken } = await request.json();
  const ip = getClientIp(request);

  // Google reCAPTCHA v2 verification — only enforced when a secret key is configured
  const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
  if (recaptchaSecret) {
    if (!recaptchaToken)
      return NextResponse.json({ error: "Please complete the CAPTCHA verification" }, { status: 400 });
    try {
      const verify = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${encodeURIComponent(recaptchaSecret)}&response=${encodeURIComponent(recaptchaToken)}&remoteip=${encodeURIComponent(ip)}`,
      });
      const result = await verify.json();
      if (!result.success)
        return NextResponse.json({ error: "CAPTCHA verification failed. Please try again." }, { status: 400 });
    } catch {
      // If Google is unreachable, fall through — rate limiting still protects login
    }
  }
  const emailKey = `login:${String(email ?? "").toLowerCase()}`;
  const ipKey = `login-ip:${ip}`;

  const serviceKey = process.env.SUPABASE_SERVICE_KEY ?? "";
  if (!serviceKey || serviceKey.includes("REPLACE_WITH") || serviceKey === "placeholder") {
    return NextResponse.json({
      error: "Database is not configured. Set SUPABASE_SERVICE_KEY in .env.local (Supabase → Settings → API → service_role).",
    }, { status: 503 });
  }

  if (await isRateLimited(emailKey, MAX_ATTEMPTS_PER_EMAIL, WINDOW_MINUTES) || await isRateLimited(ipKey, MAX_ATTEMPTS_PER_IP, WINDOW_MINUTES)) {
    return NextResponse.json({ error: "Too many login attempts. Please wait 15 minutes and try again." }, { status: 429 });
  }

  let user;
  try {
    user = await getUserByEmail(email);
  } catch (err) {
    console.error("[login] getUserByEmail failed", err);
    return NextResponse.json({
      error: "Cannot reach the database. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY.",
    }, { status: 503 });
  }

  if (!user || !(await verifyPassword(password, user.password))) {
    await Promise.all([recordAttempt(emailKey), recordAttempt(ipKey)]);
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Transparently upgrade legacy plaintext passwords to bcrypt on next successful login
  if (!isHashed(user.password)) {
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("users").update({ password: await hashPassword(password) }).eq("id", user.id);
  }

  // Admin always can log in
  if (user.role !== "admin") {
    if (user.suspended)
      return NextResponse.json({ error: "Your account has been suspended. Contact info@snapect.com" }, { status: 403 });
    // Only block when explicitly false (legacy/null rows stay allowed)
    if (user.accountActive === false)
      return NextResponse.json({
        error: "pending_activation",
        message: "Your account is pending activation. Please complete your payment to access your dashboard.",
      }, { status: 403 });
  }

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, email: user.email },
  });
  const cookieOpts = {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
  response.cookies.set("user_id",   user.id,   { ...cookieOpts, httpOnly: true });
  response.cookies.set("user_role", user.role,  { ...cookieOpts, httpOnly: true });
  response.cookies.set("user_name", user.name,  { ...cookieOpts, httpOnly: false });
  return response;
}
