/**
 * Care Business Consulting Solutions payment integration.
 * Used for one-time "Buy Credits" wallet top-ups on the client wallet page.
 *
 * The old pd.cash hosted pay link has been retired. In its place, the
 * system now uses a fixed set of hosted invoice links — one per supported
 * top-up amount — provided by carebusinessconsultingsolutions.com. These
 * links do NOT accept query parameters (no amount/reference/redirect_url
 * templating), so:
 *   1. Only the exact preset amounts below are payable through this flow.
 *   2. There is no reference id passed through, so payments cannot be
 *      auto-matched back to a pending wallet_transactions row via webhook.
 *      Admins must confirm each pending top-up manually in
 *      Admin → Wallet once the payment is verified on the
 *      Care Business Consulting Solutions side (Confirm/Cancel buttons —
 *      see app/api/wallet/[id]/route.ts).
 */

const CARE_PAY_LINKS: Record<number, string> = {
  25: "https://carebusinessconsultingsolutions.com/generate/invoice?care&pay&25",
  50: "https://carebusinessconsultingsolutions.com/generate/invoice?care&pay&50",
  75: "https://carebusinessconsultingsolutions.com/generate/invoice?care&pay&75",
  100: "https://carebusinessconsultingsolutions.com/generate/invoice?care&pay&100",
  150: "https://carebusinessconsultingsolutions.com/generate/invoice?care&pay&150",
};

/** The only USD amounts that currently have a hosted payment link. */
export const CARE_PAY_AMOUNTS: number[] = Object.keys(CARE_PAY_LINKS)
  .map(Number)
  .sort((a, b) => a - b);

export function isPdCashConfigured(): boolean {
  return true;
}

/** Returns the fixed hosted-invoice link for an amount, or null if unsupported. */
export function getCarePayLink(amountUsd: number): string | null {
  const key = Math.round(amountUsd);
  return CARE_PAY_LINKS[key] ?? null;
}

/**
 * Builds the URL a client is sent to in order to pay.
 * `txId`/`redirectPath` are accepted for backward compatibility with
 * existing callers but are no longer usable — the provider's links don't
 * accept query params, so nothing is appended. Throws if the amount isn't
 * one of the supported preset tiers.
 */
export function buildPdCashCheckoutUrl(opts: {
  amountUsd: number;
  txId: string;
  redirectPath: string;
}): string {
  const url = getCarePayLink(opts.amountUsd);
  if (!url) {
    throw new Error(
      `No payment link is configured for $${opts.amountUsd}. Supported amounts: ${CARE_PAY_AMOUNTS.map((a) => `$${a}`).join(", ")}.`,
    );
  }
  return url;
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
