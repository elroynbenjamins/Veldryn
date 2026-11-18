-- Veldryn Party Events v18 — freeze trusted boss loadouts and reserve Day 8.
-- Hidden / draft-only. Depends on v11-v17. Do not deploy to production.
-- No boss victory, reward entitlements, chest, gold or item mutation.
begin;

-- Each participant may choose/rechoose a server-verified co-op snapshot
-- during the active week. Once a finale is sealed, no further changes.
create table private.party_event_boss_loadouts_v18 (
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null,
 character_id uuid not null,
 loadout_id text not null,
 revision bigint not null check(revision>=1),
 content_version text not null,
 class_id text not null,
 character_level integer not null check(character_level between 1 and 100),
 snapshot_hash text not null check(snapshot_hash ~ '^[a-f0-9]{64}$'),
 stat_snapshot jsonb not null check(jsonb_typeof(stat_snapshot)='object'),
 ability_snapshot jsonb not null check(jsonb_typeof(ability_snapshot)='array'),
 capability_tags text[] not null,
 readiness_json jsonb not null,
 saved_at timestamptz not null default now(),
 primary key(party_id,event_starts_at,account_id),
 foreign key(party_id,event_starts_at,account_id)
  references private.party_event_roster_v11(party_id,event_starts_at,account_id)
  on delete cascade,
 foreign key(character_id,account_id)
  references public.characters(id,account_id) on delete cascade
);
create table private.party_event_finale_seals_v18 (
 party_id uuid not null,
 event_starts_at timestamptz not null,
 finale_hash text not null check(finale_hash ~ '^[a-f0-9]{64}$'),
 loadout_hash text not null check(loadout_hash ~ '^[a-f0-9]{64}$'),
 member_count integer not null check(member_count between 2 and 4),
 verified_points integer not null check(verified_points>=0),
 stage3_orders_hash text not null check(stage3_orders_hash ~ '^[a-f0-9]{64}$'),
 stage3_vote_choice text not null,
 sealed_at timestamptz not null default now(),
 primary key(party_id,event_starts_at),
 foreign key(party_id,event_starts_at)
  references private.party_event_weeks_v11(party_id,event_starts_at)
  on delete cascade
);
create table private.party_event_day8_reservations_v18 (
 id uuid primary key default gen_random_uuid(),
 party_id uuid not null,
 event_starts_at timestamptz not null,
 request_id text not null unique check(length(request_id) between 8 and 180),
 finale_hash text not null check(finale_hash ~ '^[a-f0-9]{64}$'),
 opened_at timestamptz not null default now(),
 unique(party_id,event_starts_at),
 foreign key(party_id,event_starts_at)
  references private.party_event_finale_seals_v18(party_id,event_starts_at)
  on delete cascade
);
create index party_event_day8_reservations_party_v18
 on private.party_event_day8_reservations_v18(party_id,event_starts_at);

alter table private.party_event_boss_loadouts_v18 enable row level security;
alter table private.party_event_finale_seals_v18 enable row level security;
alter table private.party_event_day8_reservations_v18 enable row level security;
revoke all on private.party_event_boss_loadouts_v18,
 private.party_event_finale_seals_v18,
 private.party_event_day8_reservations_v18 from public,anon,authenticated;
grant select on private.party_event_boss_loadouts_v18,
 private.party_event_finale_seals_v18,
 private.party_event_day8_reservations_v18 to service_role;

-- All seals and Day 8 reservations are append-only, even to service code.
create trigger party_event_finale_seal_immutable_v18 before update
 on private.party_event_finale_seals_v18 for each row
 execute function private.party_event_progress_immutable_v14();
create trigger party_event_day8_reservation_immutable_v18 before update
 on private.party_event_day8_reservations_v18 for each row
 execute function private.party_event_progress_immutable_v14();

-- Additional defense against an admin mistakenly rewriting selected
-- loadout material after a finale has been frozen.
create or replace function private.party_event_boss_loadout_guard_v18()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from private.party_event_finale_seals_v18
  where party_id=new.party_id and event_starts_at=new.event_starts_at)
 then raise exception 'party_event_v18_loadouts_sealed';end if;
 if tg_op='UPDATE' and
  row(old.party_id,old.event_starts_at,old.account_id,old.character_id)
   is distinct from
  row(new.party_id,new.event_starts_at,new.account_id,new.character_id)
 then raise exception 'party_event_v18_loadout_identity_immutable';end if;
 return new;
end;$$;
create trigger party_event_boss_loadout_guard_v18
 before insert or update on private.party_event_boss_loadouts_v18
 for each row execute function private.party_event_boss_loadout_guard_v18();

