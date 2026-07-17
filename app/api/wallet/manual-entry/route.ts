import { NextRequest, NextResponse } from "next/server";
import { manualWalletAdjustment, getUserById } from "@/lib/db";
import { sendPaymentConfirmationEmail } from "@/lib/email";

/**
 * Admin backup tool: manually credit or debit a vendor's wallet.
 * Use this when a payment was received outside the normal pd.cash flow
 * (e.g. bank transfer, cash, webhook failure) and the balance needs to be
 * corrected by hand. Every entry is logged to the audit trail and shows up
 * in the vendor's own transaction history.
 */
export async function POST(request: NextRequest) {
  const adminId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!adminId || userRole !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { userId, amount, direction, note } = body as {
    userId?: string;
    amount?: number;
    direction?: "credit" | "debit";
    note?: string;
  };

  if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });
  if (!amount || Number(amount) <= 0) return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
  if (direction !== "credit" && direction !== "debit") {
    return NextResponse.json({ error: "direction must be 'credit' or 'debit'" }, { status: 400 });
  }

  const admin = await getUserById(adminId);
  const target = await getUserById(userId);
  if (!target) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });

  try {
    const { newBalance } = await manualWalletAdjustment({
      userId,
      amount: Number(amount),
      direction,
      note: note ?? "",
      adminId,
      adminName: admin?.name ?? "Admin",
    });

    // Best-effort notification email — don't fail the request if this errors
    if (target.email && direction === "credit") {
      sendPaymentConfirmationEmail(
        { email: target.email, name: target.name },
        Number(amount),
        `Wallet Credit — $${Number(amount).toFixed(2)} added to your Snapect wallet`
      ).catch(() => {});
    }

    return NextResponse.json({ ok: true, newBalance });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Adjustment failed" }, { status: 400 });
  }
}
