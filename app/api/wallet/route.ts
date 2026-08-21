import { NextRequest, NextResponse } from "next/server";
import { getWalletBalance, getWalletTransactions } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { sendAdminNotification } from "@/lib/email";
import { canAccessScope } from "@/lib/adminAccess";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (userRole === "admin" || canAccessScope(userRole, "finance")) {
    // Admin gets all pending topups
    const { getAllWalletTopupsPending } = await import("@/lib/db");
    const pending = await getAllWalletTopupsPending();
    return NextResponse.json({ pending });
  }

  const [balance, transactions] = await Promise.all([
    getWalletBalance(userId),
    getWalletTransactions(userId),
  ]);

  // Outstanding orders (unpaid/partially paid) + any pending/approved
  // overdraft requests, so the vendor wallet page can show why an order
  // isn't fully paid and what they still owe.
  let outstanding: { orderId: string; address: string; amountDue: number; paymentState: string; overdraftStatus: string | null }[] = [];
  if (userRole === "client") {
    const { data: unpaidOrders } = await supabase
      .from("orders")
      .select("id, address, amount_due, payment_state, overdraft_status")
      .eq("client_id", userId)
      .neq("payment_state", "paid")
      .order("created_at", { ascending: true });
    outstanding = (unpaidOrders ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        orderId: row.id as string,
        address: row.address as string,
        amountDue: Number(row.amount_due ?? 0),
        paymentState: (row.payment_state as string) ?? "unpaid",
        overdraftStatus: (row.overdraft_status as string) ?? null,
      };
    }).filter((o) => o.amountDue > 0);
  }

  // Soft check: if client is viewing wallet and balance is low, try auto top-up
  let autoTopup = null;
  if (userRole === "client") {
    try {
      const { maybeRunAutoTopup } = await import("@/lib/autoTopup");
      autoTopup = await maybeRunAutoTopup(userId);
      if (autoTopup.ran && autoTopup.creditedNow) {
        const fresh = await getWalletBalance(userId);
        return NextResponse.json({ balance: fresh, transactions, autoTopup, outstanding });
      }
    } catch (err) {
      console.error("[wallet GET] auto-topup", err);
    }
  }

  return NextResponse.json({ balance, transactions, autoTopup, outstanding });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !["client","agent"].includes(userRole ?? ""))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount, description, receiptUrl, orderNumber, paymentMethod } = await request.json();
  if (!amount || Number(amount) <= 0)
    return NextResponse.json({ error: "Valid amount required" }, { status: 400 });

  const isReceiptPayment = Boolean(receiptUrl);
  if (isReceiptPayment && !String(receiptUrl).trim())
    return NextResponse.json({ error: "Receipt screenshot is required" }, { status: 400 });

  // The client explicitly picks Cash App or Zelle on the wallet page — trust
  // that selection so admin sees the true processor, defaulting to Cash App
  // only for legacy/manual submissions that predate the method picker.
  const isZelle = isReceiptPayment && paymentMethod === "zelle";
  const methodLabel = isZelle ? "Zelle" : "Cash App";

  // Create pending topup transaction (admin confirms after payment received)
  const txId = `wtx-${Date.now()}-${Math.random().toString(36).slice(2,5)}`;
  await supabase.from("wallet_transactions").insert({
    id: txId, user_id: userId, type: "topup",
    amount: Number(amount), balance_after: 0,
    description: description ?? (isReceiptPayment ? `${methodLabel} payment — $${amount}` : `Wallet top-up $${amount}`),
    status: "pending",
    purpose: isReceiptPayment ? (isZelle ? "zelle_topup" : "cashapp_topup") : "manual_topup",
    metadata: {
      ...(receiptUrl ? { receiptUrl: String(receiptUrl) } : {}),
      ...(orderNumber ? { orderNumber: String(orderNumber) } : {}),
    },
  });

  // Notify admin
  const { getUserById } = await import("@/lib/db");
  const user = await getUserById(userId);
  await sendAdminNotification({
    title: isReceiptPayment ? `💵 ${methodLabel} Payment Submitted — $${amount}` : `💰 Wallet Top-up Request — $${amount}`,
    message: `User: ${user?.name} (${user?.email})\nMethod: ${methodLabel}\nAmount: $${amount}${orderNumber ? `\nOrder #: ${orderNumber}` : ""}\nTransaction: ${txId}${isReceiptPayment ? `\nReceipt: ${receiptUrl}` : ""}\n\nConfirm payment received in Admin → Wallet tab.`,
    type: "topup_request",
  });

  return NextResponse.json({ ok: true, txId }, { status: 201 });
}
