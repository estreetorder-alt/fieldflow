-- Migration v13: fix orders stuck showing "Unpaid" on the client wallet
-- page even though they were already confirmed paid by admin.
--
-- Root cause: the admin "Confirm Payment" action and the "invoicePaid"
-- override in app/api/orders/[id]/route.ts only ever updated the legacy
-- invoice_paid / payment_status columns. They never touched the newer
-- amount_paid / amount_due / payment_state columns (added in v12) that
-- the client wallet page's "Outstanding Payments" list actually reads
-- from. Result: an order admin already marked as paid could still have
-- payment_state = 'unpaid' and amount_due > 0, so it kept showing up as
-- an unpaid/outstanding order for the client. The API route is now fixed
-- to keep both sets of columns in sync going forward — this migration is
-- a one-time backfill for orders already affected.
--
-- Safe to run multiple times.

update orders
set amount_paid = total_price,
    amount_due = 0,
    payment_state = 'paid',
    overdraft_status = null
where invoice_paid = true
  and payment_state <> 'paid';

-- Clear out any pending overdraft requests left dangling for orders that
-- are actually fully paid now.
update overdraft_requests
set status = 'approved'
where status = 'pending'
  and order_id in (select id from orders where payment_state = 'paid');
