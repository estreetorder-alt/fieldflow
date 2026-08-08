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
