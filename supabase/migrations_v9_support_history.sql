-- ============================================================
-- FieldFlow / Snapect — migrations_v9
-- Support Center: persistent request/chat history.
--
-- Supersedes the v8 "wipe app-side rows on close" design.
-- Ben's call (per chat, 2026-07-29): keep full history visible
-- in the "My Support Requests" table — do not delete rows when
-- a chat or request is closed. Slack remains the record for the
-- live back-and-forth, but the app now also keeps its own copy.
--
-- Run in Supabase SQL Editor AFTER migrations_v8_support_chat.
-- Safe to re-run (IF NOT EXISTS / guarded ALTERs).
-- ============================================================

-- Add a lifecycle beyond open/handed_off/closed, and a category
-- so the Support Center table can show a "Type" column
-- (Order Issue, Payment, Billing, Coverage, Technical, General).
alter table support_chats drop constraint if exists support_chats_status_check;
alter table support_chats add constraint support_chats_status_check
  check (status in ('open', 'handed_off', 'in_progress', 'resolved', 'closed'));

alter table support_chats add column if not exists category text not null default 'general';

-- New "request" submissions should start visible as open, not
-- pre-closed — v8's request route set status='closed' immediately
-- since nothing else read it back. It now needs to stay 'open'
-- until someone (agent, or a future admin action) resolves it.
-- No backfill needed — this only affects rows created going forward.

-- ============================================================
-- Done. Reminder: the close endpoint no longer deletes rows —
-- it just flips status to 'closed'. If you want old rows from
-- before this migration purged, that's a manual decision, not
-- something this migration does automatically.
-- ============================================================
