-- ============================================================
-- FieldFlow — Supabase Schema + Demo Data
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Drop tables (clean slate, safe to re-run) ────────────────
drop table if exists email_log cascade;
drop table if exists photos cascade;
drop table if exists bids cascade;
drop table if exists status_history cascade;
drop table if exists orders cascade;
drop table if exists pricing_config cascade;
drop table if exists users cascade;

-- ── ENUM types ───────────────────────────────────────────────
drop type if exists user_role cascade;
drop type if exists order_status cascade;
drop type if exists turnaround_tier cascade;
drop type if exists bid_status cascade;

create type user_role      as enum ('admin', 'agent', 'client');
create type order_status   as enum ('pending', 'in_progress', 'completed', 'cancelled');
create type turnaround_tier as enum ('standard', 'rush_24hr', 'rush_6hr');
create type bid_status     as enum ('pending', 'accepted', 'rejected');

-- ── USERS ────────────────────────────────────────────────────
create table users (
  id               text primary key default ('user-' || substr(uuid_generate_v4()::text, 1, 8)),
  email            text unique not null,
  password         text not null,               -- plain text for demo; hash in production
  role             user_role not null default 'client',
  name             text not null,
  phone            text not null default '',
  company          text,
  -- agent-only fields
  available        boolean default false,
  rating           numeric(3,1) default 5.0,
  bio              text default '',
  coverage_zone    text default '',
  vehicle          text default '',
  total_earnings   numeric(10,2) default 0,
  pending_payout   numeric(10,2) default 0,
  completed_jobs   integer default 0,
  created_at       timestamptz not null default now()
);

-- ── ORDERS ───────────────────────────────────────────────────
create table orders (
  id                 text primary key default ('ord-' || substr(uuid_generate_v4()::text, 1, 8)),
  address            text not null,
  status             order_status not null default 'pending',
  client_id          text not null references users(id) on delete cascade,
  assigned_agent_id  text references users(id) on delete set null,
  accepted_bid_id    text,                        -- FK set after bids table created
  total_price        numeric(10,2) not null default 0,
  compensation_amount numeric(10,2) not null default 0,
  service_type       text not null default 'inspection',
  turnaround_tier    turnaround_tier not null default 'standard',
  notes              text default '',
  customize_notes    text default '',
  photo_expires_at   timestamptz,
  offer_sent_at      timestamptz,
  offer_accepted_at  timestamptz,
  bulk_batch_id      text,
  invoice_paid       boolean not null default false,
  created_at         timestamptz not null default now()
);

-- ── BIDS ─────────────────────────────────────────────────────
create table bids (
  id               text primary key default ('bid-' || substr(uuid_generate_v4()::text, 1, 8)),
  order_id         text not null references orders(id) on delete cascade,
  agent_id         text not null references users(id) on delete cascade,
  amount           numeric(10,2) not null,
  message          text default '',
  placed_by_admin  boolean not null default false,
  status           bid_status not null default 'pending',
  placed_at        timestamptz not null default now(),
  unique (order_id, agent_id)            -- one bid per agent per order
);

-- Now we can add the FK from orders → bids
alter table orders
  add constraint fk_accepted_bid
  foreign key (accepted_bid_id) references bids(id) on delete set null;

-- ── STATUS HISTORY ───────────────────────────────────────────
create table status_history (
  id         bigserial primary key,
  order_id   text not null references orders(id) on delete cascade,
  status     text not null,
  note       text default '',
  created_at timestamptz not null default now()
);

-- ── PHOTOS ───────────────────────────────────────────────────
create table photos (
  id                 text primary key default ('ph-' || substr(uuid_generate_v4()::text, 1, 8)),
  order_id           text not null references orders(id) on delete cascade,
  filename           text not null,
  url                text default '',
  description        text default '',
  selected_by_client boolean not null default false,
  uploaded_at        timestamptz not null default now()
);

