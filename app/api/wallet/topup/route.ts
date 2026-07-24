import { NextRequest, NextResponse } from "next/server";
import { CARE_PAY_AMOUNTS, getCarePayLink } from "@/lib/pdcash";
import {
  attachCheckoutToTopup,
  createPendingWalletTopup,
  getWalletPlanById,
  listActiveWalletPlans,
} from "@/lib/walletBilling";
import { getUserById } from "@/lib/db";
import { sendAdminNotification } from "@/lib/email";

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
 * POST — start a checkout for a plan or preset USD amount.
 * Body: { planId?: string, amount?: number }
 * Returns: { success: true, checkout_url, txId }
 *
 * Payment links are fixed, one per preset amount (see lib/pdcash.ts), and
 * don't support arbitrary/custom amounts. The created transaction stays
 * "pending" until an admin manually confirms it in Admin → Wallet once the
 * payment is verified — there is no automated webhook match for this
 * provider.
 */
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") {
    return NextResponse.json({ error: "Clients only" }, { status: 403 });
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
    if (!Number.isFinite(amount)) {
      return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
    }
    amount = Math.round(amount * 100) / 100;
    title = `Wallet top-up $${amount}`;
  }

  const checkoutUrl = getCarePayLink(amount);
  if (!checkoutUrl) {
    return NextResponse.json(
      { error: `Only these amounts can be paid right now: ${CARE_PAY_AMOUNTS.map((a) => `$${a}`).join(", ")}` },
      { status: 400 },
    );
  }

  const txId = await createPendingWalletTopup({
    userId,
    amount,
    purpose,
    planId,
    description: `${title} — $${amount.toFixed(2)} USD`,
    metadata: { account_id: userId, purpose },
  });

  await attachCheckoutToTopup(txId, txId);

  try {
    const user = await getUserById(userId);
    await sendAdminNotification({
      title: `💰 Wallet Top-up Started — $${amount.toFixed(2)}`,
      message: `User: ${user?.name} (${user?.email})\nAmount: $${amount.toFixed(2)}\nTransaction: ${txId}\n\nThe client was sent to the Care Business Consulting Solutions payment link. Once you verify the payment was received, confirm it in Admin → Wallet.`,
      type: "topup_request",
    });
  } catch (err) {
    console.error("[wallet/topup] admin notification failed", err);
  }

  return NextResponse.json({
    success: true,
    checkout_url: checkoutUrl,
    url: checkoutUrl,
    txId,
    amount,
    currency: "usd",
  });
}
