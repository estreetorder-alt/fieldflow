import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrder, addStatusHistory, getUserById } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ order });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  // Agent direct-accept (no bid)
  if (body.accept === true && userRole === "agent") {
    if (order.status !== "pending" || order.assignedAgentId)
      return NextResponse.json({ error: "Order not available" }, { status: 409 });
    await updateOrder(id, {
      status: "in_progress", assignedAgentId: userId,
      offerAcceptedAt: new Date().toISOString(),
    });
    const agent = await getUserById(userId);
    await addStatusHistory(id, "in_progress", `Directly accepted by ${agent?.name ?? userId}`);
    return NextResponse.json({ ok: true });
  }

  // Status update
  if (body.status) {
    await updateOrder(id, { status: body.status });
    await addStatusHistory(id, body.status, body.note ?? `Status changed to ${body.status}`);
    if (body.status === "completed") {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      await updateOrder(id, { photoExpiresAt: expires.toISOString() });
    }
  }

  // Admin assign agent
  if (body.assignedAgentId !== undefined) {
    await updateOrder(id, { assignedAgentId: body.assignedAgentId || null, status: body.status ?? order.status });
    if (body.assignedAgentId) {
      const agent = await getUserById(body.assignedAgentId);
      await addStatusHistory(id, "in_progress", `Manually assigned to ${agent?.name ?? body.assignedAgentId}`);
    }
  }

  // Photo selection
  if (body.selectedPhotos) {
    const { updatePhotoSelection } = await import("@/lib/db");
    await updatePhotoSelection(id, body.selectedPhotos);
  }

  // Invoice paid
  if (body.invoicePaid !== undefined) {
    await updateOrder(id, { invoicePaid: body.invoicePaid });
  }

  return NextResponse.json({ ok: true });
}
