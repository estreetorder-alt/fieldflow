import { NextRequest, NextResponse } from "next/server";
import { getOrderById, getUserById } from "@/lib/db";
import { getTierLabel } from "@/lib/pricing";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (userRole === "client" && order.clientId !== userId) {
    const orderClient = await getUserById(order.clientId);
    if (orderClient?.parentClientId !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (userRole === "agent" && order.assignedAgentId !== userId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [client, agent] = await Promise.all([
    getUserById(order.clientId),
    order.assignedAgentId ? getUserById(order.assignedAgentId) : Promise.resolve(null),
  ]);

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });

  return NextResponse.json({
    order: {
      id: order.id, address: order.address, status: order.status,
      serviceType: order.serviceType, turnaroundTier: order.turnaroundTier,
      turnaroundLabel: getTierLabel(order.turnaroundTier),
      totalPrice: order.totalPrice, compensationAmount: order.compensationAmount,
      notes: order.notes, customizeNotes: order.customizeNotes,
      photos: order.photos, photoExpiresAt: order.photoExpiresAt,
      createdAt: order.createdAt, invoicePaid: order.invoicePaid,
      statusHistory: order.statusHistory,
    },
    client: client ? { name: client.name, email: client.email, phone: client.phone } : null,
    agent: agent ? { name: agent.name, email: agent.email } : null,
    formattedDate: fmt(order.createdAt),
  });
}
