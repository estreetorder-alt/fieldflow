import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

// GET /api/orders/[id]/bids — list bids on an order
export async function GET(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = store.orders.find(o => o.id === id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Clients can only see bids on their own orders
  if (userRole === "client" && order.clientId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Agents can only see their own bid
  let bids = order.bids ?? [];
  if (userRole === "agent") {
    bids = bids.filter(b => b.agentId === userId);
  }

  // Enrich with agent name
  const enriched = bids.map(b => {
    const agent = store.users.find(u => u.id === b.agentId);
    return { ...b, agentName: agent?.name ?? "Unknown", agentRating: agent?.rating ?? null };
  });

  return NextResponse.json({ bids: enriched });
}

// POST /api/orders/[id]/bids — place a bid
export async function POST(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orderIdx = store.orders.findIndex(o => o.id === id);
  if (orderIdx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const order = store.orders[orderIdx];

  // Order must be pending and unassigned
  if (order.status !== "pending" || order.assignedAgentId !== null)
    return NextResponse.json({ error: "Order is no longer available for bidding" }, { status: 409 });

  const body = await request.json();
  const { amount, message, actingAsAgentId } = body;

  // Who is actually placing the bid?
  let bidderAgentId: string;
  let placedByAdmin = false;

  if (userRole === "admin") {
    // Admin can bid on behalf of any agent
    if (!actingAsAgentId) return NextResponse.json({ error: "actingAsAgentId required for admin bids" }, { status: 400 });
    const agent = store.users.find(u => u.id === actingAsAgentId && u.role === "agent");
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    bidderAgentId = actingAsAgentId;
    placedByAdmin = true;
  } else if (userRole === "agent") {
    bidderAgentId = userId;
  } else {
    return NextResponse.json({ error: "Only agents or admins can place bids" }, { status: 403 });
  }

  // Agent cannot bid twice on the same order
  const existing = (order.bids ?? []).find(b => b.agentId === bidderAgentId);
  if (existing) return NextResponse.json({ error: "You have already bid on this order" }, { status: 409 });

  if (!amount || Number(amount) <= 0)
    return NextResponse.json({ error: "A valid bid amount is required" }, { status: 400 });

  const bid = {
    id: `bid-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    orderId: id,
    agentId: bidderAgentId,
    amount: Number(amount),
    message: message ?? "",
    placedAt: new Date().toISOString(),
    placedByAdmin,
    status: "pending" as const,
  };

  if (!store.orders[orderIdx].bids) store.orders[orderIdx].bids = [];
  store.orders[orderIdx].bids.push(bid);

  const agent = store.users.find(u => u.id === bidderAgentId);
  store.emailLog.push({
    timestamp: new Date().toISOString(),
    type: "bid_placed",
    to: "client@fieldflow.com",
    subject: `New bid on order ${id} from ${agent?.name ?? bidderAgentId}`,
    body: `Bid: $${amount}. Message: ${message}${placedByAdmin ? " [Placed by admin on agent's behalf]" : ""}`,
  });

  return NextResponse.json({ bid }, { status: 201 });
}

// PATCH /api/orders/[id]/bids — accept or reject a bid (client or admin)
export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const orderIdx = store.orders.findIndex(o => o.id === id);
  if (orderIdx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const order = store.orders[orderIdx];

  // Only client (owner) or admin can accept/reject bids
  if (userRole === "client" && order.clientId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (userRole === "agent")
    return NextResponse.json({ error: "Agents cannot accept/reject bids" }, { status: 403 });

  if (order.acceptedBidId)
    return NextResponse.json({ error: "A bid has already been accepted for this order" }, { status: 409 });

  const { bidId, action } = await request.json(); // action: "accept" | "reject"
  if (!bidId || !["accept", "reject"].includes(action))
    return NextResponse.json({ error: "bidId and action (accept|reject) required" }, { status: 400 });

  const bidIdx = store.orders[orderIdx].bids.findIndex(b => b.id === bidId);
  if (bidIdx === -1) return NextResponse.json({ error: "Bid not found" }, { status: 404 });

  if (action === "accept") {
    const bid = store.orders[orderIdx].bids[bidIdx];
    // Accept this bid
    store.orders[orderIdx].bids[bidIdx].status = "accepted";
    // Reject all other bids
    store.orders[orderIdx].bids = store.orders[orderIdx].bids.map((b, i) =>
      i === bidIdx ? b : { ...b, status: "rejected" }
    );
    store.orders[orderIdx].acceptedBidId = bidId;
    store.orders[orderIdx].assignedAgentId = bid.agentId;
    store.orders[orderIdx].compensationAmount = bid.amount;
    store.orders[orderIdx].status = "in_progress";
    store.orders[orderIdx].offerAcceptedAt = new Date().toISOString();

    const agent = store.users.find(u => u.id === bid.agentId);
    store.orders[orderIdx].statusHistory.push({
      status: "in_progress",
      timestamp: new Date().toISOString(),
      note: `Bid accepted — assigned to ${agent?.name ?? bid.agentId} at $${bid.amount}`,
    });

    store.emailLog.push({
      timestamp: new Date().toISOString(),
      type: "bid_accepted",
      to: agent?.email ?? "",
      subject: `Your bid was accepted — ${order.address}`,
      body: `Your bid of $${bid.amount} was accepted. Please proceed with the job.`,
    });
  } else {
    // Reject just this bid
    store.orders[orderIdx].bids[bidIdx].status = "rejected";
    store.orders[orderIdx].statusHistory.push({
      status: order.status,
      timestamp: new Date().toISOString(),
      note: `Bid ${bidId} rejected`,
    });
  }

  return NextResponse.json({ order: store.orders[orderIdx] });
}
