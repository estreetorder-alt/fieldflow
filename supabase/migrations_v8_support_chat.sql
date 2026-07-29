-- ============================================================
-- FieldFlow / Snapect — migrations_v8
-- Support widget: scripted AI greeter -> live Slack handoff,
-- plus a simple "submit a request" fire-and-forget form.
--
-- Run in Supabase SQL Editor AFTER migrations_v7_wallet_billing.
-- Safe to re-run (IF NOT EXISTS).
--
-- Design notes:
--   • Live chats are intentionally ephemeral. Once either side closes
--     the chat, the app-side rows are deleted outright — the Slack
--     thread itself is left alone as the permanent record (per your
--     choice: "wipe app only — keep Slack as the permanent record").
--   • "request" kind rows are a single one-shot submission, posted to
--     Slack via the existing incoming webhook — no live back-and-forth.
-- ============================================================

create table if not exists support_chats (
  id               text primary key default ('sc-' || substr(uuid_generate_v4()::text, 1, 10)),
  user_id          text not null references users(id) on delete cascade,
  kind             text not null default 'chat' check (kind in ('chat','request')),
  status           text not null default 'open' check (status in ('open','handed_off','closed')),
  subject          text,
  slack_channel    text,
  slack_thread_ts  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_support_chats_user on support_chats(user_id, created_at desc);
create unique index if not exists idx_support_chats_thread on support_chats(slack_thread_ts) where slack_thread_ts is not null;
alter table support_chats enable row level security;
do $$ begin
  create policy "service role full access" on support_chats for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

create table if not exists support_messages (
  id          bigserial primary key,
  chat_id     text not null references support_chats(id) on delete cascade,
  sender      text not null check (sender in ('user','bot','agent')),
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_support_messages_chat on support_messages(chat_id, created_at);
alter table support_messages enable row level security;
do $$ begin
  create policy "service role full access" on support_messages for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- ============================================================
-- Done. Next: set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET,
-- SLACK_SUPPORT_CHANNEL_ID and point your Slack App's Event
-- Subscriptions request URL at:
--   https://your-domain.com/api/slack/events
-- ============================================================
