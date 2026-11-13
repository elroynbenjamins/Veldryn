-- Party Events v11, hidden receipt ledger ONLY.
-- Not a release toggle, not a reward grant, and not a live source producer.
-- DO NOT APPLY TO PRODUCTION until staging, rollout and CI gates are approved.
-- Existing ranked mini-events and persistent Party Contracts are unaffected.
begin;

create table private.party_event_weeks_v11 (
 party_id uuid not null references public.parties(id) on delete cascade,
 event_starts_at timestamptz not null,
 event_ends_at timestamptz not null,
 family text not null check(family in ('broken_caravan','nightfall_hunt','broken_wards','lost_reliquary')),
 variation text not null check(length(variation) between 3 and 80),
 seed bigint not null check(seed>=0),
 difficulty text not null check(difficulty in ('standard','veteran','heroic')),
 active_stage smallint not null default 1 check(active_stage between 1 and 3),
 status text not null default 'active' check(status in ('active','closed','settled')),
 created_at timestamptz not null default now(),
 primary key (party_id,event_starts_at),
 constraint party_event_v11_full_week check(event_ends_at=event_starts_at+interval '7 days')
);
comment on table private.party_event_weeks_v11 is
 'Hidden: server-frozen event identity. Calendar, family, variation and party role validation also required in app service.';

create table private.party_event_roster_v11 (
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null references auth.users(id) on delete cascade,
 character_id uuid not null references public.characters(id) on delete cascade,
 role text not null check(role in ('tank','damage','support')),
 joined_at timestamptz not null,
 primary key (party_id,event_starts_at,account_id),
 unique (event_starts_at,account_id),
 unique (party_id,event_starts_at,character_id),
 foreign key (party_id,event_starts_at)
  references private.party_event_weeks_v11(party_id,event_starts_at) on delete cascade
);
comment on table private.party_event_roster_v11 is
 'Hidden: immutable event enrollment; max Tank 1, Damage 2, Support 1. Account can enroll in only one party per event week.';

create table private.party_event_stages_v11 (
 party_id uuid not null,
 event_starts_at timestamptz not null,
 stage smallint not null check(stage between 1 and 3),
 opened_at timestamptz not null,
 vote_choice text,
 vote_locked_at timestamptz,
 primary key (party_id,event_starts_at,stage),
 foreign key (party_id,event_starts_at)
  references private.party_event_weeks_v11(party_id,event_starts_at) on delete cascade,
 constraint party_event_v11_vote_pair check((vote_choice is null)=(vote_locked_at is null)),
 constraint party_event_v11_scout_has_no_vote check(stage<>1 or vote_choice is null)
);
comment on table private.party_event_stages_v11 is
 'Hidden: stage open time and server-locked route; vote may resolve once but never change.';

create table private.party_event_sources_v11 (
 source_event_id text primary key check(length(source_event_id) between 8 and 180),
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null,
 stage smallint not null check(stage between 1 and 3),
 kind text not null check(kind in ('verified_combat','verified_noncombat')),
 occurred_at timestamptz not null,
 committed_at timestamptz not null default now(),
 foreign key (party_id,event_starts_at,account_id)
  references private.party_event_roster_v11(party_id,event_starts_at,account_id) on delete cascade,
 foreign key (party_id,event_starts_at,stage)
  references private.party_event_stages_v11(party_id,event_starts_at,stage) on delete cascade,
 check (committed_at>=occurred_at)
);
comment on table private.party_event_sources_v11 is
 'Hidden: insert only in the SAME trusted gameplay transaction that verified the underlying gameplay/outbox receipt. Not client-submitted evidence.';

create table private.party_event_receipts_v11 (
 id uuid primary key default gen_random_uuid(),
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null,
 stage smallint not null check(stage between 1 and 3),
 action_id text not null check(action_id in
  ('scout_route','secure_approach','support_expedition','prepare_finale')),
 source_event_id text not null references private.party_event_sources_v11(source_event_id),
 request_id text not null unique check(length(request_id) between 8 and 180),
 stage_context_hash text not null check(stage_context_hash ~ '^[0-9a-f]{64}$'),
 event_points_awarded smallint not null default 0 check(event_points_awarded=0),
 committed_at timestamptz not null default now(),
 unique (event_starts_at,account_id,action_id),
 unique (source_event_id),
 foreign key (party_id,event_starts_at,account_id)
  references private.party_event_roster_v11(party_id,event_starts_at,account_id) on delete cascade,
 foreign key (party_id,event_starts_at,stage)
  references private.party_event_stages_v11(party_id,event_starts_at,stage) on delete cascade,
 constraint party_event_v11_action_stage check(
  (stage=1 and action_id='scout_route') or
  (stage=2 and action_id in ('secure_approach','support_expedition')) or
  (stage=3 and action_id='prepare_finale')
 )
);
comment on table private.party_event_receipts_v11 is
 'Hidden: replay-safe zero-EP objective receipts; never a grant ledger. Unique account/week/slot, request and global source prevent double-credit.';

