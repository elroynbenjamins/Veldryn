-- Frostfall staging parity: the reviewed seasonal advance RPC retains Veilbreak's
-- two-completion guard. Staging lacked its supporting receipts table.
-- Safe on production where the table already exists; never modify live rows.
create table if not exists public.event_dungeon_completions_v1 (
  run_id uuid primary key references public.expedition_runs(id),
  account_id uuid not null references auth.users(id),
  event_id text not null,
  completed_day date not null
);
create index if not exists event_dungeon_completions_account_day
  on public.event_dungeon_completions_v1(account_id,event_id,completed_day);
alter table public.event_dungeon_completions_v1 enable row level security;
revoke all on table public.event_dungeon_completions_v1 from public, anon, authenticated;
grant select,insert on table public.event_dungeon_completions_v1 to service_role;
