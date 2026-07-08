import { NextRequest, NextResponse } from "next/server";
import { createDispute, getDisputesByClient, getAllDisputes, getOrderById, getUserById } from "@/lib/db";
import { sendAdminNotification } from "@/lib/email";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (userRole === "admin") {
    const status = request.nextUrl.searchParams.get("status") ?? undefined;
    const disputes = await getAllDisputes(status);
    return NextResponse.json({ disputes });
  }

  if (userRole !== "client") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const disputes = await getDisputesByClient(userId);
  return NextResponse.json({ disputes });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") return NextResponse.json({ error: "Clients only" }, { status: 403 });

  const { orderId, reason, description, photoUrls } = await request.json();
  if (!orderId || !reason || !description)
    return NextResponse.json({ error: "orderId, reason, and description are required" }, { status: 400 });

  const order = await getOrderById(orderId);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  // Client may only dispute their own order (or one placed for their sub-account)
  if (order.clientId !== userId) {
    const orderClient = await getUserById(order.clientId);
    if (orderClient?.parentClientId !== userId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dispute = await createDispute({ orderId, clientId: userId, reason, description, photoUrls });

  await sendAdminNotification({
    title: `⚠️ New Dispute — Order ${orderId}`,
    message: `Client: ${userId}\nReason: ${reason}\nDescription: ${description}\n\nNote: Snapect has no cash-refund policy — resolve via reshoot or wallet credit in Admin → Disputes.`,
    type: "dispute_opened",
  });

  return NextResponse.json({ dispute }, { status: 201 });
}