-- Untrusted roles cannot inspect or mutate private event data.
alter table private.party_event_weeks_v11 enable row level security;
alter table private.party_event_roster_v11 enable row level security;
alter table private.party_event_stages_v11 enable row level security;
alter table private.party_event_sources_v11 enable row level security;
alter table private.party_event_receipts_v11 enable row level security;
revoke all on private.party_event_weeks_v11,private.party_event_roster_v11,
 private.party_event_stages_v11,private.party_event_sources_v11,
 private.party_event_receipts_v11 from public,anon,authenticated;
grant select,insert,update on private.party_event_weeks_v11 to service_role;
grant select,insert on private.party_event_roster_v11 to service_role;
grant select,insert,update on private.party_event_stages_v11 to service_role;
grant select,insert on private.party_event_sources_v11 to service_role;
grant select on private.party_event_receipts_v11 to service_role;

-- Every roster insert serializes on its week, including concurrent joins.
-- Never trust the supplied role; verify ownership and canonical class.
create or replace function private.party_event_roster_guard_v11()
returns trigger language plpgsql security definer set search_path='' as $$
declare
 v_week private.party_event_weeks_v11%rowtype;
 v_class text;v_owner uuid;v_role text;
 v_tank integer;v_damage integer;v_support integer;v_total integer;
begin
 if tg_op<>'INSERT' then raise exception 'party_event_roster_immutable';end if;
 select * into v_week from private.party_event_weeks_v11
  where party_id=new.party_id and event_starts_at=new.event_starts_at for update;
 if not found or v_week.status<>'active'
   or new.joined_at<v_week.event_starts_at or new.joined_at>=v_week.event_ends_at
   then raise exception 'party_event_invalid_enrollment_window';end if;
 if exists(select 1 from private.party_event_receipts_v11
   where party_id=new.party_id and event_starts_at=new.event_starts_at)
 then raise exception 'party_event_roster_already_frozen';end if;
 select account_id,class_id into v_owner,v_class
  from public.characters where id=new.character_id;
 if not found or v_owner is distinct from new.account_id
 then raise exception 'party_event_character_not_owned';end if;
 v_role:=case
  when v_class in ('IRONWARDEN','BASTION','DREADGUARD') then 'tank'
  when v_class in ('DAWNKEEPER','STONECALLER') then 'support'
  when v_class in ('WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER') then 'damage'
  else null end;
 if v_role is null or v_role<>new.role
 then raise exception 'party_event_role_mismatch';end if;
 select count(*)::integer,
  count(*) filter(where role='tank')::integer,
  count(*) filter(where role='damage')::integer,
  count(*) filter(where role='support')::integer
 into v_total,v_tank,v_damage,v_support
 from private.party_event_roster_v11
 where party_id=new.party_id and event_starts_at=new.event_starts_at;
 if v_total>=4 or (v_role='tank' and v_tank>=1)
   or (v_role='damage' and v_damage>=2)
   or (v_role='support' and v_support>=1)
 then raise exception 'party_event_role_capacity';end if;
 return new;
end;$$;

create trigger party_event_roster_guard_v11
 before insert or update or delete on private.party_event_roster_v11
 for each row execute function private.party_event_roster_guard_v11();

