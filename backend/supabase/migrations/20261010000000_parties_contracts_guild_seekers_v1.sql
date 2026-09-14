-- VELDRYN v16 — Persistent Parties, asynchronous Party Contracts, ranked mini-events,
-- guild seekers, LFG/LFM recruitment lifecycle, and Party Chat access.
--
-- Design invariants:
-- * persistent Parties support 1–4 players and are NOT role locked;
-- * Live Dungeon matchmaking remains a separate exact 1 Tank / 2 Damage / 1 Support system;
-- * Party Contract scoring is based on canonical expected effort, not raw action counts;
-- * no Party currency is introduced;
-- * recruitment is time-limited and expired rows are never visible through active browse;
-- * contribution/reward mutations are idempotent and server-authoritative.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Persistent parties
-- ---------------------------------------------------------------------------

alter table public.parties add column if not exists leader_account_id uuid references auth.users(id) on delete cascade;
alter table public.parties add column if not exists focus text not null default 'mixed';
alter table public.parties add column if not exists updated_at timestamptz not null default now();

update public.parties p
   set leader_account_id = c.account_id
  from public.characters c
 where p.leader_account_id is null
   and c.id = p.leader_character_id;

alter table public.party_members add column if not exists account_id uuid references auth.users(id) on delete cascade;
alter table public.party_members add column if not exists left_at timestamptz;

update public.party_members pm
   set account_id = c.account_id
  from public.characters c
 where pm.account_id is null
   and c.id = pm.character_id;

