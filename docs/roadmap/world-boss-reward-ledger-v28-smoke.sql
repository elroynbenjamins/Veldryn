-- World Boss V28 disposable Postgres 16 reward economy smoke.
-- Requires V17/V18/V27 private fixture SQL. Everything ROLLBACK.
-- No live account, app wallet or production schema is accessed.
BEGIN;
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
SELECT '30000000-0000-4000-8000-000000000028',
 'frostmarch','active',s,s+interval '7 days',
 'wb28-fixture',1000000,750000
FROM (SELECT clock_timestamp()-interval '6 hours' AS s) t;
INSERT INTO private.world_boss_war_camps_v27(
 event_id,fort_tier1,fort_tier2,field_tier1,field_tier2,
 siege_tier1,siege_tier2)
VALUES('30000000-0000-4000-8000-000000000028',1,2,1,2,1,2);
INSERT INTO private.world_boss_war_recipes_v27(
 event_id,recipe_id,track,tier,materials)
VALUES('30000000-0000-4000-8000-000000000028',
 'T1_FORTIFICATIONS','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":70},
 {"itemId":"COPPER_INGOT","quantity":12}]'::jsonb);
INSERT INTO private.world_boss_war_donations_v27(
 event_id,account_id,request_id,character_id,recipe_id,
 track,ordinal,paid_materials,revision)
VALUES(
 '30000000-0000-4000-8000-000000000028',
 '10000000-0000-4000-8000-000000000001',
 'WB28_WAR_DONATION_1','20000000-0000-4000-8000-000000000001',
 'T1_FORTIFICATIONS','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":70},
 {"itemId":"COPPER_INGOT","quantity":12}]',1
),(
 '30000000-0000-4000-8000-000000000028',
 '10000000-0000-4000-8000-000000000001',
 'WB28_WAR_DONATION_2','20000000-0000-4000-8000-000000000001',
 'T1_FORTIFICATIONS','fortifications',2,
 '[{"itemId":"GREENWOOD_LOG","quantity":70},
 {"itemId":"COPPER_INGOT","quantity":12}]',2
);
INSERT INTO private.world_boss_milestones_v17(
 event_id,threshold,crossed_by_account,crossed_by_request)
VALUES
 ('30000000-0000-4000-8000-000000000028',70,
  '10000000-0000-4000-8000-000000000002','WB28_HP_THRESHOLD_70'),
 ('30000000-0000-4000-8000-000000000028',30,
  '10000000-0000-4000-8000-000000000002','WB28_HP_THRESHOLD_30'),
 ('30000000-0000-4000-8000-000000000028',0,
  '10000000-0000-4000-8000-000000000002','WB28_HP_THRESHOLD_00');

DO $check$
DECLARE
 e uuid:='30000000-0000-4000-8000-000000000028';
 acct uuid:='10000000-0000-4000-8000-000000000001';
 ch uuid:='20000000-0000-4000-8000-000000000001';
 claim jsonb;
 duplicate_receipt jsonb;
 view_data jsonb;
 replay_content text;
 replay_digest text;
 payload jsonb;
 survived boolean;
 score integer;
 ord integer;
 error_code text;
 proof jsonb;
 wallet_value bigint;
 sum_amount bigint;
 keys integer;
