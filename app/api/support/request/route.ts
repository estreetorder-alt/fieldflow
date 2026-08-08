import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// One-shot request submission — stored as a support ticket (support_chats /
// support_messages) so it shows up in the admin Support Center regardless
// of any external notification channel.
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, message, orderNumber, category } = await request.json();
  const text = String(message ?? "").trim();
  if (!text) return NextResponse.json({ error: "Please describe your request." }, { status: 400 });

  const id = `sc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  await supabase.from("support_chats").insert({
    id, user_id: userId, kind: "request", status: "open",
    category: category || "general", subject: subject || null,
  });
  await supabase.from("support_messages").insert({ chat_id: id, sender: "user", body: text });

  return NextResponse.json({ ok: true }, { status: 201 });
}