-- ── PRICING CONFIG ───────────────────────────────────────────
create table pricing_config (
  id                  text primary key default ('price-' || substr(uuid_generate_v4()::text, 1, 8)),
  service_type        text unique not null,
  base_price          numeric(10,2) not null,
  urgency_multiplier  numeric(4,2) not null default 1.5,
  active              boolean not null default true,
  updated_at          timestamptz not null default now()
);

-- ── EMAIL LOG ────────────────────────────────────────────────
create table email_log (
  id         bigserial primary key,
  type       text not null,
  to_email   text not null,
  subject    text not null,
  body       text default '',
  created_at timestamptz not null default now()
);

-- ── INDEXES ──────────────────────────────────────────────────
create index on orders(client_id);
create index on orders(assigned_agent_id);
create index on orders(status);
create index on bids(order_id);
create index on bids(agent_id);
create index on photos(order_id);
create index on status_history(order_id);

-- ── ROW LEVEL SECURITY (basic — expand for production) ───────
alter table users          enable row level security;
alter table orders         enable row level security;
alter table bids           enable row level security;
alter table photos         enable row level security;
alter table status_history enable row level security;
alter table pricing_config enable row level security;
alter table email_log      enable row level security;

-- For demo: allow all operations via service role key (used by Next.js backend)
-- In production, tighten these per role.
create policy "service role full access" on users          for all using (true) with check (true);
create policy "service role full access" on orders         for all using (true) with check (true);
create policy "service role full access" on bids           for all using (true) with check (true);
create policy "service role full access" on photos         for all using (true) with check (true);
create policy "service role full access" on status_history for all using (true) with check (true);
create policy "service role full access" on pricing_config for all using (true) with check (true);
create policy "service role full access" on email_log      for all using (true) with check (true);


-- ============================================================
-- DEMO DATA
-- ============================================================

-- Users
insert into users (id, email, password, role, name, phone, company, available, rating, bio, coverage_zone, vehicle, total_earnings, pending_payout, completed_jobs, created_at) values
  ('user-1', 'admin@test.com',   'admin123', 'admin',  'Admin User',   '555-0100', null,                   false, 5.0, '',                                                                    '',              '',                 0,    0,   0,  now() - interval '90 days'),
  ('user-2', 'agent@test.com',   'agent123', 'agent',  'Jane Smith',   '555-0101', null,                   true,  4.8, 'Experienced field agent specializing in residential inspections.',   'Chicago, IL',   '2022 Honda CR-V',  2840, 340, 47, now() - interval '60 days'),
  ('user-3', 'agent2@test.com',  'agent123', 'agent',  'Tom Field',    '555-0102', null,                   false, 4.5, 'Professional photographer with 5 years of real estate experience.',  'Springfield, IL','2020 Ford F-150', 1620, 180, 28, now() - interval '55 days'),
  ('user-4', 'client@test.com',  'client123','client', 'Bob Johnson',  '555-0103', 'Johnson Realty LLC',   false, 5.0, '',                                                                    '',              '',                 0,    0,   0,  now() - interval '45 days'),
  ('user-5', 'client2@test.com', 'client123','client', 'Alice Brown',  '555-0104', 'Midwest Property Group',false,5.0, '',                                                                   '',              '',                 0,    0,   0,  now() - interval '30 days'),
  ('user-6', 'agent3@test.com',  'agent123', 'agent',  'Maria Lopez',  '555-0105', null,                   true,  4.9, 'Certified inspector with commercial and residential experience.',    'Evanston, IL',  '2023 Toyota RAV4', 980,  120, 15, now() - interval '20 days'),
  ('user-7', 'client3@test.com', 'client123','client', 'David Park',   '555-0106', 'Park Holdings Inc',    false, 5.0, '',                                                                    '',              '',                 0,    0,   0,  now() - interval '15 days');

-- Pricing config
insert into pricing_config (id, service_type, base_price, urgency_multiplier, active) values
  ('price-1', 'inspection',             100, 1.5, true),
  ('price-2', 'survey',                 150, 1.5, true),
  ('price-3', 'assessment',             200, 1.3, true),
  ('price-4', 'bpo_photography',        120, 1.4, true),
  ('price-5', 'occupancy_check',         80, 1.6, true),
  ('price-6', 'construction_inspection',175, 1.3, true),
  ('price-7', 'disaster_inspection',    250, 1.2, true),
  ('price-8', 'custom',                 150, 1.4, true);

