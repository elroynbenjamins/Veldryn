-- World Boss V55 — account erasure transaction DRY RUN, CI ONLY.
-- Full fixture is synthetic; BEGIN/ROLLBACK encloses all rows and functions.
-- DO NOT DEPLOY: no real retention policy, Auth admin deletion, session
-- revocation, replay object-store purge or worker-wide erasure fence exists.
-- This demonstrates FK order, global invariants and retry/idempotence only.
BEGIN;

CREATE FUNCTION pg_temp.wb55_fixture_purge(
 p_account uuid,p_external_replay_purged boolean
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $erase$
DECLARE
 r record;
 e record;
 pre jsonb;
 after_data jsonb;
 owner_exists boolean;
BEGIN
 IF p_account IS NULL THEN RAISE EXCEPTION 'WB55_INVALID_OWNER'; END IF;
 -- The actual Auth erasure service must first fence all World Boss writes,
 -- invalidate sessions and durably confirm object-store replay purges.
 -- Current V18/V22/V27/V28 workers DO NOT yet share an erasure gate.
 -- Lock relevant event rows in deterministic order used by other writers.
 FOR r IN
  SELECT event_id AS id FROM private.world_boss_attempts_v17
   WHERE account_id=p_account
  UNION SELECT event_id FROM private.world_boss_war_donations_v27
   WHERE account_id=p_account
  UNION SELECT event_id FROM private.world_boss_reward_ledger_v28
   WHERE account_id=p_account
  UNION SELECT event_id FROM private.world_boss_claim_receipts_v28
   WHERE account_id=p_account
  UNION SELECT event_id FROM private.world_boss_milestones_v17
   WHERE crossed_by_account=p_account
  ORDER BY id
 LOOP
  SELECT id INTO e FROM private.world_boss_events_v17
   WHERE id=r.id FOR UPDATE;
 END LOOP;
 PERFORM 1 FROM auth.users WHERE id=p_account FOR UPDATE;
 owner_exists:=FOUND;
 pre:=private.world_boss_v36_erasure_preflight(p_account);
 IF (pre->>'externalReplayReviewRequired')::boolean IS TRUE
   AND p_external_replay_purged IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'WB55_EXTERNAL_REPLAY_PURGE_REQUIRED'; END IF;
 IF NOT owner_exists AND (pre->>'requiresReconciliation')::boolean
 THEN RAISE EXCEPTION 'WB55_ORPHANED_ACCOUNT_RECEIPTS'; END IF;
 -- Remove child replay proofs BEFORE immutable parent battle attempts.
 DELETE FROM private.world_boss_replay_proofs_v28 WHERE account_id=p_account;
 DELETE FROM private.world_boss_claim_receipts_v28 WHERE account_id=p_account;
 DELETE FROM private.world_boss_reward_ledger_v28 WHERE account_id=p_account;
 DELETE FROM private.world_boss_wallet_v28 WHERE account_id=p_account;
 DELETE FROM private.world_boss_war_donations_v27 WHERE account_id=p_account;
 DELETE FROM private.world_boss_consent_commands_v21 WHERE owner_account_id=p_account;
 DELETE FROM private.world_boss_echo_consents_v20 WHERE owner_account_id=p_account;
 -- Milestone crossing remains a realm-wide fact. Remove account/request
 -- identity, without making the milestone eligible to trigger twice.
 UPDATE private.world_boss_milestones_v17
 SET crossed_by_account=NULL,crossed_by_request='REDACTED'
 WHERE crossed_by_account=p_account;
 DELETE FROM private.world_boss_attempts_v17 WHERE account_id=p_account;
 after_data:=private.world_boss_v36_erasure_preflight(p_account);
 IF (after_data->>'requiresReconciliation')::boolean
 THEN RAISE EXCEPTION 'WB55_ACCOUNT_DATA_REMAINS'; END IF;
 -- This DELETE exercises only disposable auth.users FK semantics. Real
 -- Supabase Auth deletion MUST go through approved Admin/Auth workflow.
 DELETE FROM auth.users WHERE id=p_account;
 RETURN true;
END
$erase$;

INSERT INTO auth.users(id) VALUES
 ('10000000-0000-4000-8000-000000000055'),
 ('10000000-0000-4000-8000-000000000056');
INSERT INTO public.characters(id,account_id) VALUES
 ('20000000-0000-4000-8000-000000000055','10000000-0000-4000-8000-000000000055'),
 ('20000000-0000-4000-8000-000000000056','10000000-0000-4000-8000-000000000056');
INSERT INTO private.world_boss_events_v17
 (id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp,revision)
VALUES('30000000-0000-4000-8000-000000000055','hollowroot','closed',
 '2036-01-07 00:00:00+00','2036-01-14 00:00:00+00',
 'wb55-fixture',100000,75000,2);
INSERT INTO private.world_boss_war_camps_v27
 (event_id,revision,fortifications,field_provisions,siegecraft,
 fort_tier1,fort_tier2,field_tier1,field_tier2,siege_tier1,siege_tier2)
VALUES('30000000-0000-4000-8000-000000000055',
 2,2,0,0,1,2,1,2,1,2);
INSERT INTO private.world_boss_war_recipes_v27
 (event_id,recipe_id,track,tier,materials)
VALUES('30000000-0000-4000-8000-000000000055',
 'WB55_TEST_SUPPLY','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":1}]'::jsonb);

-- Two real committed receipt SHAPES, including immutable frozen loadout,
-- receipt replay locator and actual event HP credited in an earlier battle.
INSERT INTO private.world_boss_attempts_v17(
 event_id,account_id,request_id,ordinal,character_id,war_order,phase,
 rules_version,engine_version,server_seed,squad_digest,frozen_squad,
 lease_owner,lease_expires_at,hard_expires_at,status,
 committed_at,replay_digest,replay_object_key,
 raw_boss_damage,local_guard_damage,hp_before,hp_after,credited_hp,residual_echo)
VALUES
 ('30000000-0000-4000-8000-000000000055',
  '10000000-0000-4000-8000-000000000055',
  'WB55_BATTLE_OWNER',1,'20000000-0000-4000-8000-000000000055',
  'hold_line','armored','wb55-fixture','wb55-prototype',
  repeat('S',32),repeat('a',64),
  jsonb_build_object('trustedFrozenRoster',repeat('X',160)),
  'WB55_OWNER_WORKER',clock_timestamp()+interval '2 minutes',
  clock_timestamp()+interval '15 minutes','committed',clock_timestamp(),
  repeat('c',64),'replays/wb55-owner-test',100,20,80000,79900,100,false),
 ('30000000-0000-4000-8000-000000000055',
  '10000000-0000-4000-8000-000000000056',
  'WB55_BATTLE_OTHER',1,'20000000-0000-4000-8000-000000000056',
  'hold_line','armored','wb55-fixture','wb55-prototype',
  repeat('T',32),repeat('b',64),
  jsonb_build_object('trustedFrozenRoster',repeat('Y',160)),
  'WB55_OTHER_WORKER',clock_timestamp()+interval '2 minutes',
  clock_timestamp()+interval '15 minutes','committed',clock_timestamp(),
  repeat('d',64),'replays/wb55-other-test',100,20,79900,79800,100,false);
INSERT INTO private.world_boss_replay_proofs_v28(
 event_id,account_id,request_id,replay_digest,survived,
 boss_hp_damage,local_guard_damage,character_ledger,rounds_completed)
VALUES
 ('30000000-0000-4000-8000-000000000055',
  '10000000-0000-4000-8000-000000000055',
  'WB55_BATTLE_OWNER',repeat('c',64),true,100,20,'[{"fixture":"owner"}]'::jsonb,14),
 ('30000000-0000-4000-8000-000000000055',
  '10000000-0000-4000-8000-000000000056',
  'WB55_BATTLE_OTHER',repeat('d',64),true,100,20,'[{"fixture":"other"}]'::jsonb,14);
INSERT INTO private.world_boss_war_donations_v27(
 event_id,account_id,request_id,character_id,recipe_id,track,
 ordinal,paid_materials,revision)
VALUES
 ('30000000-0000-4000-8000-000000000055',
  '10000000-0000-4000-8000-000000000055',
  'WB55_SUPPLY_OWNER','20000000-0000-4000-8000-000000000055',
  'WB55_TEST_SUPPLY','fortifications',1,'[{"itemId":"GREENWOOD_LOG","quantity":1}]'::jsonb,1),
 ('30000000-0000-4000-8000-000000000055',
  '10000000-0000-4000-8000-000000000056',
  'WB55_SUPPLY_OTHER','20000000-0000-4000-8000-000000000056',
  'WB55_TEST_SUPPLY','fortifications',1,'[{"itemId":"GREENWOOD_LOG","quantity":1}]'::jsonb,2);
INSERT INTO private.world_boss_milestones_v17
 (event_id,threshold,crossed_by_account,crossed_by_request)
VALUES('30000000-0000-4000-8000-000000000055',
 70,'10000000-0000-4000-8000-000000000055','WB55_BATTLE_OWNER');
INSERT INTO private.world_boss_wallet_v28(account_id,balance,revision)
VALUES('10000000-0000-4000-8000-000000000055',10,1),
 ('10000000-0000-4000-8000-000000000056',5,1);
INSERT INTO private.world_boss_reward_ledger_v28
 (event_id,account_id,source_key,amount)
VALUES
 ('30000000-0000-4000-8000-000000000055',
  '10000000-0000-4000-8000-000000000055','battle:1',10),
 ('30000000-0000-4000-8000-000000000055',
  '10000000-0000-4000-8000-000000000056','battle:1',5);
INSERT INTO private.world_boss_claim_receipts_v28
 (event_id,account_id,request_id,amount,balance_after,account_revision)
VALUES
 ('30000000-0000-4000-8000-000000000055',
  '10000000-0000-4000-8000-000000000055','WB55_CLAIM_OWNER',10,10,1),
 ('30000000-0000-4000-8000-000000000055',
  '10000000-0000-4000-8000-000000000056','WB55_CLAIM_OTHER',5,5,1);
INSERT INTO private.world_boss_echo_consents_v20
 (event_id,owner_account_id,character_id,consent_revision,enabled,granted_at,expires_at)
VALUES('30000000-0000-4000-8000-000000000055',
 '10000000-0000-4000-8000-000000000055',
 '20000000-0000-4000-8000-000000000055',
 1,false,clock_timestamp(),clock_timestamp()+interval '1 day');
INSERT INTO private.world_boss_consent_commands_v21
 (event_id,owner_account_id,request_id,character_id,enabled,
 expected_revision,resulting_revision,receipt)
VALUES('30000000-0000-4000-8000-000000000055',
 '10000000-0000-4000-8000-000000000055','WB55_RETIRED_CONSENT',
 '20000000-0000-4000-8000-000000000055',
 false,0,1,'{"repeated":false}'::jsonb);

DO $assert$
DECLARE
 target_account uuid:='10000000-0000-4000-8000-000000000055';
 other_account uuid:='10000000-0000-4000-8000-000000000056';
 target_event_id uuid:='30000000-0000-4000-8000-000000000055';
 event_before jsonb;
 camp_before jsonb;
 other_before jsonb;
 before_count jsonb;
 refused boolean:=false;
BEGIN
 SELECT to_jsonb(e) INTO event_before FROM private.world_boss_events_v17 e
 WHERE id=target_event_id;
 SELECT to_jsonb(w) INTO camp_before FROM private.world_boss_war_camps_v27 w
 WHERE w.event_id=target_event_id;
 SELECT private.world_boss_v36_erasure_preflight(target_account)
 INTO before_count;
 IF (before_count->>'requiresReconciliation')::boolean IS DISTINCT FROM true
 OR (before_count->>'externalReplayReviewRequired')::boolean IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'WB55_MISSING_PERSONAL_RECEIPT_PREFLIGHT'; END IF;
 -- Never allow direct Auth erasure while private FK-backed receipts exist.
 BEGIN
  DELETE FROM auth.users WHERE id=target_account;
 EXCEPTION WHEN foreign_key_violation THEN refused:=true; END;
 IF NOT refused THEN RAISE EXCEPTION 'WB55_DIRECT_AUTH_DELETE_BYPASSED_RESTRICT'; END IF;
 refused:=false;
 BEGIN
  PERFORM pg_temp.wb55_fixture_purge(target_account,false);
 EXCEPTION WHEN raise_exception THEN
  refused:=SQLERRM LIKE '%WB55_EXTERNAL_REPLAY_PURGE_REQUIRED%'; END;
 IF NOT refused THEN RAISE EXCEPTION 'WB55_PURGED_WITHOUT_EXTERNAL_REPLAY_ACK'; END IF;
 -- Simulated external purge acknowledgement is ONLY a fixture control.
 -- The true external object delete cannot be part of this SQL transaction.
 SELECT to_jsonb(a) INTO other_before FROM private.world_boss_attempts_v17 a
 WHERE event_id=target_event_id AND account_id=other_account;
 PERFORM pg_temp.wb55_fixture_purge(target_account,true);
 IF (SELECT private.world_boss_v36_erasure_preflight(target_account)->>'status')
    IS DISTINCT FROM 'no_world_boss_rows'
 THEN RAISE EXCEPTION 'WB55_PERSONAL_ROWS_REMAIN'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=target_account)
 OR EXISTS(SELECT 1 FROM public.characters WHERE account_id=target_account)
 THEN RAISE EXCEPTION 'WB55_ACCOUNT_OR_CHARACTER_NOT_ERASED'; END IF;
 IF (SELECT to_jsonb(e) FROM private.world_boss_events_v17 e WHERE id=target_event_id)
    IS DISTINCT FROM event_before
 OR (SELECT to_jsonb(w) FROM private.world_boss_war_camps_v27 w WHERE w.event_id=target_event_id)
    IS DISTINCT FROM camp_before
 THEN RAISE EXCEPTION 'WB55_COMMUNITY_PROGRESS_CHANGED'; END IF;
 IF (SELECT to_jsonb(a) FROM private.world_boss_attempts_v17 a
    WHERE event_id=target_event_id AND account_id=other_account)
    IS DISTINCT FROM other_before
 OR NOT EXISTS(SELECT 1 FROM private.world_boss_replay_proofs_v28
    WHERE event_id=target_event_id AND account_id=other_account)
 OR NOT EXISTS(SELECT 1 FROM private.world_boss_reward_ledger_v28
    WHERE event_id=target_event_id AND account_id=other_account)
 OR NOT EXISTS(SELECT 1 FROM private.world_boss_claim_receipts_v28
    WHERE event_id=target_event_id AND account_id=other_account)
 OR NOT EXISTS(SELECT 1 FROM private.world_boss_war_donations_v27
    WHERE event_id=target_event_id AND account_id=other_account)
 THEN RAISE EXCEPTION 'WB55_OTHER_PLAYER_DATA_WAS_CHANGED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM private.world_boss_milestones_v17
     WHERE event_id=target_event_id AND threshold=70
       AND crossed_by_account IS NULL AND crossed_by_request='REDACTED')
 THEN RAISE EXCEPTION 'WB55_MILESTONE_DUPLICATE_OR_IDENTITY_RETAINED'; END IF;
 -- Network retries must be harmless: no accounts recreated, no payouts,
 -- no community reversal and no personal rows reappearing.
 PERFORM pg_temp.wb55_fixture_purge(target_account,true);
 IF (SELECT to_jsonb(e) FROM private.world_boss_events_v17 e WHERE id=target_event_id)
    IS DISTINCT FROM event_before
 THEN RAISE EXCEPTION 'WB55_IDEMPOTENT_RETRY_CHANGED_EVENT'; END IF;
 RAISE NOTICE 'WORLD_BOSS_V55_DISPOSABLE_ACCOUNT_ERASURE_ORDER=PASS';
END
$assert$;
ROLLBACK;
