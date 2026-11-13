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

 -- v25 quote is NOT a reward grant. It must have a verified, frozen character
 -- and correctly shaped economy destinations before even storing a quote.
 if has_function_privilege('authenticated',
    'private.prepare_party_event_claim_quote_v25(uuid,uuid,uuid,text)','execute')
    or has_function_privilege('anon',
    'private.party_event_claim_quote_inbox_v25(uuid)','execute')
    or has_table_privilege('service_role',
    'private.party_event_reward_claim_quotes_v25','insert')
    or has_table_privilege('authenticated',
    'private.party_event_reward_claim_quotes_v25','select')
 then raise exception 'V25 private claim quote permissions unsafe';end if;
 begin
  perform private.prepare_party_event_claim_quote_v25(
    v_full_offer,a[2],c[2],'v25-stolen-offer');
  raise exception 'V25 cross-account reward quote allowed';
 exception when others then
  if sqlerrm<>'party_event_v25_not_offer_owner' then raise;end if;
 end;
 begin
  perform private.prepare_party_event_claim_quote_v25(
    v_full_offer,a[1],c[2],'v25-wrong-character');
  raise exception 'V25 foreign roster character allowed';
 exception when others then
  if sqlerrm<>'party_event_v25_character_not_owned_or_frozen' then raise;end if;
 end;
 begin
  perform private.prepare_party_event_claim_quote_v25(
    v_full_offer,a[1],c[1],'v25-artisan-quote');
  raise exception 'V25 accepted a quote without verified wallet';
 exception when others then
  if sqlerrm<>'party_event_v25_wallet_unavailable' then raise;end if;
 end;
 insert into public.character_wallets(character_id,gold)
 values(c[1],1000),(c[2],1200);
 begin
  perform private.prepare_party_event_claim_quote_v25(
    v_full_offer,a[1],c[1],'v25-artisan-quote');
  raise exception 'V25 accepted missing online inventory state';
 exception when others then
  if sqlerrm<>'party_event_v25_online_inventory_unavailable' then raise;end if;
 end;

 insert into public.online_game_states(account_id,character_id,state,revision)
 values
 (a[1],c[1],'{"inventory":{"stacks":[{"itemId":"GEM_DUST","quantity":3}]},"settings":{"lockedItemIds":[]}}'::jsonb,0),
 (a[2],c[2],'{"inventory":{"stacks":[]},"settings":{"lockedItemIds":[]}}'::jsonb,0);

 response:=private.prepare_party_event_claim_quote_v25(
  v_full_offer,a[1],c[1],'v25-artisan-quote');
 if response->>'replayed'<>'false'
  or response->>'storageShapeVerified'<>'true'
  or response->>'inventoryCapacityVerified'<>'false'
  or response->>'claimEnabled'<>'false'
  or response->>'claimed'<>'false'
  or response->>'economyApplied'<>'false'
  or response->>'inboxDelivered'<>'false'
  or response->>'entitlementsCreated'<>'false'
  or response#>>'{quote,version}'<>'party-event-rewards-v2'
  or response#>>'{quote,kind}'<>'artisan'
  or response#>>'{quote,personalPoints}'<>'15'
  or response#>>'{quote,performanceBand}'<>'1'
  or response#>>'{quote,gold}'<>'1700'
  or response#>>'{quote,skillXp}'<>'2250'
  or response#>>'{quote,partyRenown}'<>'10'
  or response#>>'{quote,materials,GEM_DUST}'<>'4'
 then raise exception 'V25 artisan quote disagrees with canonical model';end if;
 if (select gold from public.character_wallets where character_id=c[1])<>1000
  or (select revision from public.online_game_states
   where account_id=a[1] and character_id=c[1])<>0
 then raise exception 'V25 quote unexpectedly wrote to live economy';end if;
 again:=private.prepare_party_event_claim_quote_v25(
  v_full_offer,a[1],c[1],'v25-artisan-quote');
 if again->>'replayed'<>'true'
  or again->>'quoteHash'<>response->>'quoteHash'
 then raise exception 'V25 quote retries were not idempotent';end if;
 begin
  perform private.prepare_party_event_claim_quote_v25(
   v_full_offer,a[1],c[1],'v25-new-quote-request');
  raise exception 'V25 allowed a second quote request';
 exception when others then
  if sqlerrm<>'party_event_v25_quote_conflict' then raise;end if;
 end;

 response:=private.prepare_party_event_claim_quote_v25(
  v_participation_offer,a[2],c[2],'v25-participation-quote');
 if response#>>'{quote,kind}'<>'participation'
  or response#>>'{quote,gold}'<>'420'
  or response#>>'{quote,combatXp}'<>'0'
  or response#>>'{quote,partyRenown}'<>'0'
  or response#>>'{quote,materials}'<>'{}'
  or response->>'claimed'<>'false'
 then raise exception 'V25 participation reward quote incorrect';end if;
 begin
  perform private.prepare_party_event_claim_quote_v25(
   v_participation_offer,a[2],c[2],'v25-artisan-quote');
  raise exception 'V25 reused account-1 deduplication key for account-2 quote';
 exception when others then
  if sqlerrm<>'party_event_v25_quote_conflict' then raise;end if;
 end;

 response:=private.party_event_claim_quote_inbox_v25(a[1]);
 if response->>'claimsEnabled'<>'false'
  or response->>'economyApplied'<>'false'
  or response->>'entitlementsCreated'<>'false'
  or (response->>'quoteCount')::integer<>1
  or response#>>'{quotes,0,status}'<>'blocked_economy_not_audited'
  or response#>>'{quotes,0,claimable}'<>'false'
 then raise exception 'V25 account quote inbox is claimable';end if;
 if (private.party_event_claim_quote_inbox_v25(gen_random_uuid())->>'quoteCount')::integer<>0
 then raise exception 'V25 leaked claim quote between accounts';end if;

 begin
  update private.party_event_reward_claim_quotes_v25
   set reward_json='{"gold":9999999}'::jsonb where offer_id=v_full_offer;
  raise exception 'V25 quote was mutable';
 exception when others then
  if sqlerrm<>'party_event_progress_immutable' then raise;end if;
 end;
 if (select count(*) from private.party_event_reward_claim_quotes_v25)<>2
  or (select count(*) from private.party_event_reward_claim_quotes_v25
   where claimable or claimed or economy_applied or inbox_delivered)<>0
  or (select gold from public.character_wallets where character_id=c[2])<>1200
  or (select revision from public.online_game_states
   where account_id=a[2] and character_id=c[2])<>0
 then raise exception 'V25 quote created duplicate payment or edited inventory';end if;
end $;
select 'PASS: v25 immutable account quotes, canonical amounts, zero payout, wallet/inventory preflight' as result;
rollback;
