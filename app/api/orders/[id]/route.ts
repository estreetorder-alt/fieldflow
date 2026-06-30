import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrder, addStatusHistory, getUserById, updatePhotoSelection } from "@/lib/db";
import { sendOrderCompletionEmail } from "@/lib/email";
import { notifyPaymentReceived } from "@/lib/notify";
import { supabase } from "@/lib/supabase";

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

  // Agent direct-accept — show as agent action only
  if (body.accept === true && userRole === "agent") {
    if (order.status !== "pending" || order.assignedAgentId)
      return NextResponse.json({ error: "Order not available" }, { status: 409 });
    await updateOrder(id, { status: "in_progress", assignedAgentId: userId, offerAcceptedAt: new Date().toISOString() });
    const agent = await getUserById(userId);
    await addStatusHistory(id, "in_progress", `${agent?.name ?? "Agent"} accepted the order`);
    return NextResponse.json({ ok: true });
  }

  // Admin confirms payment — marks order as active/pending for dispatch
  if (body.confirmPayment === true && userRole === "admin") {
    const client = await getUserById(order.clientId);
    await supabase.from("orders").update({
      payment_status: "confirmed",
      invoice_paid: true,
      paid_at: new Date().toISOString(),
      status: "pending", // now active and dispatchable
    }).eq("id", id);
    await addStatusHistory(id, "pending", "Payment confirmed — order is now active");
    await notifyPaymentReceived({
      clientName: client?.name ?? "Client",
      amount: order.totalPrice,
      address: order.address,
      orderId: id,
    });
    return NextResponse.json({ ok: true });
  }

  // Status update
  if (body.status) {
    await updateOrder(id, { status: body.status });
    await addStatusHistory(id, body.status, body.note ?? `Order ${body.status.replace("_"," ")}`);
    if (body.status === "completed") {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      await updateOrder(id, { photoExpiresAt: expires.toISOString() });
      const client = await getUserById(order.clientId);
      if (client?.email) {
        await sendOrderCompletionEmail({
          clientEmail: client.email, clientName: client.name,
          address: order.address, orderId: id, photoCount: order.photos.length,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "https://fieldflow.app",
        });
      }
      if (order.assignedAgentId) {
        const agent = await getUserById(order.assignedAgentId);
        if (agent) {
          const { updateUser } = await import("@/lib/db");
          await updateUser(order.assignedAgentId, {
            completedJobs: (agent.completedJobs ?? 0) + 1,
            totalEarnings: (agent.totalEarnings ?? 0) + order.compensationAmount,
            pendingPayout: (agent.pendingPayout ?? 0) + order.compensationAmount,
          });
        }
        const { updateAgentGrade } = await import("@/lib/db");
        await updateAgentGrade(order.assignedAgentId);
      }
    }
  }

  // Admin assign agent — show as system action
  if (body.assignedAgentId !== undefined) {
    await updateOrder(id, { assignedAgentId: body.assignedAgentId || null, status: body.status ?? order.status });
    if (body.assignedAgentId) {
      const agent = await getUserById(body.assignedAgentId);
      await addStatusHistory(id, "in_progress", `${agent?.name ?? "Agent"} assigned to this order`);
    }
  }

  // Photo selection
  if (body.selectedPhotos) { await updatePhotoSelection(id, body.selectedPhotos); }
  if (body.invoicePaid !== undefined) { await updateOrder(id, { invoicePaid: body.invoicePaid }); }

  return NextResponse.json({ ok: true });
}
