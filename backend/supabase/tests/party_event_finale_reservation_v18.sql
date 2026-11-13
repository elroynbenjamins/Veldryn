-- Veldryn Party Events v18: loadout proof, fully-prepared finale and
-- one Day 8 reservation, never a boss win or reward. Rollback-only.
begin;
do $$
declare
 a uuid[]:=array[gen_random_uuid(),gen_random_uuid()];
 c uuid[]:=array[gen_random_uuid(),gen_random_uuid()];
 p uuid:=gen_random_uuid();p_past uuid:=gen_random_uuid();
 w timestamptz:=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC';
 old_w timestamptz:=date_trunc('week',now() at time zone 'UTC') at time zone 'UTC'-interval '28 days';
 item_ore uuid;item_wood uuid;item_herb uuid;
 result jsonb;retry jsonb;status jsonb;
 rid uuid;src text;action text;kind text;
 j integer;stage_num integer;
begin
 -- Private tables and functions: never available to direct game clients.
 if has_function_privilege('authenticated',
   'private.save_party_event_boss_loadout_v18(uuid,timestamptz,uuid,text,bigint)','execute')
  or has_function_privilege('authenticated',
   'private.seal_party_event_finale_v18(uuid,timestamptz)','execute')
  or has_function_privilege('anon',
   'private.reserve_party_event_day_eight_v18(uuid,timestamptz,text)','execute')
  or has_table_privilege('service_role','private.party_event_finale_seals_v18','insert')
  or has_table_privilege('service_role','private.party_event_day8_reservations_v18','insert')
  or has_table_privilege('service_role','private.party_event_boss_loadouts_v18','update')
 then raise exception 'V18 sensitive boss state exposed';end if;
 for j in 1..2 loop
  insert into auth.users(id,email) values(a[j],'v18-'||a[j]||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id)
  values(c[j],a[j],'Finale Tester '||chr(64+j),
    case j when 1 then 'IRONWARDEN' else 'WAYFINDER' end);
  insert into public.coop_saved_loadouts(
    account_id,character_id,loadout_id,revision,display_name,content_version,
    class_id,character_level,legal_equipment,stat_snapshot,ability_snapshot,
    snapshot_hash,verified_at)
  values(a[j],c[j],'current',1,'Current equipment','v18-test',
    case j when 1 then 'IRONWARDEN' else 'WAYFINDER' end,
    25,true,jsonb_build_object('characterId',c[j],
     'classId',case j when 1 then 'IRONWARDEN' else 'WAYFINDER' end),
    '[]'::jsonb,repeat(case j when 1 then 'a' else 'b' end,64),
    now()-interval '10 minutes');
 end loop;
 insert into public.parties(id,leader_account_id,leader_character_id)
 values(p,a[1],c[1]);
 insert into private.party_event_weeks_v11(
  party_id,event_starts_at,event_ends_at,family,variation,seed,difficulty)
 values(p,w,w+interval '7 days','broken_caravan','bandits_crossing',0,'standard');
 insert into private.party_event_roster_v11(
  party_id,event_starts_at,account_id,character_id,role,joined_at)
 values(p,w,a[1],c[1],'tank',w),
       (p,w,a[2],c[2],'damage',w);
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p,w,1,w);

 insert into public.online_game_states(account_id,character_id,state,revision)
 values(a[1],c[1],
  '{"inventory":{"stacks":[{"itemId":"COPPER_ORE","quantity":20},{"itemId":"GREENWOOD_LOG","quantity":20},{"itemId":"THORN_SAP","quantity":20}]},"settings":{"lockedItemIds":[]}}'::jsonb,0);

 -- A real eligible published loadout is required; no actor stats, time,
 -- account owner, or snapshot hash may come from the RPC caller.
 begin
  perform private.save_party_event_boss_loadout_v18(p,w,a[1],'current',2);
  raise exception 'V18 accepted fabricated revision';
 exception when others then
  if sqlerrm<>'party_event_v18_unverified_loadout' then raise;end if;
 end;
 begin
  perform private.save_party_event_boss_loadout_v18(p,w,gen_random_uuid(),'current',1);
  raise exception 'V18 accepted outsider';
 exception when others then
  if sqlerrm<>'party_event_v18_not_enrolled' then raise;end if;
 end;
 result:=private.save_party_event_boss_loadout_v18(p,w,a[1],'current',1);
 if result->>'replayed'<>'false' or result->>'snapshotHash'<>repeat('a',64)
 then raise exception 'V18 trusted loadout not frozen';end if;
 retry:=private.save_party_event_boss_loadout_v18(p,w,a[1],'current',1);
 if retry->>'replayed'<>'true' then raise exception 'V18 loadout retry not idempotent';end if;
 -- Players can update a saved loadout selection before finale seal,
 -- but the old copied stats/hash must not survive as the newest snapshot.
 update public.coop_saved_loadouts set
  revision=2,snapshot_hash=repeat('c',64),verified_at=now()
 where account_id=a[1] and character_id=c[1] and loadout_id='current';
 result:=private.save_party_event_boss_loadout_v18(p,w,a[1],'current',2);
 if result->>'snapshotHash'<>repeat('c',64)
  or (select revision from private.party_event_boss_loadouts_v18
   where party_id=p and event_starts_at=w and account_id=a[1])<>2
 then raise exception 'V18 preseal loadout replacement broken';end if;

 -- Test-only unlock of known alchemy herb; never enabled by migrations.
 if (select enabled from private.party_event_supply_catalogue_v16
   where item_id='THORN_SAP') is distinct from false
 then raise exception 'V18 herb should be disabled in live schema';end if;
 update private.party_event_supply_catalogue_v16
  set enabled=true where item_id='THORN_SAP';

 -- Complete Stage 1 and Stage 2 with the tested trusted transition RPCs;
 -- each phase has its own required canonical supply donation sink.
 insert into private.party_event_member_progress_v14(
  party_id,event_starts_at,account_id,activity_points)
 values(p,w,a[1],40),(p,w,a[2],40);
 for stage_num in 1..3 loop
  if stage_num>1 then
    perform private.cast_party_event_ballot_v17(
      p,w,stage_num,a[1],case stage_num when 2 then 'safe_pass' else 'brace_wagons' end);
    perform private.cast_party_event_ballot_v17(
      p,w,stage_num,a[2],case stage_num when 2 then 'safe_pass' else 'brace_wagons' end);
    result:=private.resolve_party_event_ballot_v17(p,w,stage_num);
    if result->>'reason'<>'majority' then
     raise exception 'V18 fixture vote did not use verified majority';end if;
  end if;
  item_ore:=private.freeze_party_event_supply_order_v16(
   p,w,stage_num,'COPPER_ORE','required',1);
  item_wood:=private.freeze_party_event_supply_order_v16(
   p,w,stage_num,'GREENWOOD_LOG','required',1);
  item_herb:=private.freeze_party_event_supply_order_v16(
   p,w,stage_num,'THORN_SAP','required',1);
  perform private.seal_party_event_supplies_v17(p,w,stage_num);
  perform private.donate_party_event_supply_v16(
   p,w,item_ore,a[1],1,'v18-ore-stage-'||stage_num::text);
  perform private.donate_party_event_supply_v16(
   p,w,item_wood,a[1],1,'v18-wood-stage-'||stage_num::text);
  perform private.donate_party_event_supply_v16(
   p,w,item_herb,a[1],1,'v18-herb-stage-'||stage_num::text);

  -- The v11 verified objective receipts are one-time evidence. This test
  -- generates trusted fixtures; v12-v13 separately prove source provenance.
  for j in 1..case stage_num when 2 then 2 else 1 end loop
   action:=case stage_num when 1 then 'scout_route'
    when 2 then case j when 1 then 'secure_approach' else 'support_expedition' end
    else 'prepare_finale' end;
   kind:=case action when 'secure_approach' then 'verified_combat'
    else 'verified_noncombat' end;
   src:='v18:source:'||stage_num::text||':'||j::text||':'||p::text;
   insert into private.party_event_sources_v11(
    source_event_id,party_id,event_starts_at,account_id,stage,kind,
    occurred_at,committed_at)
   values(src,p,w,a[1],stage_num,kind,clock_timestamp(),clock_timestamp());
   result:=private.record_party_event_action_v11(
    p,w,src,action,'v18-action:'||stage_num::text||':'||j::text,
    repeat('c',64));
   rid:=(result->>'receiptId')::uuid;
   perform private.credit_party_event_objective_v15(p,w,rid);
  end loop;
  if stage_num<3 then
    result:=private.advance_party_event_stage_v17(
     p,w,stage_num,'v18-transition:'||stage_num::text);
    if (result->>'toStage')::int<>stage_num+1 then
     raise exception 'V18 prior stage did not advance';end if;
  end if;
 end loop;
 -- Points: 80 recurring + 4 one-time objectives × 5 = 100.
 status:=private.party_event_stage_readiness_v17(p,w);
 if (status->>'verifiedTotalEventPoints')::int<>100
  or (status->>'missingRequiredObjectives')::int<>0 then
  raise exception 'V18 full preparation points or objectives missing';end if;

 begin
  perform private.seal_party_event_finale_v18(p,w);
  raise exception 'V18 finalized without both party member loadouts';
 exception when others then
  if sqlerrm<>'party_event_v18_missing_frozen_loadouts' then raise;end if;
 end;
 -- An illegal published loadout cannot become a Party Event snapshot,
 -- even when the account and loadout ID are otherwise valid.
 update public.coop_saved_loadouts set legal_equipment=false
 where account_id=a[2] and character_id=c[2];
 begin
  perform private.save_party_event_boss_loadout_v18(p,w,a[2],'current',1);
  raise exception 'V18 illegal equipment accepted into finale';
 exception when others then
  if sqlerrm<>'party_event_v18_unverified_loadout' then raise;end if;
 end;
 update public.coop_saved_loadouts set legal_equipment=true
 where account_id=a[2] and character_id=c[2];
 result:=private.save_party_event_boss_loadout_v18(p,w,a[2],'current',1);
 if result->>'snapshotHash'<>repeat('b',64)
 then raise exception 'V18 second loadout wrong';end if;
 result:=private.seal_party_event_finale_v18(p,w);
 if result->>'replayed'<>'false'
  or (result->>'memberCount')::int<>2
  or length(result->>'finaleHash')<>64
 then raise exception 'V18 final 2-person seal invalid';end if;
 retry:=private.seal_party_event_finale_v18(p,w);
 if retry->>'replayed'<>'true'
  or retry->>'finaleHash'<>result->>'finaleHash'
 then raise exception 'V18 finale seal replay unstable';end if;
 begin
  perform private.save_party_event_boss_loadout_v18(p,w,a[1],'current',2);
  raise exception 'V18 allowed loadout reselect after seal';
 exception when others then
  if sqlerrm<>'party_event_v18_loadouts_sealed' then raise;end if;
 end;
 begin
  update private.party_event_boss_loadouts_v18
   set revision=revision+1
  where party_id=p and event_starts_at=w and account_id=a[1];
  raise exception 'V18 sealed snapshot rewritable by internal SQL';
 exception when others then
  if sqlerrm<>'party_event_v18_loadouts_sealed' then raise;end if;
 end;
 -- Current published record can change after the event has frozen its
 -- private copy; Day8 consumes only the original sealed snapshot.
 update public.coop_saved_loadouts set
  revision=3,snapshot_hash=repeat('f',64),verified_at=now()
 where account_id=a[1] and character_id=c[1];
 if (select snapshot_hash from private.party_event_boss_loadouts_v18
    where party_id=p and event_starts_at=w and account_id=a[1])
    is distinct from repeat('c',64)
 then raise exception 'V18 sealed event snapshot mutated with live loadout';end if;
 status:=private.party_event_day_eight_readiness_v18(p,w);
 if status->>'status'<>'waiting_for_day_eight'
  or (status->>'finaleSealed')::boolean is distinct from true
  or (status->>'rewardEligible')::boolean is distinct from false
 then raise exception 'V18 day8 readiness before deadline wrong';end if;
 begin
  perform private.reserve_party_event_day_eight_v18(
   p,w,'v18-early-day8-reserve');
  raise exception 'V18 authorized Day8 attempt before week+1h';
 exception when others then
  if sqlerrm<>'party_event_v18_day8_not_ready' then raise;end if;
 end;

 -- A backdated, administratively constructed sealed event tests the time
 -- boundary without a fake database clock. Only the DB migration owner
 -- can insert a synthetic finale seal, never service_role or players.
 insert into public.parties(id,leader_account_id,leader_character_id)
 values(p_past,a[1],c[1]);
 insert into private.party_event_weeks_v11(
  party_id,event_starts_at,event_ends_at,family,variation,seed,difficulty)
 values(p_past,old_w,old_w+interval '7 days',
  'broken_caravan','bandits_crossing',0,'standard');
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at)
 values(p_past,old_w,1,old_w);
 update private.party_event_weeks_v11 set active_stage=2
 where party_id=p_past and event_starts_at=old_w;
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at,vote_choice,vote_locked_at)
 values(p_past,old_w,2,old_w+interval '1 day','safe_pass',old_w+interval '1 day');
 update private.party_event_weeks_v11 set active_stage=3
 where party_id=p_past and event_starts_at=old_w;
 insert into private.party_event_stages_v11(
  party_id,event_starts_at,stage,opened_at,vote_choice,vote_locked_at)
 values(p_past,old_w,3,old_w+interval '2 days','brace_wagons',old_w+interval '2 days');
 insert into private.party_event_finale_seals_v18(
  party_id,event_starts_at,finale_hash,loadout_hash,member_count,
  verified_points,stage3_orders_hash,stage3_vote_choice)
 values(p_past,old_w,repeat('d',64),repeat('e',64),2,100,
  repeat('f',64),'brace_wagons');

 status:=private.party_event_day_eight_readiness_v18(p_past,old_w);
 if status->>'status'<>'ready_for_server_reservation'
  or (status->>'rewardEligible')::boolean then
  raise exception 'V18 legitimate past Day8 start not recognized';end if;
 result:=private.reserve_party_event_day_eight_v18(
  p_past,old_w,'v18-day8-past-event');
 if result->>'replayed'<>'false'
  or result->>'bossResultCommitted'<>'false'
  or result->>'rewardsGranted'<>'false'
 then raise exception 'V18 reservation incorrectly granted a reward';end if;
 retry:=private.reserve_party_event_day_eight_v18(
  p_past,old_w,'v18-day8-past-event');
 if retry->>'replayed'<>'true'
  or retry->>'bossAttemptId'<>result->>'bossAttemptId'
 then raise exception 'V18 boss reservation request replay broken';end if;
 begin
  perform private.reserve_party_event_day_eight_v18(
   p_past,old_w,'v18-day8-second-attempt');
  raise exception 'V18 reserved a second Day8 attempt';
 exception when others then
  if sqlerrm<>'party_event_v18_day8_request_conflict' then raise;end if;
 end;
 update private.party_event_weeks_v11 set status='closed'
 where party_id=p_past and event_starts_at=old_w;
 retry:=private.reserve_party_event_day_eight_v18(
  p_past,old_w,'v18-day8-past-event');
 if retry->>'replayed'<>'true'
 then raise exception 'V18 closed-event replay broken';end if;

 if (select count(*) from private.party_event_day8_reservations_v18)<>1
  or (select count(*) from private.party_event_finale_seals_v18)<>2
  or exists(select 1 from private.party_event_receipts_v11
    where event_points_awarded<>0)
  or (select week.status from private.party_event_weeks_v11 week
      where week.party_id=p and week.event_starts_at=w)<>'active'
 then raise exception 'V18 exactly-once, zero reward or no-settlement invariant broken';end if;
end $$;
select 'PASS: v18 canonical loadouts, stage3 seal, +1h Day8 attempt, exact replay, zero reward' as result;
rollback;
