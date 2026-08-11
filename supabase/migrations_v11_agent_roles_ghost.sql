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