-- New rows always require these ownership fields. Existing malformed rows should be fixed
-- before applying this migration in a production database.
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='parties' and column_name='leader_account_id')
     and not exists (select 1 from public.parties where leader_account_id is null) then
    alter table public.parties alter column leader_account_id set not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='party_members' and column_name='account_id')
     and not exists (select 1 from public.party_members where account_id is null) then
    alter table public.party_members alter column account_id set not null;
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'parties_focus_v16_check') then
    alter table public.parties add constraint parties_focus_v16_check check (focus in ('combat','skilling','mixed'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'party_members_role_v16_check') then
    alter table public.party_members add constraint party_members_role_v16_check check (role in ('tank','damage','support'));
  end if;
end $$;

do $$ begin
  if exists(select 1 from public.party_members where account_id is null)
    or exists(select 1 from public.parties where leader_account_id is null)
    or exists(select 1 from public.party_members where left_at is null group by account_id having count(*)>1)
    or exists(select 1 from public.party_members where left_at is null group by party_id having count(*)>4)
  then raise exception 'v16_legacy_party_state_requires_reconciliation'; end if;
end $$;
create unique index if not exists party_members_one_current_party_per_account_v16
  on public.party_members(account_id)
  where left_at is null;
create unique index if not exists party_members_one_account_per_party_v16
  on public.party_members(party_id, account_id)
  where left_at is null;
create index if not exists party_members_active_party_v16
  on public.party_members(party_id, joined_at)
  where left_at is null;

create or replace function public.enforce_persistent_party_size_v16()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_count integer;
begin
  if new.left_at is not null then return new; end if;

  -- Only an INSERT or re-activation of a previously-left membership increases party size.
  if tg_op = 'UPDATE' and old.left_at is null and old.party_id=new.party_id then return new; end if;

  perform 1 from public.parties where id=new.party_id for update;
  select count(*) into v_active_count
    from public.party_members
   where party_id = new.party_id and left_at is null;
  if v_active_count >= 4 then raise exception 'party_full'; end if;
  return new;
end;
$$;

drop trigger if exists enforce_persistent_party_size_v16 on public.party_members;
create trigger enforce_persistent_party_size_v16
before insert or update of left_at, party_id on public.party_members
for each row execute function public.enforce_persistent_party_size_v16();

create or replace function public.is_active_party_member_v16(p_party_id uuid, p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.party_members pm
    join public.parties p on p.id = pm.party_id
    where pm.party_id = p_party_id
      and pm.account_id = p_account_id
      and pm.left_at is null
      and p.status <> 'disbanded'
  );
$$;

-- Client-readable party state is restricted to current members.
drop policy if exists "persistent party member read v16" on public.parties;
create policy "persistent party member read v16"
  on public.parties for select
  using (public.is_active_party_member_v16(id, auth.uid()));

drop policy if exists "persistent party roster read v16" on public.party_members;
create policy "persistent party roster read v16"
  on public.party_members for select
  using (public.is_active_party_member_v16(party_id, auth.uid()));

create or replace function public.create_persistent_party_v16(
  p_leader_character_id uuid,
  p_role text,
  p_focus text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid := auth.uid();
  v_party_id uuid;
  v_response jsonb;
begin
  if v_account_id is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('party-account:'||v_account_id::text,0));
  if char_length(coalesce(p_idempotency_key,'')) not between 8 and 160 then raise exception 'invalid_idempotency_key'; end if;
  if p_role not in ('tank','damage','support') then raise exception 'invalid_party_role'; end if;
  if p_focus not in ('combat','skilling','mixed') then raise exception 'invalid_party_focus'; end if;

  select response into v_response
    from public.server_action_receipts
   where account_id=v_account_id and action='create_party' and idempotency_key=p_idempotency_key;
  if found then return (v_response->>'party_id')::uuid; end if;

  if not exists (select 1 from public.characters where id=p_leader_character_id and account_id=v_account_id) then
    raise exception 'character_not_owned';
  end if;
  if exists (select 1 from public.party_members where account_id=v_account_id and left_at is null) then
    raise exception 'account_already_in_party';
  end if;

  insert into public.parties(leader_character_id, leader_account_id, focus, status, created_at, updated_at)
  values(p_leader_character_id, v_account_id, p_focus, 'active', now(), now())
  returning id into v_party_id;

  insert into public.party_members(party_id, character_id, account_id, role, joined_at, left_at)
  values(v_party_id, p_leader_character_id, v_account_id, p_role, now(), null);

  insert into public.server_action_receipts(account_id,action,idempotency_key,response)
  values(v_account_id,'create_party',p_idempotency_key,jsonb_build_object('party_id',v_party_id));
  return v_party_id;
end;
$$;

create or replace function public.join_persistent_party_v16(
  p_party_id uuid,
  p_character_id uuid,
  p_role text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid := auth.uid();
  v_response jsonb;
  v_status text;
begin
  if v_account_id is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('party-account:'||v_account_id::text,0));
  if char_length(coalesce(p_idempotency_key,'')) not between 8 and 160 then raise exception 'invalid_idempotency_key'; end if;
  if p_role not in ('tank','damage','support') then raise exception 'invalid_party_role'; end if;

  select response into v_response
    from public.server_action_receipts
   where account_id=v_account_id and action='join_party' and idempotency_key=p_idempotency_key;
  if found then return (v_response->>'party_id')::uuid; end if;

  if not exists (select 1 from public.characters where id=p_character_id and account_id=v_account_id) then
    raise exception 'character_not_owned';
  end if;
  if exists (select 1 from public.party_members where account_id=v_account_id and left_at is null) then
    raise exception 'account_already_in_party';
  end if;

  select status into v_status from public.parties where id=p_party_id for update;
  if v_status is null then raise exception 'party_not_found'; end if;
  if v_status='disbanded' then raise exception 'party_inactive'; end if;
  if (select count(*) from public.party_members where party_id=p_party_id and left_at is null) >= 4 then
    raise exception 'party_full';
  end if;

  insert into public.party_members(party_id, character_id, account_id, role, joined_at, left_at)
  values(p_party_id,p_character_id,v_account_id,p_role,now(),null)
  on conflict (party_id,character_id) do update
    set account_id=excluded.account_id, role=excluded.role, joined_at=now(), left_at=null;

  update public.parties set status='active', updated_at=now() where id=p_party_id;
  insert into public.server_action_receipts(account_id,action,idempotency_key,response)
  values(v_account_id,'join_party',p_idempotency_key,jsonb_build_object('party_id',p_party_id));
  return p_party_id;
end;
$$;

create or replace function public.leave_persistent_party_v16(
  p_party_id uuid,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_id uuid := auth.uid();
  v_response jsonb;
  v_leader uuid;
  v_next_account uuid;
  v_next_character uuid;
begin
  if v_account_id is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('party-account:'||v_account_id::text,0));
  if char_length(coalesce(p_idempotency_key,'')) not between 8 and 160 then raise exception 'invalid_idempotency_key'; end if;

  select response into v_response
    from public.server_action_receipts
   where account_id=v_account_id and action='leave_party' and idempotency_key=p_idempotency_key;
  if found then return (v_response->>'party_id')::uuid; end if;

  select leader_account_id into v_leader from public.parties where id=p_party_id for update;
  if v_leader is null then raise exception 'party_not_found'; end if;
  if not exists (select 1 from public.party_members where party_id=p_party_id and account_id=v_account_id and left_at is null) then
    raise exception 'not_party_member';
  end if;

  update public.party_members set left_at=now()
   where party_id=p_party_id and account_id=v_account_id and left_at is null;

  if not exists (select 1 from public.party_members where party_id=p_party_id and left_at is null) then
    update public.parties set status='disbanded', updated_at=now() where id=p_party_id;
  elsif v_leader=v_account_id then
    select account_id,character_id into v_next_account,v_next_character
      from public.party_members
     where party_id=p_party_id and left_at is null
     order by joined_at asc, account_id asc
     limit 1;
    update public.parties
       set leader_account_id=v_next_account, leader_character_id=v_next_character, updated_at=now()
     where id=p_party_id;
  else
    update public.parties set updated_at=now() where id=p_party_id;
  end if;

  insert into public.server_action_receipts(account_id,action,idempotency_key,response)
  values(v_account_id,'leave_party',p_idempotency_key,jsonb_build_object('party_id',p_party_id));
  return p_party_id;
end;
$$;

revoke all on function public.create_persistent_party_v16(uuid,text,text,text) from public, anon;
revoke all on function public.join_persistent_party_v16(uuid,uuid,text,text) from public, anon;
revoke all on function public.leave_persistent_party_v16(uuid,text) from public, anon;
grant execute on function public.create_persistent_party_v16(uuid,text,text,text) to authenticated;
grant execute on function public.join_persistent_party_v16(uuid,uuid,text,text) to authenticated;
grant execute on function public.leave_persistent_party_v16(uuid,text) to authenticated;

-- ---------------------------------------------------------------------------
-- Party contracts and ranked mini-events
-- ---------------------------------------------------------------------------

create table if not exists public.party_contract_definitions_v16 (
  definition_id text not null,
  version integer not null check (version > 0),
  name text not null,
  category text not null check (category in ('combat','skilling','mixed')),
  cadence text not null check (cadence in ('weekly','mini_event')),
  minimum_personal_rate numeric(6,5) not null default 0.08 check (minimum_personal_rate between 0 and 0.5),
  active boolean not null default true,
  primary key(definition_id,version)
);

create table if not exists public.party_contract_objectives_v16 (
  definition_id text not null,
  definition_version integer not null,
  objective_id text not null,
  activity_kind text not null check (activity_kind in ('combat','gathering','crafting','mixed')),
  metric text not null,
  target_units numeric(18,4) not null check (target_units > 0),
  expected_seconds_per_unit numeric(18,4) not null check (expected_seconds_per_unit > 0),
  setup_minutes numeric(18,4) not null default 0 check (setup_minutes >= 0),
  preparation_minutes_per_unit numeric(18,4) not null default 0 check (preparation_minutes_per_unit >= 0),
  difficulty text not null check (difficulty in ('routine','standard','hard','elite','boss')),
  point_budget integer not null check (point_budget > 0),
  primary key(definition_id,definition_version,objective_id),
  foreign key(definition_id,definition_version) references public.party_contract_definitions_v16(definition_id,version) on delete cascade
);

create table if not exists public.party_contract_instances_v16 (
  id uuid primary key default gen_random_uuid(),
  assignment_key text not null unique,
  party_id uuid not null references public.parties(id) on delete cascade,
  definition_id text not null,
  definition_version integer not null,
  cadence text not null check (cadence in ('weekly','mini_event')),
  season_key text not null,
  status text not null default 'active' check (status in ('active','completed','expired','cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  total_target_points integer not null check (total_target_points > 0),
  minimum_personal_points integer not null check (minimum_personal_points > 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key(definition_id,definition_version) references public.party_contract_definitions_v16(definition_id,version)
);
create index if not exists party_contract_instances_party_v16 on public.party_contract_instances_v16(party_id,status,ends_at desc);
create unique index if not exists one_weekly_definition_per_party_v16
  on public.party_contract_instances_v16(party_id,definition_id,season_key)
  where status <> 'cancelled';

create table if not exists public.party_contract_progress_v16 (
  instance_id uuid not null references public.party_contract_instances_v16(id) on delete cascade,
  objective_id text not null,
  units numeric(18,4) not null default 0 check (units >= 0),
  normalized_points integer not null default 0 check (normalized_points >= 0),
  updated_at timestamptz not null default now(),
  primary key(instance_id,objective_id)
);

create table if not exists public.party_contract_member_progress_v16 (
  instance_id uuid not null references public.party_contract_instances_v16(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  normalized_points integer not null default 0 check (normalized_points >= 0),
  updated_at timestamptz not null default now(),
  primary key(instance_id,account_id)
);

create table if not exists public.party_contract_contributions_v16 (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.party_contract_instances_v16(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  objective_id text not null,
  accepted_units numeric(18,4) not null check (accepted_units >= 0),
  normalized_points integer not null check (normalized_points >= 0),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 180),
  created_at timestamptz not null default now(),
  unique(instance_id,idempotency_key)
);

create table if not exists public.party_contract_reward_entitlements_v16 (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references public.party_contract_instances_v16(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  reward_key text not null,
  reward_json jsonb not null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(instance_id,account_id,reward_key)
);

create table if not exists public.party_ranked_events_v16 (
  event_key text primary key,
  name text not null,
  definition_id text not null,
  definition_version integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','active','ended')),
  reward_rules jsonb not null default '{}'::jsonb,
  foreign key(definition_id,definition_version) references public.party_contract_definitions_v16(definition_id,version)
);

create table if not exists public.party_rankings_v16 (
  event_key text not null references public.party_ranked_events_v16(event_key) on delete cascade,
  party_id uuid not null references public.parties(id) on delete cascade,
  normalized_points integer not null default 0 check (normalized_points >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(event_key,party_id)
);
create index if not exists party_rankings_order_v16 on public.party_rankings_v16(event_key,normalized_points desc,completed_at asc nulls last);

alter table public.party_contract_definitions_v16 enable row level security;
alter table public.party_contract_objectives_v16 enable row level security;
alter table public.party_contract_instances_v16 enable row level security;
alter table public.party_contract_progress_v16 enable row level security;
alter table public.party_contract_member_progress_v16 enable row level security;
alter table public.party_contract_contributions_v16 enable row level security;
alter table public.party_contract_reward_entitlements_v16 enable row level security;
alter table public.party_ranked_events_v16 enable row level security;
alter table public.party_rankings_v16 enable row level security;

create policy "contract definitions public read v16" on public.party_contract_definitions_v16 for select using(true);
create policy "contract objectives public read v16" on public.party_contract_objectives_v16 for select using(true);
create policy "party members read contract instances v16" on public.party_contract_instances_v16
for select using (public.is_active_party_member_v16(party_id,auth.uid()));
create policy "party members read objective progress v16" on public.party_contract_progress_v16
for select using (exists(select 1 from public.party_contract_instances_v16 i where i.id=instance_id and public.is_active_party_member_v16(i.party_id,auth.uid())));
create policy "party members read member contribution v16" on public.party_contract_member_progress_v16
for select using (exists(select 1 from public.party_contract_instances_v16 i where i.id=instance_id and public.is_active_party_member_v16(i.party_id,auth.uid())));
create policy "party members read contribution feed v16" on public.party_contract_contributions_v16
for select using (exists(select 1 from public.party_contract_instances_v16 i where i.id=instance_id and public.is_active_party_member_v16(i.party_id,auth.uid())));
create policy "account reads own contract rewards v16" on public.party_contract_reward_entitlements_v16
for select using (account_id=auth.uid());
create policy "ranked events public read v16" on public.party_ranked_events_v16 for select using(true);
create policy "party rankings public read v16" on public.party_rankings_v16 for select using(true);

-- Seed the initial content definitions. Raw action quantities differ deliberately; point budgets
-- represent expected time/preparation and difficulty rather than "one action = one point".
insert into public.party_contract_definitions_v16(definition_id,version,name,category,cadence,minimum_personal_rate)
values
 ('party_weekly_combat_v1',1,'Hold the Frontier','combat','weekly',0.08),
 ('party_weekly_skilling_v1',1,'Supply the Roads','skilling','weekly',0.08),
 ('party_weekly_mixed_v1',1,'Guildroad Expedition','mixed','weekly',0.08),
 ('party_event_frontier_rush_v1',1,'Frontier Rush','mixed','mini_event',0.10)
on conflict(definition_id,version) do update set name=excluded.name,category=excluded.category,cadence=excluded.cadence,minimum_personal_rate=excluded.minimum_personal_rate;

insert into public.party_contract_objectives_v16(
 definition_id,definition_version,objective_id,activity_kind,metric,target_units,expected_seconds_per_unit,setup_minutes,preparation_minutes_per_unit,difficulty,point_budget)
values
 ('party_weekly_combat_v1',1,'standard_hunts','combat','verified_standard_enemy_kills',120,28,10,0,'standard',660),
 ('party_weekly_combat_v1',1,'elite_hunts','combat','verified_elite_kills',12,150,6,0,'elite',522),
 ('party_weekly_combat_v1',1,'boss_hunts','combat','verified_regional_boss_kills',2,720,8,0,'boss',560),
 ('party_weekly_skilling_v1',1,'gather_materials','gathering','verified_weighted_gather_actions',160,22,8,0,'standard',667),
 ('party_weekly_skilling_v1',1,'craft_orders','crafting','verified_weighted_crafts',32,55,8,0.8,'hard',755),
 ('party_weekly_mixed_v1',1,'mixed_hunts','combat','verified_standard_enemy_kills',70,30,6,0,'standard',410),
 ('party_weekly_mixed_v1',1,'mixed_gather','gathering','verified_weighted_gather_actions',90,22,5,0,'standard',380),
 ('party_weekly_mixed_v1',1,'mixed_craft','crafting','verified_weighted_crafts',16,60,5,0.9,'hard',425),
 ('party_event_frontier_rush_v1',1,'rush_elites','combat','verified_elite_kills',18,145,5,0,'elite',703),
 ('party_event_frontier_rush_v1',1,'rush_supplies','gathering','verified_weighted_gather_actions',100,24,4,0,'standard',440),
 ('party_event_frontier_rush_v1',1,'rush_crafts','crafting','verified_weighted_crafts',20,60,4,0.8,'hard',480)
on conflict(definition_id,definition_version,objective_id) do update
set activity_kind=excluded.activity_kind, metric=excluded.metric, target_units=excluded.target_units,
    expected_seconds_per_unit=excluded.expected_seconds_per_unit, setup_minutes=excluded.setup_minutes,
    preparation_minutes_per_unit=excluded.preparation_minutes_per_unit, difficulty=excluded.difficulty,
    point_budget=excluded.point_budget;

create or replace function public.create_party_contract_instance_v16(
  p_assignment_key text,
  p_party_id uuid,
  p_definition_id text,
  p_definition_version integer,
  p_season_key text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing uuid;
  v_instance uuid;
  v_cadence text;
  v_rate numeric;
  v_total integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('contract-assignment:'||p_party_id::text,0));
  if char_length(coalesce(p_assignment_key,'')) < 8 then raise exception 'invalid_assignment_key'; end if;
  select id into v_existing from public.party_contract_instances_v16 where assignment_key=p_assignment_key;
  if found then return v_existing; end if;
  if p_ends_at <= p_starts_at then raise exception 'invalid_contract_window'; end if;
  if not exists(select 1 from public.parties where id=p_party_id and status <> 'disbanded') then raise exception 'party_inactive'; end if;

  select cadence,minimum_personal_rate into v_cadence,v_rate
    from public.party_contract_definitions_v16
   where definition_id=p_definition_id and version=p_definition_version and active=true;
  if v_cadence is null then raise exception 'contract_definition_not_found'; end if;
  if v_cadence='weekly' and (p_starts_at <> date_trunc('week',p_starts_at at time zone 'UTC') at time zone 'UTC'
      or p_ends_at <> p_starts_at+interval '7 days' or p_season_key <> to_char(p_starts_at at time zone 'UTC','YYYY-MM-DD')) then
    raise exception 'invalid_weekly_scope';
  end if;
  if v_cadence='mini_event' and not exists(select 1 from public.party_ranked_events_v16 e
    where e.event_key=p_season_key and e.definition_id=p_definition_id and e.definition_version=p_definition_version
    and e.starts_at=p_starts_at and e.ends_at=p_ends_at and e.status in ('scheduled','active')) then
    raise exception 'invalid_ranked_scope';
  end if;
  select coalesce(sum(point_budget),0)::integer into v_total
    from public.party_contract_objectives_v16
   where definition_id=p_definition_id and definition_version=p_definition_version;
  if v_total <= 0 then raise exception 'contract_has_no_objectives'; end if;

  insert into public.party_contract_instances_v16(
    assignment_key,party_id,definition_id,definition_version,cadence,season_key,status,starts_at,ends_at,total_target_points,minimum_personal_points)
  values(
    p_assignment_key,p_party_id,p_definition_id,p_definition_version,v_cadence,p_season_key,'active',p_starts_at,p_ends_at,v_total,greatest(1,ceil(v_total*v_rate)::integer))
  returning id into v_instance;
  return v_instance;
end;
$$;

-- Trusted game settlement paths call this after verifying the combat/skilling/crafting event.
-- The database itself derives points from cumulative objective progress and caps them at target.
create or replace function public.record_party_contract_contribution_v16(
  p_instance_id uuid,
  p_account_id uuid,
  p_objective_id text,
  p_delta_units numeric,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instance public.party_contract_instances_v16;
  v_target numeric;
  v_budget integer;
  v_old_units numeric := 0;
  v_new_units numeric;
  v_old_points integer := 0;
  v_new_points integer;
  v_delta_points integer;
  v_existing public.party_contract_contributions_v16;
  v_total integer;
begin
  perform 1 from public.party_contract_instances_v16 where id=p_instance_id for update;
  if p_delta_units is null or p_delta_units::text in ('NaN','Infinity','-Infinity') or p_delta_units <= 0 then raise exception 'invalid_contribution_delta'; end if;
  if char_length(coalesce(p_idempotency_key,'')) not between 8 and 160 then raise exception 'invalid_idempotency_key'; end if;

  select * into v_existing from public.party_contract_contributions_v16
   where instance_id=p_instance_id and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.account_id<>p_account_id or v_existing.objective_id<>p_objective_id then raise exception 'contribution_idempotency_conflict'; end if;
    return jsonb_build_object('replayed',true,'accepted_units',v_existing.accepted_units,'normalized_points',v_existing.normalized_points);
  end if;

  select * into v_instance from public.party_contract_instances_v16 where id=p_instance_id for update;
  if v_instance.id is null then raise exception 'party_contract_not_found'; end if;
  if v_instance.status <> 'active' or now() < v_instance.starts_at or now() >= v_instance.ends_at then raise exception 'party_contract_inactive'; end if;
  if not public.is_active_party_member_v16(v_instance.party_id,p_account_id) then raise exception 'contributor_not_party_member'; end if;

  select target_units,point_budget into v_target,v_budget
    from public.party_contract_objectives_v16
   where definition_id=v_instance.definition_id and definition_version=v_instance.definition_version and objective_id=p_objective_id;
  if v_target is null then raise exception 'party_contract_objective_not_found'; end if;

  insert into public.party_contract_progress_v16(instance_id,objective_id,units,normalized_points)
  values(p_instance_id,p_objective_id,0,0)
  on conflict(instance_id,objective_id) do nothing;

  select units,normalized_points into v_old_units,v_old_points
    from public.party_contract_progress_v16
   where instance_id=p_instance_id and objective_id=p_objective_id
   for update;

  v_new_units := least(v_target,v_old_units+round(p_delta_units,4));
  v_new_points := floor(v_budget*v_new_units/v_target)::integer;
  v_delta_points := greatest(0,v_new_points-v_old_points);

  update public.party_contract_progress_v16
     set units=v_new_units,normalized_points=v_new_points,updated_at=now()
   where instance_id=p_instance_id and objective_id=p_objective_id;

  insert into public.party_contract_member_progress_v16(instance_id,account_id,normalized_points,updated_at)
  values(p_instance_id,p_account_id,v_delta_points,now())
  on conflict(instance_id,account_id) do update
    set normalized_points=public.party_contract_member_progress_v16.normalized_points+excluded.normalized_points,
        updated_at=now();

  insert into public.party_contract_contributions_v16(instance_id,account_id,objective_id,accepted_units,normalized_points,idempotency_key)
  values(p_instance_id,p_account_id,p_objective_id,v_new_units-v_old_units,v_delta_points,p_idempotency_key);

  if not exists (
    select 1
      from public.party_contract_objectives_v16 o
      left join public.party_contract_progress_v16 p
        on p.instance_id=p_instance_id and p.objective_id=o.objective_id
     where o.definition_id=v_instance.definition_id
       and o.definition_version=v_instance.definition_version
       and coalesce(p.units,0) < o.target_units
  ) then
    update public.party_contract_instances_v16
       set status='completed',completed_at=coalesce(completed_at,now())
     where id=p_instance_id;
  end if;

  select coalesce(sum(normalized_points),0)::integer into v_total
    from public.party_contract_progress_v16 where instance_id=p_instance_id;

  if v_instance.cadence='mini_event' and exists(select 1 from public.party_ranked_events_v16 e where e.event_key=v_instance.season_key and now()>=e.starts_at and now()<e.ends_at) then
    insert into public.party_rankings_v16(event_key,party_id,normalized_points,completed_at,updated_at)
    values(v_instance.season_key,v_instance.party_id,v_total,(select completed_at from public.party_contract_instances_v16 where id=p_instance_id),now())
    on conflict(event_key,party_id) do update
      set normalized_points=greatest(public.party_rankings_v16.normalized_points,excluded.normalized_points),
          completed_at=coalesce(public.party_rankings_v16.completed_at,excluded.completed_at),
          updated_at=now();
  end if;

  return jsonb_build_object('replayed',false,'accepted_units',v_new_units-v_old_units,'normalized_points',v_delta_points,'total_points',v_total);
end;
$$;

create or replace function public.create_party_contract_rewards_v16(
  p_instance_id uuid,
  p_reward_key text,
  p_reward_json jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instance public.party_contract_instances_v16;
  v_changed integer;
begin
  select * into v_instance from public.party_contract_instances_v16 where id=p_instance_id for update;
  if v_instance.id is null then raise exception 'party_contract_not_found'; end if;
  if v_instance.status <> 'completed' then raise exception 'party_contract_not_completed'; end if;

  insert into public.party_contract_reward_entitlements_v16(instance_id,account_id,reward_key,reward_json)
  select p_instance_id,mp.account_id,p_reward_key,p_reward_json
    from public.party_contract_member_progress_v16 mp
   where mp.instance_id=p_instance_id
     and mp.normalized_points >= v_instance.minimum_personal_points
  on conflict(instance_id,account_id,reward_key) do nothing;
  get diagnostics v_changed = row_count;
  return v_changed;
end;
$$;

-- Mutating contract functions are trusted-server only. Authenticated clients can read projections.
revoke all on function public.create_party_contract_instance_v16(text,uuid,text,integer,text,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function public.record_party_contract_contribution_v16(uuid,uuid,text,numeric,text) from public, anon, authenticated;
revoke all on function public.create_party_contract_rewards_v16(uuid,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_party_contract_instance_v16(text,uuid,text,integer,text,timestamptz,timestamptz) to service_role;
grant execute on function public.record_party_contract_contribution_v16(uuid,uuid,text,numeric,text) to service_role;
grant execute on function public.create_party_contract_rewards_v16(uuid,text,jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Recruitment: LFG, LFM, guild recruiting, guild seekers
-- ---------------------------------------------------------------------------

create table if not exists public.recruitment_posts (
  id uuid primary key default gen_random_uuid(),
  owner_account_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  owner_character_id uuid references public.characters(id) on delete set null,
  guild_id uuid references public.guilds(id) on delete cascade,
  party_id uuid references public.parties(id) on delete cascade,
  post_type text not null,
  title text not null,
  body text not null default '',
  roles text[] not null default '{}',
  focus text not null default 'any',
  activity_tags text[] not null default '{}',
  playstyle_tags text[] not null default '{}',
  availability_tags text[] not null default '{}',
  guild_interest_tags text[] not null default '{}',
  activity_level text,
  current_objective text,
  open_spots integer,
  language text,
  region text,
  min_combat_level integer,
  min_total_level integer,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  refreshed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz
);

alter table public.recruitment_posts add column if not exists party_id uuid references public.parties(id) on delete cascade;
alter table public.recruitment_posts add column if not exists focus text not null default 'any';
alter table public.recruitment_posts add column if not exists availability_tags text[] not null default '{}';
alter table public.recruitment_posts add column if not exists guild_interest_tags text[] not null default '{}';
alter table public.recruitment_posts add column if not exists activity_level text;
alter table public.recruitment_posts add column if not exists current_objective text;
alter table public.recruitment_posts add column if not exists open_spots integer;

-- Replace the earlier created-at based expiry constraint if present: refreshing a three-day
-- guild advert after six hours must remain legal because the new expiry is relative to refresh.
alter table public.recruitment_posts drop constraint if exists recruitment_expiry_window;

do $$
begin
  if not exists(select 1 from pg_constraint where conname='recruitment_post_type_v16_check') then
    alter table public.recruitment_posts add constraint recruitment_post_type_v16_check check(post_type in ('looking_for_guild','guild_recruiting','looking_for_party','party_recruiting'));
  end if;
  if not exists(select 1 from pg_constraint where conname='recruitment_title_v16_check') then
    alter table public.recruitment_posts add constraint recruitment_title_v16_check check(char_length(title) between 3 and 80);
  end if;
  if not exists(select 1 from pg_constraint where conname='recruitment_body_v16_check') then
    alter table public.recruitment_posts add constraint recruitment_body_v16_check check(char_length(body) <= 600);
  end if;
  if not exists(select 1 from pg_constraint where conname='recruitment_focus_v16_check') then
    alter table public.recruitment_posts add constraint recruitment_focus_v16_check check(focus in ('combat','skilling','mixed','any'));
  end if;
  if not exists(select 1 from pg_constraint where conname='recruitment_activity_level_v16_check') then
    alter table public.recruitment_posts add constraint recruitment_activity_level_v16_check check(activity_level is null or activity_level in ('casual','regular','active','hardcore'));
  end if;
  if not exists(select 1 from pg_constraint where conname='recruitment_open_spots_v16_check') then
    alter table public.recruitment_posts add constraint recruitment_open_spots_v16_check check(open_spots is null or open_spots between 0 and 3);
  end if;
  if not exists(select 1 from pg_constraint where conname='recruitment_current_objective_v16_check') then
    alter table public.recruitment_posts add constraint recruitment_current_objective_v16_check check(current_objective is null or char_length(current_objective) <= 120);
  end if;
  if not exists(select 1 from pg_constraint where conname='recruitment_status_v16_check') then
    alter table public.recruitment_posts add constraint recruitment_status_v16_check check(status in ('active','closed','expired'));
  end if;
  if not exists(select 1 from pg_constraint where conname='recruitment_expiry_v16_check') then
    alter table public.recruitment_posts add constraint recruitment_expiry_v16_check check(expires_at > refreshed_at and expires_at <= refreshed_at + interval '3 days 5 minutes');
  end if;
end $$;

create unique index if not exists recruitment_one_active_owner_type_v16
  on public.recruitment_posts(owner_account_id,post_type)
  where status='active';
create index if not exists recruitment_active_expiry_v16 on public.recruitment_posts(status,expires_at,refreshed_at desc);
create index if not exists recruitment_type_focus_v16 on public.recruitment_posts(post_type,focus,refreshed_at desc);
create index if not exists recruitment_region_language_v16 on public.recruitment_posts(region,language);
create index if not exists recruitment_roles_gin_v16 on public.recruitment_posts using gin(roles);
create index if not exists recruitment_activity_gin_v16 on public.recruitment_posts using gin(activity_tags);
create index if not exists recruitment_playstyle_gin_v16 on public.recruitment_posts using gin(playstyle_tags);
create index if not exists recruitment_availability_gin_v16 on public.recruitment_posts using gin(availability_tags);
create index if not exists recruitment_guild_interest_gin_v16 on public.recruitment_posts using gin(guild_interest_tags);

alter table public.recruitment_posts enable row level security;

drop policy if exists "recruitment posts publicly readable while active" on public.recruitment_posts;
drop policy if exists "users create own recruitment posts" on public.recruitment_posts;
drop policy if exists "users update own recruitment posts" on public.recruitment_posts;
drop policy if exists "users delete own recruitment posts" on public.recruitment_posts;

drop policy if exists "active recruitment browse v16" on public.recruitment_posts;
create policy "active recruitment browse v16" on public.recruitment_posts for select
using ((status='active' and expires_at>now()) or owner_account_id=auth.uid());

create or replace view public.active_recruitment_posts
with (security_invoker=true) as
select * from public.recruitment_posts
where status='active' and expires_at>now();

create or replace function public.expire_recruitment_posts()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_changed integer;
begin
  update public.recruitment_posts
     set status='expired',closed_at=coalesce(closed_at,now())
   where status='active' and expires_at<=now();
  get diagnostics v_changed=row_count;
  return v_changed;
end;
$$;

create or replace function public.publish_recruitment_post_v16(
  p_post_type text,
  p_title text,
  p_body text default '',
  p_duration_days integer default null,
  p_owner_character_id uuid default null,
  p_guild_id uuid default null,
  p_party_id uuid default null,
  p_roles text[] default '{}',
  p_focus text default 'any',
  p_activity_tags text[] default '{}',
  p_playstyle_tags text[] default '{}',
  p_availability_tags text[] default '{}',
  p_guild_interest_tags text[] default '{}',
  p_activity_level text default null,
  p_current_objective text default null,
  p_open_spots integer default null,
  p_language text default null,
  p_region text default null,
  p_min_combat_level integer default null,
  p_min_total_level integer default null
)
returns public.recruitment_posts
language plpgsql
security definer
set search_path=public
as $$
declare
  v_account uuid := auth.uid();
  v_days integer;
  v_last_refresh timestamptz;
  v_post public.recruitment_posts;
begin
  if v_account is null then raise exception 'authentication_required'; end if;
  -- Publication, refresh and replacement share a lock, including different Guild officers.
  perform pg_advisory_xact_lock(hashtextextended('recruitment-v16',0));
  if p_post_type not in ('looking_for_guild','guild_recruiting','looking_for_party','party_recruiting') then raise exception 'invalid_recruitment_type'; end if;
  if char_length(trim(coalesce(p_title,''))) not between 3 and 80 then raise exception 'invalid_recruitment_title'; end if;
  if char_length(coalesce(p_body,'')) > 600 then raise exception 'invalid_recruitment_body'; end if;
  if p_focus not in ('combat','skilling','mixed','any') then raise exception 'invalid_recruitment_focus'; end if;
  if p_activity_level is not null and p_activity_level not in ('casual','regular','active','hardcore') then raise exception 'invalid_activity_level'; end if;
  if p_current_objective is not null and char_length(p_current_objective)>120 then raise exception 'invalid_current_objective'; end if;
  if p_open_spots is not null and (p_open_spots<0 or p_open_spots>3) then raise exception 'invalid_open_spots'; end if;
  if p_min_combat_level is not null and p_min_combat_level<0 then raise exception 'invalid_min_combat_level'; end if;
  if p_min_total_level is not null and p_min_total_level<0 then raise exception 'invalid_min_total_level'; end if;

  v_days := coalesce(p_duration_days,case when p_post_type in ('looking_for_party','party_recruiting') then 1 else 3 end);
  if p_post_type in ('looking_for_party','party_recruiting') and v_days<>1 then raise exception 'party_recruitment_duration_must_be_one_day'; end if;
  if p_post_type in ('looking_for_guild','guild_recruiting') and v_days not in (1,3) then raise exception 'guild_recruitment_duration_invalid'; end if;

  select max(refreshed_at) into v_last_refresh
    from public.recruitment_posts where post_type=p_post_type and
      (owner_account_id=v_account or (p_party_id is not null and party_id=p_party_id)
       or (p_guild_id is not null and guild_id=p_guild_id));
  if v_last_refresh is not null and v_last_refresh>now()-interval '6 hours' then raise exception 'recruitment_refresh_cooldown'; end if;

  if p_owner_character_id is not null and not exists(select 1 from public.characters where id=p_owner_character_id and account_id=v_account) then
    raise exception 'character_not_owned';
  end if;
  if p_post_type='looking_for_party' then
    if p_party_id is not null or p_guild_id is not null then raise exception 'lfg_must_be_individual'; end if;
    if exists(select 1 from public.party_members where account_id=v_account and left_at is null) then raise exception 'already_in_party'; end if;
  elsif p_post_type='party_recruiting' then
    if p_party_id is null or p_open_spots is null then raise exception 'party_recruitment_requires_party_and_open_spots'; end if;
    if not exists(select 1 from public.parties where id=p_party_id and leader_account_id=v_account and status<>'disbanded') then raise exception 'party_leader_required'; end if;
    if p_guild_id is not null then raise exception 'party_recruitment_guild_not_allowed'; end if;
  elsif p_post_type='looking_for_guild' then
    if p_guild_id is not null or p_party_id is not null then raise exception 'guild_seeker_must_be_individual'; end if;
    if exists(select 1 from public.guild_members where account_id=v_account) then raise exception 'already_in_guild'; end if;
  elsif p_post_type='guild_recruiting' then
    if p_guild_id is null then raise exception 'guild_recruitment_requires_guild'; end if;
    if not exists(select 1 from public.guild_members where guild_id=p_guild_id and account_id=v_account and role in ('leader','officer')) then raise exception 'guild_officer_required'; end if;
    if p_party_id is not null then raise exception 'guild_recruitment_party_not_allowed'; end if;
  end if;

  update public.recruitment_posts
     set status='closed',closed_at=now()
   where post_type=p_post_type and status='active' and
     (owner_account_id=v_account or (p_party_id is not null and party_id=p_party_id)
      or (p_guild_id is not null and guild_id=p_guild_id));

  insert into public.recruitment_posts(
    owner_account_id,owner_character_id,guild_id,party_id,post_type,title,body,roles,focus,activity_tags,playstyle_tags,
    availability_tags,guild_interest_tags,activity_level,current_objective,open_spots,language,region,min_combat_level,min_total_level,
    status,created_at,refreshed_at,expires_at)
  values(
    v_account,p_owner_character_id,p_guild_id,p_party_id,p_post_type,trim(p_title),coalesce(p_body,''),coalesce(p_roles,'{}'),p_focus,
    coalesce(p_activity_tags,'{}'),coalesce(p_playstyle_tags,'{}'),coalesce(p_availability_tags,'{}'),coalesce(p_guild_interest_tags,'{}'),
    p_activity_level,p_current_objective,p_open_spots,p_language,p_region,p_min_combat_level,p_min_total_level,'active',now(),now(),now()+make_interval(days=>v_days))
  returning * into v_post;
  return v_post;
end;
$$;

create or replace function public.refresh_recruitment_post(p_post_id uuid,p_duration_days integer default null)
returns public.recruitment_posts
language plpgsql
security definer
set search_path=public
as $$
declare
  v_account uuid:=auth.uid();
  v_post public.recruitment_posts;
  v_days integer;
begin
  if v_account is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('recruitment-v16',0));
  select * into v_post from public.recruitment_posts where id=p_post_id for update;
  if v_post.id is null then raise exception 'recruitment_post_not_found'; end if;
  if v_post.owner_account_id<>v_account then raise exception 'not_recruitment_post_owner'; end if;
  if v_post.status='closed' then raise exception 'recruitment_post_closed'; end if;
  if exists(select 1 from public.recruitment_posts p where p.id<>v_post.id and p.status='active'
    and p.post_type=v_post.post_type and (p.owner_account_id=v_account or p.party_id=v_post.party_id or p.guild_id=v_post.guild_id)) then raise exception 'recruitment_post_superseded'; end if;
  if exists(select 1 from public.recruitment_posts p where p.post_type=v_post.post_type
      and (p.owner_account_id=v_account or p.party_id=v_post.party_id or p.guild_id=v_post.guild_id)
      and p.refreshed_at>now()-interval '6 hours') then raise exception 'recruitment_refresh_cooldown'; end if;
  v_days:=coalesce(p_duration_days,case when v_post.post_type in ('looking_for_party','party_recruiting') then 1 else 3 end);
  if v_post.post_type in ('looking_for_party','party_recruiting') and v_days<>1 then raise exception 'party_recruitment_duration_must_be_one_day'; end if;
  if v_post.post_type in ('looking_for_guild','guild_recruiting') and v_days not in (1,3) then raise exception 'guild_recruitment_duration_invalid'; end if;

  update public.recruitment_posts
     set status='active',refreshed_at=now(),expires_at=now()+make_interval(days=>v_days),closed_at=null
   where id=p_post_id
   returning * into v_post;
  return v_post;
end;
$$;

create or replace function public.close_recruitment_post_v16(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('recruitment-v16',0));
  update public.recruitment_posts set status='closed',closed_at=now()
   where id=p_post_id and owner_account_id=auth.uid() and status<>'closed';
  return found;
end;
$$;

revoke all on function public.publish_recruitment_post_v16(text,text,text,integer,uuid,uuid,uuid,text[],text,text[],text[],text[],text[],text,text,integer,text,text,integer,integer) from public, anon;
revoke all on function public.refresh_recruitment_post(uuid,integer) from public, anon;
revoke all on function public.close_recruitment_post_v16(uuid) from public, anon;
revoke all on function public.expire_recruitment_posts() from public, anon, authenticated;
grant execute on function public.publish_recruitment_post_v16(text,text,text,integer,uuid,uuid,uuid,text[],text,text[],text[],text[],text[],text,text,integer,text,text,integer,integer) to authenticated;
grant execute on function public.refresh_recruitment_post(uuid,integer) to authenticated;
grant execute on function public.close_recruitment_post_v16(uuid) to authenticated;
grant execute on function public.expire_recruitment_posts() to service_role;

-- ---------------------------------------------------------------------------
-- Party chat: the chat tab/room only exists for current Party members.
-- ---------------------------------------------------------------------------

-- v15's policy referenced private co-op tables without SELECT grants. Keep the exact
-- Live membership/epoch predicate behind a definer helper, without exposing those tables.
create or replace function public.can_read_live_party_chat_v16(p_channel text,p_account uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.coop_run_access_memberships a join public.expedition_runs r on r.id=a.run_id
 where r.coop_mode='live' and a.active and a.account_id=p_account
 and split_part(p_channel,':',1)=a.run_id::text and split_part(p_channel,':',2)=a.channel_epoch::text);
$$;
revoke all on function public.can_read_live_party_chat_v16(text,uuid) from public,anon;
grant execute on function public.can_read_live_party_chat_v16(text,uuid) to authenticated;
drop policy if exists coop_party_chat_read_active_epoch on public.chat_messages;
create policy coop_party_chat_read_active_epoch on public.chat_messages for select to authenticated
using(channel_type='party' and public.can_read_live_party_chat_v16(channel_id,auth.uid()));

drop policy if exists "party chat current members read v16" on public.chat_messages;
create policy "party chat current members read v16" on public.chat_messages
for select using (
  channel_type='party'
  and exists(select 1 from public.parties p where p.id::text=chat_messages.channel_id and public.is_active_party_member_v16(p.id,auth.uid()))
);

-- Existing send-message server code remains the authoritative insert path; clients do not receive
-- a direct chat INSERT policy here.

-- v15 integration: validated recruitment, existing receipt/economy stores and authenticated projections.
create unique index recruitment_one_party_ad_v16 on public.recruitment_posts(party_id)
where status='active' and post_type='party_recruiting';
create unique index recruitment_one_guild_ad_v16 on public.recruitment_posts(guild_id)
where status='active' and post_type='guild_recruiting';

create or replace function public.recruitment_scope_valid_v16(p public.recruitment_posts)
returns boolean language sql stable security definer set search_path=public as $$
select case p.post_type
 when 'looking_for_party' then not exists(select 1 from public.party_members m where m.account_id=p.owner_account_id and m.left_at is null)
 when 'party_recruiting' then exists(select 1 from public.parties a where a.id=p.party_id and a.status<>'disbanded' and a.leader_account_id=p.owner_account_id)
 when 'looking_for_guild' then not exists(select 1 from public.guild_members m where m.account_id=p.owner_account_id)
 when 'guild_recruiting' then exists(select 1 from public.guild_members m where m.guild_id=p.guild_id and m.account_id=p.owner_account_id and m.role in ('leader','officer'))
 else false end;
$$;

create or replace function public.validate_recruitment_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_tag text;
begin
 if new.status<>'active' then return new; end if;
 if not public.recruitment_scope_valid_v16(new) then raise exception 'recruitment_scope_no_longer_valid'; end if;
 if not new.roles <@ array['tank','damage','support']::text[] then raise exception 'invalid_recruitment_roles'; end if;
 if cardinality(new.activity_tags||new.playstyle_tags||new.availability_tags||new.guild_interest_tags)>32 then raise exception 'too_many_recruitment_tags'; end if;
 foreach v_tag in array new.activity_tags||new.playstyle_tags||new.availability_tags||new.guild_interest_tags loop
  if v_tag is null or char_length(trim(v_tag)) not between 1 and 40 then raise exception 'invalid_recruitment_tag'; end if;
 end loop;
 if char_length(coalesce(new.language,''))>40 or char_length(coalesce(new.region,''))>40 then raise exception 'invalid_recruitment_locale'; end if;
 if new.post_type='party_recruiting' then
  select greatest(0,4-count(*))::integer into new.open_spots from public.party_members where party_id=new.party_id and left_at is null;
 elsif new.open_spots is not null then raise exception 'open_spots_only_for_party_recruitment'; end if;
 if (new.post_type in ('looking_for_party','party_recruiting') and new.expires_at<>new.refreshed_at+interval '1 day')
 or (new.post_type in ('looking_for_guild','guild_recruiting') and new.expires_at not in (new.refreshed_at+interval '1 day',new.refreshed_at+interval '3 days'))
 then raise exception 'invalid_recruitment_duration'; end if;
 return new;
end $$;
create trigger validate_recruitment_v16 before insert or update on public.recruitment_posts
for each row execute function public.validate_recruitment_v16();

create or replace view public.active_recruitment_posts with (security_invoker=true) as
select * from public.recruitment_posts p
where status='active' and expires_at>now() and public.recruitment_scope_valid_v16(p);

-- Filters run in PostgreSQL before pagination, using the server clock for expiry.
create or replace function public.browse_recruitment_v16(p_filters jsonb default '{}',p_limit integer default 50,p_offset integer default 0)
returns jsonb language sql stable security definer set search_path=public as $$
select coalesce(jsonb_agg(to_jsonb(result)),'[]') from (
 select p.*,coalesce(pp.display_name,'Adventurer') owner_name,g.name guild_name,
  case when p.post_type='party_recruiting' then greatest(0,4-(select count(*) from public.party_members m where m.party_id=p.party_id and m.left_at is null)) else null end actual_open_spots
 from public.active_recruitment_posts p left join public.player_profiles pp on pp.account_id=p.owner_account_id
 left join public.guilds g on g.id=p.guild_id
 where auth.uid() is not null
 and (coalesce(jsonb_array_length(p_filters->'postTypes'),0)=0 or p.post_type in (select jsonb_array_elements_text(p_filters->'postTypes')))
 and (coalesce(jsonb_array_length(p_filters->'focuses'),0)=0 or p.focus in (select jsonb_array_elements_text(p_filters->'focuses')))
 and (coalesce(jsonb_array_length(p_filters->'roles'),0)=0 or p.roles && array(select jsonb_array_elements_text(p_filters->'roles')))
 and (coalesce(jsonb_array_length(p_filters->'activityTags'),0)=0 or p.activity_tags && array(select jsonb_array_elements_text(p_filters->'activityTags')))
 and (coalesce(jsonb_array_length(p_filters->'playstyleTags'),0)=0 or p.playstyle_tags && array(select jsonb_array_elements_text(p_filters->'playstyleTags')))
 and (coalesce(jsonb_array_length(p_filters->'availabilityTags'),0)=0 or p.availability_tags && array(select jsonb_array_elements_text(p_filters->'availabilityTags')))
 and (coalesce(jsonb_array_length(p_filters->'guildInterestTags'),0)=0 or p.guild_interest_tags && array(select jsonb_array_elements_text(p_filters->'guildInterestTags')))
 and (coalesce(jsonb_array_length(p_filters->'activityLevels'),0)=0 or p.activity_level in (select jsonb_array_elements_text(p_filters->'activityLevels')))
 and (coalesce(p_filters->>'language','')='' or lower(p.language)=lower(p_filters->>'language'))
 and (coalesce(p_filters->>'region','')='' or lower(p.region)=lower(p_filters->>'region'))
 and (not p_filters ? 'maxMinCombatLevel' or coalesce(p.min_combat_level,0)<=(p_filters->>'maxMinCombatLevel')::integer)
 and (not p_filters ? 'maxMinTotalLevel' or coalesce(p.min_total_level,0)<=(p_filters->>'maxMinTotalLevel')::integer)
 and (not coalesce((p_filters->>'requireOpenPartySpot')::boolean,false) or p.post_type<>'party_recruiting'
      or (select count(*) from public.party_members m where m.party_id=p.party_id and m.left_at is null)<4)
 and (coalesce(p_filters->>'query','')='' or position(lower(trim(p_filters->>'query')) in lower(concat_ws(' ',p.title,p.body,pp.display_name,g.name,p.focus,p.language,p.region,p.activity_level,p.current_objective,array_to_string(p.roles||p.activity_tags||p.playstyle_tags||p.availability_tags||p.guild_interest_tags,' '))))>0)
 order by p.refreshed_at desc,p.id limit greatest(1,least(coalesce(p_limit,50),100)) offset greatest(0,least(coalesce(p_offset,0),10000))
) result;
$$;

-- Auto-close obsolete adverts without touching freshness timestamps or weakening the cooldown.
create or replace function public.reconcile_recruitment_v16()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 update public.recruitment_posts p set status='closed',closed_at=now()
 where p.status='active' and not public.recruitment_scope_valid_v16(p);
 return null;
end $$;
create trigger reconcile_party_recruitment_v16 after insert or update or delete on public.party_members
for each statement execute function public.reconcile_recruitment_v16();
create trigger reconcile_party_leader_recruitment_v16 after update on public.parties
for each statement execute function public.reconcile_recruitment_v16();
create trigger reconcile_guild_recruitment_v16 after insert or update or delete on public.guild_members
for each statement execute function public.reconcile_recruitment_v16();

alter table public.party_contract_definitions_v16 add column reward_json jsonb not null default '{"gold":100}';
-- Fixed ordinary Gold completion grants; they do not introduce a Party currency.
update public.party_contract_definitions_v16 set reward_json='{"gold":100}' where cadence='weekly';
update public.party_contract_definitions_v16 set reward_json='{"gold":50}' where cadence='mini_event';
alter table public.party_contract_instances_v16 add constraint party_contract_window_v16 check(ends_at>starts_at);
alter table public.party_ranked_events_v16 add constraint party_event_window_v16 check(ends_at>starts_at);

create or replace function public.ensure_party_contracts_v16(p_party_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_def record; v_start timestamptz:=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC'; v_key text;
begin
 if not exists(select 1 from public.parties where id=p_party_id and status<>'disbanded') then return; end if;
 perform pg_advisory_xact_lock(hashtextextended('contract-assignment:'||p_party_id::text,0));
 update public.party_contract_instances_v16 set status='expired' where party_id=p_party_id and status='active' and ends_at<=now();
 for v_def in select * from public.party_contract_definitions_v16 where cadence='weekly' and active loop
  v_key:=to_char(v_start at time zone 'UTC','YYYY-MM-DD');
  perform public.create_party_contract_instance_v16('weekly:'||p_party_id||':'||v_def.definition_id||':'||v_key,p_party_id,v_def.definition_id,v_def.version,v_key,v_start,v_start+interval '7 days');
 end loop;
 for v_def in select * from public.party_ranked_events_v16 where status in ('scheduled','active') and starts_at<=now() and ends_at>now() loop
  perform public.create_party_contract_instance_v16('event:'||p_party_id||':'||v_def.event_key,p_party_id,v_def.definition_id,v_def.definition_version,v_def.event_key,v_def.starts_at,v_def.ends_at);
 end loop;
end $$;

-- Sample mini-event window is anchored once at migration time, then remains immutable.
insert into public.party_ranked_events_v16(event_key,name,definition_id,definition_version,starts_at,ends_at,status,reward_rules)
values('frontier-rush-v16-launch','Frontier Rush','party_event_frontier_rush_v1',1,date_trunc('day',now()),date_trunc('day',now())+interval '3 days','active','{"completionGold":50}');

create or replace function public.complete_party_contract_rewards_v16()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='completed' and old.status<>'completed' then
  perform public.create_party_contract_rewards_v16(new.id,'completion',d.reward_json)
   from public.party_contract_definitions_v16 d where d.definition_id=new.definition_id and d.version=new.definition_version;
 end if;
 return new;
end $$;
create trigger complete_party_contract_rewards_v16 after update of status on public.party_contract_instances_v16
for each row execute function public.complete_party_contract_rewards_v16();

-- The existing receipt ledger also prevents account hopping between Parties to farm the same weekly/event grant.
alter table public.party_contract_reward_entitlements_v16 add column claimed_character_id uuid references public.characters(id);
create or replace function public.claim_party_contract_reward_v16(p_entitlement_id uuid,p_character_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_reward public.party_contract_reward_entitlements_v16; v_instance public.party_contract_instances_v16;
 v_key text; v_gold bigint; v_result jsonb;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('party-reward:'||v_uid,0));
 select * into v_reward from public.party_contract_reward_entitlements_v16 where id=p_entitlement_id and account_id=v_uid for update;
 if not found then raise exception 'reward_not_found'; end if;
 if v_reward.claimed_at is not null then return jsonb_build_object('replayed',true,'reward',v_reward.reward_json); end if;
 if not exists(select 1 from public.characters where id=p_character_id and account_id=v_uid) then raise exception 'character_not_owned'; end if;
 select * into strict v_instance from public.party_contract_instances_v16 where id=v_reward.instance_id;
 v_key:=v_instance.definition_id||':'||v_instance.season_key||':'||v_reward.reward_key;
 select response into v_result from public.server_action_receipts where account_id=v_uid and action='party_contract_reward' and idempotency_key=v_key;
 if found then raise exception 'contract_scope_reward_already_claimed'; end if;
 v_gold:=coalesce((v_reward.reward_json->>'gold')::bigint,0);
 if v_gold<0 or v_gold>100000 then raise exception 'invalid_contract_reward'; end if;
 insert into public.character_wallets(character_id,gold) values(p_character_id,v_gold)
 on conflict(character_id) do update set gold=public.character_wallets.gold+excluded.gold,updated_at=now();
 update public.party_contract_reward_entitlements_v16 set claimed_at=now(),claimed_character_id=p_character_id where id=p_entitlement_id;
 v_result:=jsonb_build_object('replayed',false,'reward',v_reward.reward_json);
 insert into public.server_action_receipts(account_id,action,idempotency_key,response) values(v_uid,'party_contract_reward',v_key,v_result);
 return v_result;
end $$;

-- One read returns only the current roster and server-derived Contract/reward projections.
create or replace function public.party_social_state_v16()
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_party public.parties; v_uid uuid:=auth.uid(); v_members jsonb; v_contracts jsonb;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 select p.* into v_party from public.parties p join public.party_members m on m.party_id=p.id
 where m.account_id=v_uid and m.left_at is null and p.status<>'disbanded';
 if not found then return jsonb_build_object('party',null,'contracts','[]'::jsonb,'serverTime',now()); end if;
 perform public.ensure_party_contracts_v16(v_party.id);
 select jsonb_agg(jsonb_build_object('accountId',m.account_id,'characterId',m.character_id,'characterName',c.name,'className',c.class_id,'role',m.role,'isLeader',m.account_id=v_party.leader_account_id) order by m.joined_at,m.account_id)
 into v_members from public.party_members m join public.characters c on c.id=m.character_id where m.party_id=v_party.id and m.left_at is null;
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'name',d.name,'category',d.category,'cadence',i.cadence,'status',i.status,'endsAtMs',extract(epoch from i.ends_at)*1000,
 'targetPoints',i.total_target_points,'minimumPersonalPoints',i.minimum_personal_points,'personalPoints',coalesce(mp.normalized_points,0),
 'totalPoints',(select coalesce(sum(p.normalized_points),0) from public.party_contract_progress_v16 p where p.instance_id=i.id),
 'objectives',(select jsonb_agg(jsonb_build_object('id',o.objective_id,'label',replace(o.objective_id,'_',' '),'targetUnits',o.target_units,'progressUnits',coalesce(p.units,0),'pointBudget',o.point_budget,'normalizedPoints',coalesce(p.normalized_points,0)) order by o.objective_id)
 from public.party_contract_objectives_v16 o left join public.party_contract_progress_v16 p on p.instance_id=i.id and p.objective_id=o.objective_id where o.definition_id=i.definition_id and o.definition_version=i.definition_version),
 'rewards',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'reward',r.reward_json,'claimed',r.claimed_at is not null)),'[]') from public.party_contract_reward_entitlements_v16 r where r.instance_id=i.id and r.account_id=v_uid)
 ) order by i.ends_at,i.id),'[]') into v_contracts
 from public.party_contract_instances_v16 i join public.party_contract_definitions_v16 d on d.definition_id=i.definition_id and d.version=i.definition_version
 left join public.party_contract_member_progress_v16 mp on mp.instance_id=i.id and mp.account_id=v_uid
 where i.party_id=v_party.id and i.status in ('active','completed') and i.ends_at>now()-interval '7 days';
 return jsonb_build_object('party',jsonb_build_object('id',v_party.id,'focus',v_party.focus,'maxMembers',4,'members',v_members),'contracts',v_contracts,'serverTime',now());
end $$;

create or replace function public.party_rankings_board_v16(p_event_key text default null)
returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(r)),'[]') from (
 select e.event_key,e.name,e.starts_at,e.ends_at,s.party_id,s.normalized_points,s.completed_at,
 row_number() over(partition by e.event_key order by s.normalized_points desc,s.completed_at asc nulls last,s.party_id) rank
 from public.party_rankings_v16 s join public.party_ranked_events_v16 e on e.event_key=s.event_key
 where auth.uid() is not null and (p_event_key is null or e.event_key=p_event_key)
 order by e.starts_at desc,s.normalized_points desc,s.completed_at asc nulls last,s.party_id limit 100
 ) r;
$$;

create or replace function public.send_persistent_party_chat_v16(p_party_id uuid,p_body text,p_idempotency_key text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_body text:=trim(p_body); v_term public.chat_filter_terms; v_id uuid; v_response jsonb;
begin
 if v_uid is null then raise exception 'authentication_required'; end if;
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||v_uid,0));
 if not public.is_active_party_member_v16(p_party_id,v_uid) then raise exception 'not_party_member'; end if;
 if char_length(coalesce(p_idempotency_key,'')) not between 8 and 160 then raise exception 'invalid_idempotency_key'; end if;
 select response into v_response from public.server_action_receipts where account_id=v_uid and action='persistent_party_chat' and idempotency_key=p_idempotency_key;
 if found then return (v_response->>'message_id')::uuid; end if;
 if char_length(coalesce(v_body,'')) not between 1 and 300 then raise exception 'INVALID_MESSAGE_LENGTH'; end if;
 if exists(select 1 from public.chat_account_sanctions where account_id=v_uid and muted_until>now()) then raise exception 'CHAT_MUTED'; end if;
 if (select count(*) from public.chat_messages where account_id=v_uid and created_at>now()-interval '10 seconds')>=3 then raise exception 'CHAT_COOLDOWN'; end if;
 if (select count(*) from public.chat_messages where account_id=v_uid and created_at>now()-interval '1 minute')>=15 then raise exception 'CHAT_RATE_LIMIT'; end if;
 for v_term in select * from public.chat_filter_terms where enabled loop
  if position(v_term.normalized_term in lower(v_body))>0 then
   if v_term.action='block' then raise exception 'MESSAGE_BLOCKED'; end if;
   v_body:=replace(lower(v_body),v_term.normalized_term,repeat('•',char_length(v_term.normalized_term)));
  end if;
 end loop;
 insert into public.chat_messages(account_id,channel_type,channel_id,sender_name,body)
 values(v_uid,'party',p_party_id::text,coalesce((select display_name from public.player_profiles where account_id=v_uid),'Adventurer'),v_body) returning id into v_id;
 insert into public.server_action_receipts(account_id,action,idempotency_key,response) values(v_uid,'persistent_party_chat',p_idempotency_key,jsonb_build_object('message_id',v_id));
 return v_id;
end $$;

revoke all on function public.ensure_party_contracts_v16(uuid),public.recruitment_scope_valid_v16(public.recruitment_posts),public.validate_recruitment_v16(),public.reconcile_recruitment_v16(),public.complete_party_contract_rewards_v16() from public,anon,authenticated;
grant execute on function public.ensure_party_contracts_v16(uuid) to service_role;
grant execute on function public.recruitment_scope_valid_v16(public.recruitment_posts) to authenticated,service_role;
revoke all on function public.browse_recruitment_v16(jsonb,integer,integer),public.party_social_state_v16(),public.party_rankings_board_v16(text),public.send_persistent_party_chat_v16(uuid,text,text),public.claim_party_contract_reward_v16(uuid,uuid) from public,anon;
grant execute on function public.browse_recruitment_v16(jsonb,integer,integer),public.party_social_state_v16(),public.party_rankings_board_v16(text),public.send_persistent_party_chat_v16(uuid,text,text),public.claim_party_contract_reward_v16(uuid,uuid) to authenticated;
grant select on public.active_recruitment_posts,public.recruitment_posts,public.parties,public.party_members,
 public.party_contract_definitions_v16,public.party_contract_objectives_v16,public.party_contract_instances_v16,
 public.party_contract_progress_v16,public.party_contract_member_progress_v16,public.party_contract_contributions_v16,
 public.party_contract_reward_entitlements_v16,public.party_ranked_events_v16,public.party_rankings_v16 to authenticated;
grant select on public.chat_messages to authenticated;
revoke insert,update,delete on public.parties,public.party_members,public.recruitment_posts,
 public.party_contract_definitions_v16,public.party_contract_objectives_v16,public.party_contract_instances_v16,
 public.party_contract_progress_v16,public.party_contract_member_progress_v16,public.party_contract_contributions_v16,
 public.party_contract_reward_entitlements_v16,public.party_ranked_events_v16,public.party_rankings_v16 from anon,authenticated;

-- Canonical activity weights are seeded from the current v15 content below.
create table public.party_activity_weights_v16(
 kind text not null,content_id text not null,metric text not null,units_per_action numeric(18,6) not null check(units_per_action>0),
 primary key(kind,content_id)
);
alter table public.party_activity_weights_v16 enable row level security;
revoke all on public.party_activity_weights_v16 from anon,authenticated;
grant all on public.party_activity_weights_v16,public.party_contract_definitions_v16,public.party_contract_objectives_v16,
 public.party_contract_instances_v16,public.party_contract_progress_v16,public.party_contract_member_progress_v16,
 public.party_contract_contributions_v16,public.party_contract_reward_entitlements_v16,public.party_ranked_events_v16,
 public.party_rankings_v16,public.recruitment_posts to service_role;

create or replace function public.settle_party_activity_v16(p_character_id uuid,p_metric text,p_units numeric,p_event_key text,p_occurred_at timestamptz)
returns integer language plpgsql security definer set search_path=public as $$
declare v_account uuid; v_party uuid; v_instance record; v_count integer:=0;
begin
 if p_units is null or p_units<=0 or p_units::text in ('NaN','Infinity','-Infinity') then return 0; end if;
 select c.account_id,m.party_id into v_account,v_party from public.characters c join public.party_members m on m.character_id=c.id
 where c.id=p_character_id and m.left_at is null and m.joined_at<=p_occurred_at;
 if v_party is null then return 0; end if;
 -- Same account lock as leave/join: a settlement cannot race membership removal.
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||v_account,0));
 if not public.is_active_party_member_v16(v_party,v_account) then return 0; end if;
 perform public.ensure_party_contracts_v16(v_party);
 for v_instance in select i.id,o.objective_id from public.party_contract_instances_v16 i
 join public.party_contract_objectives_v16 o on o.definition_id=i.definition_id and o.definition_version=i.definition_version
 where i.party_id=v_party and i.status='active' and o.metric=p_metric and i.starts_at<=p_occurred_at and i.ends_at>now()
 order by i.id,o.objective_id loop
  perform public.record_party_contract_contribution_v16(v_instance.id,v_account,v_instance.objective_id,p_units,
   encode(sha256(convert_to(p_event_key||':'||p_character_id||':'||p_metric||':'||v_instance.objective_id,'UTF8')),'hex'));
  v_count:=v_count+1;
 end loop;
 return v_count;