-- Orders
insert into orders (id, address, status, client_id, assigned_agent_id, accepted_bid_id, total_price, compensation_amount, service_type, turnaround_tier, notes, customize_notes, photo_expires_at, offer_sent_at, offer_accepted_at, bulk_batch_id, invoice_paid, created_at) values
  -- ord-1: pending, no bids yet
  ('ord-1', '123 Main St, Springfield, IL 62701',   'pending',     'user-4', null,    null,    100, 60,  'inspection',  'standard',  'Please check the foundation',       '',  null, now()-interval '20 days', null, null, false, now()-interval '20 days'),
  -- ord-2: in_progress, bid accepted
  ('ord-2', '456 Oak Ave, Chicago, IL 60601',        'in_progress', 'user-4', 'user-2', null,  225, 140, 'survey',      'rush_24hr', 'Urgent pre-sale survey needed',     '',  null, now()-interval '16 days', now()-interval '16 days'+interval '1 hour', null, false, now()-interval '16 days'),
  -- ord-3: completed, invoice paid
  ('ord-3', '789 Pine Rd, Naperville, IL 60540',     'completed',   'user-5', 'user-2', null,  100, 60,  'inspection',  'standard',  '',                                  '',  now()-interval '10 days'+interval '30 days', now()-interval '11 days', now()-interval '11 days'+interval '1 hour', null, true,  now()-interval '11 days'),
  -- ord-4: pending, rush, customized notes
  ('ord-4', '321 Elm St, Evanston, IL 60201',        'pending',     'user-5', null,    null,   350, 228, 'assessment',  'rush_6hr',  'Pre-sale full assessment',          'Please photograph the HVAC system, roof access hatch, and all structural beams visible in the basement.', null, now()-interval '5 days', null, null, false, now()-interval '5 days'),
  -- ord-5: pending, multiple bids exist
  ('ord-5', '1000 Lake Shore Dr, Chicago, IL 60611', 'pending',     'user-7', null,    null,   175, 114, 'construction_inspection', 'standard', 'New build final walkthrough', '', null, now()-interval '3 days', null, null, false, now()-interval '3 days'),
  -- ord-6: in_progress, agent 3
  ('ord-6', '55 W Monroe St, Chicago, IL 60603',     'in_progress', 'user-7', 'user-6', null,  120, 78,  'bpo_photography','rush_24hr','Commercial listing photos needed','', null, now()-interval '2 days', now()-interval '2 days'+interval '2 hours', null, false, now()-interval '2 days'),
  -- ord-7: completed, unpaid invoice
  ('ord-7', '2020 Ridge Ave, Evanston, IL 60201',    'completed',   'user-4', 'user-3', null,  80,  52,  'occupancy_check','standard','Check occupancy status',          '', now()+interval '20 days', now()-interval '8 days', now()-interval '8 days'+interval '3 hours', null, false, now()-interval '8 days'),
  -- ord-8: cancelled
  ('ord-8', '400 N Michigan Ave, Chicago, IL 60611', 'cancelled',   'user-4', null,    null,   200, 130, 'assessment',  'standard',  'Client cancelled',                  '', null, now()-interval '12 days', null, null, false, now()-interval '12 days');

