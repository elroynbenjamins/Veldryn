-- Party Events v19: private, single-write Day 8 combat CANDIDATE ledger.
-- A candidate is NOT verified victory, settlement, or a reward entitlement.
-- The server must independently reproduce combat from frozen v18 snapshots
-- in a later pass before any payout. Requires v11-v18; feature flag OFF.
begin;

create table private.party_event_boss_candidates_v19 (
 reservation_id uuid primary key references private.party_event_day8_reservations_v18(id) on delete cascade,
 party_id uuid not null,
 event_starts_at timestamptz not null,
 request_id text not null unique check(length(request_id) between 8 and 180),
 finale_hash text not null check(finale_hash ~ '^[0-9a-f]{64}$'),
 engine_version text not null check(length(engine_version) between 3 and 80),
 candidate_hash text not null check(candidate_hash ~ '^[0-9a-f]{64}$'),
 tiers_cleared smallint not null check(tiers_cleared between 0 and 12),
 highest_tier_reached smallint not null check(highest_tier_reached between 1 and 12),
 reward_band smallint not null check(reward_band between 1 and 6),
 result_json jsonb not null check(jsonb_typeof(result_json)='object'),
 captured_at timestamptz not null default now(),
 unique(party_id,event_starts_at),
 foreign key(party_id,event_starts_at)
   references private.party_event_finale_seals_v18(party_id,event_starts_at) on delete cascade
);

-- An eligibility forecast, not a claimable entitlement. Values are
-- derived from durable v14 activity and v15 special EP, not result JSON.
create table private.party_event_reward_previews_v19 (
 party_id uuid not null,
 event_starts_at timestamptz not null,
 account_id uuid not null,
 reservation_id uuid not null references private.party_event_boss_candidates_v19(reservation_id) on delete cascade,
 personal_points smallint not null check(personal_points between 0 and 60),
 eligibility text not null check(eligibility in ('none','participation','full')),
 reward_band smallint not null check(reward_band between 1 and 6),
 granted boolean not null default false check(granted=false),
 created_at timestamptz not null default now(),
 primary key(party_id,event_starts_at,account_id),
 foreign key(party_id,event_starts_at,account_id)
  references private.party_event_roster_v11(party_id,event_starts_at,account_id) on delete cascade
);
alter table private.party_event_boss_candidates_v19 enable row level security;
alter table private.party_event_reward_previews_v19 enable row level security;
revoke all on private.party_event_boss_candidates_v19,
 private.party_event_reward_previews_v19 from public,anon,authenticated;
grant select on private.party_event_boss_candidates_v19,
 private.party_event_reward_previews_v19 to service_role;
create trigger party_event_boss_candidate_immutable_v19 before update
 on private.party_event_boss_candidates_v19 for each row
 execute function private.party_event_progress_immutable_v14();
create trigger party_event_reward_preview_immutable_v19 before update
 on private.party_event_reward_previews_v19 for each row
 execute function private.party_event_progress_immutable_v14();