end $$;

-- Receipt triggers execute in the same transaction as the existing authoritative reward commit.
create or replace function public.party_gathering_receipt_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_character uuid; v_weight numeric; v_units numeric;
begin
 if new.action<>'claim_gathering' or coalesce((new.response->>'cycles')::numeric,0)<=0 then return new; end if;
 v_character:=(new.response->>'character_id')::uuid;
 if v_character is null then return new; end if;
 select units_per_action into v_weight from public.party_activity_weights_v16 where kind='gathering' and content_id=new.response->>'item_id';
 if v_weight is null then return new; end if;
 -- Only elapsed effort since joining this Party counts, not a banked pre-join gathering claim.
 select least((new.response->>'cycles')::numeric,greatest(0,extract(epoch from new.created_at-m.joined_at)/(v_weight*22))) * v_weight
 into v_units from public.party_members m where m.character_id=v_character and m.left_at is null;
 perform public.settle_party_activity_v16(v_character,'verified_weighted_gather_actions',v_units,'gather:'||new.account_id||':'||new.idempotency_key,new.created_at);
 return new;
end $$;
create trigger party_gathering_receipt_v16 after insert on public.server_action_receipts for each row execute function public.party_gathering_receipt_v16();

-- Extend the existing gathering response with its authoritative character identity; keep its reward algorithm intact.
do $$ declare v_definition text; begin
 v_definition:=pg_get_functiondef('public.claim_gathering_activity(uuid,text)'::regprocedure);
 if position($needle$'character_id',p_character_id$needle$ in v_definition)=0 then
  if position($needle$'cycles',v_cycles$needle$ in v_definition)=0 then raise exception 'gathering_rpc_changed_review_required'; end if;
  v_definition:=replace(v_definition,$needle$'cycles',v_cycles$needle$,$needle$'character_id',p_character_id,'cycles',v_cycles$needle$);
  execute v_definition;
 end if;
