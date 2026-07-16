import { NextRequest, NextResponse } from "next/server";
import { adminManualCredit } from "@/lib/walletBilling";
import { getUserById, logAdminAction } from "@/lib/db";
import { sendPaymentConfirmationEmail } from "@/lib/email";

/**
 * POST — admin-only manual wallet credit. Used to reconcile a vendor's
 * balance when an automated payment (pd.cash, etc.) fails to confirm
 * on its own. Body: { userId, amount, note }
 */
export async function POST(request: NextRequest) {
  const adminId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!adminId || userRole !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: { userId?: string; amount?: number; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.userId || !body.amount || !body.note) {
    return NextResponse.json({ error: "userId, amount, and note are required" }, { status: 400 });
  }

  try {
    const result = await adminManualCredit({
      userId: body.userId,
      amount: Number(body.amount),
      note: body.note,
      adminId,
    });

    const admin = await getUserById(adminId);
    await logAdminAction({
      actorId: adminId,
      actorName: admin?.name ?? "Admin",
      action: "wallet.manual_credit",
      targetType: "user",
      targetId: body.userId,
      details: { amount: body.amount, note: body.note, txId: result.txId },
    });

    const user = await getUserById(body.userId);
    if (user?.email) {
      await sendPaymentConfirmationEmail(
        { email: user.email, name: user.name },
        Number(body.amount),
        `Manual Wallet Credit — ${body.note}`,
      );
    }

    return NextResponse.json({ ok: true, txId: result.txId, newBalance: result.newBalance });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add credit" },
      { status: 400 },
    );
  }
}
