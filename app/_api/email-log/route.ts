import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function GET(request: NextRequest) {
  const userRole = request.cookies.get("user_role")?.value;
  if (userRole !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ emails: [...store.emailLog].reverse().slice(0, 100) });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || userRole !== "client") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { orderId, photoIds } = await request.json();
  const order = store.orders.find((o) => o.id === orderId && o.clientId === userId);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const client = store.users.find((u) => u.id === userId);
  store.emailLog.push({
    timestamp: new Date().toISOString(),
    type: "photo_email",
    to: client?.email ?? userId,
    subject: `Selected photos from inspection at ${order.address}`,
    body: `Client selected ${photoIds?.length ?? 0} photo(s) to email from order ${orderId}. Photo IDs: ${(photoIds ?? []).join(", ")}`,
  });

  return NextResponse.json({ ok: true });
}
