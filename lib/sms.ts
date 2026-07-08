// SMS notifications via Twilio. Gracefully degrades to a no-op (log only) when
// TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER aren't configured,
// so the app works fully without an SMS provider — this is just ready to plug in.
import { addEmailLog } from "./db";

function twilioConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
}

/**
 * Send an SMS if the recipient has opted in and Twilio is configured.
 * Always logs the attempt (via the existing email/notification log) so admins
 * can see what would have gone out even before a Twilio account is wired up.
 */
export async function sendSms(opts: { to: string; toName: string; smsOptIn?: boolean; message: string; type: string }): Promise<void> {
  if (!opts.smsOptIn) return; // respect opt-in preference
  if (!opts.to) return;

  if (!twilioConfigured()) {
    // No Twilio account yet — log what would have been sent, don't fail the caller
    await addEmailLog({ type: `sms_skipped_${opts.type}`, to: opts.to, subject: "[SMS not sent — Twilio not configured]", body: opts.message });
    return;
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const token = process.env.TWILIO_AUTH_TOKEN!;
  const from = process.env.TWILIO_FROM_NUMBER!;

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: opts.to, From: from, Body: opts.message }),
    });
    const ok = res.ok;
    await addEmailLog({ type: `sms_${opts.type}`, to: opts.to, subject: ok ? "SMS sent" : "SMS failed", body: opts.message });
  } catch {
    await addEmailLog({ type: `sms_error_${opts.type}`, to: opts.to, subject: "SMS send error", body: opts.message });
  }
}
