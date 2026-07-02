import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createOrder, updateOrder, addEmailLog, autoDispatch, getUserById } from "@/lib/db";
import { calcCompensation, getDeadlineDate, SERVICE_MAP } from "@/lib/services";
import { sendDispatchEmail } from "@/lib/email";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  const body = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as unknown as Record<string, unknown>;
    const metadata = (session.metadata ?? {}) as Record<string, string>;
    const userId = metadata.userId ?? "";
    let orderData: Record<string, unknown> = {};
    try { orderData = JSON.parse(metadata.orderData ?? "{}"); } catch { /* ignore */ }

    const serviceId = orderData.serviceId as string ?? "ext_7";
    const tier = orderData.turnaroundTier as string ?? "standard";
    const totalPrice = (session.amount_total as number ?? 0) / 100;
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
