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
 v_full_offer uuid;
 v_participation_offer uuid;
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

 insert into private.party_event_member_progress_v14(
  party_id,event_starts_at,account_id,activity_points,carried_seconds)
 values(p,w,a[1],15,0),(p,w,a[2],5,0);

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



 -- A pure server-side award formula that matches v2 TS, not arbitrary
 -- client amounts. All four reward kinds and all three difficulty bands.
 if private.party_event_reward_values_v25('standard',1,5,'participation')
   ->>'gold'<>'420'
  or private.party_event_reward_values_v25('standard',1,15,'artisan')
   ->>'gold'<>'1700'
  or private.party_event_reward_values_v25('standard',1,15,'artisan')
   ->>'skillXp'<>'2250'
  or private.party_event_reward_values_v25('standard',1,15,'artisan')
   #>>'{materials,GEM_DUST}'<>'4'
  or private.party_event_reward_values_v25('standard',1,15,'artisan')
   ->>'partyRenown'<>'10'
  or private.party_event_reward_values_v25('standard',1,15,'warrior')
   ->>'combatXp'<>'1650'
  or private.party_event_reward_values_v25('heroic',6,15,'companion')
   ->>'gold'<>'5333'
  or private.party_event_reward_values_v25('heroic',6,15,'companion')
   ->>'companionEssence'<>'473'
  or private.party_event_reward_values_v25('heroic',6,15,'companion')
   ->>'bondstones'<>'2'
 then raise exception 'V25 reward formula drifted from v2 model';end if;

 begin
  perform private.party_event_reward_values_v25('standard',1,4,'participation');
  raise exception 'V25 calculated payout for ineligible account';
 exception when others then
  if sqlerrm<>'party_event_v25_invalid_reward_values' then raise;end if;
 end;
 begin
  perform private.party_event_reward_values_v25('heroic',7,15,'artisan');
  raise exception 'V25 accepted bogus reward band';
 exception when others then
  if sqlerrm<>'party_event_v25_invalid_reward_values' then raise;end if;
 end;
 begin
  perform private.party_event_reward_values_v25('standard',1,5,'warrior');
  raise exception 'V25 upgraded participation offer to full cache';
 exception when others then
  if sqlerrm<>'party_event_v25_invalid_reward_values' then raise;end if;
 end;

 if has_function_privilege('authenticated',
    'private.prepare_party_event_claim_preflight_v25(uuid,uuid,uuid,text)',
    'execute')
  or has_function_privilege('anon',
    'private.party_event_reward_values_v25(text,integer,integer,text)',
    'execute')
  or has_function_privilege('authenticated',
    'private.claim_party_event_reward_v25(uuid,uuid,text)','execute')
  or has_table_privilege('service_role',
    'private.party_event_claim_preflights_v25','insert')
  or has_table_privilege('authenticated',
    'private.party_event_claim_preflights_v25','select')
 then raise exception 'V25 private claim preflight privileges unsafe';end if;

 snapshot:=private.read_party_event_boss_replay_snapshot_v21(r);
 perform private.attest_party_event_boss_replay_v23(
  r,'v25-replay-worker',snapshot->>'sourceDigest',
  snapshot->'payload'->'candidate'->>'candidate_hash',repeat('f',64),
  snapshot->'payload'->'finale'->>'loadout_hash',0,1,
  'greenfields-verified-gathering-v22');
 perform private.prepare_party_event_reward_offers_v24(r,'v25-offers-0001');

 select id into v_full_offer from private.party_event_reward_offers_v24
  where party_id=p and account_id=a[1];
 select id into v_participation_offer from private.party_event_reward_offers_v24
  where party_id=p and account_id=a[2];
 if v_full_offer is null or v_participation_offer is null
 then raise exception 'V25 missing personal reward offer';end if;

 -- The actual recorded character from roster is the only eligible target.
 begin
  perform private.prepare_party_event_claim_preflight_v25(
   v_full_offer,a[2],c[2],'v25-cross-account');
  raise exception 'V25 allowed other member to preflight private reward';
 exception when others then
  if sqlerrm<>'party_event_v25_not_offer_owner' then raise;end if;
 end;
 begin
  perform private.prepare_party_event_claim_preflight_v25(
   v_full_offer,a[1],c[2],'v25-wrong-character');
  raise exception 'V25 allowed another character as reward target';
 exception when others then
  if sqlerrm<>'party_event_v25_character_not_eligible' then raise;end if;
 end;
 begin
  perform private.prepare_party_event_claim_preflight_v25(
   v_full_offer,a[1],c[1],'v25-unselected-cache');
  raise exception 'V25 accepted full reward without locked choice';
 exception when others then
  if sqlerrm<>'party_event_v25_full_choice_required' then raise;end if;
 end;

 perform private.lock_party_event_reward_choice_v24(
  v_full_offer,a[1],'artisan','v25-lock-artisan');
 begin
  perform private.prepare_party_event_claim_preflight_v25(
   v_full_offer,a[1],c[1],'v25-no-inventory');
  raise exception 'V25 preflight without online state';
 exception when others then
  if sqlerrm<>'party_event_v25_online_inventory_required' then raise;end if;
 end;

 insert into public.online_game_states(account_id,character_id,state,revision)
 values(a[1],c[1],
  '{"inventory":{"stacks":[{"itemId":"COPPER_ORE","quantity":5}]}}'::jsonb,0),
       (a[2],c[2],
  '{"inventory":{"stacks":[{"itemId":"DEWLEAF","quantity":2}]}}'::jsonb,0);
 -- Live character capacity is constrained to 30..100; simulate full
 -- 30-slot inventory rather than altering the enforced character limit.
 update public.online_game_states
 set state=jsonb_set(state,'{inventory,stacks}',
   (select jsonb_agg(jsonb_build_object('itemId','GEM_DUST','quantity',1))
    from generate_series(1,30)))
 where account_id=a[1] and character_id=c[1];
 begin
  perform private.prepare_party_event_claim_preflight_v25(
   v_full_offer,a[1],c[1],'v25-full-inventory');
  raise exception 'V25 ignored conservative GEM_DUST inventory slot';
 exception when others then
  if sqlerrm<>'party_event_v25_inventory_capacity_insufficient' then raise;end if;
 end;
 -- Free exactly one real inventory slot for the conservative quote.
 update public.online_game_states set
  state=jsonb_set(state,'{inventory,stacks}',
   (state#>'{inventory,stacks}')-29)
 where account_id=a[1] and character_id=c[1];

 response:=private.prepare_party_event_claim_preflight_v25(
  v_full_offer,a[1],c[1],'v25-artisan-preflight');
 if response->>'replayed'<>'false'
  or response->>'preflightRecorded'<>'true'
  or response->>'payoutAuthorized'<>'false'
  or response->>'rewardsGranted'<>'false'
  or response->>'claimable'<>'false'
  or response->>'claimed'<>'false'
  or response->>'needsSkillTarget'<>'true'
  or response->>'needsCombatXpRouter'<>'false'
  or response->>'needsCompanionRouter'<>'false'
  or (response->>'conservativeSlotsNeeded')::integer<>1
  or response#>>'{reward,kind}'<>'artisan'
  or response#>>'{reward,skillXp}'<>'2250'
 then raise exception 'V25 accepted payout or incorrect artisan dry-run';end if;

 -- Exact retry after inventory revision changed returns the original
 -- immutable receipt, NOT a second slot reserve or reward.
 update public.online_game_states set revision=revision+1
  where account_id=a[1] and character_id=c[1];
 again:=private.prepare_party_event_claim_preflight_v25(
  v_full_offer,a[1],c[1],'v25-artisan-preflight');
 if again->>'replayed'<>'true'
  or again->>'rewardHash'<>response->>'rewardHash'
  or again->>'inventoryRevision'<>'0'
 then raise exception 'V25 exact retry mutated frozen preflight';end if;
 begin
  perform private.prepare_party_event_claim_preflight_v25(
   v_full_offer,a[1],c[1],'v25-second-request');
  raise exception 'V25 allowed a second preflight for same offer';
 exception when others then
  if sqlerrm<>'party_event_v25_preflight_conflict' then raise;end if;
 end;
 begin
  perform private.prepare_party_event_claim_preflight_v25(
   v_participation_offer,a[2],c[2],'v25-artisan-preflight');
  raise exception 'V25 reused full-offer request ID for other member';
 exception when others then
  if sqlerrm<>'party_event_v25_preflight_conflict' then raise;end if;
 end;

 -- A participation reward needs no material slot; a full inventory
 -- still permits a nonpaying readiness record with no choice.
 response:=private.prepare_party_event_claim_preflight_v25(
  v_participation_offer,a[2],c[2],'v25-participation');
 if response->>'replayed'<>'false'
  or response->>'needsSkillTarget'<>'false'
  or response->>'claimable'<>'false'
  or response#>>'{reward,kind}'<>'participation'
  or response#>>'{reward,gold}'<>'420'
  or (response->>'conservativeSlotsNeeded')::integer<>0
 then raise exception 'V25 participation dry-run incorrectly blocked or credited';end if;

 begin
  perform private.claim_party_event_reward_v25(
   v_full_offer,a[1],'v25-try-to-grant');
  raise exception 'V25 activated a live reward claim';
 exception when others then
  if sqlerrm<>'party_event_v25_claim_disabled_pending_economy_audit'
  then raise;end if;
 end;
 begin
  update private.party_event_claim_preflights_v25
   set claimed=true where offer_id=v_full_offer;
  raise exception 'V25 claim record was mutable';
 exception when others then
  if sqlerrm<>'party_event_progress_immutable' then raise;end if;
 end;

 if (select count(*) from private.party_event_claim_preflights_v25)<>2
  or (select count(*) from private.party_event_claim_preflights_v25
      where claimed or currency_credited or inventory_credited
        or authorized_for_payout)<>0
  or (select count(*) from private.party_event_reward_offers_v24
      where granted or claimable)<>0
  or (select count(*) from private.party_event_reward_previews_v19
      where granted)<>0
  or (select count(*) from public.character_wallets
      where character_id in (c[1],c[2]))<>0
 then raise exception 'V25 leaked an actual currency/item/XP credit';end if;
end $$;
select 'PASS: v25 model parity, locked choice, capacity/owner, one receipt per account, payout hard-off' as result;
rollback;