end $$;

-- Only a trusted crafting transaction may insert its canonical receipt.
alter table public.craft_receipts enable row level security;
revoke insert,update,delete on public.craft_receipts from anon,authenticated;
create policy craft_receipt_owner_read_v16 on public.craft_receipts for select to authenticated using(exists(select 1 from public.characters c where c.id=character_id and c.account_id=auth.uid()));
create or replace function public.party_craft_receipt_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_weight numeric;
begin
 select units_per_action into v_weight from public.party_activity_weights_v16 where kind='crafting' and content_id=new.recipe_id;
 if v_weight is not null then perform public.settle_party_activity_v16(new.character_id,'verified_weighted_crafts',new.quantity*v_weight,'craft:'||new.receipt_id,new.created_at); end if;
 return new;
end $$;
create trigger party_craft_receipt_v16 after insert on public.craft_receipts for each row execute function public.party_craft_receipt_v16();

create or replace function public.party_combat_receipt_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_member record; v_weight record;
begin
 if not new.victory then return new; end if;
 select * into v_weight from public.party_activity_weights_v16 where kind='combat' and content_id=new.encounter_id;
 if not found then return new; end if;
 for v_member in select m.character_id from public.expedition_run_members m
 where m.run_id=new.run_id and m.echo_profile_version is null and coalesce(m.member_kind,'human')='human' loop
  perform public.settle_party_activity_v16(v_member.character_id,v_weight.metric,v_weight.units_per_action,'combat:'||new.run_id||':'||new.node_index||':'||new.encounter_id,new.created_at);
 end loop;
 return new;
