-- V34: World Boss history must never permanently block character deletion.
-- Disposable PostgreSQL TEST DB only. All synthetic rows ROLLBACK.
-- V18/V22 reservation and V27 donation still verify account ownership BEFORE
-- accepting an event; immutable historical receipts intentionally keep UUIDs
-- after a character is deleted. This must never mint a new reward or attempt.
BEGIN;
INSERT INTO auth.users(id) VALUES
 ('10000000-0000-4000-8000-000000000034');
INSERT INTO public.characters(id,account_id) VALUES
 ('20000000-0000-4000-8000-000000000034',
  '10000000-0000-4000-8000-000000000034');
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
SELECT '30000000-0000-4000-8000-000000000034',
 'hollowroot','draft',s,s+interval '7 days',
 'wb34-fixture',100000,100000
FROM (SELECT clock_timestamp() AS s) t;
INSERT INTO private.world_boss_attempts_v17(
 event_id,account_id,request_id,ordinal,character_id,war_order,phase,
 rules_version,engine_version,server_seed,squad_digest,frozen_squad,
 lease_owner,lease_expires_at,hard_expires_at)
VALUES(
 '30000000-0000-4000-8000-000000000034',
 '10000000-0000-4000-8000-000000000034',
 'WB34_TEST_BATTLE_1',1,
 '20000000-0000-4000-8000-000000000034',
 'hold_line','armored','wb34-fixture','wb34-prototype',
 repeat('S',32),repeat('a',64),
 jsonb_build_object('trustedFrozenRoster',repeat('X',160)),
 'WB34_TEST_WORKER',clock_timestamp()+interval '2 minutes',
 clock_timestamp()+interval '15 minutes'
);
INSERT INTO private.world_boss_war_camps_v27(
 event_id,fort_tier1,fort_tier2,field_tier1,field_tier2,
 siege_tier1,siege_tier2)
VALUES('30000000-0000-4000-8000-000000000034',1,2,1,2,1,2);
INSERT INTO private.world_boss_war_recipes_v27(
 event_id,recipe_id,track,tier,materials)
VALUES('30000000-0000-4000-8000-000000000034',
 'WB34_TEST_RECIPE','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":1}]'::jsonb);
INSERT INTO private.world_boss_war_donations_v27(
 event_id,account_id,request_id,character_id,recipe_id,track,
 ordinal,paid_materials,revision)
VALUES(
 '30000000-0000-4000-8000-000000000034',
 '10000000-0000-4000-8000-000000000034',
 'WB34_TEST_DONATION_1',
 '20000000-0000-4000-8000-000000000034',
 'WB34_TEST_RECIPE','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":1}]'::jsonb,1);

DO $test$
DECLARE
 v_char uuid:='20000000-0000-4000-8000-000000000034';
BEGIN
 IF EXISTS (
  SELECT 1 FROM pg_constraint
  WHERE confrelid='public.characters'::regclass
    AND conrelid IN (
      'private.world_boss_attempts_v17'::regclass,
      'private.world_boss_war_donations_v27'::regclass)
 ) THEN RAISE EXCEPTION 'WB34_CHARACTER_RESTRICT_FK_STILL_PRESENT'; END IF;
 DELETE FROM public.characters WHERE id=v_char;
 IF EXISTS(SELECT 1 FROM public.characters WHERE id=v_char)
 THEN RAISE EXCEPTION 'WB34_CHARACTER_DELETION_FAILED'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM private.world_boss_attempts_v17
  WHERE event_id='30000000-0000-4000-8000-000000000034'::uuid
    AND account_id='10000000-0000-4000-8000-000000000034'::uuid
    AND character_id=v_char)
 THEN RAISE EXCEPTION 'WB34_ATTEMPT_HISTORY_LOST'; END IF;
 IF NOT EXISTS(
  SELECT 1 FROM private.world_boss_war_donations_v27
  WHERE event_id='30000000-0000-4000-8000-000000000034'::uuid
    AND account_id='10000000-0000-4000-8000-000000000034'::uuid
    AND character_id=v_char)
 THEN RAISE EXCEPTION 'WB34_DONATION_HISTORY_LOST'; END IF;
 RAISE NOTICE 'WORLD_BOSS_V34_CHARACTER_DELETE_COMPATIBILITY=PASS';
END
$test$;
ROLLBACK;
