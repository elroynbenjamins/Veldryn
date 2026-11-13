-- Party Events v21: single MVCC replay bundle and service-only gate.
-- All fixtures and migrations are run in outer BEGIN ... ROLLBACK.
begin;
do $$
declare
 p uuid:=gen_random_uuid();
 a uuid[]:=array[gen_random_uuid(),gen_random_uuid()];
 c uuid[]:=array[gen_random_uuid(),gen_random_uuid()];
 w timestamptz:=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC'-interval '28 days';
 r uuid;
 q jsonb;
 response jsonb;
 snapshot jsonb;
 again jsonb;
 i integer;
 now_ms bigint:=(extract(epoch from now())*1000)::bigint;
begin
 if has_function_privilege('authenticated',
   'private.read_party_event_boss_replay_snapshot_v21(uuid)','execute')
  or has_function_privilege('anon',
   'private.read_party_event_boss_replay_snapshot_v21(uuid)','execute')
  or not has_function_privilege('service_role',
   'private.read_party_event_boss_replay_snapshot_v21(uuid)','execute')
 then raise exception 'V21 confidential replay reader permissions invalid';end if;
 begin
  perform private.read_party_event_boss_replay_snapshot_v21(gen_random_uuid());
  raise exception 'V21 unknown reservation returned private source data';
 exception when others then
  if sqlerrm<>'party_event_v21_reservation_missing' then raise;end if;
 end;

 for i in 1..2 loop
  insert into auth.users(id,email)
  values(a[i],'v21-'||a[i]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id)
  values(c[i],a[i],'Replay Reader '||chr(64+i),
   case i when 1 then 'IRONWARDEN' else 'WAYFINDER' end);
 end loop;
 insert into public.parties(id,leader_account_id,leader_character_id)
 values(p,a[1],c[1]);
 insert into private.party_event_weeks_v11(
  party_id,event_starts_at,event_ends_at,family,variation,seed,difficulty)
 values(p,w,w+interval '7 days','broken_caravan','bandits_crossing',0,'standard');
 insert into private.party_event_roster_v11(
  party_id,event_starts_at,account_id,character_id,role,joined_at)
 values(p,w,a[1],c[1],'tank',w),(p,w,a[2],c[2],'damage',w);
 insert into private.party_event_stages_v11(party_id,event_starts_at,stage,opened_at)
 values(p,w,1,w);
 update private.party_event_weeks_v11 set active_stage=2
 where party_id=p and event_starts_at=w;
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at,vote_choice,vote_locked_at)
 values(p,w,2,w+interval '1 day','safe_pass',w+interval '1 day');
 update private.party_event_weeks_v11 set active_stage=3
 where party_id=p and event_starts_at=w;
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at,vote_choice,vote_locked_at)
 values(p,w,3,w+interval '2 days','brace_wagons',w+interval '2 days');

 -- Synthetic owner-only fixtures let the v21 read test be independent of
 -- the earlier v18/19 writer tests. These rows are NOT deployed or persisted.
 for i in 1..2 loop
  insert into private.party_event_boss_loadouts_v18(
   party_id,event_starts_at,account_id,character_id,loadout_id,
   revision,content_version,class_id,character_level,snapshot_hash,
   stat_snapshot,ability_snapshot,capability_tags,readiness_json,saved_at)
  values(p,w,a[i],c[i],'current',1,'v21-reader-test',
   case i when 1 then 'IRONWARDEN' else 'WAYFINDER' end,25,
   repeat(case i when 1 then 'a' else 'b' end,64),
   jsonb_build_object('characterId',c[i],
     'classId',case i when 1 then 'IRONWARDEN' else 'WAYFINDER' end),
   '[]'::jsonb,array[]::text[],'{}'::jsonb,w+interval '3 days');
 end loop;
 insert into private.party_event_stage_transitions_v17(
  request_id,party_id,event_starts_at,from_stage,to_stage,
  from_stage_orders_hash,verified_ep)
 values('v21-stage-one',p,w,1,2,repeat('a',64),25),
       ('v21-stage-two',p,w,2,3,repeat('b',64),75);
 insert into private.party_event_supply_orders_v16(
  party_id,event_starts_at,stage,item_id,category,kind,
  target_quantity,donated_quantity,frozen_at)
 select p,w,stage_num,x.item_id,x.category,'required',1,1,w+interval '8 hours'
 from generate_series(1,3) stage_num
 cross join (values
   ('GREENWOOD_LOG','wood'),
   ('COPPER_ORE','ore'),
   ('THORN_SAP','herb')) x(item_id,category);
 insert into private.party_event_stage_seals_v17(
  party_id,event_starts_at,stage,required_orders_count,orders_hash,sealed_at)
 values(p,w,1,3,repeat('a',64),w+interval '8 hours'),
       (p,w,2,3,repeat('b',64),w+interval '2 days'),
       (p,w,3,3,repeat('e',64),w+interval '3 days');
 insert into private.party_event_finale_seals_v18(
  party_id,event_starts_at,finale_hash,loadout_hash,member_count,
  verified_points,stage3_orders_hash,stage3_vote_choice,sealed_at)
 values(p,w,repeat('c',64),repeat('d',64),2,100,
  repeat('e',64),'brace_wagons',w+interval '6 days');
 response:=private.reserve_party_event_day_eight_v18(
  p,w,'v21-day8-reservation');
 r:=(response->>'bossAttemptId')::uuid;
 begin
  perform private.read_party_event_boss_replay_snapshot_v21(r);
  raise exception 'V21 accepted an attempt without a recorded candidate';
 exception when others then
  if sqlerrm<>'party_event_v21_candidate_missing' then raise;end if;
 end;

 q:=jsonb_build_object(
  'completedAtMs',now_ms,'tiersCleared',0,'highestTierReached',1,
  'totalBossDamage',600,'totalPossibleBossHp',1000,'rewardBand',1,
  'tiers',jsonb_build_array(jsonb_build_object(
   'tier',1,'cleared',false,'bossMaxHp',1000,
   'bossRemainingHp',400,'partyDamage',600,
   'durationMs',1100,'reason','wipe')),
  'contributions',jsonb_build_array(
   jsonb_build_object('accountId',a[1],'characterId',c[1],
    'role','tank','damage',300,'healing',0,'shielding',0,
    'absorbedDamage',10,'damageTaken',60,'interrupts',0,
    'meaningfulContribution',true),
   jsonb_build_object('accountId',a[2],'characterId',c[2],
    'role','damage','damage',300,'healing',0,'shielding',0,
    'absorbedDamage',0,'damageTaken',0,'interrupts',0,
    'meaningfulContribution',true)));
 perform private.record_party_event_boss_candidate_v19(
  r,'v21-boss-candidate',repeat('c',64),'party-event-day8-combat-v4',q);

 -- SQL can verify source snapshot binding and durable metadata. A real
 -- trusted worker runs the TypeScript v20 simulation before calling v23.
 snapshot:=private.read_party_event_boss_replay_snapshot_v21(r);
 if has_function_privilege('authenticated',
  'private.attest_party_event_boss_replay_v23(uuid,text,text,text,text,text,integer,integer,text)','execute')
 or has_function_privilege('anon',
  'private.party_event_boss_attestation_status_v23(uuid)','execute')
 or has_table_privilege('service_role',
  'private.party_event_boss_replay_attestations_v23','insert')
 or has_table_privilege('authenticated',
  'private.party_event_boss_replay_attestations_v23','select')
 then raise exception 'V23 trusted replay attestation permissions unsafe';end if;

 if (private.party_event_boss_attestation_status_v23(r)->>'workerReplayAttested')::boolean
 then raise exception 'V23 attested without server replay';end if;

 -- No audit of real gameplay content means a missing/changed audit must fail.
 begin
  perform private.attest_party_event_boss_replay_v23(r,
   'v23-test-worker-attest',snapshot->>'sourceDigest',
   snapshot->'payload'->'candidate'->>'candidate_hash',repeat('f',64),
   snapshot->'payload'->'finale'->>'loadout_hash',0,1,'unreviewed-herbalism-v99');
  raise exception 'V23 accepted unapproved resource audit';
 exception when others then
  if sqlerrm<>'party_event_v23_invalid_attestation' then raise;end if;
 end;

 begin
  perform private.attest_party_event_boss_replay_v23(gen_random_uuid(),
   'v23-test-worker-attest',snapshot->>'sourceDigest',
   snapshot->'payload'->'candidate'->>'candidate_hash',repeat('f',64),
   snapshot->'payload'->'finale'->>'loadout_hash',0,1,
   'greenfields-verified-gathering-v22');
  raise exception 'V23 accepted unknown reservation';
 exception when others then
  if sqlerrm<>'party_event_v23_reservation_missing' then raise;end if;
 end;

 begin
  perform private.attest_party_event_boss_replay_v23(r,
   'v23-test-worker-attest',snapshot->>'sourceDigest',
   snapshot->'payload'->'candidate'->>'candidate_hash',repeat('f',64),
   snapshot->'payload'->'finale'->>'loadout_hash',12,6,
   'greenfields-verified-gathering-v22');
  raise exception 'V23 accepted unearned tier and band';
 exception when others then
  if sqlerrm<>'party_event_v23_candidate_commitment_mismatch' then raise;end if;
 end;

 begin
  perform private.attest_party_event_boss_replay_v23(r,
   'v23-test-worker-attest',snapshot->>'sourceDigest',
   repeat('0',64),repeat('f',64),
   snapshot->'payload'->'finale'->>'loadout_hash',0,1,
   'greenfields-verified-gathering-v22');
  raise exception 'V23 accepted forged candidate commitment';
 exception when others then
  if sqlerrm<>'party_event_v23_candidate_commitment_mismatch' then raise;end if;
 end;

 -- The source SQL digest includes the week status: a proof made before
 -- event closure cannot be committed against a changed source state.
 update private.party_event_weeks_v11 set status='closed'
 where party_id=p and event_starts_at=w;
 begin
  perform private.attest_party_event_boss_replay_v23(r,
   'v23-test-worker-attest',snapshot->>'sourceDigest',
   snapshot->'payload'->'candidate'->>'candidate_hash',repeat('f',64),
   snapshot->'payload'->'finale'->>'loadout_hash',0,1,
   'greenfields-verified-gathering-v22');
  raise exception 'V23 accepted stale source digest';
 exception when others then
  if sqlerrm<>'party_event_v23_source_snapshot_changed' then raise;end if;
 end;

 snapshot:=private.read_party_event_boss_replay_snapshot_v21(r);
 response:=private.attest_party_event_boss_replay_v23(r,
  'v23-test-worker-attest',snapshot->>'sourceDigest',
  snapshot->'payload'->'candidate'->>'candidate_hash',repeat('f',64),
  snapshot->'payload'->'finale'->>'loadout_hash',0,1,
  'greenfields-verified-gathering-v22');
 if response->>'replayed'<>'false' or
  response->>'workerReplayAttested'<>'true'
  or response->>'combatIndependentlyVerifiedBySql'<>'false'
  or response->>'rewardsGranted'<>'false'
  or response->>'entitlementsCreated'<>'false'
 then raise exception 'V23 attestation wrongly claimed SQL replay or payout';end if;

 again:=private.attest_party_event_boss_replay_v23(r,
  'v23-test-worker-attest',snapshot->>'sourceDigest',
  snapshot->'payload'->'candidate'->>'candidate_hash',repeat('f',64),
  snapshot->'payload'->'finale'->>'loadout_hash',0,1,
  'greenfields-verified-gathering-v22');
 if again->>'replayed'<>'true' or again->>'replayHash'<>repeat('f',64)
 then raise exception 'V23 exact retry was not idempotent';end if;

 begin
  perform private.attest_party_event_boss_replay_v23(r,
   'v23-second-request-ignored',snapshot->>'sourceDigest',
   snapshot->'payload'->'candidate'->>'candidate_hash',repeat('f',64),
   snapshot->'payload'->'finale'->>'loadout_hash',0,1,
   'greenfields-verified-gathering-v22');
  raise exception 'V23 accepted second attestation';
 exception when others then
  if sqlerrm<>'party_event_v23_attestation_conflict' then raise;end if;
 end;

 begin
  perform private.attest_party_event_boss_replay_v23(r,
   'v23-test-worker-attest',snapshot->>'sourceDigest',
   snapshot->'payload'->'candidate'->>'candidate_hash',repeat('a',64),
   snapshot->'payload'->'finale'->>'loadout_hash',0,1,
   'greenfields-verified-gathering-v22');
  raise exception 'V23 accepted changed replay hash';
 exception when others then
  if sqlerrm<>'party_event_v23_attestation_conflict' then raise;end if;
 end;

 if (select count(*) from private.party_event_boss_replay_attestations_v23
    where party_id=p)<>1
 or (select count(*) from private.party_event_reward_previews_v19
    where party_id=p and granted)<>0
 or (select count(*) from private.party_event_boss_candidates_v19
    where party_id=p)<>1
 then raise exception 'V23 created multiple attestations or altered rewards';end if;

 if (private.party_event_boss_attestation_status_v23(r)->>'status')
    <>'worker_replay_attested_no_rewards'
 or (private.party_event_boss_attestation_status_v23(r)->>'rewardsClaimable')
    <>'false'
 then raise exception 'V23 made unclaimable loot visible';end if;

 begin
  update private.party_event_boss_replay_attestations_v23
   set reward_band=6 where reservation_id=r;
  raise exception 'V23 attestation mutable';
 exception when others then
  if sqlerrm<>'party_event_progress_immutable' then raise;end if;
 end;

 -- Existing attestation replays remain idempotent even if a future process
 -- marks the week settled; no second economic transfer is performed.
 update private.party_event_weeks_v11 set status='settled'
 where party_id=p and event_starts_at=w;
 again:=private.attest_party_event_boss_replay_v23(r,
  'v23-test-worker-attest',snapshot->>'sourceDigest',
  snapshot->'payload'->'candidate'->>'candidate_hash',repeat('f',64),
  snapshot->'payload'->'finale'->>'loadout_hash',0,1,
  'greenfields-verified-gathering-v22');
 if again->>'replayed'<>'true'
 then raise exception 'V23 exact retry after week closure failed';end if;
end $$;
select 'PASS: v23 one immutable worker replay attestation, source digest, no rewards' as result;
rollback;
