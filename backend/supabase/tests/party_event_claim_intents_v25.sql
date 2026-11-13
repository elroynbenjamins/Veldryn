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


 -- This SQL fixture imitates a trusted-worker attestation and is NOT proof
 -- that PostgreSQL can run the TypeScript boss simulator.
 snapshot:=private.read_party_event_boss_replay_snapshot_v21(r);
 if has_function_privilege('authenticated',
    'private.prepare_party_event_reward_offers_v24(uuid,text)','execute')
    or has_function_privilege('anon',
    'private.lock_party_event_reward_choice_v24(uuid,uuid,text,text)','execute')
    or has_function_privilege('authenticated',
    'private.party_event_reward_inbox_preview_v24(uuid)','execute')
    or has_table_privilege('service_role',
    'private.party_event_reward_offers_v24','insert')
    or has_table_privilege('service_role',
    'private.party_event_reward_choices_v24','update')
    or has_table_privilege('authenticated',
    'private.party_event_reward_batches_v24','select')
 then raise exception 'V24 privileged reward preparation exposed to client role';end if;
 begin
  perform private.prepare_party_event_reward_offers_v24(r,'v24-batch-0001');
  raise exception 'V24 prepared rewards without replay attestation';
 exception when others then
  if sqlerrm<>'party_event_v24_replay_attestation_missing' then raise;end if;
 end;
 perform private.attest_party_event_boss_replay_v23(
  r,'v24-fixture-attestation',snapshot->>'sourceDigest',
  snapshot->'payload'->'candidate'->>'candidate_hash',repeat('f',64),
  snapshot->'payload'->'finale'->>'loadout_hash',0,1,
  'greenfields-verified-gathering-v22');

 -- Even an internal actor changing progress after candidate capture cannot
 -- make v19's immutable personal EP preview an accepted payout offer.
 begin
  update private.party_event_member_progress_v14
   set activity_points=16 where party_id=p and event_starts_at=w
    and account_id=a[1];
  perform private.prepare_party_event_reward_offers_v24(r,'v24-batch-0001');
  raise exception 'V24 trusted altered EP after candidate was recorded';
 exception when others then
  if sqlerrm<>'party_event_v24_verified_points_mismatch' then raise;end if;
 end;

 -- Do not trust caller-supplied EP or choice. v24 recomputes from verified
 -- v14 progress + v15 special credits against immutable v19 previews.
 response:=private.prepare_party_event_reward_offers_v24(r,'v24-batch-0001');
 if response->>'replayed'<>'false'
  or (response->>'offerCount')::integer<>2
  or (response->>'memberCount')::integer<>2
  or response->>'rewardsClaimable'<>'false'
  or response->>'entitlementsCreated'<>'false'
  or response->>'rewardsGranted'<>'false'
 then raise exception 'V24 created spendable rewards or wrong eligible count';end if;
 if (select count(*) from private.party_event_reward_offers_v24
   where reservation_id=r)<>2
  or (select count(*) from private.party_event_reward_offers_v24
   where account_id=a[1] and eligibility='full' and personal_points=15)<>1
  or (select count(*) from private.party_event_reward_offers_v24
   where account_id=a[2] and eligibility='participation' and personal_points=5)<>1
 then raise exception 'V24 incorrect personal EP eligibility';end if;
 again:=private.prepare_party_event_reward_offers_v24(r,'v24-batch-0001');
 if again->>'replayed'<>'true'
  or (select count(*) from private.party_event_reward_batches_v24
   where reservation_id=r)<>1
 then raise exception 'V24 identical preparation not idempotent';end if;
 begin
  perform private.prepare_party_event_reward_offers_v24(r,'v24-changed-batch');
  raise exception 'V24 accepted second event-wide offer batch';
 exception when others then
  if sqlerrm<>'party_event_v24_prepare_conflict' then raise;end if;
 end;
 begin
  perform private.prepare_party_event_reward_offers_v24(
   gen_random_uuid(),'v24-other-reservation');
  raise exception 'V24 accepted unreserved boss attempt';
 exception when others then
  if sqlerrm<>'party_event_v24_reservation_missing' then raise;end if;
 end;

 -- Private read preview never offers claims or an actual Inbox payout.
 response:=private.party_event_reward_inbox_preview_v24(a[1]);
 if response->>'claimEnabled'<>'false' or
   jsonb_array_length(response->'offers')<>1 or
   response#>>'{offers,0,status}'<>'awaiting_choice_preview' or
   response#>>'{offers,0,claimable}'<>'false' or
   response#>>'{offers,0,entitlement}'<>'false'
 then raise exception 'V24 full-level Inbox preview falsely claimable';end if;
 response:=private.party_event_reward_inbox_preview_v24(a[2]);
 if response#>>'{offers,0,status}'<>'participation_preview'
 then raise exception 'V24 participation Inbox preview wrong';end if;

 select id into v_full_offer
 from private.party_event_reward_offers_v24 where account_id=a[1];
 select id into v_participation_offer
 from private.party_event_reward_offers_v24 where account_id=a[2];
 begin
  perform private.lock_party_event_reward_choice_v24(
   v_full_offer,a[2],'artisan','v24-stolen-choice');
  raise exception 'V24 accepted cross-account selection';
 exception when others then
  if sqlerrm<>'party_event_v24_choice_not_owned' then raise;end if;
 end;
 begin
  perform private.lock_party_event_reward_choice_v24(
   v_participation_offer,a[2],'warrior','v24-participation-choice');
  raise exception 'V24 participation got a full-tier choice';
 exception when others then
  if sqlerrm<>'party_event_v24_participation_has_no_choice' then raise;end if;
 end;
 begin
  perform private.lock_party_event_reward_choice_v24(
   v_full_offer,a[1],'mythic','v24-fake-choice');
  raise exception 'V24 accepted invented reward kind';
 exception when others then
  if sqlerrm<>'party_event_v24_invalid_choice' then raise;end if;
 end;

 response:=private.lock_party_event_reward_choice_v24(
  v_full_offer,a[1],'artisan','v24-choice-0001');
 if response->>'replayed'<>'false' or response->>'choice'<>'artisan'
  or response->>'rewardsClaimable'<>'false' or response->>'rewardsGranted'<>'false'
 then raise exception 'V24 locked selection wrongly or credited reward';end if;
 again:=private.lock_party_event_reward_choice_v24(
  v_full_offer,a[1],'artisan','v24-choice-0001');
 if again->>'replayed'<>'true' or
  (select count(*) from private.party_event_reward_choices_v24)<>1
 then raise exception 'V24 duplicate choice created';end if;

 begin
  perform private.lock_party_event_reward_choice_v24(
   v_full_offer,a[1],'warrior','v24-choice-0001');
  raise exception 'V24 allowed editing a locked selection';
 exception when others then
  if sqlerrm<>'party_event_v24_choice_conflict' then raise;end if;
 end;
 begin
  perform private.lock_party_event_reward_choice_v24(
   v_full_offer,a[1],'artisan','v24-revised-request');
  raise exception 'V24 accepted second request for same offer';
 exception when others then
  if sqlerrm<>'party_event_v24_choice_conflict' then raise;end if;
 end;
 response:=private.party_event_reward_inbox_preview_v24(a[1]);
 if response#>>'{offers,0,status}'<>'choice_locked_preview'
  or response#>>'{offers,0,selectedChoice}'<>'artisan'
  or response#>>'{offers,0,claimable}'<>'false'
 then raise exception 'V24 locked Inbox preview did not reflect choice';end if;

 begin
  update private.party_event_reward_offers_v24
   set granted=true where id=v_full_offer;
  raise exception 'V24 offer could be directly granted';
 exception when others then
  if sqlerrm<>'party_event_progress_immutable' then raise;end if;
 end;
 begin
  update private.party_event_reward_choices_v24
   set choice='warrior' where offer_id=v_full_offer;
  raise exception 'V24 selection not immutable';
 exception when others then
  if sqlerrm<>'party_event_progress_immutable' then raise;end if;
 end;
 if (select count(*) from private.party_event_reward_offers_v24
   where granted or claimable)<>0
  or (select count(*) from private.party_event_reward_choices_v24
   where granted or claimable)<>0
  or (select count(*) from private.party_event_reward_batches_v24
   where reward_grants_enabled)<>0
  or (select count(*) from private.party_event_reward_previews_v19
   where party_id=p and granted)<>0
 then raise exception 'V24 issued or exposed economy reward';end if;

 if has_function_privilege('authenticated',
    'private.prepare_party_event_claim_intent_v25(uuid,uuid,text)','execute')
  or has_function_privilege('anon',
    'private.claim_party_event_reward_v25(uuid,uuid,text)','execute')
  or has_table_privilege('service_role',
    'private.party_event_claim_intents_v25','insert')
  or has_table_privilege('authenticated',
    'private.party_event_claim_intents_v25','select')
 then raise exception 'V25 claim receipt permissions unsafe';end if;
 response:=private.party_event_reward_quote_v25(v_full_offer,a[1]);
 if response->>'version'<>'party-event-rewards-v2'
  or response->>'kind'<>'artisan'
  or (response->>'gold')::int<>1700
  or (response->>'skillXp')::int<>2250
  or (response->>'partyRenown')::int<>10
  or (response->'materials'->>'GEM_DUST')::int<>4
 then raise exception 'V25 full offer quote different from v2';end if;
 response:=private.party_event_reward_quote_v25(v_participation_offer,a[2]);
 if response->>'kind'<>'participation' or
    (response->>'gold')::int<>420 or
    response->'materials'<>'{}'::jsonb
 then raise exception 'V25 participation quote different from v2';end if;
 begin
  perform private.party_event_reward_quote_v25(v_full_offer,a[2]);
  raise exception 'V25 quote of another account allowed';
 exception when others then
  if sqlerrm<>'party_event_v25_offer_not_owned' then raise;end if;
 end;
 begin
  perform private.prepare_party_event_claim_intent_v25(
   v_full_offer,a[2],'v25-attacker-intent-001');
  raise exception 'V25 cross-account intent allowed';
 exception when others then
  if sqlerrm<>'party_event_v25_offer_not_owned' then raise;end if;
 end;
 begin
  perform private.prepare_party_event_claim_intent_v25(
   v_full_offer,a[1],'v25-own-intent-0001');
  raise exception 'V25 intent without authoritative game state';
 exception when others then
  if sqlerrm<>'party_event_v25_online_character_required' then raise;end if;
 end;
 insert into public.online_game_states(account_id,character_id,state,revision)
 values(a[1],c[1],jsonb_build_object('inventory',jsonb_build_object(
  'capacity',1,'stacks',jsonb_build_array(
   jsonb_build_object('itemId','COPPER_ORE','quantity',10)))),0),
 (a[2],c[2],jsonb_build_object('inventory',jsonb_build_object(
  'capacity',1,'stacks','[]'::jsonb)),0);
 insert into public.character_wallets(character_id,gold)
 values(c[1],100),(c[2],40)
 on conflict(character_id) do update set gold=excluded.gold;

 -- A material payout must not overflow a merged nine-digit inventory stack.
 update public.online_game_states set state=jsonb_set(
  state,'{inventory,stacks}',
  '[{"itemId":"GEM_DUST","quantity":999999998}]'::jsonb)
 where account_id=a[1];
 begin
  perform private.prepare_party_event_claim_intent_v25(
   v_full_offer,a[1],'v25-own-intent-0001');
  raise exception 'V25 accepted material stack overflow';
 exception when others then
  if sqlerrm<>'party_event_v25_material_stack_overflow' then raise;end if;
 end;
 update public.online_game_states set state=jsonb_set(
  state,'{inventory,stacks}',
  '[{"itemId":"COPPER_ORE","quantity":10}]'::jsonb)
 where account_id=a[1];
 -- Existing character wallet must not wrap a bigint on eventual credit.
 update public.character_wallets set gold=9223372036854775805::bigint
 where character_id=c[1];
 update public.online_game_states set state=jsonb_set(
  state,'{inventory,capacity}','2'::jsonb)
 where account_id=a[1];
 begin
  perform private.prepare_party_event_claim_intent_v25(
   v_full_offer,a[1],'v25-own-intent-0001');
  raise exception 'V25 accepted bigint wallet overflow';
 exception when others then
  if sqlerrm<>'party_event_v25_wallet_overflow' then raise;end if;
 end;
 update public.character_wallets set gold=100 where character_id=c[1];
 update public.online_game_states set state=jsonb_set(
  state,'{inventory,capacity}','1'::jsonb)
 where account_id=a[1];
 begin
  perform private.prepare_party_event_claim_intent_v25(
   v_full_offer,a[1],'v25-own-intent-0001');
  raise exception 'V25 full capacity accepted for a new GEM_DUST stack';
 exception when others then
  if sqlerrm<>'party_event_v25_inventory_full' then raise;end if;
 end;
 update public.online_game_states
 set state=jsonb_set(state,'{inventory,capacity}','2'::jsonb)
 where account_id=a[1];
 response:=private.prepare_party_event_claim_intent_v25(
  v_full_offer,a[1],'v25-own-intent-0001');
 if response->>'replayed'<>'false'
  or response->>'claimReady'<>'false'
  or response->>'rewardsGranted'<>'false'
 then raise exception 'V25 incorrectly paid on first claim intent';end if;
 if (select count(*) from private.party_event_claim_intents_v25
  where offer_id=v_full_offer and account_id=a[1]
   and reward_kind='artisan' and inventory_used_slots=1
   and inventory_extra_slots=1 and inventory_capacity=2
   and wallet_gold_before=100 and online_revision=0
   and reward_quote->>'skillXp'='2250')<>1
 then raise exception 'V25 did not freeze authoritative quote/inventory/wallet';end if;
 again:=private.prepare_party_event_claim_intent_v25(
  v_full_offer,a[1],'v25-own-intent-0001');
 if again->>'replayed'<>'true'
 then raise exception 'V25 identical claim retry not idempotent';end if;
 begin
  perform private.prepare_party_event_claim_intent_v25(
   v_full_offer,a[1],'v25-second-intent');
  raise exception 'V25 duplicate claim intent accepted';
 exception when others then
  if sqlerrm<>'party_event_v25_claim_intent_conflict' then raise;end if;
 end;
 response:=private.prepare_party_event_claim_intent_v25(
  v_participation_offer,a[2],'v25-participation-intent-001');
 if response->>'replayed'<>'false'
  or (select inventory_extra_slots from private.party_event_claim_intents_v25
    where offer_id=v_participation_offer)<>0
 then raise exception 'V25 participation quote wrongly requires a slot';end if;
 begin
  perform private.claim_party_event_reward_v25(
   v_full_offer,a[1],'v25-attempt-payout');
  raise exception 'V25 hard-blocked payout executed';
 exception when others then
  if sqlerrm<>'party_event_v25_payout_not_released' then raise;end if;
 end;
 response:=private.party_event_claim_intents_inbox_v25(a[1]);
 if response->>'claimEnabled'<>'false'
  or (response->>'economyTransfers')::int<>0
  or jsonb_array_length(response->'items')<>1
  or response#>>'{items,0,state}'<>'blocked_unreleased'
  or response#>>'{items,0,claimed}'<>'false'
 then raise exception 'V25 private Inbox leaked claimability';end if;
 response:=private.party_event_claim_intents_inbox_v25(a[2]);
 if jsonb_array_length(response->'items')<>1
  or response#>>'{items,0,rewardKind}'<>'participation'
 then raise exception 'V25 Inbox leaked account or reward kind';end if;
 begin
  update private.party_event_claim_intents_v25 set claimed=true
   where offer_id=v_full_offer;
  raise exception 'V25 claim intent was editable';
 exception when others then
  if sqlerrm<>'party_event_progress_immutable' then raise;end if;
 end;
 if (select gold from public.character_wallets where character_id=c[1])<>100
  or (select gold from public.character_wallets where character_id=c[2])<>40
  or (select revision from public.online_game_states where account_id=a[1])<>0
  or (select revision from public.online_game_states where account_id=a[2])<>0
  or (select count(*) from private.party_event_claim_intents_v25
    where claimed or claimable or rewards_granted or entitlement_created)<>0
 then raise exception 'V25 intent changed live economy state';end if;

end $$;
select 'PASS: v25 claim quote, account isolation, capacity, exact retry, no payout' result;
rollback;
