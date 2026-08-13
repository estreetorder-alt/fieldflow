import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrder, addStatusHistory, getUserById, updatePhotoSelection, logAdminAction, anonUserId, getBidsByOrderId, updateBidStatus, rejectAllPendingBids } from "@/lib/db";
import { sendOrderCompletionEmail, sendOrderActivatedEmail, sendOrderStatusEmail, sendPaymentReceivedAdminEmail } from "@/lib/email";
import { supabase } from "@/lib/supabase";
import { canAccessScope } from "@/lib/adminAccess";

type Params = { params: Promise<{ id: string }> };
type OrderLike = { clientId: string; assignedAgentId: string | null };

// A client may view/act on an order if they placed it directly, or if it
// belongs to one of their sub-accounts. Agents may only touch orders
// assigned to them. Admins can always access everything.
async function canAccessOrder(order: OrderLike, userId: string, userRole?: string): Promise<boolean> {
  if (userRole === "admin" || canAccessScope(userRole, "orders")) return true;
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
  if (userRole === "client") {
    const masked = {
      ...order,
      agent: order.agent ? { name: anonUserId(order.assignedAgentId, order.id), email: "", phone: "" } : null,
      bids: (order.bids ?? []).map(b => ({ ...b, agentName: anonUserId(b.agentId, order.id) })),
      photos: (order.photos ?? []).filter(p => p.approved !== false),
    };
    return NextResponse.json({ order: masked });
  }
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
    await addStatusHistory(id, "in_progress", `${anonUserId(userId, id)} accepted the order`);
    return NextResponse.json({ ok: true });
  }

  // Admin confirms payment
  if (body.confirmPayment === true && (userRole === "admin" || canAccessScope(userRole, "orders"))) {
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
    const canUpdateStatus = userRole === "admin" || canAccessScope(userRole, "orders") || (userRole === "agent" && order.assignedAgentId === userId);
    if (!canUpdateStatus) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await updateOrder(id, { status: body.status });
    await addStatusHistory(id, body.status, body.note ?? `Order ${body.status.replace("_", " ")}`);
    if (userRole === "admin" || canAccessScope(userRole, "orders")) {
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
        // Release the held wallet funds to the agent — releaseWalletHold is
        // guarded by wallet_released, so repeated status flips can't double-pay.
        const { releaseWalletHold, getUserById: getU, updateUser } = await import("@/lib/db");
        await releaseWalletHold(order.id, order.assignedAgentId);
        // completedJobs counter (earnings are handled inside releaseWalletHold)
        const agent = await getU(order.assignedAgentId);
        if (agent) await updateUser(order.assignedAgentId, { completedJobs: (agent.completedJobs ?? 0) + 1 });
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
    if (userRole !== "admin" && !canAccessScope(userRole, "orders")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    if (body.assignedAgentId) {
      // If this agent already has a pending bid on the order, treat this as
      // accepting that bid — same wallet-hold + acceptedBidId path the
      // normal bid-accept flow uses — instead of silently skipping it and
      // leaving the order in a contradictory "assigned but still awaiting
      // offers" state with no funds actually held.
      const bids = await getBidsByOrderId(id);
      const matchingBid = bids.find(b => b.agentId === body.assignedAgentId && b.status === "pending");

      if (matchingBid && !order.acceptedBidId) {
        const { tryHoldWithRollover } = await import("@/lib/rollover");
        const { held, usedRollover, rolloverAmount } = await tryHoldWithRollover(order.clientId, id, matchingBid.amount);
        if (!held) {
          return NextResponse.json({
            error: "insufficient_funds",
            message: `Client's wallet balance is too low to cover this agent's $${matchingBid.amount} bid. Have them top up before assigning.`,
          }, { status: 402 });
        }
        if (usedRollover) {
          await addStatusHistory(id, order.status, `$${rolloverAmount?.toFixed(2)} of this order proceeded on rollover credit — will auto-settle on next wallet top-up.`);
        }
        await updateBidStatus(matchingBid.id, "accepted");
        await rejectAllPendingBids(id);
        await updateOrder(id, {
          assignedAgentId: body.assignedAgentId, status: body.status ?? "in_progress",
          acceptedBidId: matchingBid.id, compensationAmount: matchingBid.amount,
          offerAcceptedAt: new Date().toISOString(),
        });
      } else {
        // No matching bid to accept — either a bid was already accepted
        // earlier (reassignment) or this is a pure manual placement. Either
        // way, close out any other still-pending bids so the order can't be
        // mistaken for still open to offers.
        await rejectAllPendingBids(id);
        await updateOrder(id, { assignedAgentId: body.assignedAgentId, status: body.status ?? order.status });
      }
    } else {
      await updateOrder(id, { assignedAgentId: null, status: body.status ?? order.status });
    }

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
    if (userRole !== "admin" && !canAccessScope(userRole, "orders")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await updateOrder(id, { invoicePaid: body.invoicePaid });
    const admin = await getUserById(userId);
    await logAdminAction({ actorId: userId, actorName: admin?.name ?? "Admin", action: "order.invoice_paid_override", targetType: "order", targetId: id, details: { invoicePaid: body.invoicePaid } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Refund any held wallet funds back to the client before deleting
  try {
    const { refundWalletHold } = await import("@/lib/db");
    await refundWalletHold(order.clientId, id);
  } catch { /* no hold to refund */ }

  // Remove all related rows, then the order itself
  await supabase.from("bids").delete().eq("order_id", id);
  await supabase.from("photos").delete().eq("order_id", id);
  await supabase.from("status_history").delete().eq("order_id", id);
  await supabase.from("orders").delete().eq("id", id);

  const admin = await getUserById(userId);
  await logAdminAction({ actorId: userId, actorName: admin?.name ?? "Admin", action: "delete_order", targetType: "order", targetId: id, details: { address: order.address } });
  return NextResponse.json({ ok: true });
}
