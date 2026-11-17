-- V27: disposable Postgres 16 War Camp integration smoke ONLY.
-- Run after V17/V18/V22/V26. Never import real players, never deploy.
-- Uses the ACTUAL UTC clock in the SQL functions (no test-time override).
-- Pre-Saturday test: exact inventory debits/receipts; weekend test: freeze.
BEGIN;
CREATE TABLE IF NOT EXISTS public.online_game_states(
 account_id uuid NOT NULL REFERENCES auth.users(id),
 character_id uuid NOT NULL REFERENCES public.characters(id),
 revision bigint NOT NULL DEFAULT 1,
 state jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(account_id,character_id)
);
INSERT INTO public.online_game_states(account_id,character_id,revision,state)
VALUES(
 '10000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000001',1,
 '{"inventory":{"stacks":[
  {"itemId":"GREENWOOD_LOG","quantity":150},
  {"itemId":"COPPER_INGOT","quantity":30},
  {"itemId":"DEWLEAF","quantity":100},
  {"itemId":"COOKED_MEADOW_PERCH","quantity":24},
  {"itemId":"COPPER_ORE","quantity":30},
  {"itemId":"GREENWOOD_LOG","quantity":1,"instanceId":"test-unique-protected"}
 ]},"bank":{"stacks":[{"itemId":"GREENWOOD_LOG","quantity":200}]}}'
);
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
SELECT '30000000-0000-4000-8000-000000000027','hollowroot','active',
 week_start,week_start+interval '7 days',
 'wb27-private-fixture',1000000,1000000
FROM (
 SELECT date_trunc('week',clock_timestamp() AT TIME ZONE 'UTC')
  AT TIME ZONE 'UTC' AS week_start
) q;
INSERT INTO private.world_boss_war_camps_v27(
 event_id,fort_tier1,fort_tier2,field_tier1,field_tier2,
 siege_tier1,siege_tier2)
VALUES('30000000-0000-4000-8000-000000000027',1,2,1,2,1,2);
INSERT INTO private.world_boss_war_recipes_v27(
 event_id,recipe_id,track,tier,materials) VALUES
 ('30000000-0000-4000-8000-000000000027','T1_FORTIFICATIONS',
  'fortifications',1,'[{"itemId":"GREENWOOD_LOG","quantity":70},
  {"itemId":"COPPER_INGOT","quantity":12}]'),
 ('30000000-0000-4000-8000-000000000027','T1_FIELD_PROVISIONS',
  'fieldProvisions',1,'[{"itemId":"DEWLEAF","quantity":60},
  {"itemId":"COOKED_MEADOW_PERCH","quantity":12}]'),
 ('30000000-0000-4000-8000-000000000027','T1_SIEGECRAFT',
  'siegecraft',1,'[{"itemId":"COPPER_ORE","quantity":70},
  {"itemId":"COPPER_INGOT","quantity":12}]');

DO $test$
DECLARE
 e uuid:='30000000-0000-4000-8000-000000000027';
 acct uuid:='10000000-0000-4000-8000-000000000001';
 ch uuid:='20000000-0000-4000-8000-000000000001';
 now_at timestamptz:=clock_timestamp();
 cutoff timestamptz;
 x jsonb;
 r jsonb;
 before_state jsonb;
 after_state jsonb;
 code text;
 count_receipts integer;
