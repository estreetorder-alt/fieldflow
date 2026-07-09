import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, createPasswordResetToken, validateResetToken, useResetToken } from "@/lib/db";
import { sendAdminNotification } from "@/lib/email";
import { isRateLimited, recordAttempt, getClientIp } from "@/lib/rateLimit";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://snapect.com";

export async function POST(request: NextRequest) {
  const { email, token, newPassword } = await request.json();

  // Step 1: Request reset
  if (email && !token) {
    const ip = getClientIp(request);
    const emailKey = `reset:${String(email).toLowerCase()}`;
    const ipKey = `reset-ip:${ip}`;
    if (await isRateLimited(emailKey, 3, 60) || await isRateLimited(ipKey, 10, 60)) {
      // Same generic message — don't reveal rate-limit state to a potential attacker either
      return NextResponse.json({ ok: true, message: "If that email exists, a reset link has been sent." });
    }
    await Promise.all([recordAttempt(emailKey), recordAttempt(ipKey)]);

    const user = await getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return NextResponse.json({ ok: true, message: "If that email exists, a reset link has been sent." });
    }
    const resetToken = await createPasswordResetToken(user.id);
    const resetUrl = `${BASE}/reset-password?token=${resetToken}`;

    // Send reset email via Resend
    const RESEND_KEY = process.env.RESEND_API_KEY ?? "";
    if (RESEND_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Snapect <info@snapect.com>",
          to: [user.email],
          subject: "Reset Your Snapect Password",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:32px;">
              <img src="${BASE}/snapect-logo.png" alt="Snapect" style="height:48px;margin-bottom:24px;filter:brightness(0);"/>
              <h2 style="color:#0f1f3d;margin-bottom:16px;">Reset Your Password</h2>
              <p style="color:#475569;margin-bottom:24px;">Click the button below to reset your password. This link expires in 1 hour.</p>
              <a href="${resetUrl}" style="background:#c8991a;color:#0f1f3d;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;display:inline-block;margin-bottom:24px;">Reset Password</a>
              <p style="color:#94a3b8;font-size:12px;">If you didn't request this, ignore this email. Your password won't change.</p>
              <p style="color:#94a3b8;font-size:11px;margin-top:8px;">Link: ${resetUrl}</p>
            </div>`,
        }),
      });
    }
    return NextResponse.json({ ok: true, message: "If that email exists, a reset link has been sent." });
  }

  // Step 2: Validate token
  if (token && !newPassword) {
    const userId = await validateResetToken(token);
    return NextResponse.json({ valid: !!userId });
  }

  // Step 3: Set new password
  if (token && newPassword) {
    if (newPassword.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    const success = await useResetToken(token, newPassword);
    if (!success) return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
