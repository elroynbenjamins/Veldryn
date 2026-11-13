-- Veldryn Party Events v14 regressions. Apply v11-v14 in order, run test,
-- ROLLBACK. Tests score recurring verified sources, NOT wallet or item grants.
begin;
do $$
declare
 a uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 c uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 p uuid:=gen_random_uuid();
 run_ok uuid:=gen_random_uuid();
 claim_short uuid:=gen_random_uuid();
 claim_more uuid:=gen_random_uuid();
 claim_full uuid:=gen_random_uuid();
 claim_banked uuid:=gen_random_uuid();
 claim_outside uuid:=gen_random_uuid();
 claim_bad uuid:=gen_random_uuid();
 craft_small uuid:=gen_random_uuid();
 craft_large uuid:=gen_random_uuid();
 craft_final uuid:=gen_random_uuid();
 start_at timestamptz:=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC';
 result_a jsonb; result_b jsonb; status jsonb;
 hash text:=repeat('e',64);
 i integer;
begin
 if has_function_privilege('authenticated',
  'private.credit_party_event_activity_v14(uuid,timestamptz,text,uuid,text,uuid,text)','execute')
  or has_function_privilege('anon',
  'private.party_event_stage_readiness_v14(uuid,timestamptz)','execute')
  or has_table_privilege('service_role','private.party_event_activity_credits_v14','insert')
  or has_table_privilege('authenticated','private.party_event_member_progress_v14','select')
 then raise exception 'V14 private score boundary exposed';end if;

 for i in 1..3 loop
  insert into auth.users(id,email) values(a[i],'v14-'||a[i]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id)
  values(c[i],a[i],'Progress Tester '||chr(64+i),
   case i when 1 then 'IRONWARDEN' else 'WAYFINDER' end);
 end loop;
 insert into public.parties(id,leader_account_id,leader_character_id)
 values(p,a[1],c[1]);
 insert into private.party_event_weeks_v11(
  party_id,event_starts_at,event_ends_at,family,variation,seed,difficulty)
 values(p,start_at,start_at+interval '7 days',
  'broken_caravan','bandits_crossing',0,'standard');
 insert into private.party_event_roster_v11(
  party_id,event_starts_at,account_id,character_id,role,joined_at)
 values(p,start_at,a[1],c[1],'tank',start_at),
       (p,start_at,a[2],c[2],'damage',now()-interval '30 seconds');
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p,start_at,1,start_at);

 status:=private.party_event_stage_readiness_v14(p,start_at);
 if status->>'status'<>'awaiting_progress'
  or (status->>'progressTarget')::int<>100
  or (status->>'cumulativeStageTarget')::int<>25
  or (status->>'verifiedActivityPoints')::int<>0
  or (status->>'stageReadyToAdvance')::boolean then
  raise exception 'V14 initial Stage 1 targets incorrect';end if;

 insert into public.idle_claim_receipts(
  claim_id,character_id,idempotency_key,activity_id,
  elapsed_sec,resource_amount,xp_amount)
 values(claim_short,c[1],'v14-idle-a-01','COPPER_VEIN',600,20,100),
       (claim_more,c[1],'v14-idle-a-02','GREENWOOD_TREE',450,16,80);
 result_a:=private.credit_party_event_activity_v14(
  p,start_at,'idle',claim_short,null,null,'v14-credit-short');
 if (result_a->>'eventPointsGranted')::int<>0
  or (result_a->>'memberCarriedSeconds')::int<>600
 then raise exception 'V14 600-second carry incorrect';end if;
 result_b:=private.credit_party_event_activity_v14(
  p,start_at,'idle',claim_more,null,null,'v14-credit-more');
 if (result_b->>'eventPointsGranted')::int<>1
  or (result_b->>'memberCarriedSeconds')::int<>150
 then raise exception 'V14 900-second points/carry incorrect';end if;
 result_a:=private.credit_party_event_activity_v14(
  p,start_at,'idle',claim_short,null,null,'v14-credit-short');
 if (result_a->>'replayed')::boolean is distinct from true
  or (select activity_points from private.party_event_member_progress_v14
      where party_id=p and account_id=a[1])<>1
 then raise exception 'V14 repeated claim doubled earned EP';end if;
 begin
  perform private.credit_party_event_activity_v14(
   p,start_at,'idle',claim_short,null,null,'v14-credit-changed');
  raise exception 'V14 source reused with a new request';
 exception when others then
  if sqlerrm<>'party_event_v14_conflicting_replay' then raise;end if;
 end;
 begin
  perform private.credit_party_event_activity_v14(
   p,start_at,'idle',gen_random_uuid(),null,null,'v14-credit-forged');
  raise exception 'V14 forged claim accepted';
 exception when others then
  if sqlerrm<>'party_event_v14_unverified_idle' then raise;end if;
 end;
 insert into public.idle_claim_receipts(
  claim_id,character_id,idempotency_key,activity_id,
  elapsed_sec,resource_amount,xp_amount)
 values(claim_banked,c[2],'v14-banked','COPPER_VEIN',120,6,40),
       (claim_outside,c[3],'v14-outside','COPPER_VEIN',120,6,40),
       (claim_bad,c[1],'v14-unknown-skill','ALCHEMY_ACTION',3600,6,40);
 begin
  perform private.credit_party_event_activity_v14(
   p,start_at,'idle',claim_banked,null,null,'v14-credit-banked');
  raise exception 'V14 pre-enrollment banked gathering accepted';
 exception when others then
  if sqlerrm<>'party_event_v14_not_enrolled_or_outside_stage' then raise;end if;
 end;
 begin
  perform private.credit_party_event_activity_v14(
   p,start_at,'idle',claim_outside,null,null,'v14-credit-outsider');
  raise exception 'V14 outsider gathering accepted';
 exception when others then
  if sqlerrm<>'party_event_v14_not_enrolled_or_outside_stage' then raise;end if;
 end;
 begin
  perform private.credit_party_event_activity_v14(
   p,start_at,'idle',claim_bad,null,null,'v14-credit-invalid');
  raise exception 'V14 unrecognized gathering accepted';
 exception when others then
  if sqlerrm<>'party_event_v14_unverified_idle' then raise;end if;
 end;

 -- A 24-hour, completed gathering claim caps weekly verified activity at
 -- 40 points, no remainder. No user can spoof points via a caller parameter.
 insert into public.idle_claim_receipts(
  claim_id,character_id,idempotency_key,activity_id,
  elapsed_sec,resource_amount,xp_amount)
 values(claim_full,c[1],'v14-idle-a-full','SILVERBROOK_SHOAL',86400,400,4000);
 result_a:=private.credit_party_event_activity_v14(
  p,start_at,'idle',claim_full,null,null,'v14-credit-full');
 if (result_a->>'eventPointsGranted')::int<>39
  or (result_a->>'totalMemberPoints')::int<>40
  or (result_a->>'memberCarriedSeconds')::int<>0
 then raise exception 'V14 weekly 40-EP cap or overflow broken';end if;

 status:=private.party_event_stage_readiness_v14(p,start_at);
 if status->>'status'<>'awaiting_supplies'
  or (status->>'verifiedActivityPoints')::int<>40
  or (status->>'missingPoints')::int<>0
  or (status->>'requiredSuppliesVerified')::boolean
  or (status->>'stageReadyToAdvance')::boolean
 then raise exception 'V14 missing donation guard bypassed in Stage 1';end if;

 -- Stage 2 is administratively opened in this isolated transaction to
 -- exercise future activity; v14 never advances stages itself.
 update private.party_event_weeks_v11 set active_stage=2
 where party_id=p and event_starts_at=start_at;
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p,start_at,2,now()-interval '2 seconds');
 update private.party_event_stages_v11
  set vote_choice='safe_pass',vote_locked_at=now()-interval '1 second'
 where party_id=p and event_starts_at=start_at and stage=2;
 begin
  perform private.credit_party_event_activity_v14(
   p,start_at,'idle',gen_random_uuid(),null,null,'v14-credit-late-idle');
  raise exception 'V14 Stage 1 activity accepted during Stage 2';
 exception when others then
  if sqlerrm<>'party_event_v14_source_wrong_stage' then raise;end if;
 end;

 insert into public.craft_receipts(
  receipt_id,character_id,idempotency_key,recipe_id,quantity)
 values(craft_small,c[2],'v14-craft-small','SMELT_COPPER_INGOT',1),
       (craft_large,c[2],'v14-craft-large','CRAFT_COPPER_PICKAXE',5000);
 result_a:=private.credit_party_event_activity_v14(
  p,start_at,'craft',craft_small,null,null,'v14-credit-craft-01');
 if (result_a->>'replayed')::boolean
 then raise exception 'V14 small craft not accepted';end if;
 -- Existing v12 objective receipts and recurring v14 EP may both reference
 -- the same real receipt, but each is independently unique and cannot double.
 perform private.record_party_event_canonical_action_v12(
  p,start_at,'craft',craft_small,null,null,
  'support_expedition','v14-objective-craft-01',hash);

 insert into public.expedition_runs(
  id,expedition_id,tier,content_version,seed_hash,created_by,
  coop_mode,phase,route_graph_json)
 values(run_ok,'EXP_001',1,'v14-test','v14-test',a[1],'live',
  'awaiting_choice',
  '{"nodes":[{"nodeId":"elite-one","contentId":"ROOTBOUND_ELITE_01","depth":1,"kind":"elite"},{"nodeId":"false-node","contentId":"ROOTBOUND_ELITE_01","depth":2,"kind":"elite"}]}'::jsonb);
 for i in 1..2 loop
  insert into public.expedition_run_members(
   run_id,character_id,account_id,role,synced_level,
   loadout_snapshot,stat_snapshot,member_kind,active_participant_account_id)
  values(run_ok,c[i],a[i],case i when 1 then 'tank' else 'damage' end,
   25,'{}','{}','human',a[i]);
  insert into public.coop_run_access_memberships(
   run_id,account_id,membership_kind,channel_epoch)
  values(run_ok,a[i],'live_participant',1);
 end loop;
 insert into public.coop_node_results(
  run_id,node_id,fencing_generation,success,
  start_state_hash,result_json,end_state_json)
 values(run_ok,'elite-one',1,true,'v14-hash','{}','{}'),
       (run_ok,'false-node',1,false,'v14-hash','{}','{}');

 result_b:=private.credit_party_event_activity_v14(
  p,start_at,'coop_node',run_ok,'elite-one',a[2],'v14-credit-elite-two');
 if (result_b->>'eventPointsGranted')::int<1
 then raise exception 'V14 successful co-op combat gave no verified point';end if;
 begin
  perform private.credit_party_event_activity_v14(
   p,start_at,'coop_node',run_ok,'false-node',a[2],'v14-credit-failed');
  raise exception 'V14 defeated fight produced score';
 exception when others then
  if sqlerrm<>'party_event_v14_unverified_combat' then raise;end if;
 end;
 result_b:=private.credit_party_event_activity_v14(
  p,start_at,'coop_node',run_ok,'elite-one',a[1],'v14-credit-elite-one');
 if (result_b->>'eventPointsGranted')::int<>0
 then raise exception 'V14 capped member got more EP from shared fight';end if;

 result_b:=private.credit_party_event_activity_v14(
  p,start_at,'craft',craft_large,null,null,'v14-credit-craft-large');
 if (result_b->>'totalMemberPoints')::int<>40
 then raise exception 'V14 second account cap violated';end if;
 status:=private.party_event_stage_readiness_v14(p,start_at);
 if (status->>'status')<>'awaiting_supplies'
  or (status->>'verifiedActivityPoints')::int<>80
  or (status->>'cumulativeStageTarget')::int<>75
  or (status->>'stageReadyToAdvance')::boolean
 then raise exception 'V14 Stage 2 threshold or supply guard incorrect';end if;

 -- The 2-person weekly target is 100; with 40 verified activity EP per
 -- member, Stage 3 requires separate special-action or supply EP (future).
 update private.party_event_weeks_v11 set active_stage=3
 where party_id=p and event_starts_at=start_at;
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p,start_at,3,now()-interval '0.5 seconds');
 update private.party_event_stages_v11 set
  vote_choice='brace_wagons',vote_locked_at=now()
 where party_id=p and event_starts_at=start_at and stage=3;
 insert into public.craft_receipts(
  receipt_id,character_id,idempotency_key,recipe_id,quantity)
 values(craft_final,c[1],'v14-craft-final','SMELT_COPPER_INGOT',1);
 result_a:=private.credit_party_event_activity_v14(
  p,start_at,'craft',craft_final,null,null,'v14-credit-final');
 if (result_a->>'eventPointsGranted')::int<>0 then
  raise exception 'V14 overflowed weekly cap in final stage';end if;
 status:=private.party_event_stage_readiness_v14(p,start_at);
 if (status->>'status'<>'awaiting_progress'
  or (status->>'missingPoints')::int<>20
  or (status->>'cumulativeStageTarget')::int<>100
  or (status->>'finaleVerified')::boolean
 then raise exception 'V14 finale readiness falsely completed';end if;

 update public.coop_run_access_memberships set active=false
 where run_id=run_ok;
 update private.party_event_weeks_v11 set status='closed'
 where party_id=p and event_starts_at=start_at;
 result_a:=private.credit_party_event_activity_v14(
  p,start_at,'coop_node',run_ok,'elite-one',a[2],'v14-credit-elite-two');
 if (result_a->>'replayed')::boolean is distinct from true
 then raise exception 'V14 closed run replay lost';end if;
 begin
  perform private.credit_party_event_activity_v14(
    p,start_at,'craft',gen_random_uuid(),null,null,'v14-new-closed');
  raise exception 'V14 score added after event closure';
 exception when others then
  if sqlerrm<>'party_event_v14_closed' then raise;end if;
 end;
 if (select count(*) from private.party_event_activity_credits_v14
   where party_id=p)<>7
  or exists(select 1 from private.party_event_activity_credits_v14
    where party_id=p and (points_credited<0 or points_credited>40))
  or exists(select 1 from private.party_event_receipts_v11
    where party_id=p and event_points_awarded<>0)
 then raise exception 'V14 verified credits or no-reward invariant invalid';end if;
end $$;
select 'PASS: v14 score carry, 40 EP caps, canonical gathering/crafts/co-op, stage readiness blocked until supplies, zero rewards' result;
rollback;
