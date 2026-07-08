import { NextRequest, NextResponse } from "next/server";
import { createReview, getReviewByOrder, getReviewsForAgent, getOrderById, getUserById } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orderId = request.nextUrl.searchParams.get("orderId");
  if (orderId) {
    const review = await getReviewByOrder(orderId);
    return NextResponse.json({ review });
  }

  const agentIdParam = request.nextUrl.searchParams.get("agentId");
  const agentId = userRole === "admin" && agentIdParam ? agentIdParam : (userRole === "agent" ? userId : null);
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });
  const reviews = await getReviewsForAgent(agentId);
  return NextResponse.json({ reviews });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const { orderId, rating, comment } = await request.json();
  if (!orderId || !rating || rating < 1 || rating > 5)
    return NextResponse.json({ error: "orderId and a rating from 1-5 are required" }, { status: 400 });

  const order = await getOrderById(orderId);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.clientId !== userId) {
    const orderClient = await getUserById(order.clientId);
    if (orderClient?.parentClientId !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (order.status !== "completed")
    return NextResponse.json({ error: "You can only review a completed order" }, { status: 400 });
  if (!order.assignedAgentId)
    return NextResponse.json({ error: "This order has no assigned agent" }, { status: 400 });

  const existing = await getReviewByOrder(orderId);
  if (existing) return NextResponse.json({ error: "You've already reviewed this order" }, { status: 409 });

  const review = await createReview({ orderId, clientId: userId, agentId: order.assignedAgentId, rating: Number(rating), comment });
  return NextResponse.json({ review }, { status: 201 });
}
