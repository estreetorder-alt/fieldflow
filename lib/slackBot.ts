/**
 * Two-way Slack integration for the live support chat widget.
 *
 * This is separate from lib/slack.ts (which only sends one-way incoming
 * webhook notifications). A live, in-thread chat needs a real Slack APP:
 *
 *   SLACK_BOT_TOKEN           — xoxb-... bot token.
 *                               Scopes needed: chat:write, plus
 *                               channels:history (public channel) or
 *                               groups:history (private channel).
 *   SLACK_SIGNING_SECRET      — verifies Events API requests really came
 *                               from Slack (Basic Information -> Signing Secret).
 *   SLACK_SUPPORT_CHANNEL_ID  — the channel id (e.g. C0123ABCDEF) the bot
 *                               is invited into and posts/reads threads in.
 *
 * Silently no-ops (postToSupportChannel) or fails closed (signature check)
 * if not configured — same defensive pattern as lib/slack.ts.
 */
import crypto from "crypto";

export function isSlackBotConfigured(): boolean {
  return Boolean(process.env.SLACK_BOT_TOKEN && process.env.SLACK_SUPPORT_CHANNEL_ID);
}

export async function postToSupportChannel(
  text: string,
  threadTs?: string
): Promise<{ ok: boolean; ts?: string }> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_SUPPORT_CHANNEL_ID;
  if (!token || !channel) return { ok: false };

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        channel,
        text,
        ...(threadTs ? { thread_ts: threadTs } : {}),
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error("[slackBot] chat.postMessage failed:", data.error);
      return { ok: false };
    }
    return { ok: true, ts: data.ts as string };
  } catch (err) {
    console.error("[slackBot] chat.postMessage error", err);
    return { ok: false };
  }
}

/** Verifies an incoming Events API request really came from Slack (HMAC + replay window). */
export function verifySlackSignature(
  rawBody: string,
  timestampHeader: string | null,
  signatureHeader: string | null
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret || !timestampHeader || !signatureHeader) return false;

  // Reject requests older than 5 minutes to guard against replay attacks.
  const age = Math.abs(Date.now() / 1000 - Number(timestampHeader));
  if (!Number.isFinite(age) || age > 60 * 5) return false;

  const base = `v0:${timestampHeader}:${rawBody}`;
  const expected = `v0=${crypto.createHmac("sha256", signingSecret).update(base).digest("hex")}`;

  const expectedBuf = Buffer.from(expected);
  const gotBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== gotBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, gotBuf);
}
