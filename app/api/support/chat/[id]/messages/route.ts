import { NextRequest, NextResponse } from "next/server";
import { getChat, getMessages, addMessage, handOffToSlack } from "@/lib/supportChat";
import { getUserById } from "@/lib/db";
import { postToSupportChannel, isSlackBotConfigured } from "@/lib/slackBot";

type Params = { params: Promise<{ id: string }> };

// Client polls this every few seconds while a chat is open to pick up
// whatever the support agent has typed back in the Slack thread.
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
    // support. Forward the whole thing to Slack as a new thread right away.
    if (!isSlackBotConfigured()) {
      await addMessage(
        id,
        "bot",
        "Live chat isn't fully set up yet on our end — please use \"Submit a request\" instead and we'll follow up by email."
      );
    } else {
      const user = await getUserById(userId);
      const header = `🆘 *New support chat* — ${user?.name ?? userId} (${user?.email ?? "no email on file"})`;
      const { ok, ts } = await postToSupportChannel(`${header}\n\n${text}`);
      if (ok && ts) {
        await handOffToSlack(id, ts);
        await addMessage(id, "bot", "Thanks — I've brought in our support team, they'll reply right here.");
      } else {
        await addMessage(id, "bot", "Sorry, I couldn't reach our support team just now. Please try \"Submit a request\" instead.");
      }
    }
  } else if (isSlackBotConfigured() && chat.slackThreadTs) {
    // Already handed off — relay straight into the existing Slack thread.
    await postToSupportChannel(text, chat.slackThreadTs);
  }

  const [messages, fresh] = await Promise.all([getMessages(id), getChat(id, userId)]);
  return NextResponse.json({ chat: fresh, messages });
}
