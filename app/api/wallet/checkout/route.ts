import { NextRequest, NextResponse } from "next/server";
import { createPaymentCheckout, isWhopConfigured } from "@/lib/whop";
import { attachCheckoutToTopup, createPendingWalletTopup } from "@/lib/walletBilling";

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

  if (!isWhopConfigured()) {
    return NextResponse.json(
      { error: "Card top-up isn't configured yet. Please use a manual top-up request instead." },
      { status: 503 },
    );
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

  try {
    const { checkoutId, checkoutUrl } = await createPaymentCheckout({
      amountUsd: rounded,
      title: "Snapect Wallet Top-up",
      redirectPath: `/client/wallet?topup=success&tx=${encodeURIComponent(txId)}`,
      metadata: {
        account_id: userId,
        userId,
        purpose: "custom_topup",
        tx_id: txId,
        walletTxId: txId,
        credits: String(rounded),
        walletTopup: "true",
      },
    });
    await attachCheckoutToTopup(txId, checkoutId);
    return NextResponse.json({ url: checkoutUrl, checkout_url: checkoutUrl, txId });
  } catch (err) {
    console.error("[wallet/checkout] Whop failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Checkout failed" },
      { status: 502 },
    );
  }
}
