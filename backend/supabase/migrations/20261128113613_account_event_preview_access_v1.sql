create table public.event_preview_access_v1 (
  account_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.live_events(event_id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (account_id,event_id)
);
alter table public.event_preview_access_v1 enable row level security;
revoke all on public.event_preview_access_v1 from public, anon, authenticated;
grant select on public.event_preview_access_v1 to authenticated;
grant select,insert,update,delete on public.event_preview_access_v1 to service_role;
create policy event_preview_own_unexpired_v1 on public.event_preview_access_v1
  for select to authenticated using (account_id=(select auth.uid()) and expires_at>now());