end $$;
revoke insert,update,delete on public.expedition_combat_summaries from anon,authenticated;
create trigger party_combat_receipt_v16 after insert on public.expedition_combat_summaries for each row execute function public.party_combat_receipt_v16();

create or replace function public.party_coop_node_receipt_v16()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_member record; v_weight record; v_content text;
begin
 if not new.success then return new; end if;
 select n->>'contentId' into v_content from public.expedition_runs r,jsonb_array_elements(r.route_graph_json->'nodes') n where r.id=new.run_id and n->>'nodeId'=new.node_id;
 select * into v_weight from public.party_activity_weights_v16 where kind='combat' and content_id=v_content;
 if not found then return new; end if;
 for v_member in select m.character_id from public.expedition_run_members m join public.coop_run_access_memberships a on a.run_id=m.run_id and a.account_id=m.active_participant_account_id and a.active
 where m.run_id=new.run_id and coalesce(m.member_kind,'human')='human' loop
  perform public.settle_party_activity_v16(v_member.character_id,v_weight.metric,v_weight.units_per_action,'coop:'||new.run_id||':'||new.node_id,new.committed_at);
 end loop;
 return new;
end $$;
create trigger party_coop_node_receipt_v16 after insert on public.coop_node_results for each row execute function public.party_coop_node_receipt_v16();

