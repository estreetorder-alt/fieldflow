import { NextRequest, NextResponse } from "next/server";
import { createPaymentCheckout, isWhopConfigured } from "@/lib/whop";
import {
  attachCheckoutToTopup,
  createPendingWalletTopup,
  getWalletPlanById,
  listActiveWalletPlans,
} from "@/lib/walletBilling";

/** GET — list active admin-defined wallet plans (client billing). */
export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["client", "admin"].includes(userRole ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await listActiveWalletPlans();
  return NextResponse.json({ plans, currency: "usd" });
}

/**
 * POST — start a Whop checkout for a plan or custom USD amount.
 * Body: { planId?: string, amount?: number }
 * Returns: { success: true, checkout_url, txId }
 */
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") {
    return NextResponse.json({ error: "Clients only" }, { status: 403 });
  }

  if (!isWhopConfigured()) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  let body: { planId?: string; amount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let amount = 0;
  let purpose: "plan_topup" | "custom_topup" = "custom_topup";
  let planId: string | null = null;
  let title = "Wallet top-up";

  if (body.planId) {
    const plan = await getWalletPlanById(body.planId);
    if (!plan || !plan.active) {
      return NextResponse.json({ error: "Plan not found or inactive" }, { status: 400 });
    }
    amount = plan.amountUsd;
    purpose = "plan_topup";
    planId = plan.id;
    title = plan.name;
  } else {
    amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 1 || amount > 5000) {
      return NextResponse.json({ error: "Enter an amount between $1 and $5,000" }, { status: 400 });
    }
    amount = Math.round(amount * 100) / 100;
    title = `Wallet top-up $${amount}`;
  }

  const txId = await createPendingWalletTopup({
    userId,
    amount,
    purpose,
    planId,
    description: `${title} — $${amount.toFixed(2)} USD`,
    metadata: { account_id: userId, purpose },
  });

  try {
    const { checkoutId, checkoutUrl } = await createPaymentCheckout({
      amountUsd: amount,
      title,
      description: `Snapect wallet credits — $${amount.toFixed(2)} (1 USD = 1 credit)`,
      redirectPath: `/client/wallet?topup=success&tx=${encodeURIComponent(txId)}`,
      metadata: {
        account_id: userId,
        userId,
        purpose,
        tx_id: txId,
        walletTxId: txId,
        plan_id: planId ?? "",
        credits: String(amount),
        walletTopup: "true",
      },
    });

    await attachCheckoutToTopup(txId, checkoutId);

    return NextResponse.json({
      success: true,
      checkout_url: checkoutUrl,
      url: checkoutUrl,
      txId,
      amount,
      currency: "usd",
    });
  } catch (err) {
    console.error("[wallet/topup] Whop checkout failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create checkout" },
      { status: 502 },
    );
  }
}
