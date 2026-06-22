import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (userRole !== "admin" && userId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const agent = store.users.find((u) => u.id === id && u.role === "agent");
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const completedOrders = store.orders.filter((o) => o.assignedAgentId === id && o.status === "completed");

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      bio: agent.bio ?? "",
      coverageZone: agent.coverageZone ?? "",
      vehicle: agent.vehicle ?? "",
      available: agent.available ?? true,
      rating: agent.rating ?? 4.0,
      totalEarnings: agent.totalEarnings ?? 0,
      pendingPayout: agent.pendingPayout ?? 0,
      completedJobs: agent.completedJobs ?? 0,
      recentOrders: completedOrders.slice(-5).map((o) => ({
        id: o.id, address: o.address, serviceType: o.serviceType,
        compensation: o.compensationAmount, completedAt: o.statusHistory.at(-1)?.timestamp,
      })),
    },
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const agentIdx = store.users.findIndex((u) => u.id === id && u.role === "agent");
  if (agentIdx === -1) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  if (userRole !== "admin" && userId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updates = await request.json();

  // Agents can update own profile fields
  const agentFields = ["available", "bio", "coverageZone", "vehicle", "phone"];
  // Admins can also update rating and payout
  const adminFields = ["rating", "pendingPayout", "totalEarnings"];

  const allowed = userRole === "admin" ? [...agentFields, ...adminFields] : agentFields;

  for (const key of allowed) {
    if (key in updates) {
      (store.users[agentIdx] as unknown as Record<string, unknown>)[key] = updates[key];
    }
  }

  // Admin mark-as-paid: clear pendingPayout
  if (userRole === "admin" && updates.markPaid) {
    store.users[agentIdx].pendingPayout = 0;
  }

  return NextResponse.json({ agent: store.users[agentIdx] });
}
