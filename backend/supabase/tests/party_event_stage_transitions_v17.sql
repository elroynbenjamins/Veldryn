-- Veldryn Party Events v17 staging-only transactional stage/ballot regression.
-- Migrations v11..v17 must be loaded first. No committed fixtures or grants.
begin;
do $$
declare
 p uuid:=gen_random_uuid();
 p_timeout uuid:=gen_random_uuid();
 a uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 c uuid[]:=array[gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid()];
 start_at timestamptz:=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC';
 v_ore uuid;v_wood uuid;v_herb uuid;
 v_result jsonb;v_replay jsonb;v_stage integer;v_receipt uuid;
 v_action text;v_kind text;v_src text;
 j integer;
begin
 if has_table_privilege('service_role','private.party_event_weeks_v11','update')
  or has_table_privilege('service_role','private.party_event_stages_v11','update')
  or has_table_privilege('service_role','private.party_event_stage_transitions_v17','insert')
  or has_table_privilege('service_role','private.party_event_ballots_v17','insert')
  or has_function_privilege('authenticated',
    'private.advance_party_event_stage_v17(uuid,timestamptz,integer,text)','execute')
  or has_function_privilege('anon',
    'private.cast_party_event_ballot_v17(uuid,timestamptz,integer,uuid,text)','execute')
 then raise exception 'v17 unauthorized role can bypass progression';end if;

 for j in 1..3 loop
  insert into auth.users(id,email) values(a[j],'v17-'||a[j]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id)
   values(c[j],a[j],'Advance Tester '||chr(64+j),
    case j when 1 then 'IRONWARDEN' when 2 then 'WAYFINDER'
     else 'BASTION' end);
 end loop;
 insert into public.parties(id,leader_account_id,leader_character_id)
 values(p,a[1],c[1]);
 begin
  insert into private.party_event_weeks_v11(
   party_id,event_starts_at,event_ends_at,family,variation,
   seed,difficulty,active_stage)
  values(p,start_at,start_at+interval '7 days',
   'broken_caravan','bandits_crossing',1,'standard',3);
  raise exception 'v17 initial week started in stage 3';
 exception when others then
  if sqlerrm<>'party_event_v17_invalid_initial_week' then raise;end if;
 end;
 insert into private.party_event_weeks_v11(
  party_id,event_starts_at,event_ends_at,family,variation,seed,difficulty)
 values(p,start_at,start_at+interval '7 days',
  'broken_caravan','bandits_crossing',0,'standard');
 insert into private.party_event_roster_v11(
  party_id,event_starts_at,account_id,character_id,role,joined_at)
 values(p,start_at,a[1],c[1],'tank',start_at),
  (p,start_at,a[2],c[2],'damage',start_at);
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p,start_at,1,start_at);

 insert into public.online_game_states(account_id,character_id,state,revision)
 values(a[1],c[1],
 '{"inventory":{"stacks":[{"itemId":"COPPER_ORE","quantity":10},{"itemId":"GREENWOOD_LOG","quantity":10},{"itemId":"THORN_SAP","quantity":10}]},"settings":{"lockedItemIds":[]}}'::jsonb,0),
 (a[2],c[2],
 '{"inventory":{"stacks":[{"itemId":"COPPER_ORE","quantity":10},{"itemId":"GREENWOOD_LOG","quantity":10},{"itemId":"THORN_SAP","quantity":10}]},"settings":{"lockedItemIds":[]}}'::jsonb,0);

 -- The real catalogue keeps this disabled. Fixture enables ONLY inside
 -- the rolled-back transaction so we can exercise full stage transitions.
 begin
  perform private.freeze_party_event_supply_order_v16(
   p,start_at,1,'THORN_SAP','required',1);
  raise exception 'v17 unaudited herb enabled';
 exception when others then
  if sqlerrm<>'party_event_v16_resource_unverified' then raise;end if;
 end;
 update private.party_event_supply_catalogue_v16
 set enabled=true where item_id='THORN_SAP';
 v_ore:=private.freeze_party_event_supply_order_v16(
  p,start_at,1,'COPPER_ORE','required',1);
 v_wood:=private.freeze_party_event_supply_order_v16(
  p,start_at,1,'GREENWOOD_LOG','required',1);
 begin
  perform private.seal_party_event_supplies_v17(p,start_at,1);
  raise exception 'v17 sealed incomplete 2-category plan';
 exception when others then
  if sqlerrm<>'party_event_v17_incomplete_canonical_supplies' then raise;end if;
 end;
 v_herb:=private.freeze_party_event_supply_order_v16(
  p,start_at,1,'THORN_SAP','required',1);

 begin
  perform private.advance_party_event_stage_v17(
   p,start_at,1,'v17-advance-before-seal');
  raise exception 'v17 bypassed unsealed plan';
 exception when others then
  if sqlerrm<>'party_event_v17_unsealed_supply_plan' then raise;end if;
 end;

 v_result:=private.seal_party_event_supplies_v17(p,start_at,1);
 if v_result->>'replayed'<>'false' or
  length(v_result->>'ordersHash')<>64 then
  raise exception 'v17 failed stage 1 order seal';end if;
 v_replay:=private.seal_party_event_supplies_v17(p,start_at,1);
 if v_replay->>'replayed'<>'true' or
  v_replay->>'ordersHash'<>v_result->>'ordersHash' then
  raise exception 'v17 exact seal idempotency broken';end if;
 begin
  perform private.freeze_party_event_supply_order_v16(
   p,start_at,1,'IRONWOOD_LOG','optional',1);
  raise exception 'v17 mutated sealed order plan';
 exception when others then
  if sqlerrm<>'party_event_v17_supply_plan_sealed' then raise;end if;
 end;
 begin
  perform private.advance_party_event_stage_v17(
   p,start_at,1,'v17-advance-before-supplies');
  raise exception 'v17 advanced without donated resources';
 exception when others then
  if sqlerrm<>'party_event_v17_supplies_incomplete' then raise;end if;
 end;
 perform private.donate_party_event_supply_v16(
  p,start_at,v_ore,a[1],1,'v17-stage1-ore');
 perform private.donate_party_event_supply_v16(
  p,start_at,v_wood,a[2],1,'v17-stage1-wood');
 perform private.donate_party_event_supply_v16(
  p,start_at,v_herb,a[1],1,'v17-stage1-herb');

 begin
  perform private.advance_party_event_stage_v17(
   p,start_at,1,'v17-advance-before-ep');
  raise exception 'v17 advanced without sufficient EP';
 exception when others then
  if sqlerrm<>'party_event_v17_insufficient_ep' then raise;end if;
 end;
 insert into private.party_event_member_progress_v14(
  party_id,event_starts_at,account_id,activity_points)
 values(p,start_at,a[1],25);
 begin
  perform private.advance_party_event_stage_v17(
   p,start_at,1,'v17-advance-before-objective');
  raise exception 'v17 advanced without Stage 1 objective';
 exception when others then
  if sqlerrm<>'party_event_v17_missing_objectives' then raise;end if;
 end;
 v_src:='v17:scout:'||p::text;
 insert into private.party_event_sources_v11(
  source_event_id,party_id,event_starts_at,account_id,stage,kind,
  occurred_at,committed_at)
 values(v_src,p,start_at,a[1],1,'verified_noncombat',clock_timestamp(),clock_timestamp());
 v_result:=private.record_party_event_action_v11(
  p,start_at,v_src,'scout_route','v17-obj-scout-01',repeat('a',64));
 v_receipt:=(v_result->>'receiptId')::uuid;
 perform private.credit_party_event_objective_v15(p,start_at,v_receipt);
 v_replay:=private.party_event_stage_readiness_v17(p,start_at);
 if (v_replay->>'stageReadyToAdvance')::boolean is distinct from true
   or v_replay->>'status'<>'ready_to_advance'
   or (v_replay->>'missingRequiredObjectives')::int<>0
 then raise exception 'v17 Stage 1 readiness disagrees with transition';end if;

 v_result:=private.advance_party_event_stage_v17(
  p,start_at,1,'v17-advance-stage1');
 if v_result->>'replayed'<>'false'
  or (v_result->>'toStage')::int<>2 then
  raise exception 'v17 did not advance Stage 1 -> 2';end if;
 v_replay:=private.advance_party_event_stage_v17(
  p,start_at,1,'v17-advance-stage1');
 if v_replay->>'replayed'<>'true'
  or (v_replay->>'toStage')::int<>2 then
  raise exception 'v17 Stage 1 retry not idempotent';end if;
 begin
  perform private.advance_party_event_stage_v17(
   p,start_at,1,'v17-advance-stage1-altered');
  raise exception 'v17 allowed second transition request';
 exception when others then
  if sqlerrm<>'party_event_v17_advance_conflict' then raise;end if;
 end;
 if (select active_stage from private.party_event_weeks_v11
   where party_id=p and event_starts_at=start_at)<>2
  or (select count(*) from private.party_event_stages_v11
    where party_id=p and event_starts_at=start_at)<>2
 then raise exception 'v17 stage record not atomically advanced';end if;

 -- Stage 2 cannot record an invented/fabricated winner.
 begin
  perform private.resolve_party_event_ballot_v17(p,start_at,2);
  raise exception 'v17 locked vote without ballots';
 exception when others then
  if sqlerrm<>'party_event_v17_vote_unresolved' then raise;end if;
 end;
 begin
  perform private.cast_party_event_ballot_v17(
   p,start_at,2,a[3],'safe_pass');
  raise exception 'v17 outsider voted';
 exception when others then
  if sqlerrm<>'party_event_v17_voter_not_enrolled' then raise;end if;
 end;
 begin
  perform private.cast_party_event_ballot_v17(
   p,start_at,2,a[1],'wrong_hazard');
  raise exception 'v17 invalid family option counted';
 exception when others then
  if sqlerrm<>'party_event_v17_invalid_vote_choice' then raise;end if;
 end;
 v_result:=private.cast_party_event_ballot_v17(
  p,start_at,2,a[1],'safe_pass');
 v_replay:=private.cast_party_event_ballot_v17(
  p,start_at,2,a[1],'safe_pass');
 if v_result->>'replayed'<>'false' or
  v_replay->>'replayed'<>'true' then
  raise exception 'v17 ballot retry wrong';end if;
 begin
  perform private.cast_party_event_ballot_v17(
   p,start_at,2,a[1],'fast_pass');
  raise exception 'v17 accepted changed vote';
 exception when others then
  if sqlerrm<>'party_event_v17_vote_already_cast' then raise;end if;
 end;
 begin
  perform private.resolve_party_event_ballot_v17(p,start_at,2);
  raise exception 'v17 accepted 1/2 minority';
 exception when others then
  if sqlerrm<>'party_event_v17_vote_unresolved' then raise;end if;
 end;
 perform private.cast_party_event_ballot_v17(
  p,start_at,2,a[2],'safe_pass');
 v_result:=private.resolve_party_event_ballot_v17(p,start_at,2);
 if v_result->>'choice'<>'safe_pass'
  or v_result->>'reason'<>'majority' then
  raise exception 'v17 majority resolution wrong';end if;
 v_replay:=private.resolve_party_event_ballot_v17(p,start_at,2);
 if v_replay->>'replayed'<>'true' then
  raise exception 'v17 vote replay wrong';end if;

 -- Cumulative Stage 2 threshold for 2 members is 75 EP.
 v_ore:=private.freeze_party_event_supply_order_v16(
  p,start_at,2,'COPPER_ORE','required',1);
 v_wood:=private.freeze_party_event_supply_order_v16(
  p,start_at,2,'GREENWOOD_LOG','required',1);
 v_herb:=private.freeze_party_event_supply_order_v16(
  p,start_at,2,'THORN_SAP','required',1);
 perform private.seal_party_event_supplies_v17(p,start_at,2);
 perform private.donate_party_event_supply_v16(
  p,start_at,v_ore,a[1],1,'v17-stage2-ore');
 perform private.donate_party_event_supply_v16(
  p,start_at,v_wood,a[2],1,'v17-stage2-wood');
 perform private.donate_party_event_supply_v16(
  p,start_at,v_herb,a[1],1,'v17-stage2-herb');

 update private.party_event_member_progress_v14
  set activity_points=40 where party_id=p and event_starts_at=start_at
  and account_id=a[1];
 insert into private.party_event_member_progress_v14(
  party_id,event_starts_at,account_id,activity_points)
 values(p,start_at,a[2],35);

 begin
  perform private.advance_party_event_stage_v17(
   p,start_at,2,'v17-advance-stage2-without-objectives');
  raise exception 'v17 accepted missing Stage 2 objectives';
 exception when others then
  if sqlerrm<>'party_event_v17_missing_objectives' then raise;end if;
 end;
 v_replay:=private.party_event_stage_readiness_v17(p,start_at);
 if (v_replay->>'stageReadyToAdvance')::boolean
   or v_replay->>'status'<>'awaiting_objectives'
   or (v_replay->>'missingRequiredObjectives')::int<>2
 then raise exception 'v17 readiness allowed Stage 2 missing objectives';end if;

 for j in 1..2 loop
  v_action:=case j when 1 then 'secure_approach' else 'support_expedition' end;
  v_kind:=case j when 1 then 'verified_combat' else 'verified_noncombat' end;
  v_src:='v17:stage2:'||j::text||':'||p::text;
  insert into private.party_event_sources_v11(
   source_event_id,party_id,event_starts_at,account_id,stage,kind,
   occurred_at,committed_at)
  values(v_src,p,start_at,a[1],2,v_kind,clock_timestamp(),clock_timestamp());
  v_result:=private.record_party_event_action_v11(
   p,start_at,v_src,v_action,'v17-obj-stage2-'||j::text,repeat('b',64));
  perform private.credit_party_event_objective_v15(
   p,start_at,(v_result->>'receiptId')::uuid);
 end loop;

 v_replay:=private.party_event_stage_readiness_v17(p,start_at);
 if (v_replay->>'stageReadyToAdvance')::boolean is distinct from true
   or v_replay->>'status'<>'ready_to_advance' then
  raise exception 'v17 Stage 2 readiness disagrees with transition';end if;
 v_result:=private.advance_party_event_stage_v17(
  p,start_at,2,'v17-advance-stage2');
 if v_result->>'replayed'<>'false' or
  (v_result->>'toStage')::int<>3 then
  raise exception 'v17 did not advance Stage 2 -> 3';end if;
 v_replay:=private.party_event_stage_readiness_v17(p,start_at);
 if (v_replay->>'stageReadyToAdvance')::boolean
  or (v_replay->>'stage')::integer<>3
  or (v_replay->>'finaleVerified')::boolean
 then raise exception 'v17 Stage 3 appeared completed without boss proof';end if;
 if (select count(*) from private.party_event_stage_transitions_v17
  where party_id=p and event_starts_at=start_at)<>2 then
  raise exception 'v17 stage transitions not exactly once';end if;
 begin
  perform private.advance_party_event_stage_v17(
   p,start_at,3,'v17-illegal-finalize');
  raise exception 'v17 allowed Stage 3 boss payout';
 exception when others then
  if sqlerrm<>'party_event_v17_invalid_advance' then raise;end if;
 end;
 if (select status from private.party_event_weeks_v11
  where party_id=p and event_starts_at=start_at)<>'active'
  or exists(select 1 from private.party_event_receipts_v11
   where party_id=p and event_points_awarded<>0)
 then raise exception 'v17 finale or loot settled accidentally';end if;

 -- Admin-only synthetic week closure: only previously committed transitions
 -- replay, and it never creates another one after event close.
 update private.party_event_weeks_v11 set status='closed'
  where party_id=p and event_starts_at=start_at;
 v_replay:=private.advance_party_event_stage_v17(
  p,start_at,2,'v17-advance-stage2');
 if v_replay->>'replayed'<>'true' then
  raise exception 'v17 after-closure transition replay broken';end if;
 v_replay:=private.resolve_party_event_ballot_v17(p,start_at,2);
 if v_replay->>'replayed'<>'true' then
  raise exception 'v17 locked ballot no longer replays after close';end if;
 begin
  perform private.advance_party_event_stage_v17(
   p,start_at,2,'v17-new-after-close');
  raise exception 'v17 created new stage while closed';
 exception when others then
  if sqlerrm<>'party_event_v17_advance_conflict' then raise;end if;
 end;

 -- Independent 7-hour-old Stage 2 ballot to verify deterministic timeout
 -- default without waiting or manipulating any system clock. These fixtures
 -- are database-only and rolled back in the same test transaction.
 for j in 4..5 loop
  insert into auth.users(id,email) values(a[j],'v17-'||a[j]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id)
   values(c[j],a[j],'Timeout Tester '||chr(61+j),
    case j when 4 then 'IRONWARDEN' else 'WAYFINDER' end);
 end loop;
 insert into public.parties(id,leader_account_id,leader_character_id)
  values(p_timeout,a[4],c[4]);
 insert into private.party_event_weeks_v11(
  party_id,event_starts_at,event_ends_at,family,variation,seed,difficulty)
 values(p_timeout,start_at,start_at+interval '7 days',
  'broken_caravan','bandits_crossing',0,'standard');
 insert into private.party_event_roster_v11(
  party_id,event_starts_at,account_id,character_id,role,joined_at)
 values(p_timeout,start_at,a[4],c[4],'tank',start_at),
  (p_timeout,start_at,a[5],c[5],'damage',start_at);
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p_timeout,start_at,1,now()-interval '9 hours');
 update private.party_event_weeks_v11 set active_stage=2
  where party_id=p_timeout and event_starts_at=start_at;
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p_timeout,start_at,2,now()-interval '7 hours');
 begin
  perform private.cast_party_event_ballot_v17(
   p_timeout,start_at,2,a[4],'fast_pass');
  raise exception 'v17 ballot cast after real timeout';
 exception when others then
  if sqlerrm<>'party_event_v17_ballot_window_closed' then raise;end if;
 end;
 v_result:=private.resolve_party_event_ballot_v17(p_timeout,start_at,2);
 if v_result->>'replayed'<>'false'
   or v_result->>'choice'<>'safe_pass'
   or v_result->>'reason'<>'timeout'
 then raise exception 'v17 6h deterministic fallback wrong';end if;
end $$;
select 'PASS: v17 sealed 3-category orders, 2-vote majority and stage1->2->3 exact-once; no finale settlement' as result;
rollback;
