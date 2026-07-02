import { NextRequest, NextResponse } from "next/server";
import { getOrderById, getBidsByOrderId, createBid, updateBidStatus, rejectOtherBids, updateOrder, addStatusHistory, getUserById } from "@/lib/db";
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

  // Determine bidder — admin acts as agent silently
  let bidderAgentId: string;
  if (userRole === "admin") {
    if (!actingAsAgentId) return NextResponse.json({ error: "actingAsAgentId required" }, { status: 400 });
    const agent = await getUserById(actingAsAgentId);
    if (!agent || agent.role !== "agent") return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    bidderAgentId = actingAsAgentId;
  } else if (userRole === "agent") {
    bidderAgentId = userId;
  } else {
    return NextResponse.json({ error: "Only agents can place bids" }, { status: 403 });
  }

  if (!amount || Number(amount) <= 0)
    return NextResponse.json({ error: "Valid bid amount required" }, { status: 400 });

  const bid = await createBid({
    orderId: id, agentId: bidderAgentId,
    amount: Number(amount), message: message ?? "",
    placedByAdmin: userRole === "admin",
  });

  const agent = await getUserById(bidderAgentId);
  // Status shows agent name only — no admin mention
  await addStatusHistory(id, order.status, `${agent?.name ?? "Agent"} placed a bid of $${amount}`);

  // Email client about new bid
  const client = await getUserById(order.clientId);
  if (client?.email) {
    await sendBidPlacedEmail({
      clientEmail: client.email, clientName: client.name,
      address: order.address, agentName: agent?.name ?? "Agent",
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
    await updateBidStatus(bidId, "accepted");
    await rejectOtherBids(id, bidId);
    await updateOrder(id, {
      acceptedBidId: bidId, assignedAgentId: bid.agentId,
      compensationAmount: bid.amount, status: "in_progress",
      offerAcceptedAt: new Date().toISOString(),
    });
    const agent = await getUserById(bid.agentId);
    await addStatusHistory(id, "in_progress", `Bid accepted — ${agent?.name ?? "Agent"} assigned at $${bid.amount}`);

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
