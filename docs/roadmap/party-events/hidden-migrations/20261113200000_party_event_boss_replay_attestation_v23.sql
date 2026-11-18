-- Hidden Party Events v23: durable, immutable, NONPAYING trusted-worker replay attestation.
-- Requires v11-v19 and v21-v22. A service-role SQL call is an assertion by a
-- trusted worker, NOT proof that SQL ran the TypeScript combat engine.
-- This table MUST NOT be used as a loot entitlement or a client-visible victory.
begin;

create table private.party_event_boss_replay_attestations_v23 (
  reservation_id uuid primary key
    references private.party_event_day8_reservations_v18(id) on delete cascade,
  party_id uuid not null,
  event_starts_at timestamptz not null,
  request_id text not null unique check(length(request_id) between 8 and 180),
  source_digest text not null check(source_digest ~ '^[a-f0-9]{64}$'),
  candidate_hash text not null check(candidate_hash ~ '^[a-f0-9]{64}$'),
  replay_hash text not null check(replay_hash ~ '^[a-f0-9]{64}$'),
  loadout_hash text not null check(loadout_hash ~ '^[a-f0-9]{64}$'),
  ruleset text not null check(ruleset='party-event-day8-combat-v4'),
  resource_audit text not null check(resource_audit='greenfields-verified-gathering-v22'),
  tiers_cleared smallint not null check(tiers_cleared between 0 and 12),
  reward_band smallint not null check(reward_band between 1 and 6),
  worker_attested_at timestamptz not null default now(),
  rewards_granted boolean not null default false check(rewards_granted=false),
  reward_entitlement_created boolean not null default false
    check(reward_entitlement_created=false),
  unique(party_id,event_starts_at),
  foreign key(party_id,event_starts_at)
    references private.party_event_finale_seals_v18(party_id,event_starts_at)
    on delete cascade
);

alter table private.party_event_boss_replay_attestations_v23 enable row level security;
revoke all on private.party_event_boss_replay_attestations_v23
 from public,anon,authenticated,service_role;
grant select on private.party_event_boss_replay_attestations_v23 to service_role;
create trigger party_event_boss_replay_attestation_immutable_v23
 before update on private.party_event_boss_replay_attestations_v23
 for each row execute function private.party_event_progress_immutable_v14();

