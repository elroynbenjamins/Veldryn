-- WORLD BOSS V57 — disposable PostgreSQL row-write/erasure fence smoke.
-- NEVER USE ON STAGING/PRODUCTION. All fixtures and changes ROLLBACK.
-- Requires the private V17/V20/V21/V27/V28 schemas, V36 preflight
-- and V57 write-fence contract to already exist.
BEGIN;

INSERT INTO auth.users(id) VALUES
 ('10000000-0000-4000-8000-000000000057'),
 ('10000000-0000-4000-8000-000000000058');
INSERT INTO public.characters(id,account_id) VALUES
 ('20000000-0000-4000-8000-000000000057',
  '10000000-0000-4000-8000-000000000057'),
 ('20000000-0000-4000-8000-000000000058',
  '10000000-0000-4000-8000-000000000058');
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp,revision)
VALUES('30000000-0000-4000-8000-000000000057','hollowroot','closed',
 '2036-02-04 00:00:00+00','2036-02-11 00:00:00+00',
 'wb57-fixture',100000,75000,2);
INSERT INTO private.world_boss_war_camps_v27(
 event_id,revision,fortifications,field_provisions,siegecraft,
 fort_tier1,fort_tier2,field_tier1,field_tier2,siege_tier1,siege_tier2)
VALUES('30000000-0000-4000-8000-000000000057',
 2,2,1,0,1,2,1,2,1,2);
INSERT INTO private.world_boss_war_recipes_v27(
 event_id,recipe_id,track,tier,materials)
VALUES('30000000-0000-4000-8000-000000000057',
 'WB57_SUPPLY','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":1}]'::jsonb);

INSERT INTO private.world_boss_attempts_v17(
 event_id,account_id,request_id,ordinal,character_id,war_order,phase,
 rules_version,engine_version,server_seed,squad_digest,frozen_squad,
 lease_owner,lease_expires_at,hard_expires_at)
VALUES
 ('30000000-0000-4000-8000-000000000057',
  '10000000-0000-4000-8000-000000000057',
  'WB57_ATTEMPT_OWNER',1,'20000000-0000-4000-8000-000000000057',
  'hold_line','armored','wb57-fixture','wb57-engine',
  repeat('S',32),repeat('a',64),
  jsonb_build_object('trustedFrozenRoster',repeat('X',160)),
  'WB57_OWNER_WORKER',clock_timestamp()+interval '2 minutes',
  clock_timestamp()+interval '15 minutes'),
 ('30000000-0000-4000-8000-000000000057',
  '10000000-0000-4000-8000-000000000058',
  'WB57_ATTEMPT_OTHER',1,'20000000-0000-4000-8000-000000000058',
  'hold_line','armored','wb57-fixture','wb57-engine',
  repeat('T',32),repeat('b',64),
  jsonb_build_object('trustedFrozenRoster',repeat('Y',160)),
  'WB57_OTHER_WORKER',clock_timestamp()+interval '2 minutes',
  clock_timestamp()+interval '15 minutes');
INSERT INTO private.world_boss_replay_proofs_v28(
 event_id,account_id,request_id,replay_digest,survived,
 boss_hp_damage,local_guard_damage,character_ledger,rounds_completed)
VALUES('30000000-0000-4000-8000-000000000057',
 '10000000-0000-4000-8000-000000000057',
 'WB57_ATTEMPT_OWNER',repeat('c',64),true,100,20,
 '[{"fixture":"owner"}]'::jsonb,14);
INSERT INTO private.world_boss_milestones_v17(
 event_id,threshold,crossed_by_account,crossed_by_request)
VALUES('30000000-0000-4000-8000-000000000057',
 70,'10000000-0000-4000-8000-000000000057','WB57_ATTEMPT_OWNER');
INSERT INTO private.world_boss_echo_consents_v20(
 event_id,owner_account_id,character_id,consent_revision,enabled,granted_at,expires_at)
VALUES('30000000-0000-4000-8000-000000000057',
 '10000000-0000-4000-8000-000000000057',
 '20000000-0000-4000-8000-000000000057',1,false,
 clock_timestamp(),clock_timestamp()+interval '1 day');
INSERT INTO private.world_boss_consent_commands_v21(
 event_id,owner_account_id,request_id,character_id,enabled,
 expected_revision,resulting_revision,receipt)
