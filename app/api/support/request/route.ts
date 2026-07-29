import { NextRequest, NextResponse } from "next/server";
import { getUserById } from "@/lib/db";
import { sendSlackNotification } from "@/lib/slack";
import { supabase } from "@/lib/supabase";

// One-shot request submission — works with just SLACK_WEBHOOK_URL, no
// Slack App / bot token required, unlike the live chat flow.
export async function POST(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, message, orderNumber, category } = await request.json();
  const text = String(message ?? "").trim();
  if (!text) return NextResponse.json({ error: "Please describe your request." }, { status: 400 });

  const user = await getUserById(userId);
  const id = `sc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  await supabase.from("support_chats").insert({
    id, user_id: userId, kind: "request", status: "open",
    category: category || "general", subject: subject || null,
  });
  await supabase.from("support_messages").insert({ chat_id: id, sender: "user", body: text });

  await sendSlackNotification(`📝 New support request — ${user?.name ?? userId}`, {
    Email: user?.email ?? "—",
    Subject: subject || "—",
    "Order #": orderNumber || "—",
    Message: text,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