create or replace function public.maintain_party_social_v16()
returns integer language plpgsql security definer set search_path=public as $$
declare v_party record; v_count integer;
begin
 v_count:=public.expire_recruitment_posts();
 update public.party_ranked_events_v16 set status='ended' where ends_at<=now() and status<>'ended';
 for v_party in select id from public.parties where status<>'disbanded' loop perform public.ensure_party_contracts_v16(v_party.id); end loop;
 return v_count;
end $$;
revoke all on function public.settle_party_activity_v16(uuid,text,numeric,text,timestamptz),public.party_gathering_receipt_v16(),public.party_craft_receipt_v16(),public.party_combat_receipt_v16(),public.party_coop_node_receipt_v16(),public.maintain_party_social_v16() from public,anon,authenticated;
grant execute on function public.settle_party_activity_v16(uuid,text,numeric,text,timestamptz),public.maintain_party_social_v16() to service_role;

do $$ begin
 if not exists(select 1 from pg_extension where extname='pg_cron') and exists(select 1 from pg_available_extensions where name='pg_cron') then
  create extension pg_cron;
 end if;
 if exists(select 1 from pg_extension where extname='pg_cron') then
  perform cron.schedule('veldryn-party-social-v16','*/30 * * * *','select public.maintain_party_social_v16()');
 end if;
end $$;

