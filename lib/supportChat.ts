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
  status: "open" | "handed_off" | "in_progress" | "resolved" | "closed";
  category: string;
  subject?: string | null;
  slackChannel?: string | null;
  slackThreadTs?: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapChat(r: Record<string, unknown>): SupportChat {
  return {
    id: r.id as string,
    userId: r.user_id as string,
    kind: r.kind as SupportChat["kind"],
    status: r.status as SupportChat["status"],
    category: (r.category as string) ?? "general",
    subject: (r.subject as string) ?? null,
    slackChannel: (r.slack_channel as string) ?? null,
    slackThreadTs: (r.slack_thread_ts as string) ?? null,
    createdAt: r.created_at as string,
    updatedAt: (r.updated_at as string) ?? (r.created_at as string),
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

/**
 * Closes a chat WITHOUT deleting it — supersedes the old wipeChat().
 * Rows now persist so they can show up in the Support Center's
 * "My Support Requests" history. Slack still holds the full transcript
 * independently, this just marks the app-side record as closed.
 */
export async function closeChat(chatId: string): Promise<void> {
  await supabase.from("support_chats").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", chatId);
}

export interface SupportListItem extends SupportChat {
  lastMessage?: string | null;
}

/** Paginated list of a user's support chats + requests, newest first, for the Support Center table. */
export async function listForUser(
  userId: string,
  { page = 1, pageSize = 5 }: { page?: number; pageSize?: number } = {}
): Promise<{ items: SupportListItem[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from("support_chats")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .range(from, to);

  const items = (data ?? []).map((r) => mapChat(r as Record<string, unknown>));
  return { items, total: count ?? 0 };
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