BEGIN
 IF has_function_privilege('anon',
   'private.world_boss_v28_claim(uuid,uuid,text)','EXECUTE')
   OR has_function_privilege('authenticated',
   'private.world_boss_v28_claim(uuid,uuid,text)','EXECUTE')
   OR has_function_privilege('authenticated',
   'private.world_boss_v28_record_replay(uuid,uuid,text,text)','EXECUTE')
   OR has_function_privilege('anon',
   'private.world_boss_v28_view(uuid,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'WB28_PUBLIC_REWARD_FUNCTION_EXPOSED'; END IF;
 -- A donating account may claim 5 + 5, even with no completed battle;
 -- global milestones alone must not award it 5 + 10 + 15.
 SELECT private.world_boss_v28_claim(e,acct,'WB28_CLAIM_DONATION_ONLY') INTO claim;
 IF (claim->>'creditedSigils')::integer<>10 OR
    (claim->>'balanceAfter')::integer<>10
 THEN RAISE EXCEPTION 'WB28_DONATION_ONLY_REWARD_WRONG %',claim; END IF;

 -- Two completed victories and one personal loss, all immutable
 -- replay-backed; Attack 10 + 10 + 5; global 5 + 10 + 15; supplies 10.
 FOR ord IN 1..3 LOOP
  survived:=(ord<3);
  score:=CASE WHEN ord=3 THEN 0 ELSE 100 END;
  payload:=jsonb_build_object(
   'version','world-boss-account-rounds-v25-prototype',
   'eventId',e::text,'accountId',acct::text,
   'requestId','WB28_ATTEMPT_000'||ord::text,
   'rosterDigest',repeat('a',64),
   'phase','armored',
   'warCampDigest',repeat('b',64),
   'encounterDigest',repeat('c',64),
   'replay',jsonb_build_object(
    'schema','world-boss-v25-authored-account-rounds',
    'engineVersion','world-boss-account-rounds-v25-prototype',
    'eventId',e::text,'accountId',acct::text,
    'requestId','WB28_ATTEMPT_000'||ord::text,
    'rosterDigest',repeat('a',64),
    'roundsCompleted',14,'survived',survived,
    'rawBossHpDamage',score,
    'proposedWorldHpDamage',score,
    'localGuardDamage',20,
    'result',jsonb_build_object('survived',survived),
    'events',jsonb_build_array(
     jsonb_build_object('round',14,'type','battle_end')),
    'characterLedger',jsonb_build_array(
     jsonb_build_object(
      'characterId',ch::text,'role','tank',
      'bossHpDamage',score,'localGuardDamage',20,
      'effectiveHealing',0,'shieldConsumed',10,
      'tankProtection',25,'cleansePrevented',0,
      'interrupts',1,'survived',survived))));
  replay_content:=payload::text;
  replay_digest:=encode(sha256(convert_to(replay_content,'UTF8')),'hex');
  INSERT INTO private.world_boss_attempts_v17(
   event_id,account_id,request_id,ordinal,character_id,
   status,war_order,phase,rules_version,engine_version,
   server_seed,squad_digest,frozen_squad,war_camp_digest,
   encounter_profile_digest,reserved_at,lease_generation,
   lease_owner,lease_expires_at,hard_expires_at,
   committed_at,replay_digest,replay_object_key,
   raw_boss_damage,local_guard_damage,
   hp_before,hp_after,credited_hp,residual_echo)
  VALUES(e,acct,'WB28_ATTEMPT_000'||ord::text,ord,ch,
   'committed','steady_assault','armored','wb28-fixture',
   'world-boss-account-rounds-v25-prototype',
   repeat('S',32),repeat('a',64),
   jsonb_build_object('privateFrozen','test','padding',repeat('x',180)),
   repeat('b',64),repeat('c',64),
   clock_timestamp()-interval '5 minutes',1,
   'WB28_INTERNAL_WORKER',
   clock_timestamp()+interval '1 minute',
   clock_timestamp()+interval '5 minutes',
   clock_timestamp(),replay_digest,
   'WB26_REPLAY_'||left(replay_digest,40),
   score,20,1000,1000-score,score,false);
  -- Deny a missing/mutated replay. Immutable content digest, not a
  -- caller's victory flag, is the source of proof.
  error_code:='';
  BEGIN
   PERFORM private.world_boss_v28_record_replay(
    e,acct,'WB28_ATTEMPT_000'||ord::text,replay_content||'x');
  EXCEPTION WHEN raise_exception THEN error_code:=SQLERRM; END;
  IF error_code NOT LIKE '%WB28_UNVERIFIED_REPLAY%'
  THEN RAISE EXCEPTION 'WB28_TAMPERED_CONTENT_WAS_ACCEPTED %',error_code; END IF;
  SELECT private.world_boss_v28_record_replay(
   e,acct,'WB28_ATTEMPT_000'||ord::text,replay_content) INTO proof;
  IF proof->>'repeated'<>'false' OR
     (proof->>'survived')::boolean IS DISTINCT FROM survived
  THEN RAISE EXCEPTION 'WB28_COMMITTED_PROOF_BAD %',proof; END IF;
  SELECT private.world_boss_v28_record_replay(
   e,acct,'WB28_ATTEMPT_000'||ord::text,replay_content) INTO proof;
  IF proof->>'repeated'<>'true'
  THEN RAISE EXCEPTION 'WB28_REPLAY_PROOF_REUSED'; END IF;
  -- After first proof, the 30 global milestone Sigils become qualified.
  IF ord=1 THEN
   SELECT private.world_boss_v28_claim(
    e,acct,'WB28_CLAIM_FIRST_BATTLE') INTO claim;
   IF (claim->>'creditedSigils')::integer<>40
   THEN RAISE EXCEPTION 'WB28_GLOBAL_AND_FIRST_BATTLE_INCORRECT %',claim; END IF;
  END IF;
 END LOOP;
 SELECT private.world_boss_v28_claim(
  e,acct,'WB28_CLAIM_FINAL_BATTLES') INTO claim;
 IF (claim->>'creditedSigils')::integer<>15 OR
    (claim->>'balanceAfter')::integer<>65
 THEN RAISE EXCEPTION 'WB28_FINAL_CLAIM_WRONG %',claim; END IF;
 -- Lost-ACK repeat is the HISTORICAL receipt even after later earnings.
 SELECT private.world_boss_v28_claim(
  e,acct,'WB28_CLAIM_DONATION_ONLY') INTO duplicate_receipt;
 IF duplicate_receipt->>'repeated'<>'true' OR
    (duplicate_receipt->>'creditedSigils')::integer<>10 OR
    (duplicate_receipt->>'balanceAfter')::integer<>10
 THEN RAISE EXCEPTION 'WB28_CLAIM_RETRY_MINTED_OR_CHANGED'; END IF;
 SELECT private.world_boss_v28_claim(
  e,acct,'WB28_CLAIM_NOTHING_NEW') INTO claim;
 IF (claim->>'creditedSigils')::integer<>0 OR
    (claim->>'balanceAfter')::integer<>65
 THEN RAISE EXCEPTION 'WB28_DUPLICATED_REWARD_SOURCE'; END IF;
 SELECT coalesce(sum(amount),0),count(*)
 INTO sum_amount,keys FROM private.world_boss_reward_ledger_v28
 WHERE event_id=e AND account_id=acct;
 IF sum_amount<>65 OR keys<>8
 THEN RAISE EXCEPTION 'WB28_BAD_REWARD_LEDGER % %',sum_amount,keys; END IF;
 SELECT w.balance INTO wallet_value FROM private.world_boss_wallet_v28 w WHERE w.account_id=acct;
 IF wallet_value<>65 THEN RAISE EXCEPTION 'WB28_WALLET_TOTAL_WRONG'; END IF;
 SELECT private.world_boss_v28_view(acct,e) INTO view_data;
 IF (view_data->>'claimedThisEvent')::integer<>65 OR
    jsonb_array_length(view_data->'roleContributions')<>3 OR
    view_data->>'impactStatus'<>'pending_balance_approval' OR
    view_data->>'impactMilestonesCredited'<>'false'
 THEN RAISE EXCEPTION 'WB28_INVALID_ROLE_EVIDENCE_VIEW'; END IF;
 -- Dedicated impact payout rows cannot be inserted while unapproved.
 error_code:='';
 BEGIN
  INSERT INTO private.world_boss_reward_ledger_v28(
   event_id,account_id,source_key,amount)
  VALUES(e,acct,'impact:0.8',5);
 EXCEPTION WHEN check_violation THEN error_code:=SQLERRM; END;
 IF error_code NOT LIKE '%world_boss_reward_ledger_v28%'
 THEN RAISE EXCEPTION 'WB28_PREMATURE_IMPACT_CURRENCY'; END IF;
 RAISE NOTICE 'WB28_REPLAY_VERIFIED_65_SIGIL_CLAIM_AND_EVENT_CAP_PASSED';
END
$check$;
ROLLBACK;
