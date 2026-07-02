import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client")
    return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ skip: true, message: "Stripe not configured — order placed without payment" });
  }

  const { orderData, totalPrice, description, successUrl, cancelUrl } = await request.json();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: description ?? "Snapect Inspection Order",
          description: orderData?.address ?? "",
        },
        unit_amount: Math.round(totalPrice * 100), // cents
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: successUrl ?? `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/client?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl ?? `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/client?payment=cancelled`,
    metadata: {
      userId,
      orderData: JSON.stringify(orderData),
    },
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
