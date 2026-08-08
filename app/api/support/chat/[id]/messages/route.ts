import { NextRequest, NextResponse } from "next/server";
import { getChat, getMessages, addMessage } from "@/lib/supportChat";

type Params = { params: Promise<{ id: string }> };

// Client polls this every few seconds while a ticket is open to pick up
// whatever the support team has replied in the admin Support Center.
export async function GET(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const chat = await getChat(id, userId);
  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });

  const messages = await getMessages(id);
  return NextResponse.json({ chat, messages });
}

export async function POST(request: NextRequest, { params }: Params) {
  const userId = request.cookies.get("user_id")?.value;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const chat = await getChat(id, userId);
  if (!chat) return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  if (chat.status === "closed")
    return NextResponse.json({ error: "This chat has been closed. Start a new one." }, { status: 410 });

  const { body } = await request.json();
  const text = String(body ?? "").trim();
  if (!text) return NextResponse.json({ error: "Message required" }, { status: 400 });

  await addMessage(id, "user", text);

  if (chat.status === "open") {
    // First substantive reply from the client = the "reason" for contacting
    // support. Logged as a ticket for the admin Support Center to pick up —
    // for anything urgent, the Tawk chat bubble in the corner reaches a live
    // agent immediately.
    await addMessage(
      id,
      "bot",
      "Thanks — this has been logged for our support team and they'll reply right here. For a live conversation right now, use the chat bubble in the corner."
    );
  }

  const [messages, fresh] = await Promise.all([getMessages(id), getChat(id, userId)]);
  return NextResponse.json({ chat: fresh, messages });
}