BEGIN
 SELECT starts_at+interval '5 days' INTO cutoff
 FROM private.world_boss_events_v17 WHERE id=e;
 IF has_function_privilege('anon',
  'private.world_boss_v27_donate(uuid,uuid,uuid,text,text)','EXECUTE') OR
  has_function_privilege('authenticated',
  'private.world_boss_v27_progress(uuid)','EXECUTE') OR
  has_function_privilege('authenticated',
  'private.world_boss_v27_reserve_frozen(uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)','EXECUTE')
 THEN RAISE EXCEPTION 'WB27_PUBLIC_WAR_CAMP_EXPOSED'; END IF;
 IF now_at<cutoff THEN
  -- Cannot freeze while donations are still open.
  code:='';
  BEGIN PERFORM private.world_boss_v27_freeze(e);
  EXCEPTION WHEN raise_exception THEN code:=SQLERRM; END;
  IF code NOT LIKE '%WB27_PREPARATION_NOT_FINISHED%'
  THEN RAISE EXCEPTION 'WB27_PREMATURE_FREEZE_ALLOWED %',code; END IF;
  -- A donation is one atomic material sink + account-wide receipt, not
  -- per-character and never from bank / unique physical item stacks.
  SELECT private.world_boss_v27_donate(e,acct,ch,
   'WB27_SMOKE_DONATION_0001','T1_FORTIFICATIONS') INTO x;
  IF x->>'repeated'<>'false' OR x->>'ordinal'<>'1'
  THEN RAISE EXCEPTION 'WB27_NEW_RECEIPT_WRONG'; END IF;
  SELECT state INTO after_state FROM public.online_game_states
   WHERE account_id=acct AND character_id=ch;
  IF (SELECT (a->>'quantity')::integer FROM
    jsonb_array_elements(after_state#>'{inventory,stacks}') a
    WHERE a->>'itemId'='GREENWOOD_LOG' AND NOT(a?'instanceId'))<>80 OR
    (SELECT (a->>'quantity')::integer FROM
    jsonb_array_elements(after_state#>'{inventory,stacks}') a
    WHERE a->>'itemId'='COPPER_INGOT')<>18 OR
    (SELECT (a->>'quantity')::integer FROM
    jsonb_array_elements(after_state#>'{bank,stacks}') a
    WHERE a->>'itemId'='GREENWOOD_LOG')<>200
  THEN RAISE EXCEPTION 'WB27_WRONG_INVENTORY_DEBIT'; END IF;
  -- A replay returns the exact historical receipt without a second debit.
  SELECT private.world_boss_v27_donate(e,acct,ch,
   'WB27_SMOKE_DONATION_0001','T1_FORTIFICATIONS') INTO r;
  IF r->>'repeated'<>'true' OR r->>'revision'<>x->>'revision'
  THEN RAISE EXCEPTION 'WB27_DUPLICATE_DEBIT'; END IF;
  code:='';
  BEGIN PERFORM private.world_boss_v27_donate(e,acct,ch,
    'WB27_SMOKE_DONATION_0001','T1_FIELD_PROVISIONS');
  EXCEPTION WHEN raise_exception THEN code:=SQLERRM; END;
  IF code NOT LIKE '%WB27_IDEMPOTENCY_CONFLICT%'
  THEN RAISE EXCEPTION 'WB27_REQUEST_REUSED %',code; END IF;
  SELECT private.world_boss_v27_donate(e,acct,ch,
   'WB27_SMOKE_DONATION_0002','T1_FIELD_PROVISIONS') INTO r;
  IF r->>'ordinal'<>'2'
  THEN RAISE EXCEPTION 'WB27_ACCOUNT_ORDINAL_WRONG'; END IF;
  SELECT state INTO before_state FROM public.online_game_states
   WHERE account_id=acct AND character_id=ch;
  code:='';
  BEGIN PERFORM private.world_boss_v27_donate(e,acct,ch,
   'WB27_SMOKE_DONATION_0003','T1_SIEGECRAFT');
  EXCEPTION WHEN raise_exception THEN code:=SQLERRM; END;
  IF code NOT LIKE '%WB27_ACCOUNT_BUNDLE_LIMIT%'
  THEN RAISE EXCEPTION 'WB27_THIRD_BUNDLE_ACCEPTED %',code; END IF;
  SELECT state INTO after_state FROM public.online_game_states
   WHERE account_id=acct AND character_id=ch;
  IF after_state IS DISTINCT FROM before_state
  THEN RAISE EXCEPTION 'WB27_FAILED_DONATION_CHANGED_INVENTORY'; END IF;
  SELECT private.world_boss_v27_progress(e) INTO r;
  IF r->>'frozen'<>'false' OR (r->'contributions'->>'fortifications')::integer<>1 OR
    (r->'contributions'->>'fieldProvisions')::integer<>1
  THEN RAISE EXCEPTION 'WB27_BAD_PREP_PROGRESS'; END IF;
 ELSE
  -- A real weekend read freezes even if no player makes a donation.
  SELECT state INTO before_state FROM public.online_game_states
   WHERE account_id=acct AND character_id=ch;
  SELECT private.world_boss_v27_progress(e) INTO r;
  IF r->>'frozen'<>'true' OR r->'snapshot'->>'digest' IS NULL
  THEN RAISE EXCEPTION 'WB27_SATURDAY_NOT_FROZEN'; END IF;
  SELECT private.world_boss_v27_freeze(e) INTO x;
  IF x->>'digest' IS DISTINCT FROM r->'snapshot'->>'digest'
  THEN RAISE EXCEPTION 'WB27_FREEZE_NOT_IDEMPOTENT'; END IF;
  code:='';
  BEGIN PERFORM private.world_boss_v27_donate(e,acct,ch,
   'WB27_SMOKE_LATE_DONATION','T1_FORTIFICATIONS');
  EXCEPTION WHEN raise_exception THEN code:=SQLERRM; END;
  IF code NOT LIKE '%WB27_PREPARATION_CLOSED%'
  THEN RAISE EXCEPTION 'WB27_LATE_DONATION_ACCEPTED %',code; END IF;
  SELECT state INTO after_state FROM public.online_game_states
   WHERE account_id=acct AND character_id=ch;
  IF after_state IS DISTINCT FROM before_state
  THEN RAISE EXCEPTION 'WB27_CLOSED_DONATION_CHANGED_INVENTORY'; END IF;
  code:='';
  BEGIN UPDATE private.world_boss_war_camps_v27
   SET fortifications=1 WHERE event_id=e;
  EXCEPTION WHEN raise_exception THEN code:=SQLERRM; END;
  IF code NOT LIKE '%WB27_FROZEN_CAMP_IMMUTABLE%'
  THEN RAISE EXCEPTION 'WB27_FROZEN_PROGRESS_MUTABLE %',code; END IF;
 END IF;
 SELECT count(*) INTO count_receipts
 FROM private.world_boss_war_donations_v27 WHERE event_id=e AND account_id=acct;
 IF count_receipts NOT IN(0,2)
 THEN RAISE EXCEPTION 'WB27_UNEXPECTED_DONATION_RECEIPTS'; END IF;
 RAISE NOTICE 'WB27_AUTHORITY_DEBIT_IDEMPOTENT_RECEIPT_AND_SATURDAY_FREEZE_PASSED';
END
$test$;
-- Bootstrap is a separate trusted pre-event operation. This fixture
-- verifies all 12 policy records insert atomically and cannot be replaced.
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
SELECT '30000000-0000-4000-8000-000000000028','sunscar','draft',
 start_at,start_at+interval '7 days','wb27-next-forecast',1000000,1000000
FROM (
 SELECT (date_trunc('week',clock_timestamp() AT TIME ZONE 'UTC')
  AT TIME ZONE 'UTC')+interval '7 days' AS start_at
) q;
DO $init_test$
DECLARE
 e uuid:='30000000-0000-4000-8000-000000000028';
 goals jsonb:='{"fortifications":{"tier1At":1,"tier2At":2},
  "fieldProvisions":{"tier1At":1,"tier2At":2},
  "siegecraft":{"tier1At":1,"tier2At":2}}';
 recipes jsonb;
 r jsonb;
 message text;
 installed integer;
BEGIN
 SELECT jsonb_agg(jsonb_build_object(
  'id','T'||tier::text||'_'||track, 'track', CASE track
   WHEN 'FIELD_PROVISIONS' THEN 'fieldProvisions'
   WHEN 'FORTIFICATIONS' THEN 'fortifications'
   ELSE 'siegecraft' END,
  'tier',tier,'materials',jsonb_build_array(
    jsonb_build_object('itemId','GREENWOOD_LOG','quantity',70),
    jsonb_build_object('itemId','COPPER_INGOT','quantity',12))))
 INTO recipes
 FROM generate_series(1,4) tier
 CROSS JOIN (VALUES('FORTIFICATIONS'),('FIELD_PROVISIONS'),
  ('SIEGECRAFT')) AS tracks(track);
 SELECT private.world_boss_v27_initialize(e,goals,recipes) INTO r;
 IF r->>'policyLocked'<>'true' OR
    (r->>'recipesInstalled')::integer<>12
 THEN RAISE EXCEPTION 'WB27_POLICY_NOT_INITIALIZED'; END IF;
 SELECT count(*) INTO installed FROM private.world_boss_war_recipes_v27
  WHERE event_id=e;
 IF installed<>12 THEN RAISE EXCEPTION 'WB27_CATALOG_NOT_COMPLETE'; END IF;
 message:='';
 BEGIN PERFORM private.world_boss_v27_initialize(e,goals,recipes);
 EXCEPTION WHEN raise_exception THEN message:=SQLERRM; END;
 IF message NOT LIKE '%WB27_INIT_POLICY_ALREADY_FROZEN%'
 THEN RAISE EXCEPTION 'WB27_POLICY_REINIT_ALLOWED %',message; END IF;
 message:='';
 BEGIN UPDATE private.world_boss_war_camps_v27
  SET siege_tier2=100 WHERE event_id=e;
 EXCEPTION WHEN raise_exception THEN message:=SQLERRM; END;
 IF message NOT LIKE '%WB27_IMMUTABLE_COMMUNITY_GOALS%'
 THEN RAISE EXCEPTION 'WB27_ADMIN_GOAL_MUTATION_ALLOWED %',message; END IF;
 RAISE NOTICE 'WB27_PRE_EVENT_12_RECIPE_ATOMIC_POLICY_PASSED';
END
$init_test$;
ROLLBACK;
