import { NextRequest, NextResponse } from "next/server";
import { declineOrder, getOrderById, addStatusHistory, getUserById } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "agent") return NextResponse.json({ error: "Agents only" }, { status: 403 });
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.status !== "pending") return NextResponse.json({ error: "Order not available" }, { status: 409 });
  await declineOrder(id, userId);
  const agent = await getUserById(userId);
  await addStatusHistory(id, "pending", `${agent?.name ?? "Agent"} declined this order`);
  return NextResponse.json({ ok: true });
}
