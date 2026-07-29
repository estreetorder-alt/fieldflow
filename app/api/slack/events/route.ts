import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature, postToSupportChannel } from "@/lib/slackBot";
import { findChatByThreadTs, addMessage, wipeChat } from "@/lib/supportChat";

// Point your Slack App's Event Subscriptions request URL here:
//   https://your-domain.com/api/slack/events
// Subscribe to the bot event "message.channels" (public channel) or
// "message.groups" (private channel).
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");

  if (!verifySlackSignature(rawBody, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  // One-time endpoint verification handshake when you first save the URL in Slack.
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload.type === "event_callback") {
    const event = payload.event;
    // Only plain, in-thread human messages — skips our own bot posts,
    // edits/deletes, channel joins, etc.
    if (event?.type === "message" && !event.subtype && !event.bot_id && event.thread_ts) {
      const chat = await findChatByThreadTs(event.thread_ts);
      if (chat) {
        const text = String(event.text ?? "").trim();
        if (text.toLowerCase() === "/close") {
          await postToSupportChannel("Chat closed by support agent. ✅", event.thread_ts);
          await wipeChat(chat.id);
        } else if (text) {
          await addMessage(chat.id, "agent", text);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