-- Server choices lock once. The stage cannot be rewound, changed or reopened.
create or replace function private.party_event_stage_guard_v11()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_week private.party_event_weeks_v11%rowtype;
begin
 if tg_op='DELETE' then raise exception 'party_event_stage_immutable';end if;
 select * into v_week from private.party_event_weeks_v11
 where party_id=new.party_id and event_starts_at=new.event_starts_at for update;
 if not found or v_week.status<>'active'
  or new.opened_at<v_week.event_starts_at or new.opened_at>=v_week.event_ends_at
 then raise exception 'party_event_invalid_stage_window';end if;
 if tg_op='INSERT' then
  if new.stage<>v_week.active_stage then raise exception 'party_event_wrong_open_stage';end if;
  if new.stage>1 and not exists(
   select 1 from private.party_event_stages_v11
    where party_id=new.party_id and event_starts_at=new.event_starts_at
     and stage=new.stage-1 and opened_at<=new.opened_at
     and (stage=1 or (vote_locked_at is not null
      and vote_locked_at<=new.opened_at)))
  then raise exception 'party_event_prior_stage_not_locked';end if;
  return new;
 end if;
 if row(old.party_id,old.event_starts_at,old.stage,old.opened_at)
   is distinct from row(new.party_id,new.event_starts_at,new.stage,new.opened_at)
  or old.vote_choice is not null
  or (new.vote_choice is null and new.vote_locked_at is not null)
 then raise exception 'party_event_stage_immutable';end if;
 if new.vote_choice is not null then
  if new.stage=1 or new.vote_locked_at<new.opened_at or new.vote_locked_at>now()
   then raise exception 'party_event_invalid_vote_lock';end if;
  if not (case v_week.family
   when 'broken_caravan' then (new.stage=2 and new.vote_choice in ('safe_pass','fast_pass'))
     or (new.stage=3 and new.vote_choice in ('brace_wagons','disrupt_raiders'))
   when 'nightfall_hunt' then (new.stage=2 and new.vote_choice in ('clear_trail','shadow_trail'))
     or (new.stage=3 and new.vote_choice in ('hold_ground','hunt_alpha'))
   when 'broken_wards' then (new.stage=2 and new.vote_choice in ('ground_spires','charge_sigils'))
     or (new.stage=3 and new.vote_choice in ('protect_wards','overload_wards'))
   when 'lost_reliquary' then (new.stage=2 and new.vote_choice in ('quiet_passage','deep_passage'))
     or (new.stage=3 and new.vote_choice in ('preserve_seals','break_seals'))
   else false end)
  then raise exception 'party_event_invalid_family_vote';end if;
 end if;
 return new;
end;$$;

create trigger party_event_stage_guard_v11
 before insert or update or delete on private.party_event_stages_v11
 for each row execute function private.party_event_stage_guard_v11();

-- Week metadata and the active stage are monotone. This does not itself
-- certify supply completion; the server must enforce v2 stage progression.
create or replace function private.party_event_week_guard_v11()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op<>'UPDATE' then return old;end if;
 if row(old.party_id,old.event_starts_at,old.event_ends_at,
     old.family,old.variation,old.seed,old.difficulty,old.created_at)
  is distinct from
    row(new.party_id,new.event_starts_at,new.event_ends_at,
     new.family,new.variation,new.seed,new.difficulty,new.created_at)
 then raise exception 'party_event_week_identity_immutable';end if;
 if old.status='settled' or old.status='closed' and new.status<>'settled'
  or old.status='active' and new.status not in ('active','closed','settled')
  or new.active_stage<old.active_stage
  or new.active_stage>old.active_stage+1
  or old.status<>'active' and new.active_stage<>old.active_stage
 then raise exception 'party_event_lifecycle_regression';end if;
 if new.active_stage>old.active_stage and not exists(
  select 1 from private.party_event_stages_v11
   where party_id=old.party_id and event_starts_at=old.event_starts_at
    and stage=old.active_stage and (stage=1 or vote_locked_at is not null))
 then raise exception 'party_event_previous_stage_not_locked';end if;
 return new;
end;$$;
create trigger party_event_week_guard_v11
 before update on private.party_event_weeks_v11
 for each row execute function private.party_event_week_guard_v11();

-- A source is append-only. No changing its actor, timing or gameplay kind
-- to re-credit a different action later.
create or replace function private.party_event_append_only_v11()
returns trigger language plpgsql security definer set search_path='' as $$
begin raise exception 'party_event_record_immutable';end;$$;
create trigger party_event_sources_immutable_v11
 before update or delete on private.party_event_sources_v11
 for each row execute function private.party_event_append_only_v11();
create trigger party_event_receipts_immutable_v11
 before update or delete on private.party_event_receipts_v11
 for each row execute function private.party_event_append_only_v11();

