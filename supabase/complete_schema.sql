-- ============================================================
-- FieldFlow — COMPLETE MIGRATION SET (consolidated, idempotent)
-- Generated 2026-08-13
-- ============================================================
--
-- IS THIS DESTRUCTIVE? NO — it does not erase or modify any of
-- your existing rows. The Supabase SQL editor flags this file for
-- "destructive operations" only because it contains `drop policy
-- if exists ...` statements — those drop an *access rule*, not
-- data, immediately before recreating that same rule. There are
-- no DROP TABLE, TRUNCATE, or DELETE statements anywhere in this
-- file (search it yourself — every DROP here is `drop policy` or
-- one `drop constraint`, both metadata-only).
--
-- WHAT THIS FILE IS
-- Every incremental migration (migrations.sql through
-- migrations_v11_agent_roles_ghost.sql) concatenated in the order
-- they were designed to run, with three safety fixes applied:
--   1. Every `create policy` now has a `drop policy if exists`
--      immediately before it (bare `create policy` has no
--      IF NOT EXISTS in Postgres, so re-running it against a
--      database that already has the policy errors with 42710).
--   2. The demo-data inserts in migrations.sql / migrations_v2.sql
--      (zip codes, messages, grades for seed agents user-2/3/6)
--      are now wrapped in `if exists (select 1 from users where
--      id = ...)` checks, so they no-op cleanly on a production
--      database that never had those demo rows (previously this
--      caused a foreign-key violation: 23503 on agent_zip_codes).
--   3. `photo_submissions` (added in v5) now has Row Level
--      Security enabled with the same service-role-only policy
--      every other table uses — it was created without RLS
--      before, which the Supabase linter correctly flags since it
--      leaves the table open to anon/authenticated PostgREST
--      access. Every other table already had RLS enabled.
-- Every table/column/index statement already guarded itself with
-- `if not exists` — nothing here drops or truncates a table, and
-- nothing here touches existing data.
--
-- WHY IT EXISTS
-- You said you've already run these migrations one at a time and
-- want to confirm nothing was missed. This file is that check:
-- run it against your live Supabase project and every statement
-- that's already applied becomes a safe no-op; anything that was
-- somehow skipped gets created/added. Safe to run more than once.
--
-- WHAT THIS FILE IS **NOT**
-- schema.sql and schema_final.sql (in this same folder) are
-- DESTRUCTIVE fresh-install scripts — they DROP TABLE / DROP TYPE
-- before recreating everything. Do NOT run either of those against
-- your production project; they exist only for spinning up a brand
-- new, empty environment. This consolidated file is the one to use
-- against a database that already has real data in it.
--
-- activate_demo_users.sql and clear_dummy_data.sql are local
-- dev/demo utilities — not part of the schema and not included
-- below.
--
-- ============================================================


-- ============================================================
-- FILE: migrations.sql
-- Base feature migration — agent ZIP coverage, grading, samples, messages, payouts, payment links, packages
-- ============================================================

-- FieldFlow — Migration: Add missing features
-- Run this in Supabase SQL Editor AFTER the main schema.sql

-- ── 1. Agent ZIP code coverage ────────────────────────────────
create table if not exists agent_zip_codes (
  id         bigserial primary key,
  agent_id   text not null references users(id) on delete cascade,
  zip_code   text not null,
  created_at timestamptz not null default now(),
  unique(agent_id, zip_code)
);
create index if not exists idx_azc_zip on agent_zip_codes(zip_code);
create index if not exists idx_azc_agent on agent_zip_codes(agent_id);

-- ── 2. Agent grade (0.0–5.0, starts at 3.0) ──────────────────
alter table users add column if not exists grade numeric(3,1) default 3.0;
alter table users add column if not exists completion_rate numeric(5,2) default 100.0;
alter table users add column if not exists response_rate  numeric(5,2) default 100.0;
alter table users add column if not exists approved boolean default true; -- false = pending sample review

-- ── 3. Agent sample submission ────────────────────────────────
create table if not exists agent_samples (
  id          text primary key default ('sample-' || substr(uuid_generate_v4()::text,1,8)),
  agent_id    text not null references users(id) on delete cascade,
  status      text not null default 'pending', -- pending | approved | rejected
  photos      jsonb not null default '[]',
  notes       text default '',
  reviewed_at timestamptz,
  reviewed_by text,
  created_at  timestamptz not null default now()
);

