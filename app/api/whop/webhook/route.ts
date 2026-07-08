import { NextRequest, NextResponse } from "next/server";
import { getWhopClient } from "@/lib/whop";
import { createOrder, updateOrder, addEmailLog, autoDispatch, getUserById, confirmTopup } from "@/lib/db";
import { calcCompensation, getDeadlineDate, SERVICE_MAP } from "@/lib/services";
import { sendDispatchEmail, sendPaymentConfirmationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const client = getWhopClient();
  if (!client) return NextResponse.json({ error: "Whop not configured" }, { status: 500 });

  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event;
  try {
    // Verifies the Standard Webhooks signature; throws on a bad/missing signature
    event = client.webhooks.unwrap(bodyText, { headers });
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err}` }, { status: 400 });
  }

  if (event.type === "payment.succeeded") {
    const payment = event.data;
    const metadata = (payment.metadata ?? {}) as Record<string, string>;

    // ── Wallet top-up ──
    if (metadata.walletTopup === "true" && metadata.walletTxId) {
      await confirmTopup(metadata.walletTxId);
      const user = await getUserById(metadata.userId ?? "");
      if (user?.email) {
        await sendPaymentConfirmationEmail({ email: user.email, name: user.name }, payment.amount_after_fees, "Wallet Top-up");
      }
      return NextResponse.json({ received: true });
    }

    // ── Order payment ──
    const userId = metadata.userId ?? "";
    let orderData: Record<string, unknown> = {};
    try { orderData = JSON.parse(metadata.orderData ?? "{}"); } catch { /* ignore */ }

    const serviceId = orderData.serviceId as string ?? "ext_7";
    const tier = orderData.turnaroundTier as string ?? "standard";
    const totalPrice = payment.amount_after_fees ?? 0;
    const compensation = calcCompensation(serviceId, tier, orderData.customClientPrice as number);
    const svc = SERVICE_MAP[serviceId];

    const order = await createOrder({
      address: orderData.address as string ?? "",
      clientId: userId,
      totalPrice,
      compensationAmount: compensation,
      serviceType: svc?.name ?? serviceId,
      turnaroundTier: tier,
      notes: orderData.notes as string ?? "",
      customizeNotes: orderData.customizeNotes as string ?? "",
      bulkBatchId: null,
    });

    await updateOrder(order.id, {
      invoicePaid: true,
    });

    // Auto-dispatch
    const zipMatch = (orderData.address as string ?? "").match(/\b(\d{5})\b/);
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
            deadline: deadline.toLocaleString(),
            orderId: order.id,
            baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "https://snapect.com",
          });
        }
        if (agent?.phone) {
          const { sendSms } = await import("@/lib/sms");
          await sendSms({
            to: agent.phone, toName: agent.name, smsOptIn: agent.smsOptIn,
            type: "job_dispatch",
            message: `Snapect: New job at ${orderData.address} — $${compensation} comp. Accept by ${deadline.toLocaleString()}. Log in to accept: ${process.env.NEXT_PUBLIC_BASE_URL ?? "https://snapect.com"}/agent`,
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

  return NextResponse.json({ received: true });
}
