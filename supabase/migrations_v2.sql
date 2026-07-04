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
