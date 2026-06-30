-- Run this to remove all dummy data from Supabase
-- WARNING: This deletes ALL users, orders, bids, photos, etc.
-- Run ONLY if you want to start fresh

-- Delete in dependency order
delete from email_log;
delete from payout_log;
delete from photos;
delete from bids;
delete from status_history;
delete from orders;
delete from agent_zip_codes;
delete from agent_samples;
delete from messages;
delete from users;

-- Insert ONLY the admin user
-- CHANGE THE PASSWORD BEFORE RUNNING IN PRODUCTION
insert into users (id, email, password, role, name, phone, approved, created_at) values
  ('admin-1', 'admin@fieldflow.app', 'CHANGE_THIS_PASSWORD', 'admin', 'Admin', '000-000-0000', true, now());

-- Confirm
select id, email, role, name from users;
