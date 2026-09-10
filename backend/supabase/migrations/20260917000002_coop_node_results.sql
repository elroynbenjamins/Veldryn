create table if not exists public.coop_node_results (
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  node_id text not null,
  attempt integer not null default 1,
  fencing_generation bigint not null,
  success boolean not null,
  start_state_hash text not null,
  result_json jsonb not null,
  end_state_json jsonb not null,
  event_cursor_from bigint,
  event_cursor_to bigint,
  committed_at timestamptz not null default now(),
  primary key (run_id,node_id,attempt),
  unique (run_id,node_id)
);
alter table public.coop_node_results enable row level security;
create policy coop_node_results_read_active_member on public.coop_node_results for select using (exists (
 select 1 from public.coop_run_access_memberships a
 where a.run_id=coop_node_results.run_id and a.account_id=auth.uid() and a.active
));
revoke insert,update,delete on public.coop_node_results from anon,authenticated;
