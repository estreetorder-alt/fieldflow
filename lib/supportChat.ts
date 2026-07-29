import { supabase } from "@/lib/supabase";

export interface SupportMessage {
  id: number;
  chatId: string;
  sender: "user" | "bot" | "agent";
  body: string;
  createdAt: string;
}

export interface SupportChat {
  id: string;
  userId: string;
  kind: "chat" | "request";
  status: "open" | "handed_off" | "closed";
  subject?: string | null;
  slackChannel?: string | null;
  slackThreadTs?: string | null;
  createdAt: string;
}

function mapChat(r: Record<string, unknown>): SupportChat {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    kind: r.kind as SupportChat["kind"],
    status: r.status as SupportChat["status"],
    subject: (r.subject as string) ?? null,
    slackChannel: (r.slack_channel as string) ?? null,
    slackThreadTs: (r.slack_thread_ts as string) ?? null,
    createdAt: r.created_at as string,
  };
}

function mapMessage(r: Record<string, unknown>): SupportMessage {
  return {
    id: r.id as number,
    chatId: r.chat_id as string,
    sender: r.sender as SupportMessage["sender"],
    body: r.body as string,
    createdAt: r.created_at as string,
  };
}

const GREETING =
  "Hi! 👋 I'm the Snapect support bot. What can we help you with today? Give me a quick summary and I'll bring in a member of our team.";

export async function startChat(userId: string): Promise<{ chat: SupportChat; messages: SupportMessage[] }> {
  const id = `sc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  await supabase.from("support_chats").insert({ id, user_id: userId, kind: "chat", status: "open" });
  await supabase.from("support_messages").insert({ chat_id: id, sender: "bot", body: GREETING });
  const chat = await getChat(id, userId);
  const messages = await getMessages(id);
  return { chat: chat!, messages };
}

export async function getChat(chatId: string, userId?: string): Promise<SupportChat | null> {
  let q = supabase.from("support_chats").select("*").eq("id", chatId);
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q.single();
  return data ? mapChat(data as Record<string, unknown>) : null;
}

export async function getMessages(chatId: string): Promise<SupportMessage[]> {
  const { data } = await supabase
    .from("support_messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => mapMessage(r as Record<string, unknown>));
}

export async function addMessage(chatId: string, sender: SupportMessage["sender"], body: string): Promise<void> {
  await supabase.from("support_messages").insert({ chat_id: chatId, sender, body });
}

/** Wipes a chat from the app's side only. Slack keeps its own copy of the thread. */
export async function wipeChat(chatId: string): Promise<void> {
  await supabase.from("support_messages").delete().eq("chat_id", chatId);
  await supabase.from("support_chats").delete().eq("id", chatId);
}

export async function findChatByThreadTs(threadTs: string): Promise<SupportChat | null> {
  const { data } = await supabase
    .from("support_chats")
    .select("*")
    .eq("slack_thread_ts", threadTs)
    .neq("status", "closed")
    .maybeSingle();
  return data ? mapChat(data as Record<string, unknown>) : null;
}

export async function handOffToSlack(chatId: string, threadTs: string): Promise<void> {
  await supabase
    .from("support_chats")
    .update({
      status: "handed_off",
      slack_thread_ts: threadTs,
      slack_channel: process.env.SLACK_SUPPORT_CHANNEL_ID ?? null,
    })
    .eq("id", chatId);
}