-- Bids
insert into bids (id, order_id, agent_id, amount, message, placed_by_admin, status, placed_at) values
  -- ord-2 accepted bid (Jane)
  ('bid-1', 'ord-2', 'user-2', 140, 'I can do this tomorrow morning.',              false, 'accepted', now()-interval '16 days'+interval '30 min'),
  -- ord-3 accepted bid (Jane)
  ('bid-2', 'ord-3', 'user-2', 60,  'Available immediately.',                       false, 'accepted', now()-interval '11 days'+interval '30 min'),
  -- ord-5 has multiple open bids
  ('bid-3', 'ord-5', 'user-2', 110, 'Can be there Friday morning.',                 false, 'pending',  now()-interval '2 days'),
  ('bid-4', 'ord-5', 'user-3', 100, 'Available today, very familiar with the area.',false, 'pending',  now()-interval '1 day'+interval '6 hours'),
  ('bid-5', 'ord-5', 'user-6', 114, 'I specialize in new construction walkthroughs.',false,'pending',  now()-interval '1 day'),
  -- ord-6 accepted bid (Maria)
  ('bid-6', 'ord-6', 'user-6', 78,  'I have a commercial photography kit ready.',   false, 'accepted', now()-interval '2 days'+interval '1 hour'),
  -- ord-7 accepted bid (Tom), placed by admin
  ('bid-7', 'ord-7', 'user-3', 52,  'Assigned by admin.',                           true,  'accepted', now()-interval '8 days'+interval '1 hour'),
  -- ord-1 has one open bid
  ('bid-8', 'ord-1', 'user-3', 55,  'Can handle this by end of week.',              false, 'pending',  now()-interval '1 day');

-- Update accepted_bid_id on orders now that bids exist
update orders set accepted_bid_id = 'bid-1' where id = 'ord-2';
update orders set accepted_bid_id = 'bid-2' where id = 'ord-3';
update orders set accepted_bid_id = 'bid-6' where id = 'ord-6';
update orders set accepted_bid_id = 'bid-7' where id = 'ord-7';

-- Status history
insert into status_history (order_id, status, note, created_at) values
  ('ord-1', 'pending',     'Order submitted by client',                       now()-interval '20 days'),
  ('ord-2', 'pending',     'Order submitted by client',                       now()-interval '16 days'),
  ('ord-2', 'in_progress', 'Bid accepted — assigned to Jane Smith at $140',   now()-interval '16 days'+interval '1 hour'),
  ('ord-3', 'pending',     'Order submitted by client',                       now()-interval '11 days'),
  ('ord-3', 'in_progress', 'Bid accepted — assigned to Jane Smith at $60',    now()-interval '11 days'+interval '1 hour'),
  ('ord-3', 'completed',   'Job completed, 3 photos uploaded',                now()-interval '10 days'),
  ('ord-4', 'pending',     'Order submitted by client',                       now()-interval '5 days'),
  ('ord-5', 'pending',     'Order submitted by client',                       now()-interval '3 days'),
  ('ord-6', 'pending',     'Order submitted by client',                       now()-interval '2 days'),
  ('ord-6', 'in_progress', 'Bid accepted — assigned to Maria Lopez at $78',   now()-interval '2 days'+interval '2 hours'),
  ('ord-7', 'pending',     'Order submitted by client',                       now()-interval '8 days'),
  ('ord-7', 'in_progress', 'Admin assigned to Tom Field at $52',              now()-interval '8 days'+interval '3 hours'),
  ('ord-7', 'completed',   'Occupancy check completed',                       now()-interval '7 days'),
  ('ord-8', 'pending',     'Order submitted by client',                       now()-interval '12 days'),
  ('ord-8', 'cancelled',   'Cancelled by client',                             now()-interval '10 days');

-- Photos (for completed orders)
insert into photos (id, order_id, filename, url, description, selected_by_client, uploaded_at) values
  ('ph-1', 'ord-3', 'front-elevation.jpg',  '', 'Front elevation view',           false, now()-interval '10 days'+interval '14 hours'),
  ('ph-2', 'ord-3', 'rear-elevation.jpg',   '', 'Rear elevation and yard',         false, now()-interval '10 days'+interval '14 hours'),
  ('ph-3', 'ord-3', 'basement.jpg',         '', 'Basement foundation check',       true,  now()-interval '10 days'+interval '14 hours'),
  ('ph-4', 'ord-7', 'front-door.jpg',       '', 'Front door — no occupant visible',false, now()-interval '7 days'+interval '10 hours'),
  ('ph-5', 'ord-7', 'mailbox.jpg',          '', 'Mailbox full — likely vacant',    true,  now()-interval '7 days'+interval '10 hours'),
  ('ph-6', 'ord-7', 'utilities.jpg',        '', 'Utility meters reading zero',     false, now()-interval '7 days'+interval '10 hours');

