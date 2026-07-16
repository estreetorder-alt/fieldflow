/**
 * pd.cash payment integration (Cash App + crypto checkout orchestration).
 * Used for one-time "Buy Credits" wallet top-ups on the client wallet page.
 *
 * ⚠️ VERIFY BEFORE GOING LIVE:
 * The exact query-string parameter names pd.cash's hosted pay link accepts,
 * and the exact webhook signature scheme (header name + algorithm), were
 * not available from official docs at the time this was written. Log into
 * your pd.cash merchant dashboard, open their API/webhook docs, and:
 *   1. Confirm the param names used in buildPdCashCheckoutUrl() below
 *      match what their hosted link actually expects (amount / reference /
 *      redirect_url are reasonable, common defaults but not confirmed).
 *   2. Confirm the webhook signature scheme and replace
 *      verifyPdCashWebhookSignature() with their real verification method.
 *      Until then this checks a shared secret you set yourself (see
 *      PDCASH_WEBHOOK_SECRET below) so the endpoint isn't wide open, but
 *      it is NOT pd.cash's own signature — it only works if pd.cash lets
 *      you configure a custom query param / header on outgoing webhooks,
 *      or if you proxy/rewrite the webhook URL to include it.
 */

const PDCASH_PAY_LINK = process.env.PDCASH_PAY_LINK || "https://pd.cash/pay/@Snapect";

export function isPdCashConfigured(): boolean {
  return Boolean(PDCASH_PAY_LINK);
}

/**
 * Builds the URL a client is redirected to in order to pay via pd.cash.
 * `txId` is passed through as a reference/order id so the webhook (or
 * manual admin reconciliation) can match the payment back to the correct
 * pending wallet_transactions row.
 */
export function buildPdCashCheckoutUrl(opts: {
  amountUsd: number;
  txId: string;
  redirectPath: string;
}): string {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "https://snapect.com").replace(/\/$/, "");
  const url = new URL(PDCASH_PAY_LINK);
  url.searchParams.set("amount", opts.amountUsd.toFixed(2));
  url.searchParams.set("reference", opts.txId);
  url.searchParams.set("order_id", opts.txId);
  url.searchParams.set("redirect_url", `${base}${opts.redirectPath}`);
  return url.toString();
}

/**
 * Verifies an inbound pd.cash webhook request.
 * PLACEHOLDER — see the file-level note above. Replace with pd.cash's
 * documented signature verification once confirmed.
 */
export function verifyPdCashWebhookSignature(request: {
  headers: Headers;
  url: string;
}): { ok: boolean; error?: string } {
  const secret = process.env.PDCASH_WEBHOOK_SECRET;
  if (!secret) {
    return { ok: false, error: "PDCASH_WEBHOOK_SECRET is not configured" };
  }
  const headerSig = request.headers.get("x-pdcash-signature") || request.headers.get("x-webhook-secret");
  const querySig = new URL(request.url).searchParams.get("secret");
  const provided = headerSig || querySig;
  if (!provided || provided !== secret) {
    return { ok: false, error: "Invalid or missing webhook signature" };
  }
  return { ok: true };
}

/** Small helper mirroring lib/whop.ts's metaString for reading metadata safely. */
export function pdcashString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}
