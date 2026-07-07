import { NextRequest, NextResponse } from "next/server";
import { getWalletBalance, getWalletTransactions } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { sendAdminNotification } from "@/lib/email";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (userRole === "admin") {
    // Admin gets all pending topups
    const { getAllWalletTopupsPending } = await import("@/lib/db");
    const pending = await getAllWalletTopupsPending();
    return NextResponse.json({ pending });
  }

  const [balance, transactions] = await Promise.all([
    getWalletBalance(userId),
    getWalletTransactions(userId),
  ]);
  return NextResponse.json({ balance, transactions });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["client","agent"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, description } = await request.json();
  if (!amount || Number(amount) <= 0)
    return NextResponse.json({ error: "Valid amount required" }, { status: 400 });

  // Create pending topup transaction (admin confirms after payment received)
  const txId = `wtx-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
  await supabase.from("wallet_transactions").insert({
    id: txId, user_id: userId, type: "topup",
    amount: Number(amount), balance_after: 0,
    description: description ?? `Wallet top-up $${amount}`,
    status: "pending",
  });

  // Notify admin
  const { getUserById } = await import("@/lib/db");
  const user = await getUserById(userId);
  await sendAdminNotification({
    title: `💰 Wallet Top-up Request — $${amount}`,
    message: `User: ${user?.name} (${user?.email})\nAmount: $${amount}\nTransaction: ${txId}\n\nConfirm payment received in Admin → Wallet tab.`,
    type: "topup_request",
  });

  return NextResponse.json({ ok: true, txId }, { status: 201 });
}
