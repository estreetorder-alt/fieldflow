/**
 * pd.cash payment integration
 * Payment link: https://pd.cash/pay/@Snapect
 *
 * How it works:
 *  1. Redirect user to the pd.cash payment page with metadata in the URL
 *  2. pd.cash calls our webhook at /api/pdcash/webhook when payment succeeds
 *  3. We verify the webhook signature and credit the wallet
 */

export const PDCASH_PAYMENT_URL = "https://pd.cash/pay/@Snapect";

export interface PdCashPaymentLinkOptions {
  amountUsd: number;
  /** tx_id so webhook can credit the right wallet transaction */
  txId: string;
  userId: string;
  purpose: string;
  /** Full https URL to redirect to after payment */
  redirectUrl: string;
}

/**
 * Build the pd.cash payment URL with amount and metadata embedded
 * as query parameters (pd.cash passes these back in the webhook payload).
 */
export function buildPdCashUrl(opts: PdCashPaymentLinkOptions): string {
  const params = new URLSearchParams({
    amount: opts.amountUsd.toFixed(2),
    tx_id: opts.txId,
    user_id: opts.userId,
    purpose: opts.purpose,
    redirect_url: opts.redirectUrl,
  });
  return `${PDCASH_PAYMENT_URL}?${params.toString()}`;
}

/**
 * Verify a pd.cash webhook signature.
 * pd.cash signs the raw body with HMAC-SHA256 using the secret set in
 * your pd.cash dashboard, and sends it in the `X-PdCash-Signature` header.
 *
 * Set PDCASH_WEBHOOK_SECRET in your environment variables.
 */
export function verifyPdCashWebhook(
  rawBody: string,
  headers: Headers | Record<string, string | null | undefined>,
): { ok: true } | { ok: false; error: string } {
  const { createHmac, timingSafeEqual } = require("crypto") as typeof import("crypto");

  const secret = process.env.PDCASH_WEBHOOK_SECRET ?? "";
  if (!secret) return { ok: false, error: "PDCASH_WEBHOOK_SECRET not configured" };

  const get = (name: string): string => {
    if (headers instanceof Headers) {
      return headers.get(name) ?? headers.get(name.toLowerCase()) ?? "";
    }
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(headers)) {
      if (k.toLowerCase() === lower && v) return String(v);
    }
    return "";
  };

  const signature = get("x-pdcash-signature");
  if (!signature) return { ok: false, error: "Missing X-PdCash-Signature header" };

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  try {
    const actual = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (actual.length !== expectedBuf.length || !timingSafeEqual(actual, expectedBuf)) {
      return { ok: false, error: "Invalid webhook signature" };
    }
  } catch {
    return { ok: false, error: "Malformed webhook signature" };
  }

  return { ok: true };
}
