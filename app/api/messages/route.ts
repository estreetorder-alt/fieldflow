import { NextRequest, NextResponse } from "next/server";
import { getMessages, sendMessage, markMessagesRead, getUnreadCount, getAllUsers } from "@/lib/db";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [messages, unread] = await Promise.all([getMessages(userId), getUnreadCount(userId)]);
  await markMessagesRead(userId);
  return NextResponse.json({ messages, unread });
}

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { toId, body, orderId } = await request.json();
  if (!toId || !body?.trim()) return NextResponse.json({ error: "toId and body required" }, { status: 400 });
  // Agents can only message admin; admin can message anyone
  if (userRole === "agent") {
    const users = await getAllUsers();
    const admin = users.find(u => u.role === "admin");
    if (!admin || toId !== admin.id) return NextResponse.json({ error: "Agents can only message admin" }, { status: 403 });
  }
  await sendMessage(userId, toId, body.trim(), orderId);
  return NextResponse.json({ ok: true }, { status: 201 });
}
