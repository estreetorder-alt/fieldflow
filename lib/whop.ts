import { Whop } from "@whop/sdk";

let _client: Whop | null = null;

/** Returns a configured Whop SDK client, or null if WHOP_API_KEY isn't set yet. */
export function getWhopClient(): Whop | null {
  const apiKey = process.env.WHOP_API_KEY ?? "";
  if (!apiKey) return null;
  if (_client) return _client;
  _client = new Whop({
    apiKey,
    // Webhook signature verification key — SDK expects it base64-encoded
    webhookKey: process.env.WHOP_WEBHOOK_SECRET ? btoa(process.env.WHOP_WEBHOOK_SECRET) : undefined,
  });
  return _client;
}

export function getWhopCompanyId(): string {
  return process.env.WHOP_COMPANY_ID ?? "";
}