create or replace function private.record_party_event_boss_candidate_v19(
 p_reservation_id uuid,p_request_id text,p_finale_hash text,
 p_engine_version text,p_result jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 r private.party_event_day8_reservations_v18%rowtype;
 f private.party_event_finale_seals_v18%rowtype;
 w private.party_event_weeks_v11%rowtype;
 existing private.party_event_boss_candidates_v19%rowtype;
 v_hash text;
 v_tiers jsonb;
 v_contrib jsonb;
 v_tier jsonb;
 v_row jsonb;
 v_i integer;
 v_n integer;
 v_cleared integer:=0;
 v_damage bigint:=0;
 v_total_hp bigint:=0;
 v_max_hp bigint;
 v_remaining bigint;
 v_damage_this bigint;
 v_duration bigint;
 v_result_band integer;
 v_last_cleared boolean:=false;
 v_seen_failure boolean:=false;
 v_fraction numeric;
 v_members integer;
 v_contributions_seen integer;
 v_personal integer;
 v_role text;
 v_actor uuid;
 v_account uuid;
 v_now timestamptz:=clock_timestamp();
 v_finished_ms bigint;
begin
 if p_reservation_id is null or p_request_id is null
   or length(p_request_id) not between 8 and 180
   or p_finale_hash !~ '^[0-9a-f]{64}$'
   or p_engine_version is null or length(p_engine_version) not between 3 and 80
   or p_result is null or jsonb_typeof(p_result)<>'object'
 then raise exception 'party_event_v19_invalid_candidate_request';end if;

 select * into r from private.party_event_day8_reservations_v18
 where id=p_reservation_id;
 if not found then raise exception 'party_event_v19_reservation_missing';end if;
 select * into w from private.party_event_weeks_v11
 where party_id=r.party_id and event_starts_at=r.event_starts_at for update;
 if not found then raise exception 'party_event_v19_week_missing';end if;
 v_hash:=encode(sha256(convert_to(p_result::text,'UTF8')),'hex');
 select * into existing from private.party_event_boss_candidates_v19
 where reservation_id=p_reservation_id or request_id=p_request_id
   or (party_id=r.party_id and event_starts_at=r.event_starts_at)
 for update;
 if found then
  if existing.reservation_id is distinct from p_reservation_id
   or existing.request_id is distinct from p_request_id
   or existing.finale_hash is distinct from p_finale_hash
   or existing.engine_version is distinct from p_engine_version
   or existing.candidate_hash is distinct from v_hash
  then raise exception 'party_event_v19_candidate_conflict';end if;
  return jsonb_build_object('replayed',true,'reservationId',p_reservation_id,
   'candidateHash',existing.candidate_hash,'rewardBand',existing.reward_band,
   'combatVerified',false,'rewardsGranted',false);
 end if;

 select * into f from private.party_event_finale_seals_v18
 where party_id=r.party_id and event_starts_at=r.event_starts_at;
 if not found or f.finale_hash<>p_finale_hash or r.finale_hash<>p_finale_hash
 then raise exception 'party_event_v19_finale_hash_mismatch';end if;
 if w.active_stage<>3 or w.status='settled'
  or v_now<w.event_ends_at+interval '1 hour'
  or r.opened_at<w.event_ends_at+interval '1 hour'
 then raise exception 'party_event_v19_day8_not_ready';end if;
 if (p_result->>'completedAtMs') !~ '^[0-9]{12,15}$'
 then raise exception 'party_event_v19_invalid_completion_time';end if;
 v_finished_ms:=(p_result->>'completedAtMs')::bigint;
 if to_timestamp(v_finished_ms::numeric/1000)<w.event_ends_at+interval '1 hour'
   or to_timestamp(v_finished_ms::numeric/1000)>v_now+interval '5 minutes'
 then raise exception 'party_event_v19_invalid_completion_time';end if;

 v_tiers:=p_result->'tiers';
 v_contrib:=p_result->'contributions';
 if jsonb_typeof(v_tiers)<>'array' or jsonb_typeof(v_contrib)<>'array'
 then raise exception 'party_event_v19_invalid_result_shape';end if;
 v_n:=jsonb_array_length(v_tiers);
 if v_n not between 1 and 12 then raise exception 'party_event_v19_invalid_tier_count';end if;
 for v_i in 1..v_n loop
  v_tier:=v_tiers->(v_i-1);
  if jsonb_typeof(v_tier)<>'object'
   or v_tier->>'tier' is distinct from v_i::text
   or (v_tier->>'bossMaxHp') !~ '^[1-9][0-9]{0,11}$'
   or (v_tier->>'bossRemainingHp') !~ '^[0-9]{1,12}$'
   or (v_tier->>'partyDamage') !~ '^[0-9]{1,12}$'
   or (v_tier->>'durationMs') !~ '^[0-9]{1,6}$'
   or (v_tier->>'cleared') not in ('true','false')
   or (v_tier->>'reason') not in ('victory','wipe','timeout')
  then raise exception 'party_event_v19_invalid_tier_result';end if;
  v_max_hp:=(v_tier->>'bossMaxHp')::bigint;
  v_remaining:=(v_tier->>'bossRemainingHp')::bigint;
  v_damage_this:=(v_tier->>'partyDamage')::bigint;
  v_duration:=(v_tier->>'durationMs')::bigint;
  if v_duration>90000 or v_remaining>v_max_hp
    or v_damage_this<>v_max_hp-v_remaining or v_seen_failure
  then raise exception 'party_event_v19_invalid_tier_telemetry';end if;
  v_last_cleared:=(v_tier->>'cleared')::boolean;
  if v_last_cleared then
   if v_tier->>'reason'<>'victory' or v_remaining<>0
   then raise exception 'party_event_v19_false_victory';end if;
   v_cleared:=v_cleared+1;
  else
   if v_i<>v_n or v_tier->>'reason'='victory'
   then raise exception 'party_event_v19_false_victory';end if;
   v_seen_failure:=true;
  end if;
  v_damage:=v_damage+v_damage_this;
  v_total_hp:=v_total_hp+v_max_hp;
 end loop;
 if (v_cleared=12 and v_n<>12)
   or (v_cleared=v_n and not v_last_cleared)
 then raise exception 'party_event_v19_invalid_tier_sequence';end if;
 v_fraction:=case when v_last_cleared then 0
   else v_damage_this::numeric/greatest(1,v_max_hp)::numeric end;
 v_result_band:=least(6,floor((v_cleared+v_fraction)/2)::integer+1);
 if p_result->>'tiersCleared' is distinct from v_cleared::text
   or p_result->>'highestTierReached' is distinct from v_n::text
   or p_result->>'totalBossDamage' is distinct from v_damage::text
   or p_result->>'totalPossibleBossHp' is distinct from v_total_hp::text
   or p_result->>'rewardBand' is distinct from v_result_band::text
 then raise exception 'party_event_v19_result_totals_mismatch';end if;

 -- Exact human frozen roster, no echoes or additional participant slots.
 select count(*)::integer into v_members from private.party_event_roster_v11
 where party_id=r.party_id and event_starts_at=r.event_starts_at;
 if v_members<>f.member_count or jsonb_array_length(v_contrib)<>v_members
 then raise exception 'party_event_v19_result_roster_mismatch';end if;
 v_contributions_seen:=0;
 for v_row in select value from jsonb_array_elements(v_contrib) loop
  if (v_row->>'accountId') !~* '^[0-9a-f-]{36}$'
   or (v_row->>'characterId') !~* '^[0-9a-f-]{36}$'
  then raise exception 'party_event_v19_invalid_contribution_identity';end if;
  v_account:=(v_row->>'accountId')::uuid;
  v_actor:=(v_row->>'characterId')::uuid;
  select role into v_role from private.party_event_roster_v11
  where party_id=r.party_id and event_starts_at=r.event_starts_at
   and account_id=v_account and character_id=v_actor;
  if not found or v_row->>'role'<>v_role
  then raise exception 'party_event_v19_result_roster_mismatch';end if;
  if not exists(select 1 from private.party_event_boss_loadouts_v18 l
    where l.party_id=r.party_id and l.event_starts_at=r.event_starts_at
    and l.account_id=v_account and l.character_id=v_actor)
  then raise exception 'party_event_v19_missing_frozen_actor';end if;
  for v_role in select unnest(array[
   'damage','healing','shielding','absorbedDamage','damageTaken','interrupts'
  ]) loop
   if (v_row->>v_role) !~ '^[0-9]{1,12}$'
   then raise exception 'party_event_v19_invalid_contribution_metrics';end if;
  end loop;
  select count(*) into v_i from jsonb_array_elements(v_contrib) duplicate
   where duplicate->>'accountId'=v_account::text;
  if v_i<>1 then raise exception 'party_event_v19_duplicate_contributor';end if;
  v_contributions_seen:=v_contributions_seen+1;
 end loop;
 if v_contributions_seen<>v_members
 then raise exception 'party_event_v19_result_roster_mismatch';end if;

 insert into private.party_event_boss_candidates_v19(
  reservation_id,party_id,event_starts_at,request_id,finale_hash,
  engine_version,candidate_hash,tiers_cleared,highest_tier_reached,
  reward_band,result_json,captured_at)
 values(p_reservation_id,r.party_id,r.event_starts_at,p_request_id,p_finale_hash,
  p_engine_version,v_hash,v_cleared,v_n,v_result_band,p_result,v_now);

 insert into private.party_event_reward_previews_v19(
  party_id,event_starts_at,account_id,reservation_id,
  personal_points,eligibility,reward_band)
 select roster.party_id,roster.event_starts_at,roster.account_id,p_reservation_id,
  coalesce(activity.activity_points,0)::integer+
    coalesce(special.special_points,0)::integer,
  case when coalesce(activity.activity_points,0)+coalesce(special.special_points,0)>=15
    then 'full'
   when coalesce(activity.activity_points,0)+coalesce(special.special_points,0)>=5
    then 'participation' else 'none' end,
  v_result_band
 from private.party_event_roster_v11 roster
 left join private.party_event_member_progress_v14 activity
  on activity.party_id=roster.party_id and activity.event_starts_at=roster.event_starts_at
   and activity.account_id=roster.account_id
 left join lateral(select sum(s.points_credited)::integer special_points
   from private.party_event_special_credits_v15 s
   where s.party_id=roster.party_id and s.event_starts_at=roster.event_starts_at
    and s.account_id=roster.account_id) special on true
 where roster.party_id=r.party_id and roster.event_starts_at=r.event_starts_at;

 return jsonb_build_object('replayed',false,'reservationId',p_reservation_id,
  'candidateHash',v_hash,'rewardBand',v_result_band,
  'tiersCleared',v_cleared,'combatVerified',false,'rewardsGranted',false);
end;$$;

create or replace function private.party_event_boss_candidate_status_v19(
 p_party_id uuid,p_event_starts_at timestamptz
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 b jsonb;
 candidate private.party_event_boss_candidates_v19%rowtype;
begin
 b:=private.party_event_day_eight_readiness_v18(p_party_id,p_event_starts_at);
 select * into candidate from private.party_event_boss_candidates_v19
 where party_id=p_party_id and event_starts_at=p_event_starts_at;
 return b||jsonb_build_object(
  'bossCandidateRecorded',candidate.reservation_id is not null,
  'combatVerified',false,'rewardsGranted',false,'rewardEligible',false,
  'candidateHash',candidate.candidate_hash,
  'candidateRewardBand',candidate.reward_band,
  'status',case when candidate.reservation_id is not null
   then 'awaiting_independent_combat_replay' else b->>'status' end);
end;$$;

revoke all on function private.record_party_event_boss_candidate_v19(
 uuid,text,text,text,jsonb),
 private.party_event_boss_candidate_status_v19(uuid,timestamptz)
 from public,anon,authenticated;
grant execute on function private.record_party_event_boss_candidate_v19(
 uuid,text,text,text,jsonb),
 private.party_event_boss_candidate_status_v19(uuid,timestamptz)
 to service_role;
commit;