VALUES('30000000-0000-4000-8000-000000000057',
 '10000000-0000-4000-8000-000000000057','WB57_CONSENT_OWNER',
 '20000000-0000-4000-8000-000000000057',
 false,0,1,'{"repeated":false}'::jsonb);
INSERT INTO private.world_boss_war_donations_v27(
 event_id,account_id,request_id,character_id,recipe_id,track,
 ordinal,paid_materials,revision)
VALUES('30000000-0000-4000-8000-000000000057',
 '10000000-0000-4000-8000-000000000057',
 'WB57_SUPPLY_OWNER','20000000-0000-4000-8000-000000000057',
 'WB57_SUPPLY','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":1}]'::jsonb,1);
INSERT INTO private.world_boss_wallet_v28(account_id,balance,revision)
VALUES('10000000-0000-4000-8000-000000000057',10,1),
 ('10000000-0000-4000-8000-000000000058',5,1);
INSERT INTO private.world_boss_reward_ledger_v28(
 event_id,account_id,source_key,amount)
VALUES('30000000-0000-4000-8000-000000000057',
 '10000000-0000-4000-8000-000000000057','battle:1',10);
INSERT INTO private.world_boss_claim_receipts_v28(
 event_id,account_id,request_id,amount,balance_after,account_revision)
VALUES('30000000-0000-4000-8000-000000000057',
 '10000000-0000-4000-8000-000000000057',
 'WB57_CLAIM_OWNER',10,10,1);

DO $test$
DECLARE
 owner uuid:='10000000-0000-4000-8000-000000000057';
 other_owner uuid:='10000000-0000-4000-8000-000000000058';
 event_key uuid:='30000000-0000-4000-8000-000000000057';
 blocked boolean;
 targets text[][]:=ARRAY[
  ARRAY['world_boss_attempts_v17','account_id'],
  ARRAY['world_boss_milestones_v17','crossed_by_account'],
  ARRAY['world_boss_echo_consents_v20','owner_account_id'],
  ARRAY['world_boss_consent_commands_v21','owner_account_id'],
  ARRAY['world_boss_war_donations_v27','account_id'],
  ARRAY['world_boss_replay_proofs_v28','account_id'],
  ARRAY['world_boss_wallet_v28','account_id'],
  ARRAY['world_boss_reward_ledger_v28','account_id'],
  ARRAY['world_boss_claim_receipts_v28','account_id']
 ];
 n integer;
 ev_before jsonb;
 camp_before jsonb;
 other_before bigint;