-- Email log samples
insert into email_log (type, to_email, subject, body, created_at) values
  ('new_order',      'admin@test.com',   'New Order — 456 Oak Ave, Chicago, IL 60601',         'Client Bob Johnson submitted a survey order.',          now()-interval '16 days'),
  ('bid_placed',     'client@test.com',  'New bid on ord-2 from Jane Smith',                   'Bid: $140. Message: I can do this tomorrow morning.',   now()-interval '16 days'+interval '30 min'),
  ('bid_accepted',   'agent@test.com',   'Your bid was accepted — 456 Oak Ave',                'Your bid of $140 was accepted. Please proceed.',        now()-interval '16 days'+interval '1 hour'),
  ('new_order',      'admin@test.com',   'New Order — 789 Pine Rd, Naperville, IL 60540',      'Client Alice Brown submitted an inspection order.',     now()-interval '11 days'),
  ('bid_accepted',   'agent@test.com',   'Your bid was accepted — 789 Pine Rd',                'Your bid of $60 was accepted. Please proceed.',         now()-interval '11 days'+interval '1 hour'),
  ('order_completed','client2@test.com', 'Order Completed — 789 Pine Rd, Naperville',          '3 photos uploaded. Invoice attached.',                  now()-interval '10 days'),
  ('welcome',        'agent3@test.com',  'Welcome to FieldFlow, Maria Lopez!',                 'Your agent account has been created by admin.',         now()-interval '20 days'),
  ('bid_placed',     'client3@test.com', 'New bid on ord-5 from Jane Smith',                   'Bid: $110. Message: Can be there Friday morning.',      now()-interval '2 days'),
  ('bid_placed',     'client3@test.com', 'New bid on ord-5 from Tom Field',                    'Bid: $100. Message: Available today.',                  now()-interval '1 day'+interval '6 hours'),
  ('bid_placed',     'client3@test.com', 'New bid on ord-5 from Maria Lopez',                  'Bid: $114. I specialize in new construction.',          now()-interval '1 day');
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

create policy "service role full access" on agent_zip_codes  for all using (true) with check (true);
create policy "service role full access" on agent_samples    for all using (true) with check (true);
create policy "service role full access" on messages         for all using (true) with check (true);
create policy "service role full access" on payout_log       for all using (true) with check (true);
create policy "service role full access" on photo_packages   for all using (true) with check (true);
create policy "service role full access" on services_catalog for all using (true) with check (true);

-- ── 10. Demo data ─────────────────────────────────────────────
insert into agent_zip_codes (agent_id, zip_code) values
  ('user-2','60601'),('user-2','60602'),('user-2','60603'),('user-2','60604'),('user-2','60605'),
  ('user-3','62701'),('user-3','62702'),('user-3','62703'),
  ('user-6','60201'),('user-6','60202'),('user-6','60203')
on conflict do nothing;

insert into messages (from_id, to_id, order_id, body) values
  ('user-1','user-2','ord-2','Hi Jane, please capture the foundation clearly on this one.'),
  ('user-2','user-1','ord-2','Understood! Will do extra shots of the foundation area.'),
  ('user-1','user-3',null,   'Tom, your sample set looks great. You are approved.')
on conflict do nothing;

update users set grade=4.8, completion_rate=97.5, response_rate=95.0, approved=true where id='user-2';
update users set grade=4.2, completion_rate=89.0, response_rate=88.0, approved=true where id='user-3';
update users set grade=4.9, completion_rate=99.0, response_rate=98.0, approved=true where id='user-6';

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
create policy "service role full access" on password_reset_tokens for all using (true) with check (true);

-- Admin is always active
update users set account_active = true where role = 'admin';

-- Order decline tracking
alter table orders add column if not exists declined_by jsonb default '[]';
-- Generated: Sat Jul  4 06:57:01 UTC 2026
