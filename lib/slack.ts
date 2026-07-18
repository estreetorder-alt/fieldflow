/**
 * Sends form-submission notifications to Slack via an Incoming Webhook.
 * Set SLACK_WEBHOOK_URL in environment variables to enable — silently
 * no-ops if not configured, so this never blocks registration if unset.
 *
 * To get a webhook URL: Slack → your workspace → Settings → Apps →
 * "Incoming Webhooks" → Add to Slack → choose a channel → copy the URL.
 */

export function isSlackConfigured(): boolean {
  return Boolean(process.env.SLACK_WEBHOOK_URL);
}

export async function sendSlackNotification(text: string, fields?: Record<string, string>): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const fieldLines = fields
    ? Object.entries(fields)
        .map(([k, v]) => `*${k}:* ${v || "—"}`)
        .join("\n")
    : "";

  const payload = {
    text,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*${text}*` } },
      ...(fieldLines ? [{ type: "section", text: { type: "mrkdwn", text: fieldLines } }] : []),
    ],
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Never let a Slack failure break the actual form submission
    console.error("[slack] notification failed", err);
  }
}
