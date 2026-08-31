create extension if not exists pgcrypto;

create table if not exists public.expedition_runs (
  id uuid primary key default gen_random_uuid(),
  expedition_id text not null,
  tier smallint not null check (tier between 1 and 5),
  content_version text not null,
  seed_hash text not null,
  status text not null default 'active' check (status in ('active','completed','failed','abandoned')),
  node_index integer not null default 0,
  route_progress numeric(5,4) not null default 0 check (route_progress between 0 and 1),
  regional_meter numeric(8,4) not null default 0,
  marks_spent integer not null default 0 check (marks_spent >= 0),
  wipe_count integer not null default 0 check (wipe_count >= 0),
  state_version bigint not null default 1,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.expedition_run_members (
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  character_id uuid not null,
  account_id uuid not null references auth.users(id) on delete cascade,
  echo_profile_version bigint,
  role text not null check (role in ('tank','damage','support')),
  synced_level integer not null check (synced_level between 1 and 100),
  loadout_snapshot jsonb not null,
  stat_snapshot jsonb not null,
  joined_at timestamptz not null default now(),
  primary key (run_id, character_id)
);

create table if not exists public.expedition_run_boons (
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  character_id uuid not null,
  boon_id text not null,
  rank smallint not null default 1 check (rank between 1 and 5),
  evolved_into_id text,
  acquired_node integer not null,
  primary key (run_id, character_id, boon_id)
);

create table if not exists public.expedition_run_artifacts (
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  character_id uuid not null,
  artifact_id text not null,
  rank smallint not null default 1 check (rank between 1 and 5),
  acquired_node integer not null,
  primary key (run_id, character_id, artifact_id)
);

create table if not exists public.expedition_boon_offers (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  character_id uuid not null,
  node_index integer not null,
  choices jsonb not null,
  server_seed_proof text not null,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  chosen_boon_id text
);
create unique index if not exists expedition_boon_offers_one_open_per_node
  on public.expedition_boon_offers(run_id, character_id, node_index)
  where consumed_at is null;

create table if not exists public.expedition_votes (
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  branch_id text not null,
  character_id uuid not null,
  option_id text not null,
  created_at timestamptz not null default now(),
  primary key (run_id, branch_id, character_id)
);

create table if not exists public.expedition_reward_claims (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  character_id uuid not null,
  account_id uuid not null references auth.users(id) on delete cascade,
  reward_stage text not null,
  reward_json jsonb not null,
  claimed_at timestamptz not null default now(),
  unique (run_id, character_id, reward_stage)
);

create table if not exists public.expedition_daily_counters (
  account_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
  enhanced_claims integer not null default 0,
  echo_owner_rewards integer not null default 0,
  primary key(account_id, date_key)
);

create table if not exists public.expedition_weekly_counters (
  account_id uuid not null references auth.users(id) on delete cascade,
  week_key date not null,
  enhanced_claims integer not null default 0,
  helper_rewards integer not null default 0,
  echo_owner_rewards integer not null default 0,
  primary key(account_id, week_key)
);

create table if not exists public.expedition_shop_purchases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  week_key date not null,
  quantity integer not null default 1 check (quantity > 0),
  marks_spent integer not null check (marks_spent >= 0),
  created_at timestamptz not null default now()
);
create index if not exists expedition_shop_purchase_cap_idx
  on public.expedition_shop_purchases(account_id, item_id, week_key);

create table if not exists public.expedition_currency_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references public.expedition_runs(id) on delete set null,
  currency text not null check (currency in ('expedition_mark','commendation','expedition_relic_fragment')),
  amount integer not null,
  reason text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.expedition_telemetry (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.expedition_runs(id) on delete cascade,
  account_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  server_ts timestamptz not null default now()
);

alter table public.expedition_runs enable row level security;
alter table public.expedition_run_members enable row level security;
alter table public.expedition_run_boons enable row level security;
alter table public.expedition_run_artifacts enable row level security;
alter table public.expedition_boon_offers enable row level security;
alter table public.expedition_votes enable row level security;
alter table public.expedition_reward_claims enable row level security;
alter table public.expedition_daily_counters enable row level security;
alter table public.expedition_weekly_counters enable row level security;
alter table public.expedition_shop_purchases enable row level security;
alter table public.expedition_currency_ledger enable row level security;
alter table public.expedition_telemetry enable row level security;

-- Read-only client access to runs they belong to. Writes should go through server/service-role functions.
create policy expedition_runs_read_member on public.expedition_runs
for select using (
  created_by = auth.uid() or exists (
    select 1 from public.expedition_run_members m where m.run_id = id and m.account_id = auth.uid()
  )
);

create policy expedition_run_members_read_self_run on public.expedition_run_members
for select using (
  account_id = auth.uid() or exists (
    select 1 from public.expedition_run_members m2
    where m2.run_id = expedition_run_members.run_id and m2.account_id = auth.uid()
  )
);

create policy expedition_reward_claims_read_self on public.expedition_reward_claims
for select using (account_id = auth.uid());

create policy expedition_daily_counters_read_self on public.expedition_daily_counters
for select using (account_id = auth.uid());

create policy expedition_weekly_counters_read_self on public.expedition_weekly_counters
for select using (account_id = auth.uid());

create policy expedition_shop_purchases_read_self on public.expedition_shop_purchases
for select using (account_id = auth.uid());

create policy expedition_currency_ledger_read_self on public.expedition_currency_ledger
for select using (account_id = auth.uid());
