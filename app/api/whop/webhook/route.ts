import { NextRequest, NextResponse } from "next/server";
import {
  createOrder,
  updateOrder,
  addEmailLog,
  autoDispatch,
  getUserById,
} from "@/lib/db";
import { calcCompensation, getDeadlineDate, SERVICE_MAP } from "@/lib/services";
import { sendDispatchEmail, sendPaymentConfirmationEmail } from "@/lib/email";
import { metaString, verifyWhopWebhookSignature } from "@/lib/whop";
import {
  claimWebhookEvent,
  confirmWalletTopup,
  failWalletTopup,
  upsertPaymentMethod,
} from "@/lib/walletBilling";

type JsonRecord = Record<string, unknown>;

function asRecord(v: unknown): JsonRecord {
  return v && typeof v === "object" ? (v as JsonRecord) : {};
}

export async function POST(request: NextRequest) {
  const bodyText = await request.text();

  const verified = verifyWhopWebhookSignature(bodyText, request.headers);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  let event: JsonRecord;
  try {
    event = JSON.parse(bodyText) as JsonRecord;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = String(event.type ?? "");
  const eventId = String(event.id ?? verified.eventId);
  const data = asRecord(event.data);
  const metadata = asRecord(data.metadata);
  const purpose = metaString(metadata, "purpose") || metaString(metadata, "walletTopup");
  const accountId =
    metaString(metadata, "account_id") ||
    metaString(metadata, "userId") ||
    metaString(metadata, "accountId");
  const paymentId = typeof data.id === "string" ? data.id : null;

  // Idempotency: duplicate deliveries return 200 without re-processing
  try {
    const claim = await claimWebhookEvent({
      eventId,
      eventType,
      paymentId,
      userId: accountId || null,
      purpose: purpose || null,
      payload: event,
    });
    if (!claim.isNew) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (err) {
    console.error("[whop webhook] claim event failed", err);
    return NextResponse.json({ error: "Failed to record webhook event" }, { status: 500 });
  }

  try {
    if (eventType === "payment.succeeded") {
      await handlePaymentSucceeded(data, metadata, accountId, paymentId);
    } else if (eventType === "payment.failed") {
      await handlePaymentFailed(data, metadata, paymentId);
    } else if (eventType === "setup_intent.succeeded") {
      await handleSetupSucceeded(data, metadata, accountId);
    }
    // Unknown types: still 200 so Whop does not retry forever
  } catch (err) {
    console.error(`[whop webhook] handler error for ${eventType}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(
  payment: JsonRecord,
  metadata: JsonRecord,
  accountId: string,
  paymentId: string | null,
) {
  const purpose =
    metaString(metadata, "purpose") ||
    (metaString(metadata, "walletTopup") === "true" ? "custom_topup" : "");

  const txId = metaString(metadata, "tx_id") || metaString(metadata, "walletTxId");
  const userId = accountId || metaString(metadata, "userId");

  // ── Wallet top-up (plan / custom / auto) ──
  if (txId && (purpose === "plan_topup" || purpose === "custom_topup" || purpose === "auto_topup" || metaString(metadata, "walletTopup") === "true")) {
    const result = await confirmWalletTopup({ txId, whopPaymentId: paymentId });
    if (result.credited && result.userId) {
      if (purpose === "auto_topup") {
        const { clearAutoTopupCooldownOnSuccess } = await import("@/lib/walletBilling");
        await clearAutoTopupCooldownOnSuccess(result.userId);
      }
      const user = await getUserById(result.userId);
      if (user?.email) {
        await sendPaymentConfirmationEmail(
          { email: user.email, name: user.name },
          result.amount ?? Number(payment.amount_after_fees ?? 0),
          purpose === "auto_topup" ? "Auto Top-up" : "Wallet Top-up",
        );
      }
    }

    // Optionally save card from payment object for future auto top-up
    const member = asRecord(payment.member);
    const pm = asRecord(payment.payment_method);
    const memberId = typeof member.id === "string" ? member.id : "";
    const pmId = typeof pm.id === "string" ? pm.id : "";
    if (userId && memberId && pmId) {
      const card = asRecord(pm.card);
      await upsertPaymentMethod({
        userId,
        whopMemberId: memberId,
        whopPaymentMethodId: pmId,
        brand: String(payment.card_brand ?? card.brand ?? ""),
        last4: String(payment.card_last4 ?? card.last4 ?? ""),
        makeDefault: true,
      });
    }
    return;
  }

  // ── Legacy / order payment (existing FieldFlow flow) ──
  if (!userId) return;
  if (purpose && purpose !== "order" && metaString(metadata, "orderData") === "") return;

  let orderData: Record<string, unknown> = {};
  try {
    orderData = JSON.parse(metaString(metadata, "orderData") || "{}");
  } catch {
    /* ignore */
  }
  if (!orderData.address && !metaString(metadata, "orderData")) return;

  const serviceId = (orderData.serviceId as string) ?? "re_main6";
  const tier = (orderData.turnaroundTier as string) ?? "standard";
  const totalPrice = Number(payment.amount_after_fees ?? payment.subtotal ?? 0);
  const compensation = calcCompensation(serviceId, tier, orderData.customClientPrice as number);
  const svc = SERVICE_MAP[serviceId];

  const order = await createOrder({
    address: (orderData.address as string) ?? "",
    clientId: userId,
    totalPrice,
    compensationAmount: compensation,
    serviceType: svc?.name ?? serviceId,
    turnaroundTier: tier,
    notes: (orderData.notes as string) ?? "",
    customizeNotes: (orderData.customizeNotes as string) ?? "",
    bulkBatchId: null,
  });

  await updateOrder(order.id, { invoicePaid: true });

  const zipMatch = ((orderData.address as string) ?? "").match(/\b(\d{5})\b/);
  if (zipMatch) {
    const agentId = await autoDispatch(order.id, zipMatch[1]);
    if (agentId) {
      const agent = await getUserById(agentId);
      const deadline = getDeadlineDate(tier, new Date());
      if (agent?.email) {
        await sendDispatchEmail({
          agentEmail: agent.email,
          agentName: agent.name,
          address: orderData.address as string,
          serviceType: svc?.name ?? serviceId,
          compensationAmount: compensation,
          deadline: deadline.toLocaleString("en-US", { timeZone: "America/New_York" }) + " ET",
          orderId: order.id,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "https://snapect.com",
        });
      }
      if (agent?.phone) {
        const { sendSms } = await import("@/lib/sms");
        await sendSms({
          to: agent.phone,
          toName: agent.name,
          smsOptIn: agent.smsOptIn,
          type: "job_dispatch",
          message: `Snapect: New job at ${orderData.address} — $${compensation} comp. Accept by ${deadline.toLocaleString("en-US", { timeZone: "America/New_York" })} ET. Log in to accept: ${process.env.NEXT_PUBLIC_BASE_URL ?? "https://snapect.com"}/agent`,
        });
      }
    }
  }

  await addEmailLog({
    type: "payment_confirmed",
    to: userId,
    subject: `Payment Confirmed — ${orderData.address}`,
    body: `Payment of $${totalPrice} received. Order confirmed.`,
  });
}

async function handlePaymentFailed(
  payment: JsonRecord,
  metadata: JsonRecord,
  paymentId: string | null,
) {
  const txId = metaString(metadata, "tx_id") || metaString(metadata, "walletTxId");
  if (!txId) return;
  const msg = String(payment.failure_message ?? "Payment failed");
  await failWalletTopup(txId, msg, paymentId);
}

async function handleSetupSucceeded(
  setup: JsonRecord,
  metadata: JsonRecord,
  accountId: string,
) {
  const purpose = metaString(metadata, "purpose") || "connect_card";
  if (purpose !== "connect_card" && purpose !== "add_card") return;

  const userId = accountId || metaString(metadata, "account_id") || metaString(metadata, "userId");
  if (!userId) return;

  const member = asRecord(setup.member);
  const pm = asRecord(setup.payment_method);
  const memberId = typeof member.id === "string" ? member.id : "";
  const pmId = typeof pm.id === "string" ? pm.id : "";
  if (!memberId || !pmId) {
    console.warn("[whop webhook] setup_intent.succeeded missing member/payment_method", setup.id);
    return;
  }

  const card = asRecord(pm.card);
  await upsertPaymentMethod({
    userId,
    whopMemberId: memberId,
    whopPaymentMethodId: pmId,
    brand: String(card.brand ?? ""),
    last4: String(card.last4 ?? ""),
    makeDefault: true,
  });
}