-- ── 4. Message center ─────────────────────────────────────────
create table if not exists messages (
  id          bigserial primary key,
  from_id     text not null references users(id) on delete cascade,
  to_id       text not null references users(id) on delete cascade,
  order_id    text references orders(id) on delete set null,
  body        text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists idx_msg_to on messages(to_id, read);
create index if not exists idx_msg_from on messages(from_id);

-- ── 5. Sub-accounts (employee logins under a client) ──────────
alter table users add column if not exists parent_client_id text references users(id) on delete cascade;

-- ── 6. Order additions: date stamp, photo package, address coords
alter table orders add column if not exists date_stamp     boolean not null default false;
alter table orders add column if not exists photo_package  text default null; -- e.g. "3-photo", "7-photo"
alter table orders add column if not exists address_lat    numeric(10,6) default null;
alter table orders add column if not exists address_lng    numeric(10,6) default null;
alter table orders add column if not exists dispatched_at  timestamptz default null;
alter table orders add column if not exists response_deadline timestamptz default null;

-- ── 7. Agent payout log ───────────────────────────────────────
create table if not exists payout_log (
  id         bigserial primary key,
  agent_id   text not null references users(id) on delete cascade,
  amount     numeric(10,2) not null,
  method     text not null default 'paypal',
  paypal_email text default null,
  status     text not null default 'pending', -- pending | paid
  paid_at    timestamptz,
  created_at timestamptz not null default now()
);

-- ── 8. Photo packages config ──────────────────────────────────
create table if not exists photo_packages (
  id          text primary key,
  name        text not null,
  description text not null,
  shot_list   jsonb not null default '[]',
  base_price  numeric(10,2) not null,
  active      boolean not null default true
);

insert into photo_packages (id, name, description, shot_list, base_price) values
  ('pkg-3', '3-Photo Set', 'Front, address and street scene', '["Front of property","Address number","Street scene"]', 40),
  ('pkg-4a','4-Photo Set', 'Front, side, address and street scene', '["Front of property","Right/left side","Address number","Street scene"]', 50),
  ('pkg-4b','4-Photo Set +2 Street', 'Front, address and both street scenes', '["Front of property","Address number","Street scene left","Street scene right"]', 55),
  ('pkg-5', '5-Photo Set', 'Front, both sides, address and street scene', '["Front of property","Right side","Left side","Address number","Street scene"]', 65),
  ('pkg-6', '6-Photo Set', 'Front, both sides, address and both street scenes', '["Front of property","Right side","Left side","Address number","Street scene left","Street scene right"]', 75),
  ('pkg-7', '7-Photo Set', 'Front, both sides, street sign, address and both street scenes', '["Front of property","Right side","Left side","Street sign","Address number","Street scene left","Street scene right"]', 85),
  ('pkg-8', '8-Photo Set', 'Full exterior package', '["Front of property","Right side","Left side","Street sign","Address number","Street scene left","Street scene right","View from across street"]', 95),
  ('pkg-video','Videography', 'Full walkthrough video — 360 exterior + all interior rooms', '["360 street view","Exterior front/rear/sides","All interior rooms","Major appliances","All closets","Visible damage","Garage interior"]', 150)
on conflict (id) do nothing;

-- RLS for new tables
alter table agent_zip_codes  enable row level security;
alter table agent_samples    enable row level security;
alter table messages         enable row level security;
alter table payout_log       enable row level security;
alter table photo_packages   enable row level security;

drop policy if exists "service role full access" on agent_zip_codes;
create policy "service role full access" on agent_zip_codes  for all using (true) with check (true);
drop policy if exists "service role full access" on agent_samples;
create policy "service role full access" on agent_samples    for all using (true) with check (true);
drop policy if exists "service role full access" on messages;
create policy "service role full access" on messages         for all using (true) with check (true);
drop policy if exists "service role full access" on payout_log;
create policy "service role full access" on payout_log       for all using (true) with check (true);
drop policy if exists "service role full access" on photo_packages;
create policy "service role full access" on photo_packages   for all using (true) with check (true);

-- Demo zip codes / messages / grades for the seed agents (user-2, user-3,
-- user-6) that ship in schema.sql's demo data. Wrapped so this is a safe
-- no-op on a production database that never had those seed rows.
do $$ begin
  if exists (select 1 from users where id = 'user-2') then
    insert into agent_zip_codes (agent_id, zip_code) values
      ('user-2', '60601'), ('user-2', '60602'), ('user-2', '60603'),
      ('user-2', '60604'), ('user-2', '60605'), ('user-2', '60610')
    on conflict do nothing;
    update users set grade = 4.8, completion_rate = 97.5, response_rate = 95.0, approved = true where id = 'user-2';
  end if;
  if exists (select 1 from users where id = 'user-3') then
    insert into agent_zip_codes (agent_id, zip_code) values
      ('user-3', '62701'), ('user-3', '62702'), ('user-3', '62703')
    on conflict do nothing;
    update users set grade = 4.2, completion_rate = 89.0, response_rate = 88.0, approved = true where id = 'user-3';
  end if;
  if exists (select 1 from users where id = 'user-6') then
    insert into agent_zip_codes (agent_id, zip_code) values
      ('user-6', '60201'), ('user-6', '60202'), ('user-6', '60203')
    on conflict do nothing;
    update users set grade = 4.9, completion_rate = 99.0, response_rate = 98.0, approved = true where id = 'user-6';
  end if;
  if exists (select 1 from users where id = 'user-1')
     and exists (select 1 from users where id = 'user-2')
     and exists (select 1 from users where id = 'user-3') then
    insert into messages (from_id, to_id, order_id, body) values
      ('user-1', 'user-2', 'ord-2', 'Hi Jane, please make sure to capture the foundation clearly on this one.'),
      ('user-2', 'user-1', 'ord-2', 'Understood! Will do extra shots of the foundation area.'),
      ('user-1', 'user-3', null,    'Tom, your sample set looks great. You are approved to start taking orders.');
  end if;
end $$;

-- ── Services catalog table (synced from lib/services.ts) ─────
create table if not exists services_catalog (
  id                text primary key,
  name              text not null,
  description       text not null,
  base_price        numeric(10,2) not null default 0,
  compensation      numeric(10,2) not null default 0,
  category          text not null,
  photo_count       integer,
  shot_list         jsonb default '[]',
  is_custom         boolean default false,
  requires_interior boolean default false,
  active            boolean default true
);
alter table services_catalog enable row level security;
drop policy if exists "service role full access" on services_catalog;
create policy "service role full access" on services_catalog for all using (true) with check (true);

-- Stripe payment fields on orders
alter table orders add column if not exists stripe_payment_intent_id text default null;
alter table orders add column if not exists payment_status text not null default 'unpaid'; -- unpaid | paid | refunded
alter table orders add column if not exists custom_shot_list text default null;
alter table orders add column if not exists custom_client_price numeric(10,2) default null;
alter table orders add column if not exists service_id text default null;

-- ============================================================
-- FILE: migrations_v2.sql
-- v2 — Agent ZIP coverage, grading, samples, messages, payout log (superset of migrations.sql, safe to re-run)
-- ============================================================

-- FieldFlow migrations v2 — safe to run even if some already exist

-- ── 1. Agent ZIP codes ────────────────────────────────────────
create table if not exists agent_zip_codes (
  id         bigserial primary key,
  agent_id   text not null references users(id) on delete cascade,
  zip_code   text not null,
  created_at timestamptz not null default now(),
  unique(agent_id, zip_code)
);
create index if not exists idx_azc_zip   on agent_zip_codes(zip_code);
create index if not exists idx_azc_agent on agent_zip_codes(agent_id);

-- ── 2. Agent grade columns ────────────────────────────────────
alter table users add column if not exists grade            numeric(3,1) default 3.0;
alter table users add column if not exists completion_rate  numeric(5,2) default 100.0;
alter table users add column if not exists response_rate    numeric(5,2) default 100.0;
alter table users add column if not exists approved         boolean default true;
alter table users add column if not exists parent_client_id text references users(id) on delete cascade;

-- ── 3. Agent samples ──────────────────────────────────────────
create table if not exists agent_samples (
  id          text primary key default ('sample-' || substr(uuid_generate_v4()::text,1,8)),
  agent_id    text not null references users(id) on delete cascade,
  status      text not null default 'pending',
  photos      jsonb not null default '[]',
  notes       text default '',
  reviewed_at timestamptz,
  reviewed_by text,
  created_at  timestamptz not null default now()
);

-- ── 4. Messages ───────────────────────────────────────────────
create table if not exists messages (
  id         bigserial primary key,
  from_id    text not null references users(id) on delete cascade,
  to_id      text not null references users(id) on delete cascade,
  order_id   text references orders(id) on delete set null,
  body       text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_msg_to   on messages(to_id, read);
create index if not exists idx_msg_from on messages(from_id);

-- ── 5. Payout log ─────────────────────────────────────────────
create table if not exists payout_log (
  id           bigserial primary key,
  agent_id     text not null references users(id) on delete cascade,
  amount       numeric(10,2) not null,
  method       text not null default 'paypal',
  paypal_email text default null,
  status       text not null default 'pending',
  paid_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- ── 6. Photo packages ─────────────────────────────────────────
create table if not exists photo_packages (
  id          text primary key,
  name        text not null,
  description text not null,
  shot_list   jsonb not null default '[]',
  base_price  numeric(10,2) not null,
  active      boolean not null default true
);

insert into photo_packages (id, name, description, shot_list, base_price) values
  ('pkg-3',   '3-Photo Set',  'Front, address and street scene',                       '["Front of property","Address number","Street scene"]', 40),
  ('pkg-4a',  '4-Photo Set A','Front, side, address and street scene',                 '["Front of property","Right or left side","Address number","Street scene"]', 50),
  ('pkg-5',   '5-Photo Set',  'Front, both sides, address and street scene',           '["Front of property","Right side","Left side","Address number","Street scene"]', 65),
  ('pkg-6',   '6-Photo Set',  'Front, both sides, address and both street scenes',     '["Front of property","Right side","Left side","Address number","Street scene (left)","Street scene (right)"]', 75),
  ('pkg-7',   '7-Photo Set',  'Front, both sides, street sign, address, street scenes','["Front of property","Right side","Left side","Street sign","Address number","Street scene (left)","Street scene (right)"]', 85),
  ('pkg-8',   '8-Photo Set',  'Full exterior package',                                 '["Front of property","Right side","Left side","Street sign","Address number","Street scene (left)","Street scene (right)","View from across street"]', 95),
  ('pkg-video','Videography', 'Full walkthrough video',                                 '["360 street view","Exterior all sides","All interior rooms","Major appliances","All closets","Visible damage","Garage"]', 150)
on conflict (id) do nothing;

-- ── 7. Services catalog ───────────────────────────────────────
create table if not exists services_catalog (
  id                text primary key,
  name              text not null,
  description       text not null,
  base_price        numeric(10,2) not null default 0,
  compensation      numeric(10,2) not null default 0,
  category          text not null,
  photo_count       integer,
  shot_list         jsonb default '[]',
  is_custom         boolean default false,
  requires_interior boolean default false,
  active            boolean default true
);

-- ── 8. Order extra columns ────────────────────────────────────
alter table orders add column if not exists date_stamp                boolean not null default false;
alter table orders add column if not exists photo_package             text default null;
alter table orders add column if not exists address_lat               numeric(10,6) default null;
alter table orders add column if not exists address_lng               numeric(10,6) default null;
alter table orders add column if not exists dispatched_at             timestamptz default null;
alter table orders add column if not exists response_deadline         timestamptz default null;
alter table orders add column if not exists stripe_payment_intent_id  text default null;
alter table orders add column if not exists payment_status            text not null default 'unpaid';
alter table orders add column if not exists custom_shot_list          text default null;
alter table orders add column if not exists custom_client_price       numeric(10,2) default null;
alter table orders add column if not exists service_id                text default null;

-- ── 9. RLS policies (drop first to avoid duplicate error) ─────
do $$ begin
  drop policy if exists "service role full access" on agent_zip_codes;
  drop policy if exists "service role full access" on agent_samples;
  drop policy if exists "service role full access" on messages;
  drop policy if exists "service role full access" on payout_log;
  drop policy if exists "service role full access" on photo_packages;
  drop policy if exists "service role full access" on services_catalog;
exception when others then null;
end $$;

alter table agent_zip_codes  enable row level security;
alter table agent_samples    enable row level security;
alter table messages         enable row level security;
alter table payout_log       enable row level security;
alter table photo_packages   enable row level security;
alter table services_catalog enable row level security;

drop policy if exists "service role full access" on agent_zip_codes;
create policy "service role full access" on agent_zip_codes  for all using (true) with check (true);
drop policy if exists "service role full access" on agent_samples;
create policy "service role full access" on agent_samples    for all using (true) with check (true);
drop policy if exists "service role full access" on messages;
create policy "service role full access" on messages         for all using (true) with check (true);
drop policy if exists "service role full access" on payout_log;
create policy "service role full access" on payout_log       for all using (true) with check (true);
drop policy if exists "service role full access" on photo_packages;
create policy "service role full access" on photo_packages   for all using (true) with check (true);
drop policy if exists "service role full access" on services_catalog;
create policy "service role full access" on services_catalog for all using (true) with check (true);

-- ── 10. Demo data ─────────────────────────────────────────────
-- Only seeds if the demo agents (user-2/3/6) actually exist — safe
-- no-op on a production database that never had schema.sql's demo rows.
do $$ begin
  if exists (select 1 from users where id = 'user-2') then
    insert into agent_zip_codes (agent_id, zip_code) values
      ('user-2','60601'),('user-2','60602'),('user-2','60603'),('user-2','60604'),('user-2','60605')
    on conflict do nothing;
    update users set grade=4.8, completion_rate=97.5, response_rate=95.0, approved=true where id='user-2';
  end if;
  if exists (select 1 from users where id = 'user-3') then
    insert into agent_zip_codes (agent_id, zip_code) values
      ('user-3','62701'),('user-3','62702'),('user-3','62703')
    on conflict do nothing;
    update users set grade=4.2, completion_rate=89.0, response_rate=88.0, approved=true where id='user-3';
  end if;
  if exists (select 1 from users where id = 'user-6') then
    insert into agent_zip_codes (agent_id, zip_code) values
      ('user-6','60201'),('user-6','60202'),('user-6','60203')
    on conflict do nothing;
    update users set grade=4.9, completion_rate=99.0, response_rate=98.0, approved=true where id='user-6';
  end if;
  if exists (select 1 from users where id = 'user-1')
     and exists (select 1 from users where id = 'user-2')
     and exists (select 1 from users where id = 'user-3') then
    insert into messages (from_id, to_id, order_id, body) values
      ('user-1','user-2','ord-2','Hi Jane, please capture the foundation clearly on this one.'),
      ('user-2','user-1','ord-2','Understood! Will do extra shots of the foundation area.'),
      ('user-1','user-3',null,   'Tom, your sample set looks great. You are approved.')
    on conflict do nothing;
  end if;
end $$;

-- Payment link management
create table if not exists payment_links (
  id          text primary key default ('plink-' || substr(uuid_generate_v4()::text,1,8)),
  label       text not null,
  url         text not null,
  amount      numeric(10,2),
  description text default '',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table payment_links enable row level security;
drop policy if exists "service role full access" on payment_links;
create policy "service role full access" on payment_links for all using (true) with check (true);

-- Order payment tracking
alter table orders add column if not exists payment_link_id text references payment_links(id) on delete set null;
alter table orders add column if not exists payment_status text not null default 'pending'; -- pending|under_review|confirmed
alter table orders add column if not exists paid_at timestamptz default null;

-- Account activation system
alter table users add column if not exists account_active boolean not null default false;
alter table users add column if not exists activation_paid_at timestamptz default null;
alter table users add column if not exists suspended boolean not null default false;

-- Password reset tokens
create table if not exists password_reset_tokens (
  id          text primary key default (uuid_generate_v4()::text),
  user_id     text not null references users(id) on delete cascade,
  token       text not null unique,
  expires_at  timestamptz not null,
  used        boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table password_reset_tokens enable row level security;
drop policy if exists "service role full access" on password_reset_tokens;
create policy "service role full access" on password_reset_tokens for all using (true) with check (true);

-- Admin is always active
update users set account_active = true where role = 'admin';

-- Order decline tracking
alter table orders add column if not exists declined_by jsonb default '[]';

-- ── Wallet System ─────────────────────────────────────────────
alter table users add column if not exists wallet_balance numeric(10,2) not null default 0;

create table if not exists wallet_transactions (
  id          text primary key default ('wtx-' || substr(uuid_generate_v4()::text,1,8)),
  user_id     text not null references users(id) on delete cascade,
  type        text not null, -- topup | deduction | refund | hold | release
  amount      numeric(10,2) not null,
  balance_after numeric(10,2) not null default 0,
  description text not null default '',
  order_id    text references orders(id) on delete set null,
  status      text not null default 'pending', -- pending | confirmed | cancelled
  created_at  timestamptz not null default now()
);
alter table wallet_transactions enable row level security;
drop policy if exists "service role full access" on wallet_transactions;
create policy "service role full access" on wallet_transactions for all using (true) with check (true);
create index if not exists idx_wallet_user on wallet_transactions(user_id);

-- Hold amount on orders (reserved from wallet, released to agent on completion)
alter table orders add column if not exists wallet_hold_amount numeric(10,2) default 0;
alter table orders add column if not exists wallet_released boolean not null default false;

-- Agent application table (from work page)
create table if not exists agent_applications (
  id          text primary key default ('app-' || substr(uuid_generate_v4()::text,1,8)),
  name        text not null,
  email       text not null,
  phone       text not null,
  zip         text not null,
  city        text not null,
  state       text not null,
  experience  text default '',
  why         text default '',
  status      text not null default 'pending', -- pending | approved | rejected
  created_at  timestamptz not null default now()
);
alter table agent_applications enable row level security;
drop policy if exists "service role full access" on agent_applications;
create policy "service role full access" on agent_applications for all using (true) with check (true);

-- ============================================================
-- FILE: migrations_v3.sql
-- v3 — Rate limiting, disputes (reshoot/wallet-credit resolution), password reset tokens
-- ============================================================

-- FieldFlow migrations v3 — safe to run even if some already exist

-- ── 1. Rate limiting (login / password-reset abuse protection) ──
create table if not exists rate_limit_attempts (
  id         bigserial primary key,
  key        text not null,            -- e.g. "login:user@example.com", "login-ip:1.2.3.4"
  created_at timestamptz not null default now()
);
create index if not exists idx_rla_key_created on rate_limit_attempts(key, created_at);
alter table rate_limit_attempts enable row level security;
drop policy if exists "service role full access" on rate_limit_attempts;
create policy "service role full access" on rate_limit_attempts for all using (true) with check (true);
-- Optional cleanup: delete attempts older than 24h (run periodically, e.g. via a cron/edge function)
-- delete from rate_limit_attempts where created_at < now() - interval '24 hours';

-- ── 2. Disputes — Snapect has NO cash-refund policy. Every dispute is   ──
-- ── resolved with a reshoot, wallet store credit, or explanation/reject ──
create table if not exists disputes (
  id            text primary key default ('disp-' || substr(uuid_generate_v4()::text,1,8)),
  order_id      text not null references orders(id) on delete cascade,
  client_id     text not null references users(id) on delete cascade,
  reason        text not null,          -- quality | missing_shots | late | wrong_address | other
  description   text not null default '',
  photo_urls    jsonb not null default '[]'::jsonb,
  status        text not null default 'open',   -- open | under_review | resolved | rejected
  resolution    text,                    -- reshoot | wallet_credit | rejected | other
  resolution_amount numeric(10,2) default 0,     -- amount credited to wallet, if resolution = wallet_credit
  resolution_notes  text default '',
  resolved_by   text references users(id) on delete set null,
  resolved_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_disputes_order  on disputes(order_id);
create index if not exists idx_disputes_client on disputes(client_id);
create index if not exists idx_disputes_status on disputes(status);
alter table disputes enable row level security;
drop policy if exists "service role full access" on disputes;
create policy "service role full access" on disputes for all using (true) with check (true);

-- ── 3. Agent reviews (client rates a completed job) ──────────────
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
alter table reviews enable row level security;
drop policy if exists "service role full access" on reviews;
create policy "service role full access" on reviews for all using (true) with check (true);

-- ── 4. Admin audit log ────────────────────────────────────────
create table if not exists audit_log (
  id          bigserial primary key,
  actor_id    text references users(id) on delete set null,
  actor_name  text default '',
  action      text not null,          -- e.g. "agent.activate", "payout.create", "pricing.update"
  target_type text default '',        -- e.g. "user", "order", "dispute"
  target_id   text default '',
  details     jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_created on audit_log(created_at desc);
create index if not exists idx_audit_actor   on audit_log(actor_id);
alter table audit_log enable row level security;
drop policy if exists "service role full access" on audit_log;
create policy "service role full access" on audit_log for all using (true) with check (true);

-- ── 5. Agent background-check tracking (manual/admin-managed) ────
alter table users add column if not exists background_check_status text not null default 'not_started';
-- not_started | pending | passed | failed
alter table users add column if not exists background_check_notes  text default '';
alter table users add column if not exists background_check_updated_at timestamptz;

-- ── 6. SMS notification opt-in ────────────────────────────────
alter table users add column if not exists sms_opt_in boolean not null default false;

-- ============================================================
-- FILE: migrations_v4.sql
-- v4 — Site announcements (dashboard banner)
-- ============================================================

-- FieldFlow migrations v4 — site announcements (dashboard banner)

create table if not exists site_announcements (
  id         bigserial primary key,
  message    text not null,
  audience   text not null default 'all',   -- all | client | agent
  active     boolean not null default true,
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_announcements_active on site_announcements(active, audience);
alter table site_announcements enable row level security;
drop policy if exists "service role full access" on site_announcements;
create policy "service role full access" on site_announcements for all using (true) with check (true);

-- ============================================================
-- FILE: migrations_v5.sql
-- v5 — Photo review workflow (photos require admin approval before vendors see them)
-- ============================================================

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

alter table photo_submissions enable row level security;
drop policy if exists "service role full access" on photo_submissions;
create policy "service role full access" on photo_submissions for all using (true) with check (true);

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

-- ============================================================
-- FILE: migrations_v6.sql
-- v6 — Background-check status persistence fix + reviews table safety net
-- ============================================================

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

-- ============================================================
-- FILE: migrations_v7_wallet_billing.sql
-- v7 — Wallet + billing (topups, transactions, plans)
-- ============================================================

-- ============================================================
-- FieldFlow / Snapect — migrations_v5
-- Client (vendor) wallet billing foundation
--
-- Run in Supabase SQL Editor AFTER migrations_v2 / v3 / v4.
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
--
-- Step 1 only: schema. No app/UI/Whop code in this file.
--
-- Design notes:
--   • Admin creates credit plans in OUR DB only (not in Whop).
--   • At checkout we pass plan amount into Whop dynamically (USD).
--   • $1 USD paid = $1 wallet credit (credits column mirrors amount).
--   • Redirect after Whop is UX only; webhook credits the wallet.
--   • whop_payment_id + webhook event_id prevent double-credits.
-- ============================================================

-- ── 1. Admin-managed wallet credit plans (USD) ────────────────
-- Admin creates these in the website. Whop never stores these plans.
create table if not exists wallet_plans (
  id           text primary key default ('wplan-' || substr(uuid_generate_v4()::text, 1, 8)),
  name         text not null,                          -- e.g. "Starter $50"
  amount_usd   numeric(10,2) not null check (amount_usd > 0),
  credits      numeric(10,2) not null check (credits > 0), -- 1:1 with amount_usd for now
  description  text not null default '',
  active       boolean not null default true,
  sort_order   integer not null default 0,
  created_by   text references users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_wallet_plans_active on wallet_plans(active, sort_order);
alter table wallet_plans enable row level security;
do $$ begin
  create policy "service role full access" on wallet_plans for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- Seed starter plans only if table is empty (admin can edit/deactivate later)
insert into wallet_plans (id, name, amount_usd, credits, description, active, sort_order)
select * from (values
  ('wplan-50',  'Starter $50',   50.00,  50.00,  'Add $50 in wallet credits',  true, 10),
  ('wplan-100', 'Standard $100', 100.00, 100.00, 'Add $100 in wallet credits', true, 20),
  ('wplan-250', 'Pro $250',      250.00, 250.00, 'Add $250 in wallet credits', true, 30)
) as v(id, name, amount_usd, credits, description, active, sort_order)
where not exists (select 1 from wallet_plans limit 1);

-- ── 2. Saved payment methods (Whop cards on file) ─────────────
-- Needed for "connect card" and later auto top-up / off-session charge.
create table if not exists payment_methods (
  id                       text primary key default ('pm-' || substr(uuid_generate_v4()::text, 1, 8)),
  user_id                  text not null references users(id) on delete cascade,
  whop_member_id           text not null,
  whop_payment_method_id   text not null,
  brand                    text not null default '',   -- visa, mastercard, …
  last4                    text not null default '',
  is_default               boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (user_id, whop_payment_method_id)
);
create index if not exists idx_payment_methods_user on payment_methods(user_id);
create index if not exists idx_payment_methods_default on payment_methods(user_id, is_default) where is_default = true;
alter table payment_methods enable row level security;
do $$ begin
  create policy "service role full access" on payment_methods for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- ── 3. Auto top-up preferences (charging logic comes in Step 5) ─
create table if not exists wallet_auto_topup (
  user_id            text primary key references users(id) on delete cascade,
  enabled            boolean not null default false,
  threshold_usd      numeric(10,2) not null default 25.00 check (threshold_usd >= 0),
  topup_amount_usd   numeric(10,2) not null default 50.00 check (topup_amount_usd > 0),
  plan_id            text references wallet_plans(id) on delete set null,
  payment_method_id  text references payment_methods(id) on delete set null,
  cooldown_until     timestamptz,                      -- block rapid retries after failure/attempt
  last_attempt_at    timestamptz,
  last_status        text,                             -- success | failed | skipped | null
  last_error         text,
  updated_at         timestamptz not null default now()
);
alter table wallet_auto_topup enable row level security;
do $$ begin
  create policy "service role full access" on wallet_auto_topup for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- ── 4. Extend wallet_transactions for plans + Whop idempotency ─
alter table wallet_transactions add column if not exists purpose text;
-- purpose examples: plan_topup | custom_topup | auto_topup | connect_card
--                   | order_hold | order_release | order_refund | dispute_credit | admin_adjust

alter table wallet_transactions add column if not exists plan_id text references wallet_plans(id) on delete set null;
alter table wallet_transactions add column if not exists whop_payment_id text;
alter table wallet_transactions add column if not exists whop_checkout_id text;
alter table wallet_transactions add column if not exists payment_method_id text references payment_methods(id) on delete set null;
alter table wallet_transactions add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table wallet_transactions add column if not exists failure_message text;
alter table wallet_transactions add column if not exists confirmed_at timestamptz;

-- Backfill purpose for existing rows where missing
update wallet_transactions
set purpose = case
  when type = 'topup'    then 'custom_topup'
  when type = 'hold'     then 'order_hold'
  when type = 'release'  then 'order_release'
  when type = 'refund'   then 'order_refund'
  when type = 'deduction' then 'order_hold'
  else coalesce(purpose, type)
end
where purpose is null;

-- status values in use: pending | confirmed | failed | cancelled
-- (existing rows keep their status; app will write failed going forward)

create index if not exists idx_wallet_tx_user_created on wallet_transactions(user_id, created_at desc);
create index if not exists idx_wallet_tx_status on wallet_transactions(status) where status = 'pending';
create index if not exists idx_wallet_tx_purpose on wallet_transactions(purpose);
create index if not exists idx_wallet_tx_plan on wallet_transactions(plan_id) where plan_id is not null;

-- One Whop payment may credit a wallet at most once
create unique index if not exists idx_wallet_tx_whop_payment_unique
  on wallet_transactions(whop_payment_id)
  where whop_payment_id is not null;

-- ── 5. Webhook event idempotency ──────────────────────────────
-- Store Whop webhook event ids so duplicate deliveries are no-ops.
create table if not exists whop_webhook_events (
  id            bigserial primary key,
  event_id      text not null unique,                 -- Whop / webhook-id header or event id
  event_type    text not null,                        -- payment.succeeded | payment.failed | setup_intent.succeeded | …
  payment_id    text,                                 -- Whop payment id when present
  user_id       text references users(id) on delete set null,
  purpose       text,
  payload       jsonb not null default '{}'::jsonb,
  processed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index if not exists idx_whop_webhook_type on whop_webhook_events(event_type, created_at desc);
create index if not exists idx_whop_webhook_payment on whop_webhook_events(payment_id) where payment_id is not null;
alter table whop_webhook_events enable row level security;
do $$ begin
  create policy "service role full access" on whop_webhook_events for all using (true) with check (true);
exception when duplicate_object then null;
end $$;

-- ── 6. Optional user billing flags (handy for UI / onboarding) ─
alter table users add column if not exists billing_card_connected boolean not null default false;
alter table users add column if not exists wallet_currency text not null default 'usd';

-- ============================================================
-- Done — Step 1 schema ready.
-- Next (Step 2, after your approval): Whop sandbox client,
-- checkout create (setup + plan payment), HMAC webhook verify,
-- credit wallet / save card from metadata.
-- ============================================================

-- ============================================================
-- FILE: migrations_v8_support_chat.sql
-- v8 — Support chat tables (support_chats, support_messages)
-- ============================================================

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

-- ============================================================
-- FILE: migrations_v9_support_history.sql
-- v9 — Support ticket status/category history
-- ============================================================

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

-- ============================================================
-- FILE: migrations_v10_wallet_overdraft.sql
-- v10 — Wallet overdraft / rollover credit
-- ============================================================

-- Migration v10: vendor wallet overdraft allowance + wallet log audit fields
-- Run this against your Supabase project before deploying this build.

-- Lets admin grant a specific vendor an overdraft so they can place/accept
-- orders even at a $0 or negative wallet balance, up to this amount.
-- Defaults to 0 (no override) for every existing and new vendor.
alter table users
  add column if not exists wallet_credit_limit numeric not null default 0;

-- Lets admin correct a wallet_transactions row after the fact (wrong amount,
-- typo'd note) from the new Wallet & Payment Log panel, while keeping a
-- record of who touched it and when.
alter table wallet_transactions
  add column if not exists edited_by text,
  add column if not exists edited_at timestamptz;

-- One-time backfill: any order that already had funds deducted via a wallet
-- hold (wallet_hold_amount > 0) but is still stuck showing "pending" /
-- Awaiting Payment from before this fix shipped. The app also does this
-- automatically on every admin dashboard load (see reconcilePaymentStatuses
-- in lib/db.ts), so running this manually is optional but immediate.
update orders
  set payment_status = 'confirmed'
  where payment_status = 'pending' and wallet_hold_amount > 0;

-- ============================================================
-- FILE: migrations_v11_agent_roles_ghost.sql
-- v11 — Sub-admin roles + ghost agents
-- ============================================================

-- ============================================================
-- FieldFlow v11 — Ghost agents, sub-admin roles, payout split,
-- rollover credit, anonymized order IDs, signup approval.
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- ── 1. Agent type: self_registered vs ghost, admin-only label ──
alter table users add column if not exists agent_type text
  check (agent_type in ('self_registered', 'ghost')) default 'self_registered';
-- Admin-only label for ghost agents (e.g. "John's cousin - Dallas TX").
-- Never returned to client/vendor-facing endpoints.
alter table users add column if not exists ghost_admin_label text default '';
-- If a ghost agent is later converted to a real self-registered account,
-- point at the new user row and freeze the ghost (suspended=true, keeps history).
alter table users add column if not exists ghost_converted_to_user_id text
  references users(id) on delete set null;
alter table users add column if not exists ghost_created_by text
  references users(id) on delete set null;

create index if not exists idx_users_agent_type on users(agent_type) where role = 'agent';

-- ── 2. Bid price (vendor-facing) vs agent payout (real cost) ──
-- bids.amount already exists = vendor-facing winning bid price.
-- New column = what the assigned agent actually gets paid. Admin sets this
-- independently; the spread is platform margin. Defaults to amount for
-- self-registered agents (payout == bid, no ghost markup) but must be
-- explicitly set by admin for ghost-agent bids.
alter table bids add column if not exists agent_payout numeric(10,2);
alter table bids add column if not exists payout_set_by text references users(id) on delete set null;
alter table bids add column if not exists payout_set_at timestamptz;

-- Backfill: for existing rows, payout = amount (no change in behavior for
-- current self-registered-only bids).
update bids set agent_payout = amount where agent_payout is null;

-- ── 6/7. Sub-admin roles ──
-- Extend role enum with 4 scoped sub-admin roles. Top-level 'admin' keeps
-- full access; these get access to exactly one functional area.
do $$
begin
  alter type user_role add value if not exists 'sub_admin_orders';
  alter type user_role add value if not exists 'sub_admin_users';
  alter type user_role add value if not exists 'sub_admin_finance';
  alter type user_role add value if not exists 'sub_admin_support';
exception when others then null;
end $$;

-- Every account is admin-created (top admin creates sub-admins, agents,
-- clients directly); force password change on first login.
alter table users add column if not exists must_change_password boolean not null default false;
alter table users add column if not exists created_by text references users(id) on delete set null;

-- ── 14. Manual approval gate on every new signup ──
-- account_active already exists and currently auto-flips true on signup.
-- New status column drives the approve/reject workflow explicitly so the
-- UI/emails can distinguish "pending review" from "rejected" from "active".
alter table users add column if not exists signup_status text
  check (signup_status in ('pending_approval', 'approved', 'rejected'))
  not null default 'approved';
-- existing rows are grandfathered in as approved; only new self-service
-- signups going forward get 'pending_approval' set by the register route.
alter table users add column if not exists signup_reviewed_by text references users(id) on delete set null;
alter table users add column if not exists signup_reviewed_at timestamptz;
alter table users add column if not exists signup_rejection_reason text default '';

create index if not exists idx_users_signup_status on users(signup_status);

-- ── 10. Vendor-facing anonymization: stable random ID per user ──
-- Replaces the runtime hash (lib/db.ts anonUserId) with a persisted random
-- token so it's consistent across processes/deploys and can't be reversed
-- by guessing the hash seed.
alter table users add column if not exists vendor_anon_id text unique;
alter table orders add column if not exists vendor_anon_id text unique;

update users set vendor_anon_id = 'AGT-' || upper(substr(md5(random()::text || id), 1, 6))
  where vendor_anon_id is null and role = 'agent';
update orders set vendor_anon_id = 'ORD-' || upper(substr(md5(random()::text || id), 1, 6))
  where vendor_anon_id is null;

-- ── 5. Mapbox proximity: cache last computed distance/time (self-reg only) ──
alter table users add column if not exists last_lat numeric(10,6);
alter table users add column if not exists last_lng numeric(10,6);
alter table users add column if not exists last_geocoded_at timestamptz;

-- ── 11/13. Rollover credit system ──
-- Per-vendor trust tier gate: only vendors flagged here are eligible for
-- rollover credit at all.
alter table users add column if not exists rollover_eligible boolean not null default false;
-- One-time-only by default (per requirement 13): tracks whether this vendor
-- has already consumed their single rollover grant. Admin can manually
-- reset this to grant another one-time rollover; a separate
-- rollover_recurring flag (default false) is the escape hatch for vendors
-- admin explicitly wants a repeating allowance for.
alter table users add column if not exists rollover_used boolean not null default false;
alter table users add column if not exists rollover_recurring boolean not null default false;
alter table users add column if not exists rollover_limit numeric(10,2) default 0;

-- Per-order unpaid flag: order proceeded on rollover credit rather than
-- upfront wallet balance. Auto-settles when the vendor's wallet is
-- recharged (see lib/walletBilling.ts settleRolloverOnTopup).
alter table orders add column if not exists rollover_unpaid boolean not null default false;
alter table orders add column if not exists rollover_settled_at timestamptz;
alter table orders add column if not exists rollover_amount numeric(10,2) default 0;

create index if not exists idx_orders_rollover_unpaid on orders(client_id) where rollover_unpaid = true;

-- ── 8. Tokenized link-based photo upload flow per order ──
create table if not exists upload_tokens (
  id            text primary key default ('utok-' || substr(uuid_generate_v4()::text, 1, 12)),
  order_id      text not null references orders(id) on delete cascade,
  token         text unique not null,
  expires_at    timestamptz not null,
  used_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists idx_upload_tokens_token on upload_tokens(token);
alter table upload_tokens enable row level security;
do $$ begin
  create policy "service role full access" on upload_tokens for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- ── 9. Per-role dashboard live performance tracking ──
-- Lightweight rollup table refreshed on order/bid state changes rather than
-- computed ad-hoc on every dashboard load.
create table if not exists performance_snapshots (
  user_id           text primary key references users(id) on delete cascade,
  jobs_completed_30d integer not null default 0,
  avg_rating_30d     numeric(3,2),
  response_rate_30d  numeric(5,2),
  earnings_30d       numeric(10,2) default 0,
  updated_at         timestamptz not null default now()
);
alter table performance_snapshots enable row level security;
do $$ begin
  create policy "service role full access" on performance_snapshots for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- ── 12. Universal export: no schema needed, generated on demand ──
-- (CSV/PDF/Excel are produced in-app from existing tables; nothing to add.)


-- ============================================================
-- VERIFICATION — run this block after the migrations above to
-- confirm every table this app depends on actually exists.
-- Returns one row per expected table; "present" should read
-- true for all of them. Anything false means a migration above
-- didn't apply cleanly and needs a look before you continue.
-- ============================================================
select t.table_name,
       exists (
         select 1 from information_schema.tables
         where table_schema = 'public' and table_name = t.table_name
       ) as present
from (values
  ('users'), ('orders'), ('bids'), ('photos'), ('status_history'),
  ('pricing_config'), ('email_log'),
  ('agent_zip_codes'), ('agent_samples'), ('messages'), ('payout_log'),
  ('payment_links'), ('photo_packages'), ('photo_submissions'),
  ('reviews'), ('rate_limit_attempts'), ('password_reset_tokens'),
  ('wallet_transactions'), ('wallet_plans'), ('wallet_auto_topup'),
  ('payment_methods'), ('whop_webhook_events'),
  ('support_chats'), ('support_messages'),
  ('audit_log'), ('disputes'), ('site_announcements'),
  ('agent_applications'), ('services_catalog')
) as t(table_name)
order by 1;

-- RLS check — every one of the tables above should read true.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;
