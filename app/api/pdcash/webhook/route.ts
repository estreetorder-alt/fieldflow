import { NextRequest, NextResponse } from "next/server";
import { verifyPdCashWebhookSignature, pdcashString } from "@/lib/pdcash";
import { claimWebhookEvent, confirmWalletTopup, failWalletTopup } from "@/lib/walletBilling";
import { getUserById } from "@/lib/db";
import { sendPaymentConfirmationEmail } from "@/lib/email";

/**
 * Receives payment status webhooks from the "pd.cash"-style flow.
 * ⚠️ DORMANT: wallet top-ups now use fixed Care Business Consulting
 * Solutions payment links (see lib/pdcash.ts) which don't carry a
 * reference/order id, so nothing currently calls this endpoint and it has
 * no way to match an inbound event to a pending transaction. Pending
 * top-ups are confirmed manually in Admin → Wallet instead. This route is
 * left in place only in case a future provider adds real webhook support.
 */
export async function POST(request: NextRequest) {
  const verified = verifyPdCashWebhookSignature(request);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  let event: Record<string, unknown>;
  try {
    event = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = pdcashString(event, "event") || pdcashString(event, "type");
  const paymentId =
    pdcashString(event, "invoice_id") || pdcashString(event, "payment_id") || pdcashString(event, "id");
  const txId = pdcashString(event, "order_id") || pdcashString(event, "reference") || pdcashString(event, "txId");

  if (!txId) {
    return NextResponse.json({ error: "Missing order/reference id in webhook payload" }, { status: 400 });
  }

  // Idempotency: duplicate deliveries return 200 without re-processing
  try {
    const claim = await claimWebhookEvent({
      eventId: paymentId || txId,
      eventType: eventType || "pdcash.unknown",
      paymentId: paymentId || null,
      purpose: "pdcash_topup",
      payload: event,
    });
    if (!claim.isNew) {
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (err) {
    console.error("[pdcash webhook] claim event failed", err);
    return NextResponse.json({ error: "Failed to record webhook event" }, { status: 500 });
  }

  try {
    if (eventType === "payment.completed" || eventType === "completed" || eventType === "payment.success") {
      const result = await confirmWalletTopup({ txId, whopPaymentId: paymentId || null });
      if (result.credited && result.userId) {
        const user = await getUserById(result.userId);
        if (user?.email) {
          await sendPaymentConfirmationEmail(
            { email: user.email, name: user.name },
            result.amount ?? 0,
            "Wallet Top-up",
          );
        }
      }
    } else if (eventType === "payment.failed" || eventType === "failed") {
      await failWalletTopup(txId, "pd.cash reported payment failed", paymentId || null);
    }
    // Unknown event types: still 200 so pd.cash does not retry forever
  } catch (err) {
    console.error(`[pdcash webhook] handler error for ${eventType}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
