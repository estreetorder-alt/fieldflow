import { NextRequest, NextResponse } from "next/server";
import { createPaymentCheckout, isWhopConfigured } from "@/lib/whop";

/** Legacy order checkout — creates a one-time Whop payment for an inspection order. */
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") {
    return NextResponse.json({ error: "Clients only" }, { status: 403 });
  }

  if (!isWhopConfigured()) {
    return NextResponse.json({ skip: true, message: "Whop not configured — order placed without payment" });
  }

  const { orderData, totalPrice, description, successUrl } = await request.json();
  const amount = Number(totalPrice);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid totalPrice" }, { status: 400 });
  }

  try {
    const redirectPath = successUrl
      ? successUrl.replace(process.env.NEXT_PUBLIC_BASE_URL ?? "", "") || "/client?payment=success"
      : "/client?payment=success";

    const { checkoutId, checkoutUrl } = await createPaymentCheckout({
      amountUsd: amount,
      title: description ?? "Snapect Inspection Order",
      redirectPath: redirectPath.startsWith("/") ? redirectPath : `/${redirectPath}`,
      metadata: {
        account_id: userId,
        userId,
        purpose: "order",
        orderData: JSON.stringify(orderData ?? {}),
      },
    });

    return NextResponse.json({ url: checkoutUrl, checkout_url: checkoutUrl, sessionId: checkoutId });
  } catch (err) {
    console.error("[whop] order checkout failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 502 },
    );
  }
}
