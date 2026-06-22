import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = store.orders.find((o) => o.id === id);

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (userRole === "client" && order.clientId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (userRole === "agent" && order.assignedAgentId !== userId && order.status !== "pending")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const client = store.users.find((u) => u.id === order.clientId);
  const agent = order.assignedAgentId ? store.users.find((u) => u.id === order.assignedAgentId) : null;

  return NextResponse.json({
    order: {
      ...order,
      client: client ? { name: client.name, email: client.email, phone: client.phone } : null,
      agent: agent ? { name: agent.name, email: agent.email, phone: agent.phone, rating: agent.rating } : null,
    },
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;

  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const idx = store.orders.findIndex((o) => o.id === id);

  if (idx === -1) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const updates = await request.json();
  const order = store.orders[idx];
  const oldStatus = order.status;

  if (userRole === "admin") {
    if (updates.status && updates.status !== oldStatus) {
      store.orders[idx].status = updates.status;
      store.orders[idx].statusHistory.push({
        status: updates.status,
        timestamp: new Date().toISOString(),
        note: `Status updated to "${updates.status}" by admin`,
      });
      if (updates.status === "completed") {
        const expires = new Date();
        expires.setDate(expires.getDate() + 30);
        store.orders[idx].photoExpiresAt = expires.toISOString();
        // Credit agent earnings
        const agentId = store.orders[idx].assignedAgentId;
        if (agentId) {
          const agentIdx = store.users.findIndex((u) => u.id === agentId);
          if (agentIdx !== -1) {
            store.users[agentIdx].totalEarnings = (store.users[agentIdx].totalEarnings ?? 0) + order.compensationAmount;
            store.users[agentIdx].pendingPayout = (store.users[agentIdx].pendingPayout ?? 0) + order.compensationAmount;
            store.users[agentIdx].completedJobs = (store.users[agentIdx].completedJobs ?? 0) + 1;
          }
        }
        // Email client
        const client = store.users.find((u) => u.id === order.clientId);
        if (client) {
          store.emailLog.push({
            timestamp: new Date().toISOString(),
            type: "order_completed",
            to: client.email,
            subject: `Your inspection at ${order.address} is complete`,
            body: `${order.photos.length} photo(s) available for 30 days. Download your report.`,
          });
        }
      }
    }
    if ("assignedAgentId" in updates) {
      const prevAgent = store.orders[idx].assignedAgentId;
      store.orders[idx].assignedAgentId = updates.assignedAgentId;
      const agent = updates.assignedAgentId ? store.users.find((u) => u.id === updates.assignedAgentId) : null;
      if (agent && updates.assignedAgentId !== prevAgent) {
        store.orders[idx].statusHistory.push({
          status: store.orders[idx].status,
          timestamp: new Date().toISOString(),
          note: `Assigned to agent ${agent.name}`,
        });
        store.emailLog.push({
          timestamp: new Date().toISOString(),
          type: "offer_sent",
          to: agent.email,
          subject: `New Job Offer: ${order.serviceType} at ${order.address}`,
          body: `Compensation: $${order.compensationAmount}. Accept or decline in your portal.`,
        });
      }
    }
    if ("notes" in updates) store.orders[idx].notes = updates.notes;
    if ("rating" in updates) {
      const agentId = store.orders[idx].assignedAgentId;
      if (agentId) {
        const agentIdx = store.users.findIndex((u) => u.id === agentId);
        if (agentIdx !== -1) store.users[agentIdx].rating = updates.rating;
      }
    }

  } else if (userRole === "agent") {
    if (updates.accept && order.assignedAgentId === null) {
      store.orders[idx].assignedAgentId = userId;
      store.orders[idx].status = "in_progress";
      store.orders[idx].offerAcceptedAt = new Date().toISOString();
      const agent = store.users.find((u) => u.id === userId);
      store.orders[idx].statusHistory.push({
        status: "in_progress",
        timestamp: new Date().toISOString(),
        note: `Job accepted by agent ${agent?.name ?? userId}`,
      });
    } else if (updates.decline && order.assignedAgentId === null) {
      // Agent declines — just log it, keep order pending
      store.orders[idx].statusHistory.push({
        status: "pending",
        timestamp: new Date().toISOString(),
        note: `Offer declined by agent`,
      });
    } else if (order.assignedAgentId === userId) {
      if (updates.status) {
        store.orders[idx].status = updates.status;
        store.orders[idx].statusHistory.push({
          status: updates.status,
          timestamp: new Date().toISOString(),
          note: updates.status === "completed"
            ? `Job marked complete by agent — ${order.photos.length} photo(s) uploaded`
            : `Status changed to ${updates.status}`,
        });
        if (updates.status === "completed") {
          const expires = new Date();
          expires.setDate(expires.getDate() + 30);
          store.orders[idx].photoExpiresAt = expires.toISOString();
          const agentIdx = store.users.findIndex((u) => u.id === userId);
          if (agentIdx !== -1) {
            store.users[agentIdx].totalEarnings = (store.users[agentIdx].totalEarnings ?? 0) + order.compensationAmount;
            store.users[agentIdx].pendingPayout = (store.users[agentIdx].pendingPayout ?? 0) + order.compensationAmount;
            store.users[agentIdx].completedJobs = (store.users[agentIdx].completedJobs ?? 0) + 1;
          }
          const client = store.users.find((u) => u.id === order.clientId);
          if (client) {
            store.emailLog.push({
              timestamp: new Date().toISOString(),
              type: "order_completed",
              to: client.email,
              subject: `Your inspection at ${order.address} is complete`,
              body: `${order.photos.length} photo(s) are available. Photos expire on ${store.orders[idx].photoExpiresAt}.`,
            });
          }
        }
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

  } else if (userRole === "client" && order.clientId === userId) {
    // Client can select photos
    if (updates.selectedPhotos && Array.isArray(updates.selectedPhotos)) {
      store.orders[idx].photos = store.orders[idx].photos.map((p) => ({
        ...p,
        selectedByClient: updates.selectedPhotos.includes(p.id),
      }));
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ order: store.orders[idx] });
}