-- Source is public.coop_saved_loadouts, published by the authoritative
-- gameplay settlement; not user JSON. Do not require dungeon unlock.
-- Unlike v2 freezePartyEventBossLoadout's runtime engine-specific hash,
-- this is the canonical *published* snapshot hash, with full data copied.
-- The future boss worker must verify/convert it to the combat-engine actor.
create or replace function private.save_party_event_boss_loadout_v18(
 p_party_id uuid,p_event_starts_at timestamptz,
 p_account_id uuid,p_loadout_id text,p_expected_revision bigint
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 v_character_id uuid;
 v_joined_at timestamptz;
 v_class_id text;
 l public.coop_saved_loadouts%rowtype;
 v_prior private.party_event_boss_loadouts_v18%rowtype;
 v_now timestamptz:=clock_timestamp();
begin
 if p_party_id is null or p_event_starts_at is null
  or p_account_id is null or p_loadout_id is null
  or length(p_loadout_id) not between 1 and 128
  or p_expected_revision is null or p_expected_revision<1
 then raise exception 'party_event_v18_invalid_loadout_request';end if;
 select * into w from private.party_event_weeks_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v18_week_missing';end if;
 if w.status<>'active' or v_now<w.event_starts_at
  or v_now>=w.event_ends_at
 then raise exception 'party_event_v18_loadout_window_closed';end if;
 if exists(select 1 from private.party_event_finale_seals_v18
  where party_id=p_party_id and event_starts_at=p_event_starts_at)
 then raise exception 'party_event_v18_loadouts_sealed';end if;
 select r.character_id,r.joined_at,c.class_id
  into v_character_id,v_joined_at,v_class_id
 from private.party_event_roster_v11 r
 join public.characters c on c.id=r.character_id
 where r.party_id=p_party_id and r.event_starts_at=p_event_starts_at
  and r.account_id=p_account_id;
 if v_character_id is null or v_joined_at>v_now
 then raise exception 'party_event_v18_not_enrolled';end if;
 select * into l from public.coop_saved_loadouts
 where account_id=p_account_id and character_id=v_character_id
  and loadout_id=p_loadout_id and revision=p_expected_revision
  and active and legal_equipment
 for share;
 if not found or l.class_id is distinct from v_class_id
  or l.snapshot_hash !~ '^[a-f0-9]{64}$'
  or jsonb_typeof(l.stat_snapshot)<>'object'
  or jsonb_typeof(l.ability_snapshot)<>'array'
  or l.verified_at>v_now
 then raise exception 'party_event_v18_unverified_loadout';end if;
 select * into v_prior from private.party_event_boss_loadouts_v18
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and account_id=p_account_id for update;
 if found and v_prior.snapshot_hash=l.snapshot_hash
  and v_prior.revision=l.revision and v_prior.loadout_id=l.loadout_id
 then return jsonb_build_object('replayed',true,
  'snapshotHash',v_prior.snapshot_hash,
  'savedAt',v_prior.saved_at,'characterId',v_character_id);end if;
 insert into private.party_event_boss_loadouts_v18(
  party_id,event_starts_at,account_id,character_id,loadout_id,revision,
  content_version,class_id,character_level,snapshot_hash,
  stat_snapshot,ability_snapshot,capability_tags,readiness_json,saved_at)
 values(p_party_id,p_event_starts_at,p_account_id,v_character_id,
  l.loadout_id,l.revision,l.content_version,l.class_id,l.character_level,
  l.snapshot_hash,l.stat_snapshot,l.ability_snapshot,l.capability_tags,
  l.readiness_json,v_now)
 on conflict(party_id,event_starts_at,account_id)
 do update set loadout_id=excluded.loadout_id,
  revision=excluded.revision,content_version=excluded.content_version,
  class_id=excluded.class_id,character_level=excluded.character_level,
  snapshot_hash=excluded.snapshot_hash,
  stat_snapshot=excluded.stat_snapshot,
  ability_snapshot=excluded.ability_snapshot,
  capability_tags=excluded.capability_tags,readiness_json=excluded.readiness_json,
  saved_at=excluded.saved_at;
 return jsonb_build_object('replayed',false,'snapshotHash',l.snapshot_hash,
  'savedAt',v_now,'characterId',v_character_id);
end;$$;

-- Freeze the fully prepared finale before the 7-day week closes. Every
-- stage must already have been sealed and its required resources donated,
-- both Stage 1/2 transitions must exist, and Stage 3 vote and objective
-- must be present. A missing loadout or any unmet EP blocks freezing.
create or replace function private.seal_party_event_finale_v18(
 p_party_id uuid,p_event_starts_at timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 existing private.party_event_finale_seals_v18%rowtype;
 s3 private.party_event_stages_v11%rowtype;
 seal3 private.party_event_stage_seals_v17%rowtype;
 v_now timestamptz:=clock_timestamp();
 v_readiness jsonb;
 v_roster_count integer;v_loadout_count integer;
 v_incomplete_stages integer;v_transition_count integer;
 v_snapshot_hash text;v_finale_hash text;
 v_points integer;
begin
 if p_party_id is null or p_event_starts_at is null
 then raise exception 'party_event_v18_invalid_finale_request';end if;
 select * into w from private.party_event_weeks_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v18_week_missing';end if;
 select * into existing from private.party_event_finale_seals_v18
 where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if found then return jsonb_build_object(
   'replayed',true,'finaleHash',existing.finale_hash,
   'loadoutHash',existing.loadout_hash,'memberCount',existing.member_count);
 end if;
 if w.status<>'active' or w.active_stage<>3
  or v_now<w.event_starts_at or v_now>=w.event_ends_at
 then raise exception 'party_event_v18_finale_window_closed';end if;
 select * into s3 from private.party_event_stages_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and stage=3 for update;
 select * into seal3 from private.party_event_stage_seals_v17
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and stage=3;
 if s3.stage is null or s3.vote_choice is null
   or s3.vote_locked_at is null or seal3.orders_hash is null
 then raise exception 'party_event_v18_finale_not_prepared';end if;
 select count(*)::integer into v_transition_count
 from private.party_event_stage_transitions_v17 t
 where t.party_id=p_party_id and t.event_starts_at=p_event_starts_at
  and t.from_stage in (1,2);
 if v_transition_count<>2 then
  raise exception 'party_event_v18_prior_stages_not_advanced';end if;
 select count(*)::integer into v_incomplete_stages
 from generate_series(1,3) stage_num
 where not exists(select 1 from private.party_event_stage_seals_v17 ss
  where ss.party_id=p_party_id and ss.event_starts_at=p_event_starts_at
   and ss.stage=stage_num)
 or not exists(select 1 from private.party_event_supply_orders_v16 o
  where o.party_id=p_party_id and o.event_starts_at=p_event_starts_at
   and o.stage=stage_num and o.kind='required' and o.category='wood')
 or not exists(select 1 from private.party_event_supply_orders_v16 o
  where o.party_id=p_party_id and o.event_starts_at=p_event_starts_at
   and o.stage=stage_num and o.kind='required' and o.category='ore')
 or not exists(select 1 from private.party_event_supply_orders_v16 o
  where o.party_id=p_party_id and o.event_starts_at=p_event_starts_at
   and o.stage=stage_num and o.kind='required' and o.category='herb')
 or exists(select 1 from private.party_event_supply_orders_v16 o
  where o.party_id=p_party_id and o.event_starts_at=p_event_starts_at
   and o.stage=stage_num and o.kind='required'
   and o.donated_quantity<>o.target_quantity);
 if v_incomplete_stages>0 then
  raise exception 'party_event_v18_required_supplies_incomplete';end if;
 if not exists(select 1 from private.party_event_receipts_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at
  and stage=3 and action_id='prepare_finale')
 then raise exception 'party_event_v18_missing_finale_objective';end if;
 v_readiness:=private.party_event_stage_readiness_v17(
  p_party_id,p_event_starts_at);
 if (v_readiness->>'verifiedTotalEventPoints')::integer
  <(v_readiness->>'progressTarget')::integer
 then raise exception 'party_event_v18_insufficient_ep';end if;
 v_points:=(v_readiness->>'verifiedTotalEventPoints')::integer;

 select count(*)::integer into v_roster_count
 from private.party_event_roster_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 select count(*)::integer into v_loadout_count
 from private.party_event_boss_loadouts_v18
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 if v_roster_count not between 2 and 4 or v_loadout_count<>v_roster_count
 then raise exception 'party_event_v18_missing_frozen_loadouts';end if;

 -- Stable digest of all copied authoritative records. The runtime will
 -- independently convert and validate the actors; DB never accepts a
 -- caller-supplied winner or a result belonging to a generic dungeon.
 select encode(sha256(convert_to(string_agg(
  concat_ws(':',account_id,character_id,loadout_id,
   revision,content_version,snapshot_hash),
  '|' order by account_id),'UTF8')),'hex')
 into v_snapshot_hash from private.party_event_boss_loadouts_v18
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 v_finale_hash:=encode(sha256(convert_to(
  p_party_id::text||':'||p_event_starts_at::text||':'||
  v_snapshot_hash||':'||seal3.orders_hash||':'||s3.vote_choice||':'||
  v_points::text,'UTF8')),'hex');
 insert into private.party_event_finale_seals_v18(
  party_id,event_starts_at,finale_hash,loadout_hash,
  member_count,verified_points,stage3_orders_hash,stage3_vote_choice,sealed_at)
 values(p_party_id,p_event_starts_at,v_finale_hash,v_snapshot_hash,
  v_roster_count,v_points,seal3.orders_hash,s3.vote_choice,v_now);
 return jsonb_build_object('replayed',false,
  'finaleHash',v_finale_hash,'loadoutHash',v_snapshot_hash,
  'memberCount',v_roster_count,'verifiedEventPoints',v_points);
end;$$;

-- Reserve exactly ONE Day 8 attempt after the same +1 hour grace period
-- as the hidden TypeScript boss engine. This reservation is NOT proof of
-- victory and grants NO money, inventory, title, rankings or reward.
create or replace function private.reserve_party_event_day_eight_v18(
 p_party_id uuid,p_event_starts_at timestamptz,p_request_id text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 f private.party_event_finale_seals_v18%rowtype;
 existing private.party_event_day8_reservations_v18%rowtype;
 v_new private.party_event_day8_reservations_v18%rowtype;
 v_now timestamptz:=clock_timestamp();
begin
 if p_party_id is null or p_event_starts_at is null
  or p_request_id is null or length(p_request_id) not between 8 and 180
 then raise exception 'party_event_v18_invalid_day8_request';end if;
 select * into w from private.party_event_weeks_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at for update;
 if not found then raise exception 'party_event_v18_week_missing';end if;
 select * into existing from private.party_event_day8_reservations_v18
 where request_id=p_request_id or
   (party_id=p_party_id and event_starts_at=p_event_starts_at)
 for update;
 if found then
  if existing.party_id is distinct from p_party_id
    or existing.event_starts_at is distinct from p_event_starts_at
    or existing.request_id is distinct from p_request_id
  then raise exception 'party_event_v18_day8_request_conflict';end if;
  return jsonb_build_object('replayed',true,
   'bossAttemptId',existing.id,'finaleHash',existing.finale_hash,
   'bossResultCommitted',false,'rewardsGranted',false);
 end if;
 if w.active_stage<>3 or w.status='settled'
  or v_now<w.event_ends_at+interval '1 hour'
 then raise exception 'party_event_v18_day8_not_ready';end if;
 select * into f from private.party_event_finale_seals_v18
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 if not found then raise exception 'party_event_v18_missing_preclose_finale';end if;
 insert into private.party_event_day8_reservations_v18(
  party_id,event_starts_at,request_id,finale_hash,opened_at)
 values(p_party_id,p_event_starts_at,p_request_id,f.finale_hash,v_now)
 returning * into v_new;
 return jsonb_build_object('replayed',false,
  'bossAttemptId',v_new.id,'finaleHash',f.finale_hash,
  'bossResultCommitted',false,'rewardsGranted',false);
end;$$;

create or replace function private.party_event_day_eight_readiness_v18(
 p_party_id uuid,p_event_starts_at timestamptz
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 w private.party_event_weeks_v11%rowtype;
 f private.party_event_finale_seals_v18%rowtype;
 r private.party_event_day8_reservations_v18%rowtype;
 v_now timestamptz:=now();
begin
 select * into w from private.party_event_weeks_v11
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 if not found then raise exception 'party_event_v18_week_missing';end if;
 select * into f from private.party_event_finale_seals_v18
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 select * into r from private.party_event_day8_reservations_v18
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 return jsonb_build_object(
  'stage',w.active_stage,'eventStatus',w.status,
  'finaleSealed',f.finale_hash is not null,
  'frozenMemberCount',coalesce(f.member_count,0),
  'bossOpensAt',w.event_ends_at+interval '1 hour',
  'bossAttemptReserved',r.id is not null,
  'bossAttemptId',r.id,
  'bossResultCommitted',false,'rewardsGranted',false,
  'rewardEligible',false,
  'status',case
   when r.id is not null then 'reserved_for_server_boss'
   when w.status='settled' then 'settled_without_party_event_boss'
   when f.finale_hash is null and v_now<w.event_ends_at then 'preparing'
   when f.finale_hash is null then 'incomplete_at_close'
   when v_now<w.event_ends_at+interval '1 hour' then 'waiting_for_day_eight'
   else 'ready_for_server_reservation' end);
end;$$;

revoke all on function private.save_party_event_boss_loadout_v18(
 uuid,timestamptz,uuid,text,bigint),
 private.seal_party_event_finale_v18(uuid,timestamptz),
 private.reserve_party_event_day_eight_v18(uuid,timestamptz,text),
 private.party_event_day_eight_readiness_v18(uuid,timestamptz)
 from public,anon,authenticated;
grant execute on function private.save_party_event_boss_loadout_v18(
 uuid,timestamptz,uuid,text,bigint),
 private.seal_party_event_finale_v18(uuid,timestamptz),
 private.reserve_party_event_day_eight_v18(uuid,timestamptz,text),
 private.party_event_day_eight_readiness_v18(uuid,timestamptz)
 to service_role;
revoke all on function private.party_event_boss_loadout_guard_v18()
 from public,anon,authenticated;
commit;
