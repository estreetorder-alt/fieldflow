import { createHmac, timingSafeEqual } from "crypto";
import { Whop } from "@whop/sdk";

export type WhopEnvironment = "production" | "sandbox";

const SANDBOX_API = "https://sandbox-api.whop.com/api/v1";
const PROD_API = "https://api.whop.com/api/v1";
const SANDBOX_CHECKOUT_HOST = "https://sandbox.whop.com";
const PROD_CHECKOUT_HOST = "https://whop.com";

let _client: Whop | null = null;
let _clientEnv: string | null = null;

export function getWhopEnvironment(): WhopEnvironment {
  const raw = (process.env.WHOP_ENVIRONMENT ?? "sandbox").toLowerCase().trim();
  return raw === "production" || raw === "prod" ? "production" : "sandbox";
}

export function isWhopSandbox(): boolean {
  return getWhopEnvironment() === "sandbox";
}

function resolveApiKey(): string {
  if (isWhopSandbox()) {
    return process.env.WHOP_SANDBOX_API_KEY || process.env.WHOP_API_KEY || "";
  }
  return process.env.WHOP_API_KEY || "";
}

function resolveWebhookSecret(): string {
  if (isWhopSandbox()) {
    return process.env.WHOP_SANDBOX_WEBHOOK_SECRET || process.env.WHOP_WEBHOOK_SECRET || "";
  }
  return process.env.WHOP_WEBHOOK_SECRET || "";
}

export function getWhopCompanyId(): string {
  if (isWhopSandbox()) {
    return process.env.WHOP_SANDBOX_COMPANY_ID || process.env.WHOP_COMPANY_ID || "";
  }
  return process.env.WHOP_COMPANY_ID || "";
}

export function getWhopCheckoutHost(): string {
  return isWhopSandbox() ? SANDBOX_CHECKOUT_HOST : PROD_CHECKOUT_HOST;
}

export function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Whop requires redirect_url to start with https:// (localhost http is rejected).
 * Prefer WHOP_REDIRECT_BASE_URL (e.g. ngrok), else NEXT_PUBLIC_BASE_URL if already https.
 */
export function getWhopRedirectBaseUrl(): string {
  const candidates = [
    process.env.WHOP_REDIRECT_BASE_URL,
    process.env.NEXT_PUBLIC_BASE_URL,
  ];
  for (const raw of candidates) {
    const base = (raw ?? "").trim().replace(/\/$/, "");
    if (base.startsWith("https://")) return base;
  }
  throw new Error(
    "Whop requires an https:// redirect URL. Set WHOP_REDIRECT_BASE_URL to your ngrok URL (e.g. https://xxxx.ngrok-free.dev) in .env.local, keep ngrok running on port 3000, then restart npm run dev.",
  );
}

