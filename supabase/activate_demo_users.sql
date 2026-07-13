-- Run once in Supabase SQL Editor if demo logins show "pending activation"
-- Activates seed users so local testing works without payment links.

update users
set account_active = true
where email in (
  'admin@test.com',
  'agent@test.com',
  'agent2@test.com',
  'agent3@test.com',
  'client@test.com',
  'client2@test.com',
  'client3@test.com'
);
