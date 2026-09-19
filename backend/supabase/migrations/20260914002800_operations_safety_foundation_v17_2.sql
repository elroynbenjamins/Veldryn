-- VELDRYN v17.2 — Operations & Safety Foundation
-- Remote config/kill switches, telemetry buckets, central UTC resets, alerts, and player-support indexing/case tooling.
-- These tables are control-plane/service-side. Never expose service-role credentials to game clients.

create table if not exists public.ops_remote_config (
  config_key text primary key check(config_key ~ '^[a-z][a-z0-9_.:-]{2,119}$'),
  category text not null default 'general',
  label text not null,
  description text not null default '',
  value_type text not null check(value_type in('boolean','integer','number','string','json')),
  default_value jsonb not null,
  current_value jsonb not null,
  enabled boolean not null default true,
  exposure text not null default 'server_only' check(exposure in('server_only','client_safe')),
  risk_tier text not null default 'medium' check(risk_tier in('low','medium','critical')),
  live_change_safe boolean not null default true,
  rollout_percent numeric(5,2) not null default 100 check(rollout_percent between 0 and 100),
  rollout_seed text not null default gen_random_uuid()::text,
  active_from timestamptz,
  active_until timestamptz,
  constraints_json jsonb not null default '{}'::jsonb,
  notes text not null default '',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  check(active_until is null or active_from is null or active_until > active_from)
);

