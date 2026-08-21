import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getOrderById, getBidsByOrderId, createBid, updateBidStatus, rejectOtherBids, updateOrder, addStatusHistory, getUserById, anonUserId, getWalletBalance } from "@/lib/db";
import { sendBidPlacedEmail, sendBidAcceptedEmail, sendBidRejectedEmail } from "@/lib/email";
import { sendNtfyNotification } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  let bids = await getBidsByOrderId(id);
  if (userRole === "agent") bids = bids.filter(b => b.agentId === userId);
  if (userRole === "client") bids = bids.map(b => ({ ...b, agentName: anonUserId(b.agentId, id) }));
  return NextResponse.json({ bids });
}

export async function POST(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending" || order.assignedAgentId)
    return NextResponse.json({ error: "Order is no longer available" }, { status: 409 });

  const body = await request.json();
  const { amount, message, actingAsAgentId } = body;

  // Req. 2: bidding is entirely admin-controlled through ghost agents.
  // Self-registered agents never place bids or see order pricing — only
  // admin (and scoped sub_admin_orders) can submit bids, acting on behalf
  // of any agent (typically a ghost agent).
  const canPlaceBids = userRole === "admin" || userRole === "sub_admin_orders";
  let bidderAgentId: string;
  if (canPlaceBids) {
    if (!actingAsAgentId) return NextResponse.json({ error: "actingAsAgentId required" }, { status: 400 });
    const agent = await getUserById(actingAsAgentId);
    if (!agent || agent.role !== "agent") return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    bidderAgentId = actingAsAgentId;
  } else {
    return NextResponse.json({ error: "Bidding is admin-controlled. Agents cannot place bids directly." }, { status: 403 });
  }

  if (!amount || Number(amount) <= 0)
    return NextResponse.json({ error: "Valid bid amount required" }, { status: 400 });

  const { agentPayout } = body;
  const bid = await createBid({
    orderId: id, agentId: bidderAgentId,
    amount: Number(amount), message: message ?? "",
    placedByAdmin: true,
    agentPayout: agentPayout !== undefined ? Number(agentPayout) : undefined,
    payoutSetBy: agentPayout !== undefined ? userId : undefined,
  });

  const agent = await getUserById(bidderAgentId);
  // Status shows an anonymized user id only — no real agent name, no admin mention
  await addStatusHistory(id, order.status, `${anonUserId(bidderAgentId, id)} placed a bid of $${amount} on ${order.address}`);

  // Email client about new bid
  const client = await getUserById(order.clientId);
  if (client?.email) {
    await sendBidPlacedEmail({
      clientEmail: client.email, clientName: client.name,
      address: order.address, agentName: anonUserId(bidderAgentId, id),
      bidAmount: Number(amount), orderId: id,
    });
  }

  // Ntfy admin
  await sendNtfyNotification({
    title: `🎯 New Bid — $${amount}`,
    message: `Agent: ${agent?.name}\nOrder: ${order.address}\nAmount: $${amount}`,
    priority: "default", tags: ["dart"],
  });

  return NextResponse.json({ bid }, { status: 201 });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (userRole === "client" && order.clientId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (userRole === "agent") return NextResponse.json({ error: "Agents cannot accept bids" }, { status: 403 });
  if (order.acceptedBidId) return NextResponse.json({ error: "Bid already accepted" }, { status: 409 });

  const { bidId, action } = await request.json();
  if (!bidId || !["accept", "reject"].includes(action))
    return NextResponse.json({ error: "bidId and action required" }, { status: 400 });

  const bids = await getBidsByOrderId(id);
  const bid = bids.find(b => b.id === bidId);
  if (!bid) return NextResponse.json({ error: "Bid not found" }, { status: 404 });

  if (action === "accept") {
    // Orders are never blocked by wallet balance. Accept the bid, assign
    // the agent, and charge whatever the vendor's wallet currently covers
    // (accept_order_charge is atomic/row-locked, so this can't double-spend
    // against a concurrently-accepted order). If it doesn't fully cover the
    // bid, an overdraft request is opened automatically for admin review —
    // the order keeps moving either way.
    const balanceBefore = await getWalletBalance(order.clientId);

    await updateBidStatus(bidId, "accepted");
    await rejectOtherBids(id, bidId);
    await updateOrder(id, {
      acceptedBidId: bidId, assignedAgentId: bid.agentId,
      compensationAmount: bid.amount, status: "in_progress",
      offerAcceptedAt: new Date().toISOString(),
    });

    const { acceptOrderCharge, openOverdraftRequest } = await import("@/lib/orderPayments");
    const charge = await acceptOrderCharge(id);

    if (charge.amountDue > 0) {
      await addStatusHistory(id, "in_progress", `Bid accepted — ${anonUserId(bid.agentId, id)} assigned at $${bid.amount}. $${charge.charged.toFixed(2)} collected from wallet, $${charge.amountDue.toFixed(2)} outstanding.`);
      await openOverdraftRequest({
        orderId: id, vendorId: order.clientId, orderAmount: bid.amount,
        walletBalanceAtRequest: balanceBefore, requestedAmount: charge.amountDue,
      }).catch((err) => console.error("[overdraft] auto-open failed", err));
    } else {
      await addStatusHistory(id, "in_progress", `Bid accepted — ${anonUserId(bid.agentId, id)} assigned at $${bid.amount}. $${charge.charged.toFixed(2)} deducted from wallet.`);
    }

    const agent = await getUserById(bid.agentId);
    // Email agent about acceptance
    if (agent?.email) {
      await sendBidAcceptedEmail({
        agentEmail: agent.email, agentName: agent.name,
        address: order.address, bidAmount: bid.amount, orderId: id,
      });
    }
    // Reject other bidders and email them
    const rejectedBids = bids.filter(b => b.id !== bidId && b.status === "pending");
    for (const rb of rejectedBids) {
      const rejAgent = await getUserById(rb.agentId);
      if (rejAgent?.email) {
        await sendBidRejectedEmail({ agentEmail: rejAgent.email, agentName: rejAgent.name, address: order.address });
      }
    }
  } else {
    await updateBidStatus(bidId, "rejected");
    await addStatusHistory(id, order.status, `Bid rejected`);
    const agent = await getUserById(bid.agentId);
    if (agent?.email) {
      await sendBidRejectedEmail({ agentEmail: agent.email, agentName: agent.name, address: order.address });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || (userRole !== "admin" && userRole !== "sub_admin_orders"))
    return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const { bidId } = await request.json();
  if (!bidId) return NextResponse.json({ error: "bidId required" }, { status: 400 });

  const bids = await getBidsByOrderId(id);
  const bid = bids.find(b => b.id === bidId);
  if (!bid) return NextResponse.json({ error: "Bid not found" }, { status: 404 });

  const order = await getOrderById(id);
  if (order?.acceptedBidId === bidId)
    return NextResponse.json({ error: "Cannot delete an accepted bid — cancel or delete the order instead" }, { status: 409 });

  await supabase.from("bids").delete().eq("id", bidId);
  return NextResponse.json({ ok: true });
}
