import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrder, addStatusHistory, getUserById, updatePhotoSelection, logAdminAction } from "@/lib/db";
import { sendOrderCompletionEmail, sendOrderActivatedEmail, sendOrderStatusEmail, sendPaymentReceivedAdminEmail } from "@/lib/email";
import { supabase } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };
type OrderLike = { clientId: string; assignedAgentId: string | null };

// A client may view/act on an order if they placed it directly, or if it
// belongs to one of their sub-accounts. Agents may only touch orders
// assigned to them. Admins can always access everything.
async function canAccessOrder(order: OrderLike, userId: string, userRole?: string): Promise<boolean> {
  if (userRole === "admin") return true;
  if (userRole === "agent") return order.assignedAgentId === userId;
  if (userRole === "client") {
    if (order.clientId === userId) return true;
    const orderClient = await getUserById(order.clientId);
    return orderClient?.parentClientId === userId;
  }
  return false;
}

export async function GET(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await canAccessOrder(order, userId, userRole)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  // Agent direct-accept — shown as agent action only
  if (body.accept === true && userRole === "agent") {
    if (order.status !== "pending" || order.assignedAgentId)
      return NextResponse.json({ error: "Order not available" }, { status: 409 });
    await updateOrder(id, { status: "in_progress", assignedAgentId: userId, offerAcceptedAt: new Date().toISOString() });
    const agent = await getUserById(userId);
    await addStatusHistory(id, "in_progress", `${agent?.name ?? "Agent"} accepted the order`);
    return NextResponse.json({ ok: true });
  }

  // Admin confirms payment
  if (body.confirmPayment === true && userRole === "admin") {
    const client = await getUserById(order.clientId);
    await supabase.from("orders").update({
      payment_status: "confirmed",
      invoice_paid: true,
      paid_at: new Date().toISOString(),
      status: "pending",
    }).eq("id", id);
    await addStatusHistory(id, "pending", "Payment confirmed — order is now active");
    const admin = await getUserById(userId);
    await logAdminAction({ actorId: userId, actorName: admin?.name ?? "Admin", action: "order.confirm_payment", targetType: "order", targetId: id, details: { amount: order.totalPrice } });

    // Email client that order is activated
    if (client?.email) {
      await sendOrderActivatedEmail({
        clientEmail: client.email, clientName: client.name,
        address: order.address, orderId: id,
      });
    }
    // Notify admin via email+ntfy
    await sendPaymentReceivedAdminEmail({
      clientName: client?.name ?? "Client",
      clientEmail: client?.email ?? "",
      amount: order.totalPrice,
      orderId: id,
      address: order.address,
    });
    return NextResponse.json({ ok: true });
  }

  // Status update — admin can update any order; agents only their assigned order
  if (body.status) {
    const canUpdateStatus = userRole === "admin" || (userRole === "agent" && order.assignedAgentId === userId);
    if (!canUpdateStatus) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await updateOrder(id, { status: body.status });
    await addStatusHistory(id, body.status, body.note ?? `Order ${body.status.replace("_", " ")}`);
    if (userRole === "admin") {
      const admin = await getUserById(userId);
      await logAdminAction({ actorId: userId, actorName: admin?.name ?? "Admin", action: "order.status_override", targetType: "order", targetId: id, details: { newStatus: body.status, note: body.note ?? "" } });
    }

    const client = await getUserById(order.clientId);

    if (body.status === "completed") {
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      await updateOrder(id, { photoExpiresAt: expires.toISOString() });
      if (client?.email) {
        await sendOrderCompletionEmail({
          clientEmail: client.email, clientName: client.name,
          address: order.address, orderId: id, photoCount: order.photos.length,
          baseUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "https://snapect.com",
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
    } else if (body.status === "cancelled") {
      // Refund wallet hold on cancellation
      const { refundWalletHold } = await import("@/lib/db");
      await refundWalletHold(order.clientId, order.id);
      if (client?.email) {
        await sendOrderStatusEmail({ clientEmail: client.email, clientName: client.name, address: order.address, orderId: id, status: body.status, note: body.note });
      }
    } else if (client?.email && ["in_progress"].includes(body.status)) {
      await sendOrderStatusEmail({
        clientEmail: client.email, clientName: client.name,
        address: order.address, orderId: id,
        status: body.status, note: body.note,
      });
    }
  }

  // Admin assign agent — shown as system action without admin mention
  if (body.assignedAgentId !== undefined) {
    if (userRole !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await updateOrder(id, { assignedAgentId: body.assignedAgentId || null, status: body.status ?? order.status });
    const admin = await getUserById(userId);
    if (body.assignedAgentId) {
      const agent = await getUserById(body.assignedAgentId);
      await addStatusHistory(id, "in_progress", `${agent?.name ?? "Agent"} assigned to this order`);
      await logAdminAction({ actorId: userId, actorName: admin?.name ?? "Admin", action: "order.assign_agent", targetType: "order", targetId: id, details: { agentId: body.assignedAgentId, agentName: agent?.name } });
    } else {
      await logAdminAction({ actorId: userId, actorName: admin?.name ?? "Admin", action: "order.unassign_agent", targetType: "order", targetId: id });
    }
  }

  // Client selects which delivered photos to keep — only the order's own client
  if (body.selectedPhotos) {
    if (userRole !== "client" || order.clientId !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await updatePhotoSelection(id, body.selectedPhotos);
  }

  // Marking an invoice paid outside of Whop/admin confirmation flows — admin only
  if (body.invoicePaid !== undefined) {
    if (userRole !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await updateOrder(id, { invoicePaid: body.invoicePaid });
    const admin = await getUserById(userId);
    await logAdminAction({ actorId: userId, actorName: admin?.name ?? "Admin", action: "order.invoice_paid_override", targetType: "order", targetId: id, details: { invoicePaid: body.invoicePaid } });
  }

  return NextResponse.json({ ok: true });
}
