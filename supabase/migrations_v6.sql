-- migrations_v6.sql — run in Supabase SQL editor
-- Fix: background check status not persisting after refresh.
-- Root cause: these columns were introduced in migrations_v3.sql — if that file
-- was never run against production, the UPDATE silently failed. Idempotent, safe to re-run.

alter table users add column if not exists background_check_status text not null default 'not_started';
alter table users add column if not exists background_check_notes  text default '';
alter table users add column if not exists background_check_updated_at timestamptz;

-- reviews table (vendor → agent feedback), in case migrations_v3 wasn't applied either
create extension if not exists "uuid-ossp";
create table if not exists reviews (
  id          text primary key default ('rev-' || substr(uuid_generate_v4()::text,1,8)),
  order_id    text not null references orders(id) on delete cascade,
  client_id   text not null references users(id) on delete cascade,
  agent_id    text not null references users(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text default '',
  created_at  timestamptz not null default now(),
  unique(order_id)
);
create index if not exists idx_reviews_agent on reviews(agent_id);