BEGIN
 IF has_table_privilege('anon','private.world_boss_erasure_fences_v57','SELECT')
 OR has_table_privilege('authenticated',
     'private.world_boss_erasure_fences_v57','INSERT')
 OR has_table_privilege('service_role',
     'private.world_boss_erasure_fences_v57','UPDATE')
 OR NOT has_table_privilege('service_role',
     'private.world_boss_erasure_fences_v57','SELECT')
 THEN RAISE EXCEPTION 'WB57_FENCE_ROLE_PRIVILEGES_UNSAFE'; END IF;
 SELECT count(*) INTO n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace ns ON ns.oid=c.relnamespace
 WHERE ns.nspname='private' AND c.relname LIKE 'world_boss_%'
 AND t.tgname LIKE 'world_boss_v57_%_owner_write'
 AND NOT t.tgisinternal;
 IF n<>9 THEN RAISE EXCEPTION 'WB57_NOT_ALL_NINE_WRITES_FENCED: %',n; END IF;
 -- The V36 review must recognize the one known privacy tombstone, but not
 -- accidentally allow some unknown account-link column or table.
 IF (private.world_boss_v36_erasure_preflight(owner)->>'requiresReconciliation')::boolean
    IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'WB57_V36_PRIVACY_FENCE_SCHEMA_DRIFT'; END IF;

 -- Premature redaction of a shared milestone without a deletion fence
 -- is forbidden, so no system can erase crossing identity arbitrarily.
 blocked:=false;
 BEGIN
  UPDATE private.world_boss_milestones_v17 SET
   crossed_by_account=NULL,crossed_by_request='REDACTED'
  WHERE event_id=event_key AND threshold=70;
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB57_MILESTONE_REDACTION_REQUIRES_FENCE%';
 END;
 IF NOT blocked THEN
  RAISE EXCEPTION 'WB57_MILESTONE_REDACTION_ALLOWED_BEFORE_FENCE'; END IF;

 SELECT to_jsonb(e) INTO ev_before FROM private.world_boss_events_v17 e
 WHERE id=event_key;
 SELECT to_jsonb(w) INTO camp_before FROM private.world_boss_war_camps_v27 w
 WHERE event_id=event_key;
 SELECT balance INTO other_before FROM private.world_boss_wallet_v28
 WHERE account_id=other_owner;

 -- This INSERT itself obtains the SAME advisory transaction lock used
 -- by every monitored personal write, including absent-row races.
 INSERT INTO private.world_boss_erasure_fences_v57(account_id) VALUES(owner);
 IF NOT EXISTS(SELECT 1 FROM private.world_boss_erasure_fences_v57
    WHERE account_id=owner AND status='blocked')
 THEN RAISE EXCEPTION 'WB57_FENCE_NOT_CREATED'; END IF;
 FOR n IN 1..9 LOOP
  blocked:=false;
  BEGIN
   -- Duplicate primary keys are deliberate: BEFORE INSERT account guards
   -- must reject first, before any constraint can allow another receipt.
   EXECUTE format('INSERT INTO private.%I SELECT * FROM private.%I WHERE %I=$1 LIMIT 1',
    targets[n][1],targets[n][1],targets[n][2]) USING owner;
  EXCEPTION WHEN raise_exception THEN
   blocked:=SQLERRM LIKE '%WB57_ACCOUNT_ERASURE_FENCED%';
  END;
  IF NOT blocked THEN
   RAISE EXCEPTION 'WB57_OWNER_WRITE_BYPASSED: %',targets[n][1]; END IF;
 END LOOP;
 blocked:=false;
 BEGIN
  UPDATE private.world_boss_wallet_v28 SET balance=balance+1
  WHERE account_id=owner;
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB57_ACCOUNT_ERASURE_FENCED%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB57_WALLET_UPDATE_BYPASSED'; END IF;
 blocked:=false;
 BEGIN
  UPDATE private.world_boss_wallet_v28 SET account_id=other_owner
  WHERE account_id=owner;
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB57_ACCOUNT_OWNER_REASSIGNMENT_FORBIDDEN%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB57_OWNER_REASSIGNMENT_BYPASSED'; END IF;

 -- When erasure is actually approved, milestone de-identification is
 -- allowed AFTER the fence, while its global threshold stays crossed.
 UPDATE private.world_boss_milestones_v17 SET
  crossed_by_account=NULL,crossed_by_request='REDACTED'
 WHERE event_id=event_key AND threshold=70;
 IF NOT EXISTS(SELECT 1 FROM private.world_boss_milestones_v17
  WHERE event_id=event_key AND threshold=70
   AND crossed_by_account IS NULL AND crossed_by_request='REDACTED')
 THEN RAISE EXCEPTION 'WB57_MILESTONE_GLOBAL_FACT_LOST'; END IF;

 UPDATE private.world_boss_wallet_v28 SET balance=balance+1
 WHERE account_id=other_owner;
 IF (SELECT balance FROM private.world_boss_wallet_v28
     WHERE account_id=other_owner)<>other_before+1
 THEN RAISE EXCEPTION 'WB57_OTHER_ACCOUNT_UNNECESSARILY_FENCED'; END IF;

 -- A real V28 claim must also be blocked by the wallet/ledger/claim
 -- trigger boundary, even if the trusted worker runs after the fence.
 blocked:=false;
 BEGIN
  PERFORM private.world_boss_v28_claim(event_key,owner,'WB57_CLAIM_FORBIDDEN');
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB57_ACCOUNT_ERASURE_FENCED%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB57_CLAIM_AFTER_ERASURE_ALLOWED'; END IF;

 IF (SELECT to_jsonb(e) FROM private.world_boss_events_v17 e WHERE id=event_key)
    IS DISTINCT FROM ev_before
 OR (SELECT to_jsonb(w) FROM private.world_boss_war_camps_v27 w
    WHERE event_id=event_key) IS DISTINCT FROM camp_before
 THEN RAISE EXCEPTION 'WB57_SHARED_PROGRESS_CHANGED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM private.world_boss_attempts_v17
    WHERE event_id=event_key AND account_id=other_owner)
 THEN RAISE EXCEPTION 'WB57_OTHER_ACCOUNT_RECEIPT_LOST'; END IF;

 -- An erasure fence cannot be removed while its Auth user is still alive.
 blocked:=false;
 BEGIN
  DELETE FROM private.world_boss_erasure_fences_v57 WHERE account_id=owner;
 EXCEPTION WHEN raise_exception THEN
  blocked:=SQLERRM LIKE '%WB57_CANNOT_UNFENCE_EXISTING_AUTH_ACCOUNT%';
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'WB57_PREMATURE_UNFENCE_ALLOWED'; END IF;

 -- Integrated V55/V57 cleanup ordering, still ONLY synthetic DB fixtures:
 -- neither object store deletion nor actual Supabase Admin Auth is invoked.
 -- The committed fence remains in place throughout child-before-parent
 -- erasure. Row guards must reject writes but permit legitimate cleanup.
 DELETE FROM private.world_boss_replay_proofs_v28 WHERE account_id=owner;
 DELETE FROM private.world_boss_claim_receipts_v28 WHERE account_id=owner;
 DELETE FROM private.world_boss_reward_ledger_v28 WHERE account_id=owner;
 DELETE FROM private.world_boss_wallet_v28 WHERE account_id=owner;
 DELETE FROM private.world_boss_war_donations_v27 WHERE account_id=owner;
 DELETE FROM private.world_boss_consent_commands_v21 WHERE owner_account_id=owner;
 DELETE FROM private.world_boss_echo_consents_v20 WHERE owner_account_id=owner;
 DELETE FROM private.world_boss_attempts_v17 WHERE account_id=owner;
 IF (private.world_boss_v36_erasure_preflight(owner)->>'status')
    IS DISTINCT FROM 'no_world_boss_rows'
 THEN RAISE EXCEPTION 'WB57_PRIVATE_ACCOUNT_ROW_ERASURE_INCOMPLETE'; END IF;
 DELETE FROM auth.users WHERE id=owner;
 -- Once the fixture user is gone, the reviewed privacy retention owner
 -- could remove its tombstone; this tests the invariant, NOT retention policy.
 DELETE FROM private.world_boss_erasure_fences_v57 WHERE account_id=owner;
 IF EXISTS(SELECT 1 FROM private.world_boss_erasure_fences_v57
     WHERE account_id=owner)
 OR EXISTS(SELECT 1 FROM public.characters WHERE account_id=owner)
 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=other_owner)
 OR NOT EXISTS(SELECT 1 FROM private.world_boss_wallet_v28
     WHERE account_id=other_owner)
 OR NOT EXISTS(SELECT 1 FROM private.world_boss_attempts_v17
     WHERE event_id=event_key AND account_id=other_owner)
 THEN RAISE EXCEPTION 'WB57_ERASURE_DAMAGED_OTHER_OWNER_OR_TOMBSTONE'; END IF;
 IF (SELECT to_jsonb(e) FROM private.world_boss_events_v17 e WHERE id=event_key)
    IS DISTINCT FROM ev_before
 OR (SELECT to_jsonb(w) FROM private.world_boss_war_camps_v27 w
     WHERE event_id=event_key) IS DISTINCT FROM camp_before
 THEN RAISE EXCEPTION 'WB57_ERASURE_CHANGED_COMMUNITY_PROGRESS'; END IF;
 RAISE NOTICE 'WORLD_BOSS_V57_NINE_OWNER_WRITE_FENCES_AND_ERASURE=PASS';
END $test$;
ROLLBACK;
-- Under REPEATABLE READ a transaction could see a snapshot from before
-- the erasure marker even after waiting on the advisory lock; fail closed.
BEGIN ISOLATION LEVEL REPEATABLE READ;
DO $isolation$
DECLARE rejected boolean:=false;
BEGIN
 BEGIN
  PERFORM private.world_boss_v57_assert_write_open(
   '10000000-0000-4000-8000-000000000057'::uuid);
 EXCEPTION WHEN raise_exception THEN
  rejected:=SQLERRM LIKE '%WB57_READ_COMMITTED_REQUIRED%';
 END;
 IF NOT rejected THEN
  RAISE EXCEPTION 'WB57_REPEATABLE_READ_SNAPSHOT_BYPASS';
 END IF;
 RAISE NOTICE 'WORLD_BOSS_V57_NON_READ_COMMITTED_REJECTED=PASS';
END $isolation$;
ROLLBACK;
