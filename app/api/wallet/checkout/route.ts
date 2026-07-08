import { NextRequest, NextResponse } from "next/server";
import { getWhopClient, getWhopCompanyId } from "@/lib/whop";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["client", "agent"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount } = await request.json();
  const amt = Number(amount);
  if (!amt || amt <= 0 || amt > 5000)
    return NextResponse.json({ error: "Enter an amount between $1 and $5,000" }, { status: 400 });

  const client = getWhopClient();
  const companyId = getWhopCompanyId();
  if (!client || !companyId) {
    return NextResponse.json({ error: "Card top-up isn't configured yet. Please use a manual top-up request instead." }, { status: 503 });
  }

  // Create a pending wallet transaction up front; the webhook confirms it on payment success
  const txId = `wtx-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
  await supabase.from("wallet_transactions").insert({
    id: txId, user_id: userId, type: "topup",
    amount: amt, balance_after: 0,
    description: `Card top-up $${amt}`,
    status: "pending",
  });

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const checkout = await client.checkoutConfigurations.create({
    plan: {
      company_id: companyId,
      currency: "usd",
      initial_price: amt,
      plan_type: "one_time",
      title: "Snapect Wallet Top-up",
    },
    redirect_url: `${base}/client/wallet?topup=success`,
    metadata: { walletTopup: "true", walletTxId: txId, userId },
  });

  return NextResponse.json({ url: checkout.purchase_url });
}
