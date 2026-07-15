import { NextRequest, NextResponse } from "next/server";
import { verifyPdCashWebhook } from "@/lib/pdcash";
import {
  claimWebhookEvent,
  confirmWalletTopup,
  failWalletTopup,
} from "@/lib/walletBilling";
import { getUserById } from "@/lib/db";
import { sendPaymentConfirmationEmail } from "@/lib/email";
import { clearAutoTopupCooldownOnSuccess } from "@/lib/walletBilling";

type JsonRecord = Record<string, unknown>;

function asRecord(v: unknown): JsonRecord {
  return v && typeof v === "object" ? (v as JsonRecord) : {};
}

/**
 * pd.cash webhook endpoint.
 *
 * Register this URL in your pd.cash dashboard:
 *   https://yourdomain.com/api/pdcash/webhook
 *
 * Expected event shape from pd.cash:
 * {
 *   id: "evt_...",
 *   type: "payment.completed" | "payment.failed",
 *   data: {
 *     id: "pay_...",
 *     amount: 50.00,          // USD
 *     status: "completed",
 *     metadata: {
 *       tx_id: "wtx-...",
 *       user_id: "...",
 *       purpose: "plan_topup" | "custom_topup",
 *     }
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const bodyText = await request.text();

  // Verify signature
  const verified = verifyPdCashWebhook(bodyText, request.headers);
  if (!verified.ok) {
    console.error("[pdcash webhook] signature verification failed:", verified.error);
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  let event: JsonRecord;
  try {
    event = JSON.parse(bodyText) as JsonRecord;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const eventType = String(event.type ?? "");
  const eventId = String(event.id ?? "");
  const data = asRecord(event.data);
  const metadata = asRecord(data.metadata);
  const paymentId = typeof data.id === "string" ? data.id : null;

  const txId = String(metadata.tx_id ?? "");
  const userId = String(metadata.user_id ?? "");
  const purpose = String(metadata.purpose ?? "custom_topup");

  // Idempotency: ignore duplicate deliveries
  try {
    const claim = await claimWebhookEvent({
      eventId,
      eventType,
      paymentId,
      userId: userId || null,
      purpose: purpose || null,
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
    if (eventType === "payment.completed") {
      if (!txId) {
        console.warn("[pdcash webhook] payment.completed missing tx_id in metadata", metadata);
        return NextResponse.json({ received: true });
      }

      const result = await confirmWalletTopup({ txId, whopPaymentId: paymentId });

      if (result.credited && result.userId) {
        // Clear auto top-up cooldown if this was an auto top-up
        if (purpose === "auto_topup") {
          await clearAutoTopupCooldownOnSuccess(result.userId);
        }

        // Send confirmation email
        const user = await getUserById(result.userId);
        if (user?.email) {
          await sendPaymentConfirmationEmail(
            { email: user.email, name: user.name },
            result.amount ?? Number(data.amount ?? 0),
            purpose === "auto_topup" ? "Auto Top-up" : "Wallet Top-up",
          );
        }
      }
    } else if (eventType === "payment.failed") {
      if (txId) {
        const msg = String(data.failure_reason ?? data.error ?? "Payment failed");
        await failWalletTopup(txId, msg, paymentId);
      }
    }
    // Other event types: acknowledge without error so pd.cash doesn't retry
  } catch (err) {
    console.error(`[pdcash webhook] handler error for ${eventType}`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
