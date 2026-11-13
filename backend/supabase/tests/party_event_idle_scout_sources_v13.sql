-- Veldryn Party Events v13: hidden scout evidence/anti-bank regressions.
-- Run after v11/v12/v13 migrations; test fixtures are rolled back.
begin;
do $$
declare
 a uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 c uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 p uuid:=gen_random_uuid();
 start_at timestamptz:=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC';
 good_claim uuid:=gen_random_uuid();
 other_claim uuid:=gen_random_uuid();
 short_claim uuid:=gen_random_uuid();
 zero_claim uuid:=gen_random_uuid();
 non_gather_claim uuid:=gen_random_uuid();
 outsider_claim uuid:=gen_random_uuid();
 banked_claim uuid:=gen_random_uuid();
 req_hash text:=repeat('d',64);
 first_result jsonb;
 replay_result jsonb;
 i integer;
begin
 if has_function_privilege('authenticated',
  'private.record_party_event_idle_scout_v13(uuid,timestamptz,uuid,text,text)','execute')
  or not has_function_privilege('service_role',
  'private.record_party_event_idle_scout_v13(uuid,timestamptz,uuid,text,text)','execute')
 then raise exception 'V13 scout function permissions wrong';end if;
 if has_table_privilege('service_role','private.party_event_sources_v11','insert')
  or has_table_privilege('authenticated','private.party_event_sources_v11','insert')
 then raise exception 'V13 raw source evidence can be fabricated';end if;

 for i in 1..3 loop
  insert into auth.users(id,email) values(a[i],'v13-'||a[i]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id)
  values(c[i],a[i],'Scout Tester '||chr(64+i),
   case i when 1 then 'IRONWARDEN' when 2 then 'WAYFINDER' else 'BASTION' end);
 end loop;
 insert into public.parties(id,leader_account_id,leader_character_id)
 values(p,a[1],c[1]);
 insert into private.party_event_weeks_v11(
  party_id,event_starts_at,event_ends_at,family,variation,seed,difficulty)
 values(p,start_at,start_at+interval '7 days','broken_caravan',
  'bandits_crossing',0,'standard');
 insert into private.party_event_roster_v11(
  party_id,event_starts_at,account_id,character_id,role,joined_at)
 values(p,start_at,a[1],c[1],'tank',start_at),
       (p,start_at,a[2],c[2],'damage',start_at);
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p,start_at,1,start_at);

 -- A valid event-local, completed 90-second mining claim.
 insert into public.idle_claim_receipts(
  claim_id,character_id,idempotency_key,activity_id,
  elapsed_sec,resource_amount,xp_amount)
 values(good_claim,c[1],'v13-good-gathering-01','COPPER_VEIN',90,4,32);
 first_result:=private.record_party_event_idle_scout_v13(
  p,start_at,good_claim,'v13-request-scout-01',req_hash);
 if first_result->>'replayed'<>'false'
  or (first_result->>'eventPointsGranted')::int<>0
 then raise exception 'V13 canonical scouting receipt failed';end if;
 replay_result:=private.record_party_event_idle_scout_v13(
  p,start_at,good_claim,'v13-request-scout-01',req_hash);
 if replay_result->>'replayed'<>'true'
  or replay_result->>'receiptId'<>first_result->>'receiptId'
 then raise exception 'V13 exact scout replay not idempotent';end if;
 begin
  perform private.record_party_event_idle_scout_v13(
   p,start_at,good_claim,'v13-request-scout-02',req_hash);
  raise exception 'V13 duplicate scout allowed with another request';
 exception when others then
  if sqlerrm<>'party_event_action_already_claimed' then raise;end if;
 end;

 insert into public.idle_claim_receipts(
  claim_id,character_id,idempotency_key,activity_id,
  elapsed_sec,resource_amount,xp_amount)
 values(short_claim,c[2],'v13-short-gathering','GREENWOOD_TREE',30,3,4),
       (zero_claim,c[2],'v13-zero-gathering','RIVER_EEL_POOL',90,0,4),
       (non_gather_claim,c[2],'v13-non-gathering','ALCHEMY_ACTION',120,3,4),
       (outsider_claim,c[3],'v13-outsider-gather','COPPER_VEIN',120,5,10);
 begin
  perform private.record_party_event_idle_scout_v13(
   p,start_at,short_claim,'v13-request-short',req_hash);
  raise exception 'V13 short claim accepted';
 exception when others then
  if sqlerrm<>'party_event_v13_invalid_gathering_evidence' then raise;end if;
 end;
 begin
  perform private.record_party_event_idle_scout_v13(
   p,start_at,zero_claim,'v13-request-zero',req_hash);
  raise exception 'V13 zero-output gathering accepted';
 exception when others then
  if sqlerrm<>'party_event_v13_invalid_gathering_evidence' then raise;end if;
 end;
 begin
  perform private.record_party_event_idle_scout_v13(
   p,start_at,non_gather_claim,'v13-request-alchemy',req_hash);
  raise exception 'V13 wrong skill accepted';
 exception when others then
  if sqlerrm<>'party_event_v13_invalid_gathering_evidence' then raise;end if;
 end;
 begin
  perform private.record_party_event_idle_scout_v13(
   p,start_at,outsider_claim,'v13-request-outsider',req_hash);
  raise exception 'V13 outsider claim accepted';
 exception when others then
  if sqlerrm<>'party_event_v13_invalid_gathering_evidence' then raise;end if;
 end;
 begin
  perform private.record_party_event_idle_scout_v13(
   p,start_at,gen_random_uuid(),'v13-request-fabricated',req_hash);
  raise exception 'V13 fabricated claim accepted';
 exception when others then
  if sqlerrm<>'party_event_v13_missing_canonical_idle_claim' then raise;end if;
 end;

 -- A claim that started BEFORE the member joined must not become scouting.
 update private.party_event_roster_v11 set joined_at=now()-interval '30 seconds'
 where party_id=p and event_starts_at=start_at and account_id=a[2];
 insert into public.idle_claim_receipts(
  claim_id,character_id,idempotency_key,activity_id,
  elapsed_sec,resource_amount,xp_amount)
 values(banked_claim,c[2],'v13-banked-gather','IRONWOOD_TREE',120,4,60);
 begin
  perform private.record_party_event_idle_scout_v13(
   p,start_at,banked_claim,'v13-request-banked',req_hash);
  raise exception 'V13 pre-enrollment banked gathering accepted';
 exception when others then
  if sqlerrm<>'party_event_v13_invalid_gathering_evidence' then raise;end if;
 end;
 update private.party_event_roster_v11 set joined_at=start_at
 where party_id=p and event_starts_at=start_at and account_id=a[2];
 insert into public.idle_claim_receipts(
  claim_id,character_id,idempotency_key,activity_id,
  elapsed_sec,resource_amount,xp_amount)
 values(other_claim,c[2],'v13-other-gathering','SILVERBROOK_SHOAL',90,4,13);
 replay_result:=private.record_party_event_idle_scout_v13(
  p,start_at,other_claim,'v13-request-scout-02',req_hash);
 if replay_result->>'replayed'<>'false'
  or replay_result->>'receiptId'=first_result->>'receiptId'
 then raise exception 'V13 second enrolled member denied separate scouting';end if;

 if (select count(*) from private.party_event_receipts_v11
  where party_id=p and action_id='scout_route')<>2
  or (select count(*) from private.party_event_sources_v11
   where party_id=p and stage=1)<>2
 then raise exception 'V13 double counted or leaked unverified sources';end if;

 update private.party_event_weeks_v11 set status='closed'
 where party_id=p and event_starts_at=start_at;
 replay_result:=private.record_party_event_idle_scout_v13(
  p,start_at,good_claim,'v13-request-scout-01',req_hash);
 if replay_result->>'replayed'<>'true'
  or replay_result->>'receiptId'<>first_result->>'receiptId'
 then raise exception 'V13 after-close scout replay failed';end if;
 begin
  perform private.record_party_event_idle_scout_v13(
   p,start_at,gen_random_uuid(),'v13-request-new-after-close',req_hash);
  raise exception 'V13 minted source after closure';
 exception when others then
  if sqlerrm<>'party_event_v13_scout_stage_closed' then raise;end if;
 end;
 if exists(select 1 from private.party_event_receipts_v11
  where party_id=p and event_points_awarded<>0)
 then raise exception 'V13 granted EP';end if;
end $$;
select 'PASS: v13 scouting via settled idle gathers, no banked/outsider/duplicate claims, no EP' result;
rollback;
