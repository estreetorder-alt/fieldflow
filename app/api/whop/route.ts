import { NextRequest, NextResponse } from "next/server";
import { buildPdCashUrl } from "@/lib/pdcash";
import { createPendingWalletTopup } from "@/lib/walletBilling";

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Legacy order checkout — creates a one-time pd.cash payment for an inspection order. */
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") {
    return NextResponse.json({ error: "Clients only" }, { status: 403 });
  }

  const { totalPrice, description, successUrl } = await request.json();
  const amount = Number(totalPrice);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid totalPrice" }, { status: 400 });
  }

  const txId = await createPendingWalletTopup({
    userId,
    amount,
    purpose: "custom_topup",
    description: description ?? "Snapect Inspection Order",
    metadata: { account_id: userId, purpose: "order" },
  });

  const redirectPath = successUrl
    ? successUrl.replace(process.env.NEXT_PUBLIC_BASE_URL ?? "", "") || "/client?payment=success"
    : "/client?payment=success";

  const redirectUrl = `${getBaseUrl()}${redirectPath.startsWith("/") ? redirectPath : `/${redirectPath}`}`;

  const checkoutUrl = buildPdCashUrl({
    amountUsd: amount,
    txId,
    userId,
    purpose: "order",
    redirectUrl,
  });

  return NextResponse.json({ url: checkoutUrl, checkout_url: checkoutUrl, sessionId: txId });
}
