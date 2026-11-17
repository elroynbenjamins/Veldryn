-- V36 disposable PostgreSQL account-erasure preflight smoke.
-- Synthetic owner only; all inserts and temporary table creation ROLLBACK.
-- No account erasure, no wallet credits and no staging/production connection.
BEGIN;
DO $check$
DECLARE
 data jsonb;
 owner uuid:='10000000-0000-4000-8000-000000000036';
 refused boolean;
BEGIN
 IF has_function_privilege('anon',
    'private.world_boss_v36_erasure_preflight(uuid)','EXECUTE')
 OR has_function_privilege('authenticated',
    'private.world_boss_v36_erasure_preflight(uuid)','EXECUTE')
 OR NOT has_function_privilege('service_role',
    'private.world_boss_v36_erasure_preflight(uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'WB36_ERASURE_PREFLIGHT_PUBLIC_EXECUTE'; END IF;
 data:=private.world_boss_v36_erasure_preflight(owner);
 IF data->>'status'<>'no_world_boss_rows'
 OR (data->>'requiresReconciliation')::boolean
 THEN RAISE EXCEPTION 'WB36_EMPTY_PREFLIGHT_WRONG: %',data; END IF;
 refused:=false;
 BEGIN
  PERFORM private.world_boss_v36_erasure_preflight(NULL);
 EXCEPTION WHEN raise_exception THEN
  refused:=SQLERRM LIKE '%WB36_ACCOUNT_REQUIRED%';
 END;
 IF NOT refused THEN RAISE EXCEPTION 'WB36_MISSING_ACCOUNT_ALLOWED'; END IF;
END $check$;

INSERT INTO auth.users(id)
 VALUES('10000000-0000-4000-8000-000000000036');
INSERT INTO public.characters(id,account_id)
 VALUES('20000000-0000-4000-8000-000000000036',
        '10000000-0000-4000-8000-000000000036');
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
 VALUES('30000000-0000-4000-8000-000000000036',
  'hollowroot','draft',now(),now()+interval '7 days',
  'wb36-fixture',100000,100000);
INSERT INTO private.world_boss_attempts_v17(
 event_id,account_id,request_id,ordinal,character_id,war_order,phase,
 rules_version,engine_version,server_seed,squad_digest,frozen_squad,
 lease_owner,lease_expires_at,hard_expires_at)
 VALUES(
 '30000000-0000-4000-8000-000000000036',
 '10000000-0000-4000-8000-000000000036',
 'WB36_TEST_ATTEMPT_1',1,
 '20000000-0000-4000-8000-000000000036',
 'hold_line','armored','wb36-fixture','wb36-prototype',
 repeat('S',32),repeat('a',64),
 jsonb_build_object('trustedFrozenRoster',repeat('X',160)),
 'WB36_TEST_WORKER',clock_timestamp()+interval '2 minutes',
 clock_timestamp()+interval '15 minutes');
INSERT INTO private.world_boss_replay_proofs_v28(
 event_id,account_id,request_id,replay_digest,survived,
 boss_hp_damage,local_guard_damage,character_ledger,rounds_completed)
 VALUES(
 '30000000-0000-4000-8000-000000000036',
 '10000000-0000-4000-8000-000000000036',
 'WB36_TEST_ATTEMPT_1',repeat('a',64),true,
 100,20,'[{"character":"fixture"}]'::jsonb,14);
INSERT INTO private.world_boss_milestones_v17(
 event_id,threshold,crossed_by_account,crossed_by_request)
 VALUES('30000000-0000-4000-8000-000000000036',70,
 '10000000-0000-4000-8000-000000000036','WB36_CROSSING');
INSERT INTO private.world_boss_war_camps_v27(
 event_id,fort_tier1,fort_tier2,field_tier1,field_tier2,
 siege_tier1,siege_tier2)
 VALUES('30000000-0000-4000-8000-000000000036',1,2,1,2,1,2);
INSERT INTO private.world_boss_war_recipes_v27(
 event_id,recipe_id,track,tier,materials)
 VALUES('30000000-0000-4000-8000-000000000036',
 'WB36_TEST_RECIPE','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":1}]'::jsonb);
INSERT INTO private.world_boss_war_donations_v27(
 event_id,account_id,request_id,character_id,recipe_id,track,
 ordinal,paid_materials,revision)
 VALUES('30000000-0000-4000-8000-000000000036',
 '10000000-0000-4000-8000-000000000036',
 'WB36_TEST_DONATION_1',
 '20000000-0000-4000-8000-000000000036',
 'WB36_TEST_RECIPE','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":1}]'::jsonb,1);
INSERT INTO private.world_boss_wallet_v28(account_id,balance,revision)
 VALUES('10000000-0000-4000-8000-000000000036',5,1);
INSERT INTO private.world_boss_reward_ledger_v28(
 event_id,account_id,source_key,amount)
 VALUES('30000000-0000-4000-8000-000000000036',
 '10000000-0000-4000-8000-000000000036','battle:1',5);
INSERT INTO private.world_boss_claim_receipts_v28(
 event_id,account_id,request_id,amount,balance_after,account_revision)
 VALUES('30000000-0000-4000-8000-000000000036',
 '10000000-0000-4000-8000-000000000036',
 'WB36_TEST_CLAIM_1',5,5,1);

DO $check$
DECLARE
 data jsonb;
 owner uuid:='10000000-0000-4000-8000-000000000036';
BEGIN
 data:=private.world_boss_v36_erasure_preflight(owner);
 IF data->>'status'<>'blocked_pending_reconciliation'
 OR (data->>'requiresReconciliation')::boolean IS DISTINCT FROM true
 OR (data->>'externalReplayReviewRequired')::boolean IS DISTINCT FROM true
 OR (data#>>'{counts,attempts}')::bigint<>1
 OR (data#>>'{counts,milestones}')::bigint<>1
 OR (data#>>'{counts,donations}')::bigint<>1
 OR (data#>>'{counts,replays}')::bigint<>1
 OR (data#>>'{counts,walletRows}')::bigint<>1
 OR (data#>>'{counts,rewardLedgerEntries}')::bigint<>1
 OR (data#>>'{counts,claimReceipts}')::bigint<>1
 OR data::text LIKE '%'||owner::text||'%'
 THEN RAISE EXCEPTION 'WB36_ACCOUNT_ERASURE_PREFLIGHT_MISMATCH: %',data; END IF;
END $check$;

-- An unreviewed account data table must never produce a false 'safe' signal.
CREATE TABLE private.world_boss_v36_unreviewed_account_data(
 account_id uuid NOT NULL
);
DO $check$
DECLARE refused boolean:=false;
BEGIN
 BEGIN
  PERFORM private.world_boss_v36_erasure_preflight(
   '10000000-0000-4000-8000-000000000036');
 EXCEPTION WHEN raise_exception THEN
  refused:=SQLERRM LIKE '%WB36_UNREVIEWED_ACCOUNT_DATA%';
 END;
 IF NOT refused THEN RAISE EXCEPTION 'WB36_SCHEMA_DRIFT_WAS_IGNORED'; END IF;
 -- A newly added identity column in an already known table is also
 -- schema drift: checking only the table names would miss it.
 DROP TABLE private.world_boss_v36_unreviewed_account_data;
 ALTER TABLE private.world_boss_wallet_v28 ADD COLUMN owner_account_id uuid;
 refused:=false;
 BEGIN
  PERFORM private.world_boss_v36_erasure_preflight(
   '10000000-0000-4000-8000-000000000036');
 EXCEPTION WHEN raise_exception THEN
  refused:=SQLERRM LIKE '%WB36_UNREVIEWED_ACCOUNT_DATA%';
 END;
 IF NOT refused THEN RAISE EXCEPTION 'WB36_COLUMN_DRIFT_WAS_IGNORED'; END IF;
 RAISE NOTICE 'WORLD_BOSS_V36_ACCOUNT_ERASURE_PREFLIGHT=PASS';
END $check$;
ROLLBACK;
