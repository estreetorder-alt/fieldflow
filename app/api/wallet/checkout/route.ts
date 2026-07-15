import { NextRequest, NextResponse } from "next/server";
import { buildPdCashUrl } from "@/lib/pdcash";
import { attachCheckoutToTopup, createPendingWalletTopup } from "@/lib/walletBilling";

function getBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Legacy custom-amount top-up endpoint.
 * Prefer POST /api/wallet/topup going forward (supports planId + amount).
 */
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["client", "agent"].includes(userRole ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { amount } = await request.json();
  const amt = Number(amount);
  if (!amt || amt <= 0 || amt > 5000) {
    return NextResponse.json({ error: "Enter an amount between $1 and $5,000" }, { status: 400 });
  }

  const rounded = Math.round(amt * 100) / 100;
  const txId = await createPendingWalletTopup({
    userId,
    amount: rounded,
    purpose: "custom_topup",
    description: `Card top-up $${rounded}`,
    metadata: { account_id: userId, purpose: "custom_topup" },
  });

  const redirectUrl = `${getBaseUrl()}/client/wallet?topup=success&tx=${encodeURIComponent(txId)}`;

  const checkoutUrl = buildPdCashUrl({
    amountUsd: rounded,
    txId,
    userId,
    purpose: "custom_topup",
    redirectUrl,
  });

  await attachCheckoutToTopup(txId, txId); // store txId as checkout ref
  return NextResponse.json({ url: checkoutUrl, checkout_url: checkoutUrl, txId });
}
