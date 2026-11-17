-- V41 read-only overview integration. Disposable PostgreSQL only.
-- Synthetic accounts; all data below is ROLLBACKed, no Supabase connections.
BEGIN;
INSERT INTO auth.users(id) VALUES
 ('10000000-0000-4000-8000-000000000041'),
 ('10000000-0000-4000-8000-000000000042');
INSERT INTO public.characters(id,account_id) VALUES
 ('20000000-0000-4000-8000-000000000041',
  '10000000-0000-4000-8000-000000000041');
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
SELECT '30000000-0000-4000-8000-000000000041',
 'hollowroot','active',s,s+interval '7 days','wb41-fixture',100000,91000
FROM (SELECT date_trunc('week',statement_timestamp() AT TIME ZONE 'UTC')
 AT TIME ZONE 'UTC' AS s) t;
INSERT INTO private.world_boss_war_camps_v27(
 event_id,revision,fortifications,fort_tier1,fort_tier2,
 field_tier1,field_tier2,siege_tier1,siege_tier2)
VALUES('30000000-0000-4000-8000-000000000041',1,1,1,3,1,3,1,3);
INSERT INTO private.world_boss_war_recipes_v27(
 event_id,recipe_id,tier,track,materials)
VALUES('30000000-0000-4000-8000-000000000041',
 'T1_FORTIFICATIONS',1,'fortifications',
 '[{"itemId":"GREENWOOD_LOG","quantity":70},
   {"itemId":"COPPER_INGOT","quantity":12}]'::jsonb);
INSERT INTO private.world_boss_war_donations_v27(
 event_id,account_id,character_id,request_id,recipe_id,track,
 ordinal,paid_materials,revision)
VALUES('30000000-0000-4000-8000-000000000041',
 '10000000-0000-4000-8000-000000000041',
 '20000000-0000-4000-8000-000000000041',
 'WB41_DONATE_0001','T1_FORTIFICATIONS','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":70},
   {"itemId":"COPPER_INGOT","quantity":12}]'::jsonb,1);
INSERT INTO private.world_boss_attempts_v17(
 event_id,account_id,request_id,ordinal,character_id,
 status,war_order,phase,rules_version,engine_version,server_seed,
 squad_digest,frozen_squad,reserved_at,lease_generation,
 lease_owner,lease_expires_at,hard_expires_at)
VALUES('30000000-0000-4000-8000-000000000041',
 '10000000-0000-4000-8000-000000000041','WB41_RAID_0001',1,
 '20000000-0000-4000-8000-000000000041',
 'reserved','steady_assault','armored','wb41-fixture','wb41-synthetic',
 repeat('S',32),repeat('a',64),
 jsonb_build_object('fixture','untrusted dummy','padding',repeat('x',180)),
 clock_timestamp(),1,'WB41_WORKER_001',
 clock_timestamp()+interval '2 minutes',
 clock_timestamp()+interval '5 minutes');
INSERT INTO private.world_boss_wallet_v28(account_id,balance,revision)
VALUES('10000000-0000-4000-8000-000000000041',25,2);
INSERT INTO private.world_boss_reward_ledger_v28(
 event_id,account_id,source_key,amount)
VALUES('30000000-0000-4000-8000-000000000041',
 '10000000-0000-4000-8000-000000000041','supply:1',5);
DO $verify$
DECLARE
 event_key uuid:='30000000-0000-4000-8000-000000000041';
 a uuid:='10000000-0000-4000-8000-000000000041';
 b uuid:='10000000-0000-4000-8000-000000000042';
 mine jsonb;
 foreign_view jsonb;
 before_state jsonb;
 after_state jsonb;
 before_revision bigint;
 after_revision bigint;
 expected_phase text;
BEGIN
 IF has_function_privilege('anon',
   'private.world_boss_v41_overview(uuid,uuid)','EXECUTE') OR
    has_function_privilege('authenticated',
   'private.world_boss_v41_overview(uuid,uuid)','EXECUTE') OR
    NOT has_function_privilege('service_role',
   'private.world_boss_v41_overview(uuid,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'WB41_PRIVATE_GRANTS_INVALID'; END IF;
 SELECT to_jsonb(e),e.revision INTO before_state,before_revision
 FROM private.world_boss_events_v17 e WHERE id=event_key;
 mine:=private.world_boss_v41_overview(event_key,a);
 foreign_view:=private.world_boss_v41_overview(event_key,b);
 expected_phase:=CASE
  WHEN extract(isodow FROM statement_timestamp() AT TIME ZONE 'UTC')<6
   THEN 'preparation' ELSE 'raid' END;
 IF mine->>'accountId' IS DISTINCT FROM a::text OR
    mine->>'phase' IS DISTINCT FROM expected_phase OR
    (mine->>'attemptsUsed')::integer<>1 OR
    (mine->>'attemptsReserved')::integer<>1 OR
    (mine->>'attemptsCommitted')::integer<>0 OR
    (mine->>'donationsUsed')::integer<>1 OR
    (mine->>'maxHp')::integer<>100000 OR
    (mine->>'remainingHp')::integer<>91000 OR
    (mine->'warCamp'->>'revision')::integer<>1 OR
    (mine->'rewards'->>'claimedThisEvent')::integer<>5 OR
    (mine->'rewards'->>'balance')::integer<>25
 THEN RAISE EXCEPTION 'WB41_ACCOUNT_OVERVIEW_INCORRECT %',mine; END IF;
 IF (foreign_view->>'attemptsUsed')::integer<>0 OR
    (foreign_view->>'donationsUsed')::integer<>0 OR
    (foreign_view->'rewards'->>'claimedThisEvent')::integer<>0 OR
    (foreign_view->'rewards'->>'balance')::integer<>0 OR
    foreign_view->>'accountId' IS DISTINCT FROM b::text
 THEN RAISE EXCEPTION 'WB41_CROSS_ACCOUNT_LEAK %',foreign_view; END IF;
 SELECT to_jsonb(e),e.revision INTO after_state,after_revision
 FROM private.world_boss_events_v17 e WHERE id=event_key;
 IF before_state IS DISTINCT FROM after_state OR
    before_revision IS DISTINCT FROM after_revision
 THEN RAISE EXCEPTION 'WB41_READ_MUTATED_EVENT'; END IF;
 RAISE NOTICE 'WORLD_BOSS_V41_ACCOUNT_READ_ONLY_INTEGRATION=PASS';
END
$verify$;
ROLLBACK;
