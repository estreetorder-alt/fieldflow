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
