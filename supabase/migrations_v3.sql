-- FieldFlow migrations v3 — safe to run even if some already exist

-- ── 1. Rate limiting (login / password-reset abuse protection) ──
create table if not exists rate_limit_attempts (
  id         bigserial primary key,
  key        text not null,            -- e.g. "login:user@example.com", "login-ip:1.2.3.4"
  created_at timestamptz not null default now()
);
create index if not exists idx_rla_key_created on rate_limit_attempts(key, created_at);
alter table rate_limit_attempts enable row level security;
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
create policy "service role full access" on audit_log for all using (true) with check (true);

-- ── 5. Agent background-check tracking (manual/admin-managed) ────
alter table users add column if not exists background_check_status text not null default 'not_started';
-- not_started | pending | passed | failed
alter table users add column if not exists background_check_notes  text default '';
alter table users add column if not exists background_check_updated_at timestamptz;

-- ── 6. SMS notification opt-in ────────────────────────────────
alter table users add column if not exists sms_opt_in boolean not null default false;