/** Absolute Whop checkout URL (handles relative purchase_url). */
export function toAbsoluteCheckoutUrl(purchaseUrl: string): string {
  if (!purchaseUrl) return "";
  if (/^https?:\/\//i.test(purchaseUrl)) return purchaseUrl;
  const path = purchaseUrl.startsWith("/") ? purchaseUrl : `/${purchaseUrl}`;
  return `${getWhopCheckoutHost()}${path}`;
}

/** Reset cached client after env/config changes (tests / hot reload). */
export function resetWhopClient(): void {
  _client = null;
  _clientEnv = null;
}

/** Returns a configured Whop SDK client, or null if API key isn't set. */
export function getWhopClient(): Whop | null {
  const apiKey = resolveApiKey();
  if (!apiKey) return null;

  const env = getWhopEnvironment();
  const cacheKey = `${env}:${apiKey.slice(0, 12)}`;
  if (_client && _clientEnv === cacheKey) return _client;

  const opts: ConstructorParameters<typeof Whop>[0] = {
    apiKey,
    // SDK unwrap expects base64 key; we primarily verify with raw HMAC ourselves.
    webhookKey: resolveWebhookSecret() ? btoa(resolveWebhookSecret()) : undefined,
  };
  if (isWhopSandbox()) {
    opts.baseURL = SANDBOX_API;
  } else {
    opts.baseURL = process.env.WHOP_BASE_URL || PROD_API;
  }

  _client = new Whop(opts);
  _clientEnv = cacheKey;
  return _client;
}

export function isWhopConfigured(): boolean {
  return Boolean(resolveApiKey() && getWhopCompanyId());
}

export type WalletCheckoutPurpose =
  | "plan_topup"
  | "custom_topup"
  | "auto_topup"
  | "connect_card"
  | "add_card"
  | "order";

export interface CreatePaymentCheckoutInput {
  amountUsd: number;
  title: string;
  redirectPath: string;
  metadata: Record<string, string>;
  description?: string;
}

export interface CreateSetupCheckoutInput {
  redirectPath: string;
  metadata: Record<string, string>;
  purpose?: "connect_card" | "add_card";
}

/**
 * One-time USD payment checkout. Plan is created inline from our DB amount —
 * admin never creates plans in Whop.
 */
export async function createPaymentCheckout(input: CreatePaymentCheckoutInput): Promise<{
  checkoutId: string;
  checkoutUrl: string;
}> {
  const client = getWhopClient();
  const companyId = getWhopCompanyId();
  if (!client || !companyId) throw new Error("Whop is not configured");

  const amount = Number(input.amountUsd);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  const checkout = await client.checkoutConfigurations.create({
    mode: "payment",
    plan: {
      company_id: companyId,
      currency: "usd",
      initial_price: amount,
      plan_type: "one_time",
      force_create_new_plan: true,
      adaptive_pricing_enabled: false,
      title: input.title,
      description: input.description ?? input.title,
      payment_method_configuration: {
        enabled: ["card"],
        disabled: [],
        include_platform_defaults: false,
      },
      product: {
        title: input.title,
        external_identifier: `snapect-wallet-${Math.round(amount * 100)}`,
      },
    },
    redirect_url: `${getWhopRedirectBaseUrl()}${input.redirectPath.startsWith("/") ? input.redirectPath : `/${input.redirectPath}`}`,
    metadata: input.metadata,
  });

  return {
    checkoutId: checkout.id,
    checkoutUrl: toAbsoluteCheckoutUrl(checkout.purchase_url),
  };
}

/** Save card without charging (Whop setup mode). */
export async function createSetupCheckout(input: CreateSetupCheckoutInput): Promise<{
  checkoutId: string;
  checkoutUrl: string;
}> {
  const client = getWhopClient();
  const companyId = getWhopCompanyId();
  if (!client || !companyId) throw new Error("Whop is not configured");

  const checkout = await client.checkoutConfigurations.create({
    mode: "setup",
    company_id: companyId,
    currency: "usd",
    redirect_url: `${getWhopRedirectBaseUrl()}${input.redirectPath.startsWith("/") ? input.redirectPath : `/${input.redirectPath}`}`,
    metadata: {
      ...input.metadata,
      purpose: input.purpose ?? input.metadata.purpose ?? "connect_card",
    },
    payment_method_configuration: {
      enabled: ["card"],
      disabled: [],
      include_platform_defaults: false,
    },
  });

  return {
    checkoutId: checkout.id,
    checkoutUrl: toAbsoluteCheckoutUrl(checkout.purchase_url),
  };
}

export interface OffSessionPaymentInput {
  amountUsd: number;
  title: string;
  memberId: string;
  paymentMethodId: string;
  metadata: Record<string, string>;
  description?: string;
}

/**
 * Charge a saved card with no browser redirect (auto top-up).
 * Fulfillment still confirmed via payment.succeeded webhook (idempotent).
 */
export async function createOffSessionPayment(input: OffSessionPaymentInput): Promise<{
  paymentId: string;
  status: string | null;
}> {
  const client = getWhopClient();
  const companyId = getWhopCompanyId();
  if (!client || !companyId) throw new Error("Whop is not configured");

  const amount = Number(input.amountUsd);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");

  const payment = await client.payments.create({
    company_id: companyId,
    member_id: input.memberId,
    payment_method_id: input.paymentMethodId,
    metadata: input.metadata,
    plan: {
      currency: "usd",
      initial_price: amount,
      plan_type: "one_time",
      force_create_new_plan: true,
      title: input.title,
      description: input.description ?? input.title,
      product: {
        title: input.title,
        external_identifier: `snapect-auto-topup-${Math.round(amount * 100)}`,
      },
    },
  });

  return {
    paymentId: payment.id,
    status: payment.status ?? null,
  };
}

/**
 * Verify Whop webhook with raw-secret HMAC-SHA256.
 * Do NOT rely on client.webhooks.unwrap() alone — it expects a different key encoding
 * and fails with raw `ws_…` secrets.
 *
 * Signed content: `${webhook-id}.${webhook-timestamp}.${rawBody}`
 */
export function verifyWhopWebhookSignature(
  rawBody: string,
  headers: Headers | Record<string, string | null | undefined>,
): { ok: true; eventId: string; timestamp: string } | { ok: false; error: string } {
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

  const eventId = get("webhook-id");
  const timestamp = get("webhook-timestamp");
  const signatureHeader = get("webhook-signature");
  const secret = resolveWebhookSecret();

  if (!secret) return { ok: false, error: "WHOP_WEBHOOK_SECRET not configured" };
  if (!eventId || !timestamp || !signatureHeader) {
    return { ok: false, error: "Missing webhook-id, webhook-timestamp, or webhook-signature" };
  }

  const tsNum = Number(timestamp);
  if (!Number.isFinite(tsNum)) return { ok: false, error: "Invalid webhook-timestamp" };
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - tsNum);
  if (ageSec > 5 * 60) return { ok: false, error: "Webhook timestamp outside 5-minute tolerance" };

  const signed = `${eventId}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signed, "utf8").digest();

  const parts = signatureHeader.split(" ").map((p) => p.trim()).filter(Boolean);
  let matched = false;
  for (const part of parts) {
    const [version, b64] = part.split(",", 2);
    if (version !== "v1" || !b64) continue;
    try {
      const actual = Buffer.from(b64, "base64");
      if (actual.length === expected.length && timingSafeEqual(actual, expected)) {
        matched = true;
        break;
      }
    } catch {
      /* ignore bad base64 chunk */
    }
  }

  if (!matched) return { ok: false, error: "Invalid webhook signature" };
  return { ok: true, eventId, timestamp };
}

export function metaString(meta: Record<string, unknown> | null | undefined, key: string): string {
  const v = meta?.[key];
  if (v == null) return "";
  return String(v);
}