create table if not exists public.ops_remote_config_revisions (
  id bigint generated always as identity primary key,
  config_key text not null references public.ops_remote_config(config_key) on delete restrict,
  actor_account_id uuid references auth.users(id),
  actor_role text,
  reason text not null,
  prior_json jsonb,
  next_json jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_ops_remote_config_revision_key_time on public.ops_remote_config_revisions(config_key, created_at desc);

-- Aggregated operational/economy telemetry. Application code should write bounded buckets, not per-action raw events.
create table if not exists public.ops_metric_buckets (
  metric_key text not null check(metric_key ~ '^[a-z][a-z0-9_.:-]{2,159}$'),
  bucket_start timestamptz not null,
  bucket_minutes integer not null default 60 check(bucket_minutes in(5,15,60,1440)),
  dimension_key text not null default 'all',
  dimensions_json jsonb not null default '{}'::jsonb,
  metric_type text not null default 'counter' check(metric_type in('counter','gauge','duration')),
  sum_value numeric not null default 0,
  sample_count bigint not null default 0 check(sample_count >= 0),
  min_value numeric,
  max_value numeric,
  last_value numeric,
  updated_at timestamptz not null default now(),
  primary key(metric_key,bucket_start,bucket_minutes,dimension_key)
);
create index if not exists idx_ops_metric_recent on public.ops_metric_buckets(bucket_start desc, metric_key);

create table if not exists public.ops_alerts (
  id uuid primary key default gen_random_uuid(),
  severity text not null check(severity in('info','warning','critical')),
  status text not null default 'open' check(status in('open','acknowledged','resolved')),
  alert_key text not null,
  title text not null,
  detail text not null default '',
  account_id uuid references auth.users(id) on delete set null,
  metric_key text,
  context_json jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  acknowledged_by uuid references auth.users(id),
  acknowledged_at timestamptz,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz
);
create index if not exists idx_ops_alerts_open on public.ops_alerts(status,severity,last_seen_at desc);
create unique index if not exists uq_ops_alert_open_dedupe on public.ops_alerts(alert_key) where status <> 'resolved';

-- One authoritative UTC reset registry. Each handler must be idempotent by (reset_key, period_key).
create table if not exists public.ops_reset_definitions (
  reset_key text primary key check(reset_key ~ '^[a-z][a-z0-9_.:-]{2,119}$'),
  label text not null,
  description text not null default '',
  cadence text not null check(cadence in('daily','weekly','monthly')),
  utc_hour integer not null default 0 check(utc_hour between 0 and 23),
  utc_minute integer not null default 0 check(utc_minute between 0 and 59),
  day_of_week integer check(day_of_week between 0 and 6),
  day_of_month integer check(day_of_month between 1 and 28),
  handler_key text not null,
  catch_up_policy text not null default 'latest_only' check(catch_up_policy in('latest_only','all_missed','skip_missed')),
  max_catchup_runs integer not null default 1 check(max_catchup_runs between 1 and 31),
  enabled boolean not null default true,
  last_success_period_key text,
  last_success_at timestamptz,
  next_due_at timestamptz,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  check((cadence='weekly' and day_of_week is not null) or cadence <> 'weekly'),
  check((cadence='monthly' and day_of_month is not null) or cadence <> 'monthly')
);

create table if not exists public.ops_reset_runs (
  id uuid primary key default gen_random_uuid(),
  reset_key text not null references public.ops_reset_definitions(reset_key) on delete restrict,
  period_key text not null,
  due_at timestamptz not null,
  status text not null default 'pending' check(status in('pending','processing','succeeded','failed','dead_letter','skipped')),
  attempts integer not null default 0 check(attempts >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  result_json jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  unique(reset_key,period_key)
);
create index if not exists idx_ops_reset_runs_worker on public.ops_reset_runs(status,available_at,due_at) where status in('pending','processing','failed');

-- Denormalized support index populated by trusted backend code. It intentionally avoids secrets/payment data.
create table if not exists public.ops_support_accounts (
  account_id uuid primary key references auth.users(id) on delete cascade,
  public_player_id text unique,
  display_name text,
  primary_character_id uuid,
  account_created_at timestamptz,
  last_seen_at timestamptz,
  tags text[] not null default '{}',
  metadata_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists idx_ops_support_accounts_public_id on public.ops_support_accounts(public_player_id);
create index if not exists idx_ops_support_accounts_display_name on public.ops_support_accounts(lower(display_name));

create table if not exists public.ops_support_cases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text not null default '',
  priority text not null default 'normal' check(priority in('low','normal','high','urgent')),
  status text not null default 'open' check(status in('open','waiting','resolved')),
  created_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_ops_support_cases_account on public.ops_support_cases(account_id,status,updated_at desc);

create table if not exists public.ops_support_notes (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid references public.ops_support_cases(id) on delete set null,
  category text not null default 'general' check(category in('general','bug','economy','social','event','moderation','recovery')),
  note text not null check(length(note) between 3 and 4000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_ops_support_notes_account on public.ops_support_notes(account_id,created_at desc);

-- Control-plane tables are service-only. Admin browser access goes through the protected Pages Function.
alter table public.ops_remote_config enable row level security;
alter table public.ops_remote_config_revisions enable row level security;
alter table public.ops_metric_buckets enable row level security;
alter table public.ops_alerts enable row level security;
alter table public.ops_reset_definitions enable row level security;
alter table public.ops_reset_runs enable row level security;
alter table public.ops_support_accounts enable row level security;
alter table public.ops_support_cases enable row level security;
alter table public.ops_support_notes enable row level security;

revoke all on public.ops_remote_config from anon, authenticated;
revoke all on public.ops_remote_config_revisions from anon, authenticated;
revoke all on public.ops_metric_buckets from anon, authenticated;
revoke all on public.ops_alerts from anon, authenticated;
revoke all on public.ops_reset_definitions from anon, authenticated;
revoke all on public.ops_reset_runs from anon, authenticated;
revoke all on public.ops_support_accounts from anon, authenticated;
revoke all on public.ops_support_cases from anon, authenticated;
revoke all on public.ops_support_notes from anon, authenticated;

-- Service-side bounded metric upsert. Keep permissions away from player roles.
create or replace function public.record_ops_metric(
  p_metric_key text,
  p_bucket_start timestamptz,
  p_bucket_minutes integer,
  p_dimension_key text,
  p_dimensions jsonb,
  p_metric_type text,
  p_value numeric,
  p_increment_count bigint default 1
) returns void
language plpgsql security definer set search_path=public as $$
begin
  if p_bucket_minutes not in (5,15,60,1440) then raise exception 'invalid_bucket_minutes'; end if;
  if p_metric_type not in ('counter','gauge','duration') then raise exception 'invalid_metric_type'; end if;
  if p_increment_count < 0 then raise exception 'invalid_sample_count'; end if;
  insert into public.ops_metric_buckets(metric_key,bucket_start,bucket_minutes,dimension_key,dimensions_json,metric_type,sum_value,sample_count,min_value,max_value,last_value)
  values(p_metric_key,p_bucket_start,p_bucket_minutes,coalesce(nullif(p_dimension_key,''),'all'),coalesce(p_dimensions,'{}'::jsonb),p_metric_type,p_value,p_increment_count,p_value,p_value,p_value)
  on conflict(metric_key,bucket_start,bucket_minutes,dimension_key) do update set
    dimensions_json=excluded.dimensions_json,
    metric_type=excluded.metric_type,
    sum_value=case when excluded.metric_type='gauge' then excluded.sum_value else public.ops_metric_buckets.sum_value+excluded.sum_value end,
    sample_count=case when excluded.metric_type='gauge' then excluded.sample_count else public.ops_metric_buckets.sample_count+excluded.sample_count end,
    min_value=least(coalesce(public.ops_metric_buckets.min_value,excluded.min_value),excluded.min_value),
    max_value=greatest(coalesce(public.ops_metric_buckets.max_value,excluded.max_value),excluded.max_value),
    last_value=excluded.last_value,
    updated_at=now();
end $$;
revoke all on function public.record_ops_metric(text,timestamptz,integer,text,jsonb,text,numeric,bigint) from public, anon, authenticated;
grant execute on function public.record_ops_metric(text,timestamptz,integer,text,jsonb,text,numeric,bigint) to service_role;

-- Initial kill switches / live-safe tunables. Defaults preserve current behavior.
insert into public.ops_remote_config(config_key,category,label,description,value_type,default_value,current_value,exposure,risk_tier,live_change_safe,constraints_json,notes) values
('feature.parties.enabled','Features','Persistent Parties','Master gate for persistent asynchronous Parties. Server endpoints must enforce it.','boolean','true','true','client_safe','critical',true,'{}','Emergency kill switch; does not affect Live Dungeon temporary parties.'),
('feature.party_contracts.enabled','Features','Party Contracts','Stops accepting/progressing/claiming weekly Party Contracts when false.','boolean','true','true','client_safe','critical',true,'{}','Existing state is preserved while disabled.'),
('feature.party_events.enabled','Features','Party Events','Stops Party Event contribution/claim entry points when false.','boolean','true','true','client_safe','critical',true,'{}','Event definitions remain intact; use event cancellation for a single bad event.'),
('feature.guild_recruitment.enabled','Features','Guild Recruitment','Controls guild/player recruitment adverts, applications and invites.','boolean','true','true','client_safe','medium',true,'{}','Guild membership itself remains intact.'),
('feature.live_dungeons.enabled','Features','Live Dungeons','Master gate for synchronous Live Dungeon matchmaking/run creation.','boolean','true','true','client_safe','critical',true,'{}','Do not terminate already-running runs unless the run itself is unsafe.'),
('feature.crafting.enabled','Features','Crafting','Master gate for starting new crafting actions.','boolean','true','true','client_safe','critical',true,'{}','Already-started jobs should settle safely.'),
('feature.chat.enabled','Features','Chat','Master gate for sending new chat messages.','boolean','true','true','client_safe','critical',true,'{}','Read-only chat history may stay visible.'),
('feature.companion_trials.enabled','Features','Companion Trials','Controls entry/progression in monthly Companion Trials.','boolean','true','true','client_safe','medium',true,'{}','Monthly reset is managed separately.'),
('feature.reward_claims.enabled','Features','Reward Claims','Emergency stop for reward-claim endpoints.','boolean','true','true','client_safe','critical',true,'{}','Use only during reward/economy incidents.'),
('maintenance.write_actions_disabled','Safety','Global gameplay write lock','Emergency maintenance gate for mutating gameplay actions. Admin/support operations remain available.','boolean','false','false','client_safe','critical',true,'{}','Highest-level emergency switch. Backend must fail gameplay writes with a maintenance response.'),
('tuning.xp.global_multiplier','Tuning','Global XP multiplier','Live-safe multiplier applied by trusted XP settlement code.','number','1.0','1.0','client_safe','medium',true,'{"min":0.5,"max":1.5}','Do not use to compensate a single broken activity; fix the content definition instead.'),
('safety.social.account_daily_credit_hard_cap','Safety','Social daily hard cap','Additional global ceiling across normalized Party/social contribution systems. System-specific lower caps still win.','integer','3000','3000','server_only','critical',true,'{"min":500,"max":5000}','Apply as min(system cap, this safety ceiling); never use it to raise an immutable live event cap.'),
('safety.liveops.account_daily_credit_hard_cap','Safety','Party Event daily hard cap','Emergency ceiling for Party Event contribution. Definition cap remains authoritative when lower.','integer','4000','4000','server_only','critical',true,'{"min":500,"max":6000}','Apply as min(event definition cap, this safety ceiling).'),
('matchmaking.live_dungeon.ready_check_seconds','Matchmaking','Live Dungeon ready check','Server-authoritative ready-check duration.','integer','8','8','client_safe','medium',true,'{"min":5,"max":15}','Client reads the resolved value only for countdown display.'),
('matchmaking.live_dungeon.vote_seconds','Matchmaking','Dungeon route vote','Server-authoritative route voting window.','integer','8','8','client_safe','medium',true,'{"min":5,"max":10}','All-four-agree can still resolve instantly.'),
('ops.maintenance_message','Safety','Maintenance message','Short player-facing message shown while a maintenance/feature gate blocks an action.','string','"VELDRYN is undergoing brief maintenance. Please try again shortly."','"VELDRYN is undergoing brief maintenance. Please try again shortly."','client_safe','low',true,'{"maxLength":240}','No HTML; plain text only.')
on conflict(config_key) do nothing;

insert into public.ops_reset_definitions(reset_key,label,description,cadence,utc_hour,utc_minute,day_of_week,day_of_month,handler_key,catch_up_policy,max_catchup_runs,enabled) values
('daily.world','Daily World Reset','Shared daily boundary for daily goals/limits that explicitly opt into the central service.','daily',0,0,null,null,'daily_world_reset','latest_only',1,true),
('weekly.party_contracts','Weekly Party Contracts','Starts the new UTC weekly Party Contract/social-goal rotation.','weekly',0,0,1,null,'weekly_party_contracts_reset','latest_only',1,true),
('monthly.companion_trials','Monthly Companion Trials','Resets monthly Companion Trial floor/checkpoint/challenge state on the first day of each calendar month.','monthly',0,0,null,1,'monthly_companion_trials_reset','latest_only',1,true)
on conflict(reset_key) do nothing;

comment on table public.ops_remote_config is 'Server-authoritative registered live-safe configuration. Client visibility never replaces server enforcement.';
comment on table public.ops_metric_buckets is 'Aggregated telemetry only; avoid unbounded per-action analytics in the primary game database.';
comment on table public.ops_reset_runs is 'Idempotent reset-run ledger keyed by reset_key + period_key.';
comment on table public.ops_support_accounts is 'Denormalized support lookup index; no passwords, payment details or sensitive free-form profile data.';

-- Atomic reset worker claim. A worker may safely call this from multiple instances.
create or replace function public.claim_ops_reset_runs(p_limit integer default 10)
returns setof public.ops_reset_runs
language plpgsql security definer set search_path=public as $$
begin
  return query
  with picked as (
    select id from public.ops_reset_runs
    where status in('pending','failed') and available_at <= now() and due_at <= now() and attempts < 5
    order by due_at asc, created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit,10),50))
  )
  update public.ops_reset_runs r set
    status='processing',
    attempts=r.attempts+1,
    locked_at=now(),
    started_at=coalesce(r.started_at,now())
  from picked
  where r.id=picked.id
  returning r.*;
end $$;
revoke all on function public.claim_ops_reset_runs(integer) from public, anon, authenticated;
grant execute on function public.claim_ops_reset_runs(integer) to service_role;

-- Config revision history is append-only even for privileged application code.
create or replace function public.prevent_ops_remote_config_revision_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'ops_remote_config_revisions_are_append_only';
end $$;
drop trigger if exists trg_ops_remote_config_revisions_append_only on public.ops_remote_config_revisions;
create trigger trg_ops_remote_config_revisions_append_only
before update or delete on public.ops_remote_config_revisions
for each row execute function public.prevent_ops_remote_config_revision_mutation();
