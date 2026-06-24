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
