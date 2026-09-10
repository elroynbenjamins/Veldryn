-- Append-only co-op roguelite lifecycle. The feature remains disabled until release gates pass.
alter table public.expedition_runs
  add column if not exists coop_mode text check (coop_mode in ('live','qmode')),
  add column if not exists controller_account_id uuid references auth.users(id) on delete set null,
  add column if not exists route_schema_version integer,
  add column if not exists route_graph_json jsonb,
  add column if not exists current_node_id text,
  add column if not exists cleared_pre_boss_count integer not null default 0 check (cleared_pre_boss_count between 0 and 7),
  add column if not exists balance_version text,
  add column if not exists engine_version text,
  add column if not exists phase text;

alter table public.expedition_run_members
  add column if not exists slot_id text,
  add column if not exists member_kind text check (member_kind in ('human','echo')),
  add column if not exists source_account_id uuid references auth.users(id) on delete set null,
  add column if not exists active_participant_account_id uuid references auth.users(id) on delete set null,
  add column if not exists snapshot_hash text,
  add column if not exists persistent_state jsonb not null default '{}'::jsonb;

create table if not exists public.coop_run_access_memberships (
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  membership_kind text not null check (membership_kind in ('controller','live_participant')),
  channel_epoch integer not null default 1,
  active boolean not null default true,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (run_id, account_id)
);

create table if not exists public.coop_account_reservations (
  account_id uuid primary key references auth.users(id) on delete cascade,
  ticket_id uuid unique,
  run_id uuid references public.expedition_runs(id) on delete cascade,
  reservation_kind text not null check (reservation_kind in ('queue','ready','run')),
  expires_at timestamptz,
  generation bigint not null default 1
);

create table if not exists public.coop_ready_checks (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null,
  roster_revision bigint not null,
  roster_json jsonb not null,
  status text not null check (status in ('open','refilling','committed','expired','cancelled')),
  opened_at timestamptz not null default clock_timestamp(),
  closes_at timestamptz not null,
  refill_started_at timestamptz,
  unique (party_id, roster_revision)
);

create table if not exists public.coop_ready_responses (
  ready_check_id uuid not null references public.coop_ready_checks(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  accept boolean not null,
  responded_at timestamptz not null default clock_timestamp(),
  primary key (ready_check_id, account_id)
);

create table if not exists public.coop_decisions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  revision bigint not null,
  kind text not null check (kind in ('route','shared_event','disconnect')),
  option_ids text[] not null check (cardinality(option_ids) >= 2),
  eligible_account_ids uuid[] not null,
  opened_at timestamptz not null default clock_timestamp(),
  closes_at timestamptz,
  status text not null check (status in ('open','resolved','cancelled')),
  tie_key text not null,
  selected_option_id text,
  unique (run_id, revision)
);

create table if not exists public.coop_decision_votes (
  decision_id uuid not null references public.coop_decisions(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  option_id text not null,
  request_id text not null,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (decision_id, account_id),
  unique (decision_id, account_id, request_id)
);

create table if not exists public.coop_idempotency_receipts (
  caller_account_id uuid not null references auth.users(id) on delete cascade,
  operation text not null,
  resource_id text not null,
  request_id text not null,
  request_hash text not null,
  response_json jsonb not null,
  created_at timestamptz not null default now(),
  primary key (caller_account_id, operation, resource_id, request_id)
);

create table if not exists public.coop_due_jobs (
  id uuid primary key default gen_random_uuid(),
  semantic_key text not null unique,
  job_kind text not null,
  resource_id text not null,
  due_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','leased','complete','failed')),
  lease_until timestamptz,
  fencing_generation bigint not null default 0,
  attempt integer not null default 0,
  payload jsonb not null default '{}'::jsonb
);
create index if not exists coop_due_jobs_claim_idx on public.coop_due_jobs(status,due_at);

create table if not exists public.coop_outbox (
  id bigint generated always as identity primary key,
  semantic_key text not null unique,
  run_id uuid references public.expedition_runs(id) on delete cascade,
  channel_epoch integer,
  event_type text not null,
  client_payload jsonb not null,
  committed_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.coop_run_access_memberships enable row level security;
alter table public.coop_ready_checks enable row level security;
alter table public.coop_ready_responses enable row level security;
alter table public.coop_decisions enable row level security;
alter table public.coop_decision_votes enable row level security;
alter table public.coop_idempotency_receipts enable row level security;
alter table public.coop_account_reservations enable row level security;
alter table public.coop_due_jobs enable row level security;
alter table public.coop_outbox enable row level security;

create policy coop_access_read_self on public.coop_run_access_memberships
for select using (account_id = auth.uid());
create policy coop_decisions_read_active_member on public.coop_decisions
for select using (exists (
  select 1 from public.coop_run_access_memberships a
  where a.run_id = coop_decisions.run_id and a.account_id = auth.uid() and a.active
));
create policy coop_votes_read_active_member on public.coop_decision_votes
for select using (exists (
  select 1 from public.coop_decisions d
  join public.coop_run_access_memberships a on a.run_id = d.run_id
  where d.id = coop_decision_votes.decision_id and a.account_id = auth.uid() and a.active
));
create policy coop_receipts_read_self on public.coop_idempotency_receipts
for select using (caller_account_id = auth.uid());

-- Echo source ownership never grants access. Co-op reads are based only on actual-human access rows.
drop policy if exists expedition_runs_read_member on public.expedition_runs;
drop policy if exists expedition_run_members_read_self_run on public.expedition_run_members;
drop policy if exists expedition_encounter_results_read_member on public.expedition_encounter_results;

-- SECURITY DEFINER avoids the old self-referencing run-member RLS recursion. It returns only a boolean.
create or replace function public.can_read_expedition_run(p_run_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(
  select 1 from public.expedition_runs r where r.id=p_run_id and (
   (r.coop_mode is null and (r.created_by=auth.uid() or exists(
    select 1 from public.expedition_run_members m where m.run_id=r.id and m.account_id=auth.uid()
   ))) or (r.coop_mode is not null and exists(
    select 1 from public.coop_run_access_memberships a where a.run_id=r.id and a.account_id=auth.uid() and a.active
   ))
  )
 );
$$;
revoke all on function public.can_read_expedition_run(uuid) from public,anon;
grant execute on function public.can_read_expedition_run(uuid) to authenticated;
create policy expedition_runs_read_member on public.expedition_runs for select using(public.can_read_expedition_run(id));
create policy expedition_run_members_read_self_run on public.expedition_run_members for select using(public.can_read_expedition_run(run_id));
create policy expedition_encounter_results_read_member on public.expedition_encounter_results for select using(public.can_read_expedition_run(run_id));

-- The legacy RPC trusts caller-provided economic inputs and must not be callable by clients.
revoke execute on function public.claim_expedition_reward(uuid,uuid,text,integer,numeric,boolean,numeric) from authenticated;

revoke all on public.coop_account_reservations, public.coop_due_jobs, public.coop_outbox from anon, authenticated;
revoke insert, update, delete on public.coop_run_access_memberships, public.coop_ready_checks,
  public.coop_ready_responses, public.coop_decisions, public.coop_decision_votes,
  public.coop_idempotency_receipts from anon, authenticated;
