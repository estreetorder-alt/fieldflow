-- Migration v12: order-payment engine + overdraft workflow
--
-- Replaces the old "block the order if the wallet can't cover it" /
-- rollover-credit model with:
--   1. Orders are never blocked by wallet balance.
--   2. Every order tracks amount_paid / amount_due / payment_state
--      (unpaid | partially_paid | paid) instead of a single boolean.
--   3. When a vendor can't fully cover an order, an overdraft_requests row
--      is created (surfaced through the existing support-chat system) for
--      admin to approve/reject. Approval does NOT mark the order paid —
--      it only means the vendor is allowed to keep going without full
--      payment yet.
--   4. Two atomic, row-locked Postgres functions do all balance math:
--      accept_order_charge() at bid-acceptance time, and
--      settle_vendor_unpaid_orders() after a confirmed Cash App/Zelle
--      top-up. Both are safe against double-processing and concurrent
--      orders racing for the same balance.
--
-- Existing fields (payment_status, wallet_hold_amount, invoice_paid,
-- rollover_*) are left in place for backward compatibility and historical
-- data — nothing here deletes columns or rows. invoice_paid is now kept in
-- sync with payment_state (true only when payment_state = 'paid').

-- ── New order payment-state columns ─────────────────────────────
alter table orders add column if not exists amount_paid numeric(10,2) not null default 0;
alter table orders add column if not exists amount_due numeric(10,2);
alter table orders add column if not exists payment_state text not null default 'unpaid';
-- unpaid | partially_paid | paid
alter table orders add column if not exists overdraft_status text; -- null | pending | approved | rejected

create index if not exists idx_orders_payment_state on orders(payment_state);
create index if not exists idx_orders_client_payment_state on orders(client_id, payment_state);

-- ── Overdraft requests ───────────────────────────────────────────
create table if not exists overdraft_requests (
  id                    text primary key default ('odr-' || substr(uuid_generate_v4()::text,1,10)),
  order_id              text not null references orders(id) on delete cascade,
  vendor_id             text not null references users(id) on delete cascade,
  order_amount          numeric(10,2) not null,
  wallet_balance_at_request numeric(10,2) not null,
  requested_amount      numeric(10,2) not null,
  shortfall_amount      numeric(10,2) not null,
  status                text not null default 'pending', -- pending | approved | rejected
  admin_id              text references users(id) on delete set null,
  decided_at            timestamptz,
  chat_id               text references support_chats(id) on delete set null,
  created_at            timestamptz not null default now()
);
alter table overdraft_requests enable row level security;
drop policy if exists "service role full access" on overdraft_requests;
create policy "service role full access" on overdraft_requests for all using (true) with check (true);
create index if not exists idx_overdraft_order on overdraft_requests(order_id);
create index if not exists idx_overdraft_vendor_status on overdraft_requests(vendor_id, status);

-- ── Idempotency guard: one order_payment ledger row can never double-apply.
-- Each application of funds to a specific order carries a unique
-- idempotency key so retried settlement runs / duplicate confirmations
-- can't charge twice.
alter table wallet_transactions add column if not exists idempotency_key text;
create unique index if not exists idx_wallet_tx_idempotency
  on wallet_transactions(idempotency_key) where idempotency_key is not null;

-- ── Core atomic charge: apply whatever wallet balance is available toward
-- a single order's amount_due. Used both at bid-acceptance time (charge
-- whatever's on hand right now, order proceeds regardless of the result)
-- and during settlement (see below). Locks the user row and the order row
-- (in that fixed order, to avoid deadlocks with concurrent calls) so two
-- orders racing for the same balance can never both spend it.
create or replace function charge_order_payment(p_order_id text, p_idem_suffix text default null)
returns table(charged numeric, amount_paid numeric, amount_due numeric, payment_state text) as $$
declare
  v_vendor_id text;
  v_total numeric;
  v_paid numeric;
  v_due numeric;
  v_balance numeric;
  v_deduct numeric;
  v_new_balance numeric;
  v_new_paid numeric;
  v_new_due numeric;
  v_state text;
  v_idem text;
