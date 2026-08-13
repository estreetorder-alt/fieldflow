import { NextRequest, NextResponse } from "next/server";
import { getChat, getMessages, addMessage, closeChat } from "@/lib/supportChat";
import { getUserById } from "@/lib/db";
import { canAccessScope } from "@/lib/adminAccess";

type Params = { params: Promise<{ id: string }> };

function isSupportAdmin(role?: string) {
  return role === "admin" || canAccessScope(role, "support");
}

// GET — full thread for one ticket, plus the requester's basic info.
export async function GET(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !isSupportAdmin(userRole)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const chat = await getChat(id);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [messages, requester] = await Promise.all([getMessages(id), getUserById(chat.userId)]);

  return NextResponse.json({
    chat,
    messages,
    requester: requester ? { id: requester.id, name: requester.name, email: requester.email, role: requester.role } : null,
  });
}

// POST — reply to the ticket as support staff.
export async function POST(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !isSupportAdmin(userRole)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const chat = await getChat(id);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { body } = await request.json();
  const text = String(body ?? "").trim();
  if (!text) return NextResponse.json({ error: "Message body is required" }, { status: 400 });

  await addMessage(id, "agent", text);
  // Replying re-opens a closed ticket into "in_progress" so it surfaces again.
  if (chat.status === "closed" || chat.status === "open") {
    const { supabase } = await import("@/lib/supabase");
    await supabase.from("support_chats").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", id);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// PATCH — mark resolved/closed.
export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  const userRole = request.cookies.get("user_role")?.value;
  if (!userId || !isSupportAdmin(userRole)) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const { id } = await params;
  const { status } = await request.json();

  if (status === "closed" || status === "resolved") {
    if (status === "closed") {
      await closeChat(id);
    } else {
      const { supabase } = await import("@/lib/supabase");
      await supabase.from("support_chats").update({ status: "resolved", updated_at: new Date().toISOString() }).eq("id", id);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "status must be 'resolved' or 'closed'" }, { status: 400 });
}
