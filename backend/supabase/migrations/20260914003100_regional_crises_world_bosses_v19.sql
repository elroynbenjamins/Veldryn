-- VELDRYN v19 — Regional Crises + Asynchronous World Bosses
-- Additive shared-world systems. No player Market dependency. All authoritative writes are service-role/domain-service only.

begin;

create extension if not exists pgcrypto;

create table if not exists public.shared_world_regional_crisis_definitions (
  definition_id text not null,
  version integer not null check(version >= 1),
  definition_json jsonb not null,
  definition_hash text not null check(char_length(definition_hash)=64),
  created_by uuid,
  created_at timestamptz not null default now(),
  primary key(definition_id,version)
);

create table if not exists public.shared_world_regional_crises (
  id uuid primary key default gen_random_uuid(),
  definition_id text not null,
  definition_version integer not null,
  definition_snapshot jsonb not null,
  definition_hash text not null check(char_length(definition_hash)=64),
  name_snapshot text not null,
  region_id text not null,
  focus text not null check(focus in('combat','skilling','mixed')),
  state text not null default 'scheduled' check(state in('scheduled','active','secured','failed','cancelled','finalized')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  target_points bigint not null check(target_points > 0),
  credited_points bigint not null default 0 check(credited_points >= 0),
  combat_points bigint not null default 0 check(combat_points >= 0),
  skilling_points bigint not null default 0 check(skilling_points >= 0),
  daily_account_credit_cap integer not null check(daily_account_credit_cap > 0),
  scale_snapshot jsonb not null default '{}'::jsonb,
  secured_at timestamptz,
  finalized_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(definition_id,starts_at),
  check(ends_at > starts_at)
);
create index if not exists idx_shared_world_crises_region_state on public.shared_world_regional_crises(region_id,state,starts_at desc);
create index if not exists idx_shared_world_crises_schedule on public.shared_world_regional_crises(state,starts_at,ends_at);

create table if not exists public.shared_world_crisis_contributions (
  id bigint generated always as identity primary key,
  crisis_id uuid not null references public.shared_world_regional_crises(id) on delete restrict,
  source_event_id text not null,
  account_id uuid not null,
  occurred_at timestamptz not null,
  date_key date not null,
  category text not null check(category in('combat','skilling')),
  activity_kind text not null,
  content_id text not null,
  raw_points integer not null check(raw_points >= 0),
  credited_points integer not null check(credited_points >= 0),
  party_id_at_settlement uuid,
  party_name_snapshot text,
  guild_id_at_settlement uuid,
  guild_name_snapshot text,
  created_at timestamptz not null default now(),
  unique(crisis_id,source_event_id)
);
create index if not exists idx_shared_world_crisis_contrib_account on public.shared_world_crisis_contributions(crisis_id,account_id,created_at desc);
create index if not exists idx_shared_world_crisis_contrib_daily on public.shared_world_crisis_contributions(crisis_id,account_id,date_key);

create table if not exists public.shared_world_crisis_account_progress (
  crisis_id uuid not null references public.shared_world_regional_crises(id) on delete restrict,
  account_id uuid not null,
  total_points bigint not null default 0,
  combat_points bigint not null default 0,
  skilling_points bigint not null default 0,
  qualifying_actions integer not null default 0,
  first_contribution_at timestamptz,
  last_contribution_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(crisis_id,account_id)
);

create table if not exists public.shared_world_crisis_stage_events (
  crisis_id uuid not null references public.shared_world_regional_crises(id) on delete restrict,
  stage_id text not null,
  threshold_fraction numeric(6,5) not null,
  reached_at timestamptz not null default now(),
  metadata_json jsonb not null default '{}'::jsonb,
  primary key(crisis_id,stage_id)
);

create table if not exists public.shared_world_crisis_reward_claims (
  crisis_id uuid not null references public.shared_world_regional_crises(id) on delete restrict,
  account_id uuid not null,
  reward_key text not null,
  reward_bundle_id text not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check(status in('pending','granted','failed')),
  error_text text,
  created_at timestamptz not null default now(),
  granted_at timestamptz,
  primary key(crisis_id,account_id,reward_key)
);

create table if not exists public.shared_world_world_boss_definitions (
  definition_id text not null,
  version integer not null check(version >= 1),
  definition_json jsonb not null,
  definition_hash text not null check(char_length(definition_hash)=64),
  created_by uuid,
  created_at timestamptz not null default now(),
  primary key(definition_id,version)
);

create table if not exists public.shared_world_world_bosses (
  id uuid primary key default gen_random_uuid(),
  definition_id text not null,
  definition_version integer not null,
  definition_snapshot jsonb not null,
  definition_hash text not null check(char_length(definition_hash)=64),
  name_snapshot text not null,
  region_id text not null,
  linked_crisis_id uuid references public.shared_world_regional_crises(id) on delete set null,
  state text not null default 'scheduled' check(state in('scheduled','active','defeated','expired','cancelled','finalized')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_hp bigint not null check(max_hp > 0),
  remaining_hp bigint not null check(remaining_hp >= 0),
  scale_snapshot jsonb not null default '{}'::jsonb,
  daily_scored_attempts integer not null check(daily_scored_attempts between 1 and 12),
  defeated_at timestamptz,
  finalized_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(remaining_hp <= max_hp),
  check(ends_at > starts_at)
);
create index if not exists idx_shared_world_boss_region_state on public.shared_world_world_bosses(region_id,state,starts_at desc);
create index if not exists idx_shared_world_boss_schedule on public.shared_world_world_bosses(state,starts_at,ends_at);

create table if not exists public.shared_world_world_boss_attempts (
  encounter_id uuid primary key default gen_random_uuid(),
  boss_id uuid not null references public.shared_world_world_bosses(id) on delete restrict,
  source_request_id text not null,
  account_id uuid not null,
  character_id uuid not null,
  date_key date not null,
  echo_only boolean not null default false,
  phase_id text not null,
  role_profile text,
  state text not null default 'reserved' check(state in('reserved','settled','expired','cancelled')),
  expires_at timestamptz not null,
  party_id_at_start uuid,
  party_name_snapshot text,
  guild_id_at_start uuid,
  guild_name_snapshot text,
  combat_result_json jsonb,
  impact_breakdown_json jsonb,
  raid_impact bigint not null default 0 check(raid_impact >= 0),
  requested_global_damage bigint not null default 0 check(requested_global_damage >= 0),
  applied_global_damage bigint not null default 0 check(applied_global_damage >= 0),
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  unique(boss_id,account_id,source_request_id)
);
create index if not exists idx_shared_world_boss_attempt_account on public.shared_world_world_boss_attempts(boss_id,account_id,date_key,created_at desc);
create unique index if not exists uq_shared_world_boss_open_attempt on public.shared_world_world_boss_attempts(boss_id,account_id) where state='reserved';

create table if not exists public.shared_world_world_boss_account_progress (
  boss_id uuid not null references public.shared_world_world_bosses(id) on delete restrict,
  account_id uuid not null,
  valid_attempts integer not null default 0,
  echo_attempts integer not null default 0,
  raid_impact bigint not null default 0,
  echo_raid_impact bigint not null default 0,
  applied_global_damage bigint not null default 0,
  best_attempt_impact bigint not null default 0,
  first_attempt_at timestamptz,
  last_attempt_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(boss_id,account_id)
);

create table if not exists public.shared_world_world_boss_phase_events (
  boss_id uuid not null references public.shared_world_world_bosses(id) on delete restrict,
  phase_id text not null,
  hp_fraction numeric(8,6) not null,
  reached_at timestamptz not null default now(),
  metadata_json jsonb not null default '{}'::jsonb,
  primary key(boss_id,phase_id)
);

create table if not exists public.shared_world_world_boss_final_ranks (
  boss_id uuid not null references public.shared_world_world_bosses(id) on delete restrict,
  account_id uuid not null,
  display_name_snapshot text,
  final_rank integer not null check(final_rank >= 1),
  raid_impact bigint not null,
  applied_global_damage bigint not null,
  valid_attempts integer not null,
  finalized_at timestamptz not null default now(),
  primary key(boss_id,account_id),
  unique(boss_id,final_rank)
);

create table if not exists public.shared_world_world_boss_reward_claims (
  boss_id uuid not null references public.shared_world_world_bosses(id) on delete restrict,
  account_id uuid not null,
  reward_key text not null,
  reward_bundle_id text not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check(status in('pending','granted','failed')),
  error_text text,
  created_at timestamptz not null default now(),
  granted_at timestamptz,
  primary key(boss_id,account_id,reward_key)
);

-- Immutable definition snapshots once an instance exists.
create or replace function public.prevent_shared_world_instance_definition_mutation()
returns trigger language plpgsql as $$
begin
  if old.definition_hash is distinct from new.definition_hash
     or old.definition_snapshot is distinct from new.definition_snapshot
     or old.definition_id is distinct from new.definition_id
     or old.definition_version is distinct from new.definition_version then
    raise exception 'shared_world_instance_definition_is_immutable';
  end if;
  return new;
end $$;

drop trigger if exists trg_shared_world_crisis_definition_immutable on public.shared_world_regional_crises;
create trigger trg_shared_world_crisis_definition_immutable before update on public.shared_world_regional_crises for each row execute function public.prevent_shared_world_instance_definition_mutation();
drop trigger if exists trg_shared_world_boss_definition_immutable on public.shared_world_world_bosses;
create trigger trg_shared_world_boss_definition_immutable before update on public.shared_world_world_bosses for each row execute function public.prevent_shared_world_instance_definition_mutation();

-- Canonical crisis contribution application: idempotent, daily-capped, and global totals updated under one lock.
create or replace function public.apply_shared_world_crisis_contribution(
  p_crisis_id uuid,
  p_source_event_id text,
  p_account_id uuid,
  p_occurred_at timestamptz,
  p_date_key date,
  p_category text,
  p_activity_kind text,
  p_content_id text,
  p_raw_points integer,
  p_requested_points integer,
  p_party_id uuid default null,
  p_party_name text default null,
  p_guild_id uuid default null,
  p_guild_name text default null
)
returns table(duplicate boolean,credited_points integer,total_points bigint,combat_points bigint,skilling_points bigint)
language plpgsql security definer set search_path=public as $$
declare
  v_crisis public.shared_world_regional_crises%rowtype;
  v_existing public.shared_world_crisis_contributions%rowtype;
  v_daily bigint;
  v_credit integer;
begin
  if p_category not in ('combat','skilling') then raise exception 'invalid_crisis_category'; end if;
  if p_requested_points < 0 or p_raw_points < 0 then raise exception 'invalid_crisis_points'; end if;
  select * into v_crisis from public.shared_world_regional_crises where id=p_crisis_id for update;
  if not found then raise exception 'crisis_not_found'; end if;
  select * into v_existing from public.shared_world_crisis_contributions where crisis_id=p_crisis_id and source_event_id=p_source_event_id;
  if found then
    return query select true,v_existing.credited_points,v_crisis.credited_points,v_crisis.combat_points,v_crisis.skilling_points;
    return;
  end if;
  if v_crisis.state not in ('active','secured') or p_occurred_at < v_crisis.starts_at or p_occurred_at >= v_crisis.ends_at then
    return query select false,0,v_crisis.credited_points,v_crisis.combat_points,v_crisis.skilling_points;
    return;
  end if;
  select coalesce(sum(c.credited_points),0) into v_daily from public.shared_world_crisis_contributions c where c.crisis_id=p_crisis_id and c.account_id=p_account_id and c.date_key=p_date_key;
  v_credit := least(greatest(p_requested_points,0), greatest(v_crisis.daily_account_credit_cap - v_daily,0));
  insert into public.shared_world_crisis_contributions(crisis_id,source_event_id,account_id,occurred_at,date_key,category,activity_kind,content_id,raw_points,credited_points,party_id_at_settlement,party_name_snapshot,guild_id_at_settlement,guild_name_snapshot)
  values(p_crisis_id,p_source_event_id,p_account_id,p_occurred_at,p_date_key,p_category,p_activity_kind,p_content_id,p_raw_points,v_credit,p_party_id,left(p_party_name,80),p_guild_id,left(p_guild_name,80));
  if v_credit > 0 then
    update public.shared_world_regional_crises set
      credited_points=credited_points+v_credit,
      combat_points=combat_points+case when p_category='combat' then v_credit else 0 end,
      skilling_points=skilling_points+case when p_category='skilling' then v_credit else 0 end,
      updated_at=now()
    where id=p_crisis_id returning * into v_crisis;
    insert into public.shared_world_crisis_account_progress(crisis_id,account_id,total_points,combat_points,skilling_points,qualifying_actions,first_contribution_at,last_contribution_at)
    values(p_crisis_id,p_account_id,v_credit,case when p_category='combat' then v_credit else 0 end,case when p_category='skilling' then v_credit else 0 end,1,p_occurred_at,p_occurred_at)
    on conflict(crisis_id,account_id) do update set
      total_points=public.shared_world_crisis_account_progress.total_points+excluded.total_points,
      combat_points=public.shared_world_crisis_account_progress.combat_points+excluded.combat_points,
      skilling_points=public.shared_world_crisis_account_progress.skilling_points+excluded.skilling_points,
      qualifying_actions=public.shared_world_crisis_account_progress.qualifying_actions+1,
      last_contribution_at=greatest(public.shared_world_crisis_account_progress.last_contribution_at,excluded.last_contribution_at),
      updated_at=now();
  end if;
  return query select false,v_credit,v_crisis.credited_points,v_crisis.combat_points,v_crisis.skilling_points;
end $$;
revoke all on function public.apply_shared_world_crisis_contribution(uuid,text,uuid,timestamptz,date,text,text,text,integer,integer,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.apply_shared_world_crisis_contribution(uuid,text,uuid,timestamptz,date,text,text,text,integer,integer,uuid,text,uuid,text) to service_role;

-- Atomic World Boss attempt reservation. Serializes only this boss+account pair, not the whole boss.
create or replace function public.reserve_shared_world_boss_attempt(
  p_boss_id uuid,
  p_source_request_id text,
  p_account_id uuid,
  p_character_id uuid,
  p_date_key date,
  p_echo_only boolean,
  p_phase_id text,
  p_expires_at timestamptz,
  p_effective_daily_cap integer,
  p_party_id uuid default null,
  p_party_name text default null,
  p_guild_id uuid default null,
  p_guild_name text default null
)
returns public.shared_world_world_boss_attempts
language plpgsql security definer set search_path=public as $$
declare
  v_boss public.shared_world_world_bosses%rowtype;
  v_existing public.shared_world_world_boss_attempts%rowtype;
  v_attempt public.shared_world_world_boss_attempts%rowtype;
  v_today integer;
  v_valid_total integer;
  v_echo_total integer;
  v_echo_hours integer;
begin
  if p_effective_daily_cap < 1 or p_effective_daily_cap > 12 then raise exception 'world_boss_daily_cap_invalid'; end if;
  perform pg_advisory_xact_lock(hashtext(p_boss_id::text),hashtext(p_account_id::text));
  select * into v_existing from public.shared_world_world_boss_attempts where boss_id=p_boss_id and account_id=p_account_id and source_request_id=p_source_request_id;
  if found then return v_existing; end if;
  if exists(select 1 from public.shared_world_world_boss_attempts where boss_id=p_boss_id and account_id=p_account_id and state='reserved') then raise exception 'world_boss_attempt_already_open'; end if;
  select * into v_boss from public.shared_world_world_bosses where id=p_boss_id;
  if not found then raise exception 'world_boss_not_found'; end if;
  if now() < v_boss.starts_at or now() >= v_boss.ends_at then raise exception 'world_boss_not_in_schedule'; end if;
  select count(*) filter(where not echo_only and state in('reserved','settled')),
         count(*) filter(where echo_only and state in('reserved','settled'))
    into v_valid_total,v_echo_total
    from public.shared_world_world_boss_attempts where boss_id=p_boss_id and account_id=p_account_id;
  if p_echo_only then
    if v_boss.state <> 'defeated' or v_boss.defeated_at is null then raise exception 'world_boss_echo_not_available'; end if;
    v_echo_hours := greatest(0,least(coalesce((v_boss.definition_snapshot->>'postDefeatEchoWindowHours')::integer,12),24));
    if now() >= least(v_boss.ends_at,v_boss.defeated_at + make_interval(hours=>v_echo_hours)) then raise exception 'world_boss_echo_window_closed'; end if;
    if v_valid_total > 0 then raise exception 'world_boss_echo_already_participated'; end if;
    if v_echo_total > 0 then raise exception 'world_boss_echo_already_used'; end if;
  else
    if v_boss.state <> 'active' then raise exception 'world_boss_not_active'; end if;
    select count(*) into v_today from public.shared_world_world_boss_attempts where boss_id=p_boss_id and account_id=p_account_id and date_key=p_date_key and not echo_only and state in('reserved','settled');
    if v_today >= least(v_boss.daily_scored_attempts,p_effective_daily_cap) then raise exception 'world_boss_daily_attempt_limit'; end if;
  end if;
  insert into public.shared_world_world_boss_attempts(boss_id,source_request_id,account_id,character_id,date_key,echo_only,phase_id,expires_at,party_id_at_start,party_name_snapshot,guild_id_at_start,guild_name_snapshot)
  values(p_boss_id,p_source_request_id,p_account_id,p_character_id,p_date_key,p_echo_only,p_phase_id,p_expires_at,p_party_id,left(p_party_name,80),p_guild_id,left(p_guild_name,80))
  returning * into v_attempt;
  return v_attempt;
end $$;
revoke all on function public.reserve_shared_world_boss_attempt(uuid,text,uuid,uuid,date,boolean,text,timestamptz,integer,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_shared_world_boss_attempt(uuid,text,uuid,uuid,date,boolean,text,timestamptz,integer,uuid,text,uuid,text) to service_role;

-- Atomic World Boss damage settlement. A duplicate encounter settlement returns its original result and never damages twice.
create or replace function public.settle_shared_world_boss_attempt(
  p_encounter_id uuid,
  p_account_id uuid,
  p_role_profile text,
  p_raid_impact bigint,
  p_requested_damage bigint,
  p_combat_result jsonb,
  p_impact_breakdown jsonb
)
returns table(duplicate boolean,applied_damage bigint,remaining_hp bigint,defeated boolean)
language plpgsql security definer set search_path=public as $$
declare
  v_attempt public.shared_world_world_boss_attempts%rowtype;
  v_boss public.shared_world_world_bosses%rowtype;
  v_applied bigint;
  v_now timestamptz := now();
begin
  select * into v_attempt from public.shared_world_world_boss_attempts where encounter_id=p_encounter_id for update;
  if not found then raise exception 'world_boss_attempt_not_found'; end if;
  if v_attempt.account_id <> p_account_id then raise exception 'world_boss_attempt_owner_mismatch'; end if;
  select * into v_boss from public.shared_world_world_bosses where id=v_attempt.boss_id for update;
  if v_attempt.state='settled' then
    return query select true,v_attempt.applied_global_damage,v_boss.remaining_hp,(v_boss.remaining_hp=0);
    return;
  end if;
  if v_attempt.state<>'reserved' then raise exception 'world_boss_attempt_not_settleable'; end if;
  if v_now > v_attempt.expires_at then raise exception 'world_boss_attempt_expired'; end if;
  v_applied := case when v_attempt.echo_only or v_boss.remaining_hp=0 then 0 else least(v_boss.remaining_hp,greatest(p_requested_damage,0)) end;
  update public.shared_world_world_boss_attempts set state='settled',role_profile=left(p_role_profile,32),combat_result_json=coalesce(p_combat_result,'{}'::jsonb),impact_breakdown_json=coalesce(p_impact_breakdown,'{}'::jsonb),raid_impact=greatest(p_raid_impact,0),requested_global_damage=greatest(p_requested_damage,0),applied_global_damage=v_applied,settled_at=v_now where encounter_id=p_encounter_id;
  if v_applied>0 then
    update public.shared_world_world_bosses set remaining_hp=remaining_hp-v_applied,defeated_at=case when remaining_hp-v_applied=0 then coalesce(defeated_at,v_now) else defeated_at end,state=case when remaining_hp-v_applied=0 then 'defeated' else state end,updated_at=v_now where id=v_boss.id returning * into v_boss;
  end if;
  insert into public.shared_world_world_boss_account_progress(boss_id,account_id,valid_attempts,echo_attempts,raid_impact,echo_raid_impact,applied_global_damage,best_attempt_impact,first_attempt_at,last_attempt_at)
  values(v_boss.id,p_account_id,case when v_attempt.echo_only then 0 else 1 end,case when v_attempt.echo_only then 1 else 0 end,case when v_attempt.echo_only then 0 else greatest(p_raid_impact,0) end,case when v_attempt.echo_only then greatest(p_raid_impact,0) else 0 end,v_applied,case when v_attempt.echo_only then 0 else greatest(p_raid_impact,0) end,v_attempt.created_at,v_now)
  on conflict(boss_id,account_id) do update set
    valid_attempts=public.shared_world_world_boss_account_progress.valid_attempts+excluded.valid_attempts,
    echo_attempts=public.shared_world_world_boss_account_progress.echo_attempts+excluded.echo_attempts,
    raid_impact=public.shared_world_world_boss_account_progress.raid_impact+excluded.raid_impact,
    echo_raid_impact=public.shared_world_world_boss_account_progress.echo_raid_impact+excluded.echo_raid_impact,
    applied_global_damage=public.shared_world_world_boss_account_progress.applied_global_damage+excluded.applied_global_damage,
    best_attempt_impact=greatest(public.shared_world_world_boss_account_progress.best_attempt_impact,excluded.best_attempt_impact),
    last_attempt_at=v_now,updated_at=v_now;
  return query select false,v_applied,v_boss.remaining_hp,(v_boss.remaining_hp=0);
end $$;
revoke all on function public.settle_shared_world_boss_attempt(uuid,uuid,text,bigint,bigint,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.settle_shared_world_boss_attempt(uuid,uuid,text,bigint,bigint,jsonb,jsonb) to service_role;

-- RLS: shared-world state is readable only through approved API/RPC/view layers; direct client mutation is forbidden.
alter table public.shared_world_regional_crisis_definitions enable row level security;
alter table public.shared_world_regional_crises enable row level security;
alter table public.shared_world_crisis_contributions enable row level security;
alter table public.shared_world_crisis_account_progress enable row level security;
alter table public.shared_world_crisis_stage_events enable row level security;
alter table public.shared_world_crisis_reward_claims enable row level security;
alter table public.shared_world_world_boss_definitions enable row level security;
alter table public.shared_world_world_bosses enable row level security;
alter table public.shared_world_world_boss_attempts enable row level security;
alter table public.shared_world_world_boss_account_progress enable row level security;
alter table public.shared_world_world_boss_phase_events enable row level security;
alter table public.shared_world_world_boss_final_ranks enable row level security;
alter table public.shared_world_world_boss_reward_claims enable row level security;

revoke all on public.shared_world_regional_crisis_definitions from anon,authenticated;
revoke all on public.shared_world_regional_crises from anon,authenticated;
revoke all on public.shared_world_crisis_contributions from anon,authenticated;
revoke all on public.shared_world_crisis_account_progress from anon,authenticated;
revoke all on public.shared_world_crisis_stage_events from anon,authenticated;
revoke all on public.shared_world_crisis_reward_claims from anon,authenticated;
revoke all on public.shared_world_world_boss_definitions from anon,authenticated;
revoke all on public.shared_world_world_bosses from anon,authenticated;
revoke all on public.shared_world_world_boss_attempts from anon,authenticated;
revoke all on public.shared_world_world_boss_account_progress from anon,authenticated;
revoke all on public.shared_world_world_boss_phase_events from anon,authenticated;
revoke all on public.shared_world_world_boss_final_ranks from anon,authenticated;
revoke all on public.shared_world_world_boss_reward_claims from anon,authenticated;

-- Extend v17.2 control-plane only when it exists. No separate admin-site page is required: the schema-driven Control page renders these commands.
do $$ begin
  if to_regclass('public.ops_remote_config') is not null then
    insert into public.ops_remote_config(config_key,category,label,description,value_type,default_value,current_value,exposure,risk_tier,live_change_safe,constraints_json,notes) values
      ('feature.regional_crises.enabled','Features','Regional Crises','Master gate for starting new Regional Crises and crediting new crisis contribution.','boolean','true','true','client_safe','critical',true,'{}','Existing crisis state is preserved while disabled.'),
      ('feature.world_bosses.enabled','Features','World Bosses','Master gate for new asynchronous World Boss attempts.','boolean','true','true','client_safe','critical',true,'{}','Existing attempt receipts remain settleable when safe.'),
      ('safety.regional_crisis.account_daily_credit_hard_cap','Safety','Regional Crisis daily hard cap','Emergency ceiling for Regional Crisis normalized contribution.','integer','3000','3000','server_only','critical',true,'{"min":500,"max":5000}','Apply as min(definition cap, this ceiling).'),
      ('safety.world_boss.daily_attempt_hard_cap','Safety','World Boss daily attempt hard cap','Emergency ceiling for score-bearing World Boss attempts.','integer','6','6','server_only','critical',true,'{"min":1,"max":12}','Apply as min(definition attempts, this ceiling).')
    on conflict(config_key) do nothing;
  end if;
end $$;

do $$ begin
  if to_regclass('public.ops_admin_command_registry') is not null then
    insert into public.ops_admin_command_registry(command_key,category,label,description,target_scope,min_role,risk_tier,handler_key,params_schema,reversible,requires_approval,notes) values
      ('shared_world.crisis_cancel','Shared World','Cancel Regional Crisis','Cancel one broken/scheduled Regional Crisis while preserving history.','none','owner','critical','shared_world.crisis_cancel','{"fields":[{"name":"instanceId","label":"Crisis instance ID","type":"uuid","required":true}]}',false,true,'Do not delete contribution history.'),
      ('shared_world.crisis_recalculate','Shared World','Recalculate Regional Crisis','Rebuild crisis aggregate totals from immutable contribution receipts.','none','owner','high','shared_world.crisis_recalculate','{"fields":[{"name":"instanceId","label":"Crisis instance ID","type":"uuid","required":true}]}',false,false,'Repair only; no arbitrary point injection.'),
      ('shared_world.world_boss_cancel','Shared World','Cancel World Boss','Cancel a broken World Boss while preserving attempts and audit history.','none','owner','critical','shared_world.world_boss_cancel','{"fields":[{"name":"instanceId","label":"World Boss instance ID","type":"uuid","required":true}]}',false,true,''),
      ('shared_world.world_boss_recalculate_hp','Shared World','Recalculate World Boss HP','Repair remaining HP from immutable settled attempt receipts.','none','owner','critical','shared_world.world_boss_recalculate_hp','{"fields":[{"name":"instanceId","label":"World Boss instance ID","type":"uuid","required":true}]}',false,true,'Never enter arbitrary HP; recompute from max HP minus canonical applied receipts.'),
      ('shared_world.world_boss_repair_attempt','Shared World','Repair Boss Attempt','Re-run safe settlement/recovery for one stuck authoritative World Boss encounter.','none','owner','high','shared_world.world_boss_repair_attempt','{"fields":[{"name":"encounterId","label":"Encounter ID","type":"uuid","required":true}]}',false,false,'Idempotent receipt recovery only.'),
      ('shared_world.world_boss_finalize','Shared World','Finalize World Boss','Freeze ranks/rewards after the boss resolution/grace rules are satisfied.','none','owner','critical','shared_world.world_boss_finalize','{"fields":[{"name":"instanceId","label":"World Boss instance ID","type":"uuid","required":true}]}',false,true,'Refuse while valid in-flight attempts remain inside grace.')
    on conflict(command_key) do update set category=excluded.category,label=excluded.label,description=excluded.description,target_scope=excluded.target_scope,min_role=excluded.min_role,risk_tier=excluded.risk_tier,handler_key=excluded.handler_key,params_schema=excluded.params_schema,reversible=excluded.reversible,requires_approval=excluded.requires_approval,notes=excluded.notes,updated_at=now();
  end if;
end $$;

comment on table public.shared_world_regional_crises is 'Server-wide regional campaign instances with frozen population scaling and immutable definition snapshots.';
comment on table public.shared_world_world_bosses is 'Asynchronous shared-HP World Boss instances. Individual encounters settle authoritative role-aware Raid Impact through idempotent receipts.';
comment on table public.shared_world_world_boss_attempts is 'One authoritative per-player encounter receipt; settled exactly once. Echo attempts after defeat never damage shared HP.';

commit;
