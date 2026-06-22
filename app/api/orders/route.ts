import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";
import { calculatePrice, calculateCompensation } from "@/lib/pricing";
import type { TurnaroundTier } from "@/lib/store";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let orders = [...store.orders];

  if (userRole === "client") {
    orders = orders.filter((o) => o.clientId === userId);
  } else if (userRole === "agent") {
    orders = orders.filter((o) => o.assignedAgentId === userId || o.status === "pending");
  }

  const enriched = orders.map((o) => {
    const client = store.users.find((u) => u.id === o.clientId);
    const agent = o.assignedAgentId ? store.users.find((u) => u.id === o.assignedAgentId) : null;
    return {
      ...o,
      client: client ? { id: client.id, name: client.name, email: client.email } : null,
      agent: agent ? { id: agent.id, name: agent.name, rating: agent.rating } : null,
    };
  });

  return NextResponse.json({ orders: enriched });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  if (!userId || userRole !== "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { orders: bulkOrders } = body;

  // Support both single order and bulk array
  const ordersList: typeof bulkOrders = Array.isArray(bulkOrders) ? bulkOrders : [body];

  if (ordersList.length === 0) {
    return NextResponse.json({ error: "No orders provided" }, { status: 400 });
  }
  if (ordersList.length > 50) {
    return NextResponse.json({ error: "Max 50 orders per batch" }, { status: 400 });
  }

  const batchId = ordersList.length > 1 ? `batch-${Date.now()}` : null;
  const created = [];

  for (const item of ordersList) {
    const { address, serviceType, turnaroundTier = "standard", notes = "", customizeNotes = "" } = item;

    if (!address || !serviceType) {
      return NextResponse.json({ error: "Missing required fields: address, serviceType" }, { status: 400 });
    }

    const tier = turnaroundTier as TurnaroundTier;
    const price = calculatePrice(serviceType, tier);
    const compensation = calculateCompensation(price, tier);

    const order = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      address,
      status: "pending" as const,
      clientId: userId,
      assignedAgentId: null,
      totalPrice: price,
      compensationAmount: compensation,
      serviceType,
      turnaroundTier: tier,
      notes,
      customizeNotes,
      photos: [],
      photoExpiresAt: null,
      createdAt: new Date().toISOString(),
      offerSentAt: new Date().toISOString(),
      offerAcceptedAt: null,
      bulkBatchId: batchId,
      invoicePaid: false,
      statusHistory: [
        { status: "pending", timestamp: new Date().toISOString(), note: "Order submitted by client" },
      ],
    };

    store.orders.push(order);
    created.push(order);

    // Email stub
    store.emailLog.push({
      timestamp: new Date().toISOString(),
      type: "new_order",
      to: "agents@fieldflow.com",
      subject: `New Order #${order.id} — ${serviceType} at ${address}`,
      body: `Compensation: $${compensation}. Turnaround: ${tier}.`,
    });
  }

  return NextResponse.json({ orders: created, count: created.length }, { status: 201 });
}