-- The function is service-only and receives no combat result, winner or
-- claimed raw stats. It locks the week (the same lock used by donation
-- and stage mutation functions), recomputes the ONE-statement source digest,
-- and cross-checks all persisted identities and v19 result metadata.
-- The replay_hash is an assertion from the worker; SQL cannot reproduce
-- the TypeScript fight or authenticate a binary version by itself.
create or replace function private.attest_party_event_boss_replay_v23(
 p_reservation_id uuid,
 p_request_id text,
 p_source_digest text,
 p_candidate_hash text,
 p_replay_hash text,
 p_loadout_hash text,
 p_tiers_cleared integer,
 p_reward_band integer,
 p_resource_audit text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 r private.party_event_day8_reservations_v18%rowtype;
 w private.party_event_weeks_v11%rowtype;
 f private.party_event_finale_seals_v18%rowtype;
 c private.party_event_boss_candidates_v19%rowtype;
 prior private.party_event_boss_replay_attestations_v23%rowtype;
 bundle jsonb;
 new_row private.party_event_boss_replay_attestations_v23%rowtype;
begin
 if p_reservation_id is null or p_request_id is null
    or length(p_request_id) not between 8 and 180
    or p_source_digest !~ '^[a-f0-9]{64}$'
    or p_candidate_hash !~ '^[a-f0-9]{64}$'
    or p_replay_hash !~ '^[a-f0-9]{64}$'
    or p_loadout_hash !~ '^[a-f0-9]{64}$'
    or p_tiers_cleared not between 0 and 12
    or p_reward_band not between 1 and 6
    or p_resource_audit is distinct from 'greenfields-verified-gathering-v22'
 then raise exception 'party_event_v23_invalid_attestation';end if;

 select * into r from private.party_event_day8_reservations_v18
  where id=p_reservation_id;
 if not found then raise exception 'party_event_v23_reservation_missing';end if;
 select * into w from private.party_event_weeks_v11
  where party_id=r.party_id and event_starts_at=r.event_starts_at
  for update;
 if not found then raise exception 'party_event_v23_week_missing';end if;

 select * into prior from private.party_event_boss_replay_attestations_v23
 where reservation_id=p_reservation_id
    or request_id=p_request_id
    or (party_id=r.party_id and event_starts_at=r.event_starts_at)
 for update;
 if found then
  if prior.reservation_id is distinct from p_reservation_id
     or prior.request_id is distinct from p_request_id
     or prior.source_digest is distinct from p_source_digest
     or prior.candidate_hash is distinct from p_candidate_hash
     or prior.replay_hash is distinct from p_replay_hash
     or prior.loadout_hash is distinct from p_loadout_hash
     or prior.tiers_cleared is distinct from p_tiers_cleared
     or prior.reward_band is distinct from p_reward_band
     or prior.resource_audit is distinct from p_resource_audit
  then raise exception 'party_event_v23_attestation_conflict';end if;
  return jsonb_build_object('replayed',true,'reservationId',p_reservation_id,
   'replayHash',prior.replay_hash,
   'workerReplayAttested',true,'combatIndependentlyVerifiedBySql',false,
   'rewardsGranted',false,'entitlementsCreated',false);
 end if;

 -- A finalized week is not a valid source for a FIRST attestation.
 if w.status='settled' or w.active_stage<>3
    or clock_timestamp()<w.event_ends_at+interval '1 hour'
 then raise exception 'party_event_v23_attestation_window_closed';end if;
 select * into f from private.party_event_finale_seals_v18
 where party_id=r.party_id and event_starts_at=r.event_starts_at;
 select * into c from private.party_event_boss_candidates_v19
 where reservation_id=r.id and party_id=r.party_id
   and event_starts_at=r.event_starts_at;
 if f.finale_hash is null or c.reservation_id is null
    or r.finale_hash is distinct from f.finale_hash
    or c.finale_hash is distinct from f.finale_hash
    or c.candidate_hash is distinct from p_candidate_hash
    or f.loadout_hash is distinct from p_loadout_hash
    or c.tiers_cleared is distinct from p_tiers_cleared
    or c.reward_band is distinct from p_reward_band
    or c.engine_version<>'party-event-day8-combat-v4'
 then raise exception 'party_event_v23_candidate_commitment_mismatch';end if;

 -- The exact source snapshot used by the worker must still match the data
 -- at commit time; this rejects a stale proof if a relevant row changed.
 bundle:=private.read_party_event_boss_replay_snapshot_v21(p_reservation_id);
 if bundle->>'sourceDigest' is distinct from p_source_digest
  or bundle->>'version'<>'private-party-event-replay-snapshot-v21'
  or (bundle->>'rewardGrantAllowed')::boolean is distinct from false
 then raise exception 'party_event_v23_source_snapshot_changed';end if;
 if bundle->'payload'->'candidate'->>'candidate_hash' is distinct from p_candidate_hash
    or bundle->'payload'->'finale'->>'loadout_hash' is distinct from p_loadout_hash
 then raise exception 'party_event_v23_source_commitment_changed';end if;

 insert into private.party_event_boss_replay_attestations_v23(
  reservation_id,party_id,event_starts_at,request_id,source_digest,
  candidate_hash,replay_hash,loadout_hash,ruleset,resource_audit,
  tiers_cleared,reward_band)
 values(p_reservation_id,r.party_id,r.event_starts_at,p_request_id,
  p_source_digest,p_candidate_hash,p_replay_hash,p_loadout_hash,
  'party-event-day8-combat-v4',p_resource_audit,p_tiers_cleared,p_reward_band)
 returning * into new_row;
 return jsonb_build_object('replayed',false,'reservationId',new_row.reservation_id,
  'replayHash',new_row.replay_hash,
  'workerReplayAttested',true,'combatIndependentlyVerifiedBySql',false,
  'rewardsGranted',false,'entitlementsCreated',false);
end;$$;

create or replace function private.party_event_boss_attestation_status_v23(
 p_reservation_id uuid
) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare a private.party_event_boss_replay_attestations_v23%rowtype;
begin
 if p_reservation_id is null then
  raise exception 'party_event_v23_invalid_reservation';end if;
 select * into a from private.party_event_boss_replay_attestations_v23
 where reservation_id=p_reservation_id;
 return jsonb_build_object('reservationId',p_reservation_id,
  'workerReplayAttested',a.reservation_id is not null,
  'replayHash',a.replay_hash,
  'rewardEligible',false,'rewardsGranted',false,
  'entitlementsCreated',false,'rewardsClaimable',false,
  'status',case when a.reservation_id is not null
    then 'worker_replay_attested_no_rewards'
    else 'awaiting_trusted_worker_replay' end);
end;$$;
revoke all on function private.attest_party_event_boss_replay_v23(
 uuid,text,text,text,text,text,integer,integer,text),
 private.party_event_boss_attestation_status_v23(uuid)
 from public,anon,authenticated;
grant execute on function private.attest_party_event_boss_replay_v23(
 uuid,text,text,text,text,text,integer,integer,text),
 private.party_event_boss_attestation_status_v23(uuid)
 to service_role;
commit;