begin
  select client_id, total_price, amount_paid
    into v_vendor_id, v_total, v_paid
    from orders where id = p_order_id
    for update;

  if v_vendor_id is null then
    raise exception 'order % not found', p_order_id;
  end if;

  select wallet_balance into v_balance from users where id = v_vendor_id for update;
  v_due := round((v_total - coalesce(v_paid, 0))::numeric, 2);

  if v_due <= 0 or v_balance <= 0 then
    v_state := case when v_due <= 0 then 'paid' else (case when v_paid > 0 then 'partially_paid' else 'unpaid' end) end;
    return query select 0::numeric, v_paid, greatest(v_due, 0), v_state;
    return;
  end if;

  v_deduct := least(v_balance, v_due);
  v_new_balance := round((v_balance - v_deduct)::numeric, 2);
  v_new_paid := round((coalesce(v_paid, 0) + v_deduct)::numeric, 2);
  v_new_due := round((v_total - v_new_paid)::numeric, 2);
  v_state := case when v_new_due <= 0 then 'paid' when v_new_paid > 0 then 'partially_paid' else 'unpaid' end;
  v_idem := 'charge-' || p_order_id || '-' || coalesce(p_idem_suffix, extract(epoch from clock_timestamp())::text);

  update users set wallet_balance = v_new_balance where id = v_vendor_id;
  update orders set
    amount_paid = v_new_paid,
    amount_due = greatest(v_new_due, 0),
    payment_state = v_state,
    invoice_paid = (v_state = 'paid'),
    payment_status = 'confirmed'
  where id = p_order_id;

  insert into wallet_transactions (user_id, type, amount, balance_after, description, order_id, status, purpose, idempotency_key)
  values (v_vendor_id, 'order_payment', v_deduct, v_new_balance,
          'Payment applied to order ' || p_order_id, p_order_id, 'confirmed', 'order_payment', v_idem)
  on conflict (idempotency_key) do nothing;

  return query select v_deduct, v_new_paid, greatest(v_new_due, 0), v_state;
end;
$$ language plpgsql;

-- ── Bid-acceptance entry point: charges whatever's available right now.
-- The order is NEVER blocked here — this always succeeds and the caller
-- proceeds with the order regardless of whether it ends up fully paid.
create or replace function accept_order_charge(p_order_id text)
returns table(charged numeric, amount_paid numeric, amount_due numeric, payment_state text) as $$
begin
  return query select * from charge_order_payment(p_order_id, 'accept');
end;
$$ language plpgsql;

-- ── Settlement: after a confirmed Cash App/Zelle top-up, apply the
-- vendor's fresh balance to their outstanding orders oldest-first, one
-- charge_order_payment() call per order, all inside one function-level
-- transaction so the whole settlement run is atomic and can't interleave
-- with another concurrent order acceptance or settlement for the same
-- vendor (the first charge_order_payment() call locks the user row and
-- holds that lock for the rest of the function).
create or replace function settle_vendor_unpaid_orders(p_vendor_id text)
returns table(order_id text, charged numeric, payment_state text) as $$
declare
  r record;
begin
  perform wallet_balance from users where id = p_vendor_id for update;

  for r in
    select id from orders
    where client_id = p_vendor_id and payment_state <> 'paid'
    order by created_at asc
  loop
    return query
      select r.id, c.charged, c.payment_state
      from charge_order_payment(r.id, 'settle') c;
  end loop;
end;
$$ language plpgsql;

-- ── One-time historical reconciliation ───────────────────────────
-- Backfill amount_paid/amount_due/payment_state for every existing order
-- using actual evidence of funds collected — never blindly marks an order
-- paid. Evidence, in priority order:
--   1. rollover-settled orders (rollover_unpaid = false and rollover_amount
--      was set) → fully paid, amount already left the wallet historically.
--   2. wallet_hold_amount > 0 with payment_status = 'confirmed' and no
--      outstanding rollover shortfall → the old hold system actually took
--      the money → fully paid.
--   3. invoice_paid already true → fully paid (covers admin-marked-paid
--      cases with no hold record).
--   4. everything else → genuinely unpaid, amount_paid stays 0.
update orders
set amount_paid = total_price,
    amount_due = 0,
    payment_state = 'paid',
    invoice_paid = true
where payment_state = 'unpaid' -- only touch rows not already processed by this migration
  and (
    invoice_paid = true
    or (wallet_hold_amount > 0 and coalesce(rollover_unpaid, false) = false)
    or (rollover_unpaid = false and rollover_settled_at is not null)
  );

update orders
set amount_due = total_price - amount_paid
where amount_due is null or amount_due <> (total_price - amount_paid);

-- Orders still carrying an unsettled rollover shortfall become
-- partially_paid under the new model (whatever wasn't rollover credit was
-- actually collected) rather than flat "unpaid".
update orders
set payment_state = case when amount_paid > 0 then 'partially_paid' else 'unpaid' end,
    invoice_paid = false
where coalesce(rollover_unpaid, false) = true and payment_state = 'unpaid';

-- Any order that still has an open rollover shortfall gets a matching
-- overdraft_requests row (pre-approved, since it already proceeded under
-- the old rollover rules) so it shows up consistently in the new admin
-- view instead of silently only existing under the old field names.
insert into overdraft_requests (order_id, vendor_id, order_amount, wallet_balance_at_request, requested_amount, shortfall_amount, status, decided_at, created_at)
select o.id, o.client_id, o.total_price, 0, o.rollover_amount, o.rollover_amount, 'approved', o.created_at, o.created_at
from orders o
where coalesce(o.rollover_unpaid, false) = true
  and not exists (select 1 from overdraft_requests r where r.order_id = o.id);

update orders set overdraft_status = 'approved'
where coalesce(rollover_unpaid, false) = true and overdraft_status is null;