-- Trusted service-only RPC: source MUST already exist from gameplay/outbox
-- commit. Locks the week and stage before checking and inserting. A retry
-- returns the original row even after the week closes, but can never insert
-- a new receipt after close. Unique indexes remain the final concurrency gate.
create or replace function private.record_party_event_action_v11(
 p_party_id uuid,p_event_starts_at timestamptz,p_source_event_id text,
 p_action_id text,p_request_id text,p_stage_context_hash text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_week private.party_event_weeks_v11%rowtype;
 v_stage private.party_event_stages_v11%rowtype;
 v_source private.party_event_sources_v11%rowtype;
 v_existing private.party_event_receipts_v11%rowtype;
 v_new private.party_event_receipts_v11%rowtype;
 v_now timestamptz:=clock_timestamp();
 v_count integer;v_tanks integer;v_damage integer;v_support integer;
 v_expected_stage smallint;
begin
 if p_party_id is null or p_event_starts_at is null or
  p_source_event_id is null or p_request_id is null or
  length(p_request_id) not between 8 and 180 or
  length(p_source_event_id) not between 8 and 180 or
  p_stage_context_hash is null or
  p_stage_context_hash !~ '^[0-9a-f]{64}$'
 then raise exception 'party_event_invalid_receipt_input';end if;
 v_expected_stage:=case p_action_id
  when 'scout_route' then 1
  when 'secure_approach' then 2
  when 'support_expedition' then 2
  when 'prepare_finale' then 3 else null end;
 if v_expected_stage is null then raise exception 'party_event_invalid_action';end if;

 select * into v_week from private.party_event_weeks_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_week_not_found';end if;
 select * into v_source from private.party_event_sources_v11
 where source_event_id=p_source_event_id
  and party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_source_not_verified';end if;

 select * into v_existing from private.party_event_receipts_v11
 where event_starts_at=p_event_starts_at and account_id=v_source.account_id
  and action_id=p_action_id for update;
 if found then
  if v_existing.party_id<>p_party_id or
   v_existing.source_event_id<>p_source_event_id or
   v_existing.request_id<>p_request_id or
   v_existing.stage_context_hash<>p_stage_context_hash
  then raise exception 'party_event_action_already_claimed';end if;
  return jsonb_build_object('receiptId',v_existing.id,'replayed',true,'eventPointsGranted',0);
 end if;
 if v_week.status<>'active' or
  v_now<v_week.event_starts_at or v_now>=v_week.event_ends_at
 then raise exception 'party_event_window_closed';end if;
 if v_week.active_stage<>v_expected_stage or v_source.stage<>v_expected_stage
 then raise exception 'party_event_wrong_stage';end if;
 select * into v_stage from private.party_event_stages_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and stage=v_expected_stage for update;
 if not found or v_stage.opened_at>v_now
 then raise exception 'party_event_stage_not_open';end if;
 if v_expected_stage>1 then
  if v_stage.vote_choice is null or v_stage.vote_locked_at is null
   or v_source.occurred_at<v_stage.vote_locked_at
  then raise exception 'party_event_vote_not_locked';end if;
 end if;
 if v_expected_stage=3 and not exists(
  select 1 from private.party_event_stages_v11
   where party_id=p_party_id and event_starts_at=p_event_starts_at
    and stage=2 and vote_locked_at is not null)
 then raise exception 'party_event_prior_vote_missing';end if;
 if v_source.occurred_at<v_stage.opened_at
  or v_source.occurred_at>=v_week.event_ends_at
  or v_source.committed_at<v_source.occurred_at
  or v_source.committed_at>v_now
  or (v_expected_stage=1 and v_source.kind<>'verified_noncombat')
  or not exists (
   select 1 from private.party_event_roster_v11
   where party_id=p_party_id and event_starts_at=p_event_starts_at
    and account_id=v_source.account_id and joined_at<=v_source.occurred_at)
 then raise exception 'party_event_invalid_evidence';end if;

 select count(*)::integer,count(*) filter(where role='tank')::integer,
  count(*) filter(where role='damage')::integer,
  count(*) filter(where role='support')::integer
 into v_count,v_tanks,v_damage,v_support
 from private.party_event_roster_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 if v_count<2 or v_count>4 or v_tanks>1 or v_damage>2 or v_support>1
  or (v_count=4 and (v_tanks<>1 or v_damage<>2 or v_support<>1))
 then raise exception 'party_event_illegal_party_composition';end if;

 if exists(select 1 from private.party_event_receipts_v11
   where request_id=p_request_id or source_event_id=p_source_event_id)
 then raise exception 'party_event_source_or_request_reused';end if;
 insert into private.party_event_receipts_v11(
  party_id,event_starts_at,account_id,stage,action_id,source_event_id,
  request_id,stage_context_hash,committed_at)
 values(p_party_id,p_event_starts_at,v_source.account_id,v_expected_stage,
  p_action_id,p_source_event_id,p_request_id,p_stage_context_hash,v_now)
 returning * into v_new;
 return jsonb_build_object('receiptId',v_new.id,'replayed',false,'eventPointsGranted',0);
end;$$;

revoke all on function private.record_party_event_action_v11(
 uuid,timestamptz,text,text,text,text) from public,anon,authenticated;
grant execute on function private.record_party_event_action_v11(
 uuid,timestamptz,text,text,text,text) to service_role;
revoke all on function private.party_event_week_guard_v11() from public,anon,authenticated;
revoke all on function private.party_event_roster_guard_v11() from public,anon,authenticated;
revoke all on function private.party_event_stage_guard_v11() from public,anon,authenticated;
revoke all on function private.party_event_append_only_v11() from public,anon,authenticated;
commit;
