-- ═══════════════════════════════════════════════════════════════
-- Migration v5 — Photo review workflow
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1) Photos now require admin approval before vendors see them.
--    Existing photos default to approved (already visible).
alter table photos add column if not exists approved boolean not null default true;

-- 2) Photo submissions — agent "open form" uploads reviewed by admin
create table if not exists photo_submissions (
  id           text primary key,
  agent_id     text not null references users(id) on delete cascade,
  order_id     text references orders(id) on delete set null,
  service_name text default '',
  photos       jsonb not null default '[]',
  status       text not null default 'pending', -- pending | sent | dismissed
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

create index if not exists idx_photo_submissions_status on photo_submissions(status);
create index if not exists idx_photo_submissions_agent on photo_submissions(agent_id);

-- 3) Storage bucket for photo files (public read).
--    If this insert errors, create it manually: Dashboard → Storage → New bucket → name "photos", Public.
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Allow the service role full access (API uses the service key, so this is usually already covered)
-- and public read of photo files:
do $$ begin
  create policy "public read photos" on storage.objects
    for select using (bucket_id = 'photos');
exception when duplicate_object then null; end $$;