-- v15 canonical recipe durations and encounter registries; gathering uses the existing server RPC timings.
-- Craft weights include recursively resolved ingredient preparation; unknown ingredient effort adds zero.
insert into public.party_activity_weights_v16(kind,content_id,metric,units_per_action) values
 ('combat','BOSS_EXP_BELL','verified_regional_boss_kills',1.000000),
 ('combat','BOSS_EXP_ROOT','verified_regional_boss_kills',1.000000),
 ('combat','BOSS_EXP_SOLAR','verified_regional_boss_kills',1.000000),
 ('combat','BOSS_EXP_SPHINX','verified_regional_boss_kills',1.000000),
 ('combat','LANTERN_BATTLE_01','verified_standard_enemy_kills',2.000000),
 ('combat','LANTERN_BATTLE_02','verified_standard_enemy_kills',2.000000),
 ('combat','LANTERN_BATTLE_03','verified_standard_enemy_kills',2.000000),
 ('combat','LANTERN_BOSS','verified_regional_boss_kills',1.000000),
 ('combat','LANTERN_ELITE_01','verified_elite_kills',1.000000),
 ('combat','LANTERN_ELITE_02','verified_elite_kills',1.000000),
 ('combat','LANTERN_ELITE_03','verified_elite_kills',1.000000),
 ('combat','ROOT_ELITE_BRAMBLE','verified_elite_kills',1.000000),
 ('combat','ROOT_ELITE_MYCELIUM','verified_elite_kills',1.000000),
 ('combat','ROOT_ELITE_WARDEN','verified_elite_kills',1.000000),
 ('combat','ROOT_GUARDIANS','verified_standard_enemy_kills',2.000000),
 ('combat','ROOT_SCOUTS','verified_standard_enemy_kills',2.000000),
 ('combat','ROOT_SENTINELS','verified_standard_enemy_kills',2.000000),
 ('combat','ROOT_STALKERS','verified_standard_enemy_kills',2.000000),
 ('combat','ROOT_VINES','verified_standard_enemy_kills',2.000000),
 ('combat','ROOTBOUND_BATTLE_01','verified_standard_enemy_kills',2.000000),
 ('combat','ROOTBOUND_BOSS','verified_regional_boss_kills',1.000000),
 ('combat','ROOTBOUND_ELITE_01','verified_elite_kills',1.000000),
 ('combat','SUN_MIRAGE_BATTLE_01','verified_standard_enemy_kills',2.000000),
 ('combat','SUN_MIRAGE_BATTLE_02','verified_standard_enemy_kills',2.000000),
 ('combat','SUN_MIRAGE_BATTLE_03','verified_standard_enemy_kills',2.000000),
 ('combat','SUN_MIRAGE_ELITE_01','verified_elite_kills',1.000000),
 ('combat','SUN_MIRAGE_ELITE_02','verified_elite_kills',1.000000),
 ('combat','SUN_MIRAGE_ELITE_03','verified_elite_kills',1.000000),
 ('combat','SUN_OBS_BATTLE_01','verified_standard_enemy_kills',2.000000),
 ('combat','SUN_OBS_BATTLE_02','verified_standard_enemy_kills',2.000000),
 ('combat','SUN_OBS_BATTLE_03','verified_standard_enemy_kills',2.000000),
 ('combat','SUN_OBS_ELITE_01','verified_elite_kills',1.000000),
 ('combat','SUN_OBS_ELITE_02','verified_elite_kills',1.000000),
 ('combat','SUN_OBS_ELITE_03','verified_elite_kills',1.000000),
 ('crafting','COOK_IRONWOOD_STEW','verified_weighted_crafts',1.350877),
 ('crafting','COOK_OATHSCALE','verified_weighted_crafts',2.105263),
 ('crafting','COOK_RIVER_EEL','verified_weighted_crafts',1.929825),
 ('crafting','COOK_SILVERFIN','verified_weighted_crafts',1.456140),
 ('crafting','CRAFT_ASTER_IRON_HATCHET','verified_weighted_crafts',41.342105),
 ('crafting','CRAFT_ASTER_IRON_PICKAXE','verified_weighted_crafts',41.578947),
 ('crafting','CRAFT_BLOODRUSH_AMULET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_BLOODRUSH_BOOTS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_BLOODRUSH_CAPE','verified_weighted_crafts',3.421053),
 ('crafting','CRAFT_BLOODRUSH_CHEST','verified_weighted_crafts',3.157895),
 ('crafting','CRAFT_BLOODRUSH_GLOVES','verified_weighted_crafts',2.894737),
 ('crafting','CRAFT_BLOODRUSH_HELMET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_BLOODRUSH_LEGS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_BLOODRUSH_OFFHAND','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_BLOODRUSH_RING','verified_weighted_crafts',3.684211),
 ('crafting','CRAFT_BLOODRUSH_WEAPON','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_COPPER_PICKAXE','verified_weighted_crafts',10.073684),
 ('crafting','CRAFT_FROSTIRON_HATCHET','verified_weighted_crafts',6.210526),
 ('crafting','CRAFT_FROSTIRON_PICKAXE','verified_weighted_crafts',46.315789),
 ('crafting','CRAFT_GREENWOOD_HATCHET','verified_weighted_crafts',9.824561),
 ('crafting','CRAFT_IRONWOOD_ROD','verified_weighted_crafts',29.289474),
 ('crafting','CRAFT_LASTWALL_AMULET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_LASTWALL_BOOTS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_LASTWALL_CAPE','verified_weighted_crafts',47.263158),
 ('crafting','CRAFT_LASTWALL_CHEST','verified_weighted_crafts',82.473684),
 ('crafting','CRAFT_LASTWALL_GLOVES','verified_weighted_crafts',55.684211),
 ('crafting','CRAFT_LASTWALL_HELMET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_LASTWALL_LEGS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_LASTWALL_OFFHAND','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_LASTWALL_RING','verified_weighted_crafts',38.684211),
 ('crafting','CRAFT_LASTWALL_WEAPON','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_MOURNCHAIN_AMULET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_MOURNCHAIN_BOOTS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_MOURNCHAIN_CAPE','verified_weighted_crafts',3.210526),
 ('crafting','CRAFT_MOURNCHAIN_CHEST','verified_weighted_crafts',3.052632),
 ('crafting','CRAFT_MOURNCHAIN_GLOVES','verified_weighted_crafts',2.789474),
 ('crafting','CRAFT_MOURNCHAIN_HELMET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_MOURNCHAIN_LEGS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_MOURNCHAIN_OFFHAND','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_MOURNCHAIN_RING','verified_weighted_crafts',3.473684),
 ('crafting','CRAFT_MOURNCHAIN_WEAPON','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_NIGHTFANG_AMULET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_NIGHTFANG_BOOTS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_NIGHTFANG_CAPE','verified_weighted_crafts',3.578947),
 ('crafting','CRAFT_NIGHTFANG_CHEST','verified_weighted_crafts',3.315789),
 ('crafting','CRAFT_NIGHTFANG_GLOVES','verified_weighted_crafts',3.052632),
 ('crafting','CRAFT_NIGHTFANG_HELMET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_NIGHTFANG_LEGS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_NIGHTFANG_OFFHAND','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_NIGHTFANG_RING','verified_weighted_crafts',3.842105),
 ('crafting','CRAFT_NIGHTFANG_WEAPON','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_NOVICE_BASTION_AMULET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_BASTION_BOOTS','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_BASTION_CAPE','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_BASTION_CHEST','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_BASTION_GLOVES','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_BASTION_HELMET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_BASTION_LEGS','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_BASTION_OFFHAND','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_BASTION_RING','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_BASTION_WEAPON','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DAWNKEEPER_AMULET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DAWNKEEPER_BOOTS','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_DAWNKEEPER_CAPE','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DAWNKEEPER_CHEST','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DAWNKEEPER_GLOVES','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_DAWNKEEPER_HELMET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DAWNKEEPER_LEGS','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DAWNKEEPER_OFFHAND','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_DAWNKEEPER_RING','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DAWNKEEPER_WEAPON','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DREADGUARD_AMULET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DREADGUARD_BOOTS','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_DREADGUARD_CAPE','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DREADGUARD_CHEST','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DREADGUARD_GLOVES','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_DREADGUARD_HELMET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DREADGUARD_LEGS','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DREADGUARD_OFFHAND','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_DREADGUARD_RING','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_DREADGUARD_WEAPON','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_HEXWEAVER_AMULET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_HEXWEAVER_BOOTS','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_HEXWEAVER_CAPE','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_HEXWEAVER_CHEST','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_HEXWEAVER_GLOVES','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_HEXWEAVER_HELMET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_HEXWEAVER_LEGS','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_HEXWEAVER_OFFHAND','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_HEXWEAVER_RING','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_HEXWEAVER_WEAPON','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_IRONWARDEN_AMULET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_IRONWARDEN_BOOTS','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_IRONWARDEN_CAPE','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_IRONWARDEN_CHEST','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_IRONWARDEN_GLOVES','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_IRONWARDEN_HELMET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_IRONWARDEN_LEGS','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_IRONWARDEN_OFFHAND','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_IRONWARDEN_RING','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_IRONWARDEN_WEAPON','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_KNIFE_DANCER_AMULET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_KNIFE_DANCER_BOOTS','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_KNIFE_DANCER_CAPE','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_KNIFE_DANCER_CHEST','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_KNIFE_DANCER_GLOVES','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_KNIFE_DANCER_HELMET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_KNIFE_DANCER_LEGS','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_KNIFE_DANCER_OFFHAND','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_KNIFE_DANCER_RING','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_KNIFE_DANCER_WEAPON','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_RAVAGER_AMULET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_RAVAGER_BOOTS','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_RAVAGER_CAPE','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_RAVAGER_CHEST','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_RAVAGER_GLOVES','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_RAVAGER_HELMET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_RAVAGER_LEGS','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_RAVAGER_OFFHAND','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_RAVAGER_RING','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_RAVAGER_WEAPON','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_STONECALLER_AMULET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_STONECALLER_BOOTS','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_STONECALLER_CAPE','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_STONECALLER_CHEST','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_STONECALLER_GLOVES','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_STONECALLER_HELMET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_STONECALLER_LEGS','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_STONECALLER_OFFHAND','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_STONECALLER_RING','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_STONECALLER_WEAPON','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_WAYFINDER_AMULET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_WAYFINDER_BOOTS','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_WAYFINDER_CAPE','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_WAYFINDER_CHEST','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_WAYFINDER_GLOVES','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_WAYFINDER_HELMET','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_WAYFINDER_LEGS','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_WAYFINDER_OFFHAND','verified_weighted_crafts',6.175439),
 ('crafting','CRAFT_NOVICE_WAYFINDER_RING','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_NOVICE_WAYFINDER_WEAPON','verified_weighted_crafts',12.350877),
 ('crafting','CRAFT_OATHSCALE_ROD','verified_weighted_crafts',64.122807),
 ('crafting','CRAFT_OATHSTONE_HATCHET','verified_weighted_crafts',68.421053),
 ('crafting','CRAFT_OATHSTONE_PICKAXE','verified_weighted_crafts',66.947368),
 ('crafting','CRAFT_QUICKPRAYER_AMULET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_QUICKPRAYER_BOOTS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_QUICKPRAYER_CAPE','verified_weighted_crafts',31.263158),
 ('crafting','CRAFT_QUICKPRAYER_CHEST','verified_weighted_crafts',43.105263),
 ('crafting','CRAFT_QUICKPRAYER_GLOVES','verified_weighted_crafts',28.368421),
 ('crafting','CRAFT_QUICKPRAYER_HELMET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_QUICKPRAYER_LEGS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_QUICKPRAYER_OFFHAND','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_QUICKPRAYER_RING','verified_weighted_crafts',23.368421),
 ('crafting','CRAFT_QUICKPRAYER_WEAPON','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_REEDLINE_ROD','verified_weighted_crafts',6.631579),
 ('crafting','CRAFT_RIMEBOUND_BLOODRUSH_AMULET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_BLOODRUSH_BOOTS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_BLOODRUSH_CAPE','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_BLOODRUSH_CHEST','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_BLOODRUSH_GLOVES','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_BLOODRUSH_HELMET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_BLOODRUSH_LEGS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_BLOODRUSH_OFFHAND','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_BLOODRUSH_RING','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_BLOODRUSH_WEAPON','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_LASTWALL_AMULET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_LASTWALL_BOOTS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_LASTWALL_CAPE','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_LASTWALL_CHEST','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_LASTWALL_GLOVES','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_LASTWALL_HELMET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_LASTWALL_LEGS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_LASTWALL_OFFHAND','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_LASTWALL_RING','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_LASTWALL_WEAPON','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_MOURNCHAIN_AMULET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_MOURNCHAIN_BOOTS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_MOURNCHAIN_CAPE','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_MOURNCHAIN_CHEST','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_MOURNCHAIN_GLOVES','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_MOURNCHAIN_HELMET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_MOURNCHAIN_LEGS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_MOURNCHAIN_OFFHAND','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_MOURNCHAIN_RING','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_MOURNCHAIN_WEAPON','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_NIGHTFANG_AMULET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_NIGHTFANG_BOOTS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_NIGHTFANG_CAPE','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_NIGHTFANG_CHEST','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_NIGHTFANG_GLOVES','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_NIGHTFANG_HELMET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_NIGHTFANG_LEGS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_NIGHTFANG_OFFHAND','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_NIGHTFANG_RING','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_NIGHTFANG_WEAPON','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_QUICKPRAYER_AMULET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_QUICKPRAYER_BOOTS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_QUICKPRAYER_CAPE','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_QUICKPRAYER_CHEST','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_QUICKPRAYER_GLOVES','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_QUICKPRAYER_HELMET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_QUICKPRAYER_LEGS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_QUICKPRAYER_OFFHAND','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_QUICKPRAYER_RING','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_QUICKPRAYER_WEAPON','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_SPELLGLASS_AMULET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_SPELLGLASS_BOOTS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_SPELLGLASS_CAPE','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_SPELLGLASS_CHEST','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_SPELLGLASS_GLOVES','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_SPELLGLASS_HELMET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_SPELLGLASS_LEGS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_SPELLGLASS_OFFHAND','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_SPELLGLASS_RING','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_SPELLGLASS_WEAPON','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STONEHEART_AMULET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STONEHEART_BOOTS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STONEHEART_CAPE','verified_weighted_crafts',7.631579),
 ('crafting','CRAFT_RIMEBOUND_STONEHEART_CHEST','verified_weighted_crafts',8.421053),
 ('crafting','CRAFT_RIMEBOUND_STONEHEART_GLOVES','verified_weighted_crafts',6.842105),
 ('crafting','CRAFT_RIMEBOUND_STONEHEART_HELMET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STONEHEART_LEGS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STONEHEART_OFFHAND','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STONEHEART_RING','verified_weighted_crafts',7.236842),
 ('crafting','CRAFT_RIMEBOUND_STONEHEART_WEAPON','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STORMCARVED_AMULET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STORMCARVED_BOOTS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STORMCARVED_CAPE','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STORMCARVED_CHEST','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STORMCARVED_GLOVES','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STORMCARVED_HELMET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STORMCARVED_LEGS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STORMCARVED_OFFHAND','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STORMCARVED_RING','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_STORMCARVED_WEAPON','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_TRACKER_AMULET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_TRACKER_BOOTS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_TRACKER_CAPE','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_TRACKER_CHEST','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_TRACKER_GLOVES','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_TRACKER_HELMET','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_TRACKER_LEGS','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_TRACKER_OFFHAND','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_TRACKER_RING','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEBOUND_TRACKER_WEAPON','verified_weighted_crafts',7.368421),
 ('crafting','CRAFT_RIMEGLASS_ROD','verified_weighted_crafts',6.105263),
 ('crafting','CRAFT_SPELLGLASS_AMULET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_SPELLGLASS_BOOTS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_SPELLGLASS_CAPE','verified_weighted_crafts',3.526316),
 ('crafting','CRAFT_SPELLGLASS_CHEST','verified_weighted_crafts',3.263158),
 ('crafting','CRAFT_SPELLGLASS_GLOVES','verified_weighted_crafts',3.000000),
 ('crafting','CRAFT_SPELLGLASS_HELMET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_SPELLGLASS_LEGS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_SPELLGLASS_OFFHAND','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_SPELLGLASS_RING','verified_weighted_crafts',3.789474),
 ('crafting','CRAFT_SPELLGLASS_WEAPON','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STONEHEART_AMULET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STONEHEART_BOOTS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STONEHEART_CAPE','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STONEHEART_CHEST','verified_weighted_crafts',77.789474),
 ('crafting','CRAFT_STONEHEART_GLOVES','verified_weighted_crafts',51.000000),
 ('crafting','CRAFT_STONEHEART_HELMET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STONEHEART_LEGS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STONEHEART_OFFHAND','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STONEHEART_RING','verified_weighted_crafts',42.947368),
 ('crafting','CRAFT_STONEHEART_WEAPON','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STORMCARVED_AMULET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STORMCARVED_BOOTS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STORMCARVED_CAPE','verified_weighted_crafts',3.473684),
 ('crafting','CRAFT_STORMCARVED_CHEST','verified_weighted_crafts',3.210526),
 ('crafting','CRAFT_STORMCARVED_GLOVES','verified_weighted_crafts',2.947368),
 ('crafting','CRAFT_STORMCARVED_HELMET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STORMCARVED_LEGS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STORMCARVED_OFFHAND','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_STORMCARVED_RING','verified_weighted_crafts',3.736842),
 ('crafting','CRAFT_STORMCARVED_WEAPON','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_SUNSCORED_BLOODRUSH_AMULET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_BLOODRUSH_BOOTS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_BLOODRUSH_CAPE','verified_weighted_crafts',5.315789),
 ('crafting','CRAFT_SUNSCORED_BLOODRUSH_CHEST','verified_weighted_crafts',5.789474),
 ('crafting','CRAFT_SUNSCORED_BLOODRUSH_GLOVES','verified_weighted_crafts',4.789474),
 ('crafting','CRAFT_SUNSCORED_BLOODRUSH_HELMET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_BLOODRUSH_LEGS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_BLOODRUSH_OFFHAND','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_BLOODRUSH_RING','verified_weighted_crafts',5.052632),
 ('crafting','CRAFT_SUNSCORED_BLOODRUSH_WEAPON','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_LASTWALL_AMULET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_LASTWALL_BOOTS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_LASTWALL_CAPE','verified_weighted_crafts',5.263158),
 ('crafting','CRAFT_SUNSCORED_LASTWALL_CHEST','verified_weighted_crafts',5.789474),
 ('crafting','CRAFT_SUNSCORED_LASTWALL_GLOVES','verified_weighted_crafts',4.736842),
 ('crafting','CRAFT_SUNSCORED_LASTWALL_HELMET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_LASTWALL_LEGS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_LASTWALL_OFFHAND','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_LASTWALL_RING','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_LASTWALL_WEAPON','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_MOURNCHAIN_AMULET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_MOURNCHAIN_BOOTS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_MOURNCHAIN_CAPE','verified_weighted_crafts',5.315789),
 ('crafting','CRAFT_SUNSCORED_MOURNCHAIN_CHEST','verified_weighted_crafts',5.842105),
 ('crafting','CRAFT_SUNSCORED_MOURNCHAIN_GLOVES','verified_weighted_crafts',4.789474),
 ('crafting','CRAFT_SUNSCORED_MOURNCHAIN_HELMET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_MOURNCHAIN_LEGS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_MOURNCHAIN_OFFHAND','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_MOURNCHAIN_RING','verified_weighted_crafts',5.052632),
 ('crafting','CRAFT_SUNSCORED_MOURNCHAIN_WEAPON','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_NIGHTFANG_AMULET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_NIGHTFANG_BOOTS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_NIGHTFANG_CAPE','verified_weighted_crafts',5.315789),
 ('crafting','CRAFT_SUNSCORED_NIGHTFANG_CHEST','verified_weighted_crafts',5.789474),
 ('crafting','CRAFT_SUNSCORED_NIGHTFANG_GLOVES','verified_weighted_crafts',4.789474),
 ('crafting','CRAFT_SUNSCORED_NIGHTFANG_HELMET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_NIGHTFANG_LEGS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_NIGHTFANG_OFFHAND','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_NIGHTFANG_RING','verified_weighted_crafts',5.052632),
 ('crafting','CRAFT_SUNSCORED_NIGHTFANG_WEAPON','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_QUICKPRAYER_AMULET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_QUICKPRAYER_BOOTS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_QUICKPRAYER_CAPE','verified_weighted_crafts',5.210526),
 ('crafting','CRAFT_SUNSCORED_QUICKPRAYER_CHEST','verified_weighted_crafts',5.684211),
 ('crafting','CRAFT_SUNSCORED_QUICKPRAYER_GLOVES','verified_weighted_crafts',4.684211),
 ('crafting','CRAFT_SUNSCORED_QUICKPRAYER_HELMET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_QUICKPRAYER_LEGS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_QUICKPRAYER_OFFHAND','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_QUICKPRAYER_RING','verified_weighted_crafts',4.947368),
 ('crafting','CRAFT_SUNSCORED_QUICKPRAYER_WEAPON','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_SPELLGLASS_AMULET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_SPELLGLASS_BOOTS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_SPELLGLASS_CAPE','verified_weighted_crafts',5.263158),
 ('crafting','CRAFT_SUNSCORED_SPELLGLASS_CHEST','verified_weighted_crafts',5.736842),
 ('crafting','CRAFT_SUNSCORED_SPELLGLASS_GLOVES','verified_weighted_crafts',4.736842),
 ('crafting','CRAFT_SUNSCORED_SPELLGLASS_HELMET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_SPELLGLASS_LEGS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_SPELLGLASS_OFFHAND','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_SPELLGLASS_RING','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_SPELLGLASS_WEAPON','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STONEHEART_AMULET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STONEHEART_BOOTS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STONEHEART_CAPE','verified_weighted_crafts',5.263158),
 ('crafting','CRAFT_SUNSCORED_STONEHEART_CHEST','verified_weighted_crafts',5.789474),
 ('crafting','CRAFT_SUNSCORED_STONEHEART_GLOVES','verified_weighted_crafts',4.736842),
 ('crafting','CRAFT_SUNSCORED_STONEHEART_HELMET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STONEHEART_LEGS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STONEHEART_OFFHAND','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STONEHEART_RING','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STONEHEART_WEAPON','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STORMCARVED_AMULET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STORMCARVED_BOOTS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STORMCARVED_CAPE','verified_weighted_crafts',5.263158),
 ('crafting','CRAFT_SUNSCORED_STORMCARVED_CHEST','verified_weighted_crafts',5.736842),
 ('crafting','CRAFT_SUNSCORED_STORMCARVED_GLOVES','verified_weighted_crafts',4.736842),
 ('crafting','CRAFT_SUNSCORED_STORMCARVED_HELMET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STORMCARVED_LEGS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STORMCARVED_OFFHAND','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STORMCARVED_RING','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_STORMCARVED_WEAPON','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_TRACKER_AMULET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_TRACKER_BOOTS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_TRACKER_CAPE','verified_weighted_crafts',5.263158),
 ('crafting','CRAFT_SUNSCORED_TRACKER_CHEST','verified_weighted_crafts',5.736842),
 ('crafting','CRAFT_SUNSCORED_TRACKER_GLOVES','verified_weighted_crafts',4.736842),
 ('crafting','CRAFT_SUNSCORED_TRACKER_HELMET','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_TRACKER_LEGS','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_TRACKER_OFFHAND','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_TRACKER_RING','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_SUNSCORED_TRACKER_WEAPON','verified_weighted_crafts',5.000000),
 ('crafting','CRAFT_TRACKER_AMULET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_TRACKER_BOOTS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_TRACKER_CAPE','verified_weighted_crafts',3.947368),
 ('crafting','CRAFT_TRACKER_CHEST','verified_weighted_crafts',3.684211),
 ('crafting','CRAFT_TRACKER_GLOVES','verified_weighted_crafts',3.421053),
 ('crafting','CRAFT_TRACKER_HELMET','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_TRACKER_LEGS','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_TRACKER_OFFHAND','verified_weighted_crafts',42.684211),
 ('crafting','CRAFT_TRACKER_RING','verified_weighted_crafts',4.210526),
 ('crafting','CRAFT_TRACKER_WEAPON','verified_weighted_crafts',42.684211),
 ('crafting','FORGE_REINFORCED_FITTING','verified_weighted_crafts',2.500000),
 ('crafting','SMELT_ASTER_IRON_INGOT','verified_weighted_crafts',2.894737),
 ('crafting','SMELT_COPPER_INGOT','verified_weighted_crafts',2.333333),
 ('crafting','SMELT_OATHSTONE_INGOT','verified_weighted_crafts',3.315789),
 ('crafting','SMITH_ASTER_IRON_BLADE','verified_weighted_crafts',143.078947),
 ('crafting','SMITH_ASTER_IRON_BOOTS','verified_weighted_crafts',145.052632),
 ('crafting','SMITH_ASTER_IRON_CHEST','verified_weighted_crafts',280.973684),
 ('crafting','SMITH_ASTER_IRON_GLOVES','verified_weighted_crafts',132.947368),
 ('crafting','SMITH_ASTER_IRON_HELM','verified_weighted_crafts',149.973684),
 ('crafting','SMITH_ASTER_IRON_LEGS','verified_weighted_crafts',207.052632),
 ('crafting','SMITH_COPPER_BLADE','verified_weighted_crafts',37.849123),
 ('crafting','SMITH_IRONWOOD_DAGGERS','verified_weighted_crafts',150.736842),
 ('crafting','SMITH_IRONWOOD_GREATAXE','verified_weighted_crafts',164.947368),
 ('crafting','SMITH_IRONWOOD_GUARD','verified_weighted_crafts',165.289474),
 ('crafting','SMITH_IRONWOOD_LONGBOW','verified_weighted_crafts',166.000000),
 ('crafting','SMITH_IRONWOOD_STAFF','verified_weighted_crafts',116.000000),
 ('crafting','SMITH_OATHSTONE_AMULET','verified_weighted_crafts',87.263158),
 ('crafting','SMITH_OATHSTONE_BLADE','verified_weighted_crafts',117.631579),
 ('crafting','SMITH_OATHSTONE_GAUNTLETS','verified_weighted_crafts',93.710526),
 ('crafting','SMITH_OATHSTONE_GREAVES','verified_weighted_crafts',102.526316),
 ('crafting','SMITH_OATHSTONE_HELM','verified_weighted_crafts',107.526316),
 ('crafting','SMITH_OATHSTONE_LEGPLATES','verified_weighted_crafts',137.210526),
 ('crafting','SMITH_OATHSTONE_MANTLE','verified_weighted_crafts',112.842105),
 ('crafting','SMITH_OATHSTONE_SIGNET','verified_weighted_crafts',82.947368),
 ('crafting','SMITH_OATHSTONE_TOWER_SHIELD','verified_weighted_crafts',203.368421),
 ('crafting','SMITH_OATHSTONE_WARD','verified_weighted_crafts',222.394737),
 ('gathering','ASTER_IRON_ORE','verified_weighted_gather_actions',1.636364),
 ('gathering','COPPER_ORE','verified_weighted_gather_actions',1.045455),
 ('gathering','CROWNWOOD_LOG','verified_weighted_gather_actions',2.454545),
 ('gathering','GREENWOOD_LOG','verified_weighted_gather_actions',0.954545),
 ('gathering','IRONWOOD_LOG','verified_weighted_gather_actions',1.636364),
 ('gathering','OATHSCALE_PIKE','verified_weighted_gather_actions',2.818182),
 ('gathering','OATHSTONE_ORE','verified_weighted_gather_actions',2.454545),
 ('gathering','RIVER_EEL','verified_weighted_gather_actions',2.000000),
 ('gathering','SILVERFIN','verified_weighted_gather_actions',1.181818);
