-- Party Events v19: candidate integrity, closed-week replay, zero reward grants.
-- Tests use privileged synthetic data inside a single outer ROLLBACK.
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
 replay jsonb;
 summary jsonb;
 i integer;
 now_ms bigint:=(extract(epoch from now())*1000)::bigint;
begin
 if has_table_privilege('service_role','private.party_event_boss_candidates_v19','insert')
  or has_table_privilege('service_role','private.party_event_reward_previews_v19','insert')
  or has_function_privilege('authenticated',
   'private.record_party_event_boss_candidate_v19(uuid,text,text,text,jsonb)','execute')
  or has_function_privilege('anon',
   'private.party_event_boss_candidate_status_v19(uuid,timestamptz)','execute')
 then raise exception 'V19 candidate exposed to untrusted clients';end if;
 for i in 1..2 loop
  insert into auth.users(id,email) values(a[i],'v19-'||a[i]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id)
  values(c[i],a[i],'Boss Candidate '||chr(64+i),
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

 -- The real v18 loadout freeze is separately proven in v18. These
 -- database-owner synthetic rows only exercise candidate join constraints.
 for i in 1..2 loop
  insert into private.party_event_boss_loadouts_v18(
   party_id,event_starts_at,account_id,character_id,loadout_id,
   revision,content_version,class_id,character_level,snapshot_hash,
   stat_snapshot,ability_snapshot,capability_tags,readiness_json,saved_at)
  values(p,w,a[i],c[i],'current',1,'test-v19',
   case i when 1 then 'IRONWARDEN' else 'WAYFINDER' end,25,
   repeat(case i when 1 then 'a' else 'b' end,64),
   jsonb_build_object('characterId',c[i]),'[]'::jsonb,
   array[]::text[],'{}'::jsonb,w+interval '3 days');
 end loop;
 insert into private.party_event_finale_seals_v18(
  party_id,event_starts_at,finale_hash,loadout_hash,member_count,
  verified_points,stage3_orders_hash,stage3_vote_choice,sealed_at)
 values(p,w,repeat('c',64),repeat('d',64),2,100,
  repeat('e',64),'brace_wagons',w+interval '6 days');
 insert into private.party_event_member_progress_v14(
  party_id,event_starts_at,account_id,activity_points)
 values(p,w,a[1],20),(p,w,a[2],6);
 response:=private.reserve_party_event_day_eight_v18(
  p,w,'v19-boss-attempt-0001');
 r:=(response->>'bossAttemptId')::uuid;
 if r is null then raise exception 'V19 attempt reservation missing';end if;

 q:=jsonb_build_object(
  'completedAtMs',now_ms,'tiersCleared',1,'highestTierReached',1,
  'totalBossDamage',1000,'totalPossibleBossHp',1000,'rewardBand',1,
  'tiers',jsonb_build_array(jsonb_build_object(
   'tier',1,'cleared',true,'bossMaxHp',1000,
   'bossRemainingHp',0,'partyDamage',1000,
   'durationMs',1100,'reason','victory')),
  'contributions',jsonb_build_array(
   jsonb_build_object('accountId',a[1],'characterId',c[1],
    'role','tank','damage',300,'healing',0,'shielding',0,
    'absorbedDamage',10,'damageTaken',60,'interrupts',0,
    'meaningfulContribution',true),
   jsonb_build_object('accountId',a[2],'characterId',c[2],
    'role','damage','damage',700,'healing',0,'shielding',0,
    'absorbedDamage',0,'damageTaken',0,'interrupts',0,
    'meaningfulContribution',true)));

 begin
  perform private.record_party_event_boss_candidate_v19(
   gen_random_uuid(),'v19-no-attempt-0001',repeat('c',64),
   'combat-engine-v19',q);
  raise exception 'V19 accepted unknown attempt';
 exception when others then
  if sqlerrm<>'party_event_v19_reservation_missing' then raise;end if;
 end;
 begin
  perform private.record_party_event_boss_candidate_v19(
   r,'v19-wrong-finalehash',repeat('f',64),'combat-engine-v19',q);
  raise exception 'V19 accepted wrong finale hash';
 exception when others then
  if sqlerrm<>'party_event_v19_finale_hash_mismatch' then raise;end if;
 end;
 begin
  perform private.record_party_event_boss_candidate_v19(
   r,'v19-forged-damage',repeat('c',64),'combat-engine-v19',
   jsonb_set(q,'{tiers,0,partyDamage}','999'::jsonb));
  raise exception 'V19 accepted inconsistent boss damage';
 exception when others then
  if sqlerrm<>'party_event_v19_invalid_tier_telemetry' then raise;end if;
 end;
 begin
  perform private.record_party_event_boss_candidate_v19(
   r,'v19-fake-tier-count',repeat('c',64),'combat-engine-v19',
   jsonb_set(q,'{tiersCleared}','12'::jsonb));
  raise exception 'V19 trusted client-provided tier score';
 exception when others then
  if sqlerrm<>'party_event_v19_result_totals_mismatch' then raise;end if;
 end;
 begin
  perform private.record_party_event_boss_candidate_v19(
   r,'v19-duplicate-contributors',repeat('c',64),'combat-engine-v19',
   jsonb_set(q,'{contributions,1,accountId}',to_jsonb(a[1])));
  raise exception 'V19 accepted duplicated roster account';
 exception when others then
  if sqlerrm not in ('party_event_v19_result_roster_mismatch',
   'party_event_v19_duplicate_contributor') then raise;end if;
 end;
 begin
  perform private.record_party_event_boss_candidate_v19(
   r,'v19-invalid-band',repeat('c',64),'combat-engine-v19',
   jsonb_set(q,'{rewardBand}','6'::jsonb));
  raise exception 'V19 accepted arbitrary reward band';
 exception when others then
  if sqlerrm<>'party_event_v19_result_totals_mismatch' then raise;end if;
 end;

 response:=private.record_party_event_boss_candidate_v19(
  r,'v19-valid-result-0001',repeat('c',64),'combat-engine-v19',q);
 if response->>'replayed'<>'false'
  or response->>'combatVerified'<>'false'
  or response->>'rewardsGranted'<>'false'
  or (response->>'rewardBand')::int<>1
 then raise exception 'V19 candidate incorrectly settled or rewarded';end if;
 replay:=private.record_party_event_boss_candidate_v19(
  r,'v19-valid-result-0001',repeat('c',64),'combat-engine-v19',q);
 if replay->>'replayed'<>'true'
  or replay->>'candidateHash'<>response->>'candidateHash'
 then raise exception 'V19 exact replay changed result';end if;
 begin
  perform private.record_party_event_boss_candidate_v19(
   r,'v19-another-boss-result',repeat('c',64),'combat-engine-v19',q);
  raise exception 'V19 accepted second boss outcome';
 exception when others then
  if sqlerrm<>'party_event_v19_candidate_conflict' then raise;end if;
 end;
 begin
  perform private.record_party_event_boss_candidate_v19(
   r,'v19-valid-result-0001',repeat('c',64),'combat-engine-v19',
   jsonb_set(q,'{contributions,0,damage}','301'::jsonb));
  raise exception 'V19 mutated existing boss candidate';
 exception when others then
  if sqlerrm<>'party_event_v19_candidate_conflict' then raise;end if;
 end;

 if (select count(*) from private.party_event_reward_previews_v19
   where party_id=p)<>2
  or (select eligibility from private.party_event_reward_previews_v19
      where party_id=p and account_id=a[1])<>'full'
  or (select eligibility from private.party_event_reward_previews_v19
      where party_id=p and account_id=a[2])<>'participation'
  or exists(select 1 from private.party_event_reward_previews_v19
    where granted)
 then raise exception 'V19 derived eligibility or no-grants invariant violated';end if;
 summary:=private.party_event_boss_candidate_status_v19(p,w);
 if summary->>'status'<>'awaiting_independent_combat_replay'
  or summary->>'bossCandidateRecorded'<>'true'
  or summary->>'combatVerified'<>'false'
  or summary->>'rewardEligible'<>'false'
 then raise exception 'V19 preview exposed unverified boss loot';end if;
 begin
  update private.party_event_boss_candidates_v19 set reward_band=6
  where reservation_id=r;
  raise exception 'V19 candidate was mutable';
 exception when others then
  if sqlerrm<>'party_event_progress_immutable_v14' and
   sqlerrm<>'party_event_progress_immutable' then raise;end if;
 end;
 update private.party_event_weeks_v11 set status='closed'
 where party_id=p and event_starts_at=w;
 replay:=private.record_party_event_boss_candidate_v19(
  r,'v19-valid-result-0001',repeat('c',64),'combat-engine-v19',q);
 if replay->>'replayed'<>'true' then
  raise exception 'V19 post-close exact replay failed';end if;
 if (select count(*) from private.party_event_boss_candidates_v19)<>1
  or (select status from private.party_event_weeks_v11
    where party_id=p and event_starts_at=w)<>'closed'
 then raise exception 'V19 wrote event status or multiple results';end if;
end $$;
select 'PASS: v19 boss candidate integrity, exact replay, frozen roster, previews never grant' as result;
rollback;
