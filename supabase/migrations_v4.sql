-- FieldFlow migrations v4 — site announcements (dashboard banner)

create table if not exists site_announcements (
  id         bigserial primary key,
  message    text not null,
  audience   text not null default 'all',   -- all | client | agent
  active     boolean not null default true,
  created_by text references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_announcements_active on site_announcements(active, audience);
alter table site_announcements enable row level security;
create policy "service role full access" on site_announcements for all using (true) with check (true);
