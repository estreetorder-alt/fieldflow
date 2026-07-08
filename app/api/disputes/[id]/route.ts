import { NextRequest, NextResponse } from "next/server";
import { getDisputeById, resolveDispute, setDisputeStatus, getUserById, logAdminAction } from "@/lib/db";
import { sendDisputeResolutionEmail } from "@/lib/email";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const dispute = await getDisputeById(id);
  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (userRole !== "admin" && dispute.clientId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ dispute });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const dispute = await getDisputeById(id);
  if (!dispute) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  if (body.status === "under_review") {
    await setDisputeStatus(id, "under_review");
    return NextResponse.json({ ok: true });
  }

  const { resolution, amount, notes } = body;
  if (!["reshoot", "wallet_credit", "rejected", "other"].includes(resolution))
    return NextResponse.json({ error: "Invalid resolution" }, { status: 400 });
  if (resolution === "wallet_credit" && (!amount || Number(amount) <= 0))
    return NextResponse.json({ error: "A positive credit amount is required for wallet_credit resolutions" }, { status: 400 });

  const admin = await getUserById(userId);
  const updated = await resolveDispute(id, { resolution, amount: amount ? Number(amount) : undefined, notes: notes ?? "", resolvedBy: userId });

  await logAdminAction({
    actorId: userId, actorName: admin?.name ?? "Admin", action: "dispute.resolve",
    targetType: "dispute", targetId: id,
    details: { resolution, amount: amount ?? 0, notes: notes ?? "", orderId: dispute.orderId },
  });

  // Notify client of the outcome
  const client = await getUserById(dispute.clientId);
  if (client?.email) {
    await sendDisputeResolutionEmail({
      email: client.email, name: client.name, orderAddress: dispute.orderAddress ?? "your order",
      resolution, amount: amount ? Number(amount) : undefined, notes: notes ?? "",
    });
  }

  return NextResponse.json({ dispute: updated });
}
