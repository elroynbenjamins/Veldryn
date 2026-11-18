-- World Boss V38 schedule safety regression, disposable PostgreSQL only.
-- No real account IDs, real inventory, production migration or public route.
-- Malformed 7-day windows must not debit a material, increment save revision,
-- or create a War Camp receipt. Compatible with any runner weekday.
BEGIN;
CREATE TABLE IF NOT EXISTS public.online_game_states(
 account_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 character_id uuid UNIQUE REFERENCES public.characters(id),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>=0),
 state jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO auth.users(id)
 VALUES('10000000-0000-4000-8000-000000000038');
INSERT INTO public.characters(id,account_id)
 VALUES('20000000-0000-4000-8000-000000000038',
        '10000000-0000-4000-8000-000000000038');
INSERT INTO public.online_game_states(account_id,character_id,revision,state)
VALUES('10000000-0000-4000-8000-000000000038',
 '20000000-0000-4000-8000-000000000038',1,
 '{"character":{"id":"20000000-0000-4000-8000-000000000038"},
   "inventory":{"capacity":30,"stacks":[
     {"itemId":"GREENWOOD_LOG","quantity":140},
     {"itemId":"COPPER_INGOT","quantity":24}]}}'::jsonb);
-- Case A: Tuesday 00:00 UTC; case B: Monday 07:00 UTC.
-- Both are 7-day events but cannot yield an authorized Sat/Sun raid.
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
SELECT event_id,'hollowroot','active',started,
 started+interval '7 days','wb38-fixture',100000,100000
FROM (
 SELECT '30000000-0000-4000-8000-000000000038'::uuid event_id,
  ((date_trunc('week',clock_timestamp() AT TIME ZONE 'UTC')
     AT TIME ZONE 'UTC')+interval '1 day') started
 UNION ALL
 SELECT '30000000-0000-4000-8000-000000000039'::uuid,
  ((date_trunc('week',clock_timestamp() AT TIME ZONE 'UTC')
     AT TIME ZONE 'UTC')+interval '7 hours')
) bad;
INSERT INTO private.world_boss_war_camps_v27(
 event_id,fort_tier1,fort_tier2,field_tier1,field_tier2,
 siege_tier1,siege_tier2)
VALUES
 ('30000000-0000-4000-8000-000000000038',1,2,1,2,1,2),
 ('30000000-0000-4000-8000-000000000039',1,2,1,2,1,2);
INSERT INTO private.world_boss_war_recipes_v27(
 event_id,recipe_id,track,tier,materials)
VALUES
 ('30000000-0000-4000-8000-000000000038',
  'WB38_SUPPLY','fortifications',1,
  '[{"itemId":"GREENWOOD_LOG","quantity":70},
    {"itemId":"COPPER_INGOT","quantity":12}]'::jsonb),
 ('30000000-0000-4000-8000-000000000039',
  'WB38_SUPPLY','fortifications',1,
  '[{"itemId":"GREENWOOD_LOG","quantity":70},
    {"itemId":"COPPER_INGOT","quantity":12}]'::jsonb);
DO $test$
DECLARE
 acct uuid:='10000000-0000-4000-8000-000000000038';
 ch uuid:='20000000-0000-4000-8000-000000000038';
 ev uuid;
 first_state jsonb;
 last_state jsonb;
 first_revision bigint;
 last_revision bigint;
 msg text;
BEGIN
 SELECT state,revision INTO first_state,first_revision
 FROM public.online_game_states WHERE account_id=acct;
 FOR ev IN SELECT id FROM private.world_boss_events_v17
  WHERE id IN('30000000-0000-4000-8000-000000000038'::uuid,
              '30000000-0000-4000-8000-000000000039'::uuid)
  ORDER BY id LOOP
  msg:='';
  BEGIN
   PERFORM private.world_boss_v27_donate(
     ev,acct,ch,'WB38_INVALID_SCHEDULE','WB38_SUPPLY');
  EXCEPTION WHEN raise_exception THEN msg:=SQLERRM; END;
  IF msg NOT LIKE '%WB27_INVALID_EVENT_SCHEDULE%'
  THEN RAISE EXCEPTION 'WB38_BAD_SCHEDULE_ACCEPTED: %',msg; END IF;
  IF EXISTS(SELECT 1 FROM private.world_boss_war_donations_v27
    WHERE event_id=ev AND account_id=acct)
  THEN RAISE EXCEPTION 'WB38_BAD_SCHEDULE_CREATED_DONATION'; END IF;
  IF EXISTS(SELECT 1 FROM private.world_boss_war_camps_v27
    WHERE event_id=ev AND revision<>0)
  THEN RAISE EXCEPTION 'WB38_BAD_SCHEDULE_INCREASED_CAMP'; END IF;
 END LOOP;
 SELECT state,revision INTO last_state,last_revision
 FROM public.online_game_states WHERE account_id=acct;
 IF last_state IS DISTINCT FROM first_state
    OR last_revision IS DISTINCT FROM first_revision
 THEN RAISE EXCEPTION 'WB38_BAD_SCHEDULE_CONSUMED_RESOURCES'; END IF;
 RAISE NOTICE 'WORLD_BOSS_V38_PREPARATION_CALENDAR_PROTECTION=PASS';
END
$test$;
ROLLBACK;
