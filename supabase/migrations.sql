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

create policy "service role full access" on agent_zip_codes  for all using (true) with check (true);
create policy "service role full access" on agent_samples    for all using (true) with check (true);
create policy "service role full access" on messages         for all using (true) with check (true);
create policy "service role full access" on payout_log       for all using (true) with check (true);
create policy "service role full access" on photo_packages   for all using (true) with check (true);

-- Demo zip codes for existing agents
insert into agent_zip_codes (agent_id, zip_code) values
  ('user-2', '60601'), ('user-2', '60602'), ('user-2', '60603'),
  ('user-2', '60604'), ('user-2', '60605'), ('user-2', '60610'),
  ('user-3', '62701'), ('user-3', '62702'), ('user-3', '62703'),
  ('user-6', '60201'), ('user-6', '60202'), ('user-6', '60203')
on conflict do nothing;

-- Demo messages
insert into messages (from_id, to_id, order_id, body) values
  ('user-1', 'user-2', 'ord-2', 'Hi Jane, please make sure to capture the foundation clearly on this one.'),
  ('user-2', 'user-1', 'ord-2', 'Understood! Will do extra shots of the foundation area.'),
  ('user-1', 'user-3', null,    'Tom, your sample set looks great. You are approved to start taking orders.');

-- Agent grades for demo agents
update users set grade = 4.8, completion_rate = 97.5, response_rate = 95.0, approved = true where id = 'user-2';
update users set grade = 4.2, completion_rate = 89.0, response_rate = 88.0, approved = true where id = 'user-3';
update users set grade = 4.9, completion_rate = 99.0, response_rate = 98.0, approved = true where id = 'user-6';

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
create policy "service role full access" on services_catalog for all using (true) with check (true);

-- Stripe payment fields on orders
alter table orders add column if not exists stripe_payment_intent_id text default null;
alter table orders add column if not exists payment_status text not null default 'unpaid'; -- unpaid | paid | refunded
alter table orders add column if not exists custom_shot_list text default null;
alter table orders add column if not exists custom_client_price numeric(10,2) default null;
alter table orders add column if not exists service_id text default null;
