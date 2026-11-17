-- V37: test War Camp against the actual account-scoped online save layout.
-- Disposable PostgreSQL ONLY; all synthetic records are rolled back.
-- The event time below is an artificial five-day-preparation fixture window;
-- this does not replace V22's real Monday/UTC scheduler validation.
BEGIN;
-- Earlier War Camp smoke uses ROLLBACK, so reconstruct the exact staging
-- account-scoped shape inside this independent transaction.
CREATE TABLE IF NOT EXISTS public.online_game_states(
 account_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 character_id uuid UNIQUE REFERENCES public.characters(id),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>=0),
 state jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO auth.users(id) VALUES('10000000-0000-4000-8000-000000000037');
INSERT INTO public.characters(id,account_id) VALUES
 ('20000000-0000-4000-8000-000000000037',
  '10000000-0000-4000-8000-000000000037'),
 ('20000000-0000-4000-8000-000000000038',
  '10000000-0000-4000-8000-000000000037');
INSERT INTO public.online_game_states(
 account_id,character_id,revision,state)
VALUES('10000000-0000-4000-8000-000000000037',
 '20000000-0000-4000-8000-000000000037',1,
 '{
  "character":{"id":"20000000-0000-4000-8000-000000000037"},
  "inventory":{"stacks":[
   {"itemId":"GREENWOOD_LOG","quantity":150},
   {"itemId":"COPPER_INGOT","quantity":30}
  ],"capacity":30},
  "otherCharacters":[{
   "character":{"id":"20000000-0000-4000-8000-000000000038"},
   "inventory":{"stacks":[
    {"itemId":"GREENWOOD_LOG","quantity":140},
    {"itemId":"COPPER_INGOT","quantity":24}
   ],"capacity":30}
  }],
  "bank":{"stacks":[{"itemId":"GREENWOOD_LOG","quantity":500}]}
 }'::jsonb);
INSERT INTO private.world_boss_events_v17(
 id,boss_id,status,starts_at,ends_at,rules_version,max_hp,remaining_hp)
SELECT '30000000-0000-4000-8000-000000000037',
 'hollowroot','active',t,t+interval '7 days','wb37-fixture',1000000,1000000
FROM (SELECT clock_timestamp()-interval '1 hour' t) as x;
INSERT INTO private.world_boss_war_camps_v27(
 event_id,fort_tier1,fort_tier2,field_tier1,field_tier2,
 siege_tier1,siege_tier2)
VALUES('30000000-0000-4000-8000-000000000037',1,3,1,3,1,3);
INSERT INTO private.world_boss_war_recipes_v27(
 event_id,recipe_id,track,tier,materials)
VALUES('30000000-0000-4000-8000-000000000037',
 'WB37_TEST_SUPPLIES','fortifications',1,
 '[{"itemId":"GREENWOOD_LOG","quantity":70},
   {"itemId":"COPPER_INGOT","quantity":12}]'::jsonb);

DO $test$
DECLARE
 ev uuid:='30000000-0000-4000-8000-000000000037';
 acct uuid:='10000000-0000-4000-8000-000000000037';
 active_id uuid:='20000000-0000-4000-8000-000000000037';
 parked_id uuid:='20000000-0000-4000-8000-000000000038';
 original jsonb;
 oldrev bigint;
 changed jsonb;
 switched jsonb;
 rec jsonb;
 msg text;
BEGIN
 SELECT state,revision INTO original,oldrev
 FROM public.online_game_states WHERE account_id=acct;
 -- Distinct relational ownership is not enough: parked character must first
 -- become the active character in the authoritative account save.
 msg:='';
 BEGIN
  PERFORM private.world_boss_v27_donate(
   ev,acct,parked_id,
   'WB37_PARKED_DENIED','WB37_TEST_SUPPLIES');
 EXCEPTION WHEN raise_exception THEN msg:=SQLERRM; END;
 IF msg NOT LIKE '%WB27_MISSING_AUTHORITY_INVENTORY%'
 THEN RAISE EXCEPTION 'WB37_PARKED_CHARACTER_DEBIT_ALLOWED: %',msg; END IF;
 IF EXISTS(SELECT 1 FROM private.world_boss_war_donations_v27
  WHERE event_id=ev AND account_id=acct)
 THEN RAISE EXCEPTION 'WB37_DENIED_ACTION_CREATED_RECEIPT'; END IF;
 SELECT state,revision INTO changed,oldrev
 FROM public.online_game_states WHERE account_id=acct;
 IF changed IS DISTINCT FROM original OR oldrev<>1
 THEN RAISE EXCEPTION 'WB37_PARKED_REQUEST_MUTATED_STATE'; END IF;

 -- Even when the relational active character matches, inconsistent JSON
 -- identity must fail closed rather than spending the wrong inventory.
 UPDATE public.online_game_states
 SET state=jsonb_set(state,'{character,id}',to_jsonb(parked_id::text))
 WHERE account_id=acct;
 msg:='';
 BEGIN
  PERFORM private.world_boss_v27_donate(
   ev,acct,active_id,
   'WB37_BAD_ACTIVE_JSON','WB37_TEST_SUPPLIES');
 EXCEPTION WHEN raise_exception THEN msg:=SQLERRM; END;
 IF msg NOT LIKE '%WB27_MISSING_AUTHORITY_INVENTORY%'
 THEN RAISE EXCEPTION 'WB37_SAVED_CHARACTER_MISMATCH_ALLOWED: %',msg; END IF;
 UPDATE public.online_game_states SET state=original WHERE account_id=acct;

 SELECT private.world_boss_v27_donate(ev,acct,active_id,
  'WB37_ACTIVE_DEBIT_1','WB37_TEST_SUPPLIES') INTO rec;
 IF rec->>'ordinal'<>'1' OR rec->>'repeated'<>'false'
 THEN RAISE EXCEPTION 'WB37_ACTIVE_FIRST_RECEIPT_BAD'; END IF;
 SELECT state INTO changed FROM public.online_game_states WHERE account_id=acct;
 IF (SELECT (s->>'quantity')::int FROM
      jsonb_array_elements(changed#>'{inventory,stacks}') s
      WHERE s->>'itemId'='GREENWOOD_LOG')<>80
 OR (SELECT (s->>'quantity')::int FROM
      jsonb_array_elements(changed#>'{otherCharacters,0,inventory,stacks}') s
      WHERE s->>'itemId'='GREENWOOD_LOG')<>140
 OR (SELECT (s->>'quantity')::int FROM
      jsonb_array_elements(changed#>'{bank,stacks}') s
      WHERE s->>'itemId'='GREENWOOD_LOG')<>500
 THEN RAISE EXCEPTION 'WB37_DEBIT_LEAKED_INACTIVE_OR_BANK'; END IF;

 -- Simulate the game's account-level switch: the original active inventory
 -- moves to otherCharacters, the prior parked inventory becomes active.
 switched:=jsonb_set(
  jsonb_set(
   jsonb_set(
    jsonb_set(changed,
     '{otherCharacters,0,inventory,stacks}',
     changed#>'{inventory,stacks}',false),
    '{otherCharacters,0,character,id}',to_jsonb(active_id::text),false),
   '{inventory,stacks}',changed#>'{otherCharacters,0,inventory,stacks}',false),
  '{character,id}',to_jsonb(parked_id::text),false);
 UPDATE public.online_game_states SET character_id=parked_id,
   state=switched,revision=revision+1
 WHERE account_id=acct;

 SELECT private.world_boss_v27_donate(ev,acct,parked_id,
  'WB37_PARKED_NOW_ACTIVE_2','WB37_TEST_SUPPLIES') INTO rec;
 IF rec->>'ordinal'<>'2' OR rec->>'repeated'<>'false'
 THEN RAISE EXCEPTION 'WB37_SECOND_CHARACTER_RECEIPT_BAD'; END IF;
 SELECT state INTO changed FROM public.online_game_states WHERE account_id=acct;
 IF (SELECT (s->>'quantity')::int FROM
      jsonb_array_elements(changed#>'{inventory,stacks}') s
      WHERE s->>'itemId'='GREENWOOD_LOG')<>70
 OR (SELECT (s->>'quantity')::int FROM
      jsonb_array_elements(changed#>'{otherCharacters,0,inventory,stacks}') s
      WHERE s->>'itemId'='GREENWOOD_LOG')<>80
 THEN RAISE EXCEPTION 'WB37_SECOND_DONATION_DEBIT_WRONG_INVENTORY'; END IF;

 -- Replaying the first character's completed donation after switching must
 -- return the original receipt without debiting anything a second time.
 SELECT private.world_boss_v27_donate(ev,acct,active_id,
  'WB37_ACTIVE_DEBIT_1','WB37_TEST_SUPPLIES') INTO rec;
 IF rec->>'repeated'<>'true' OR rec->>'ordinal'<>'1'
 THEN RAISE EXCEPTION 'WB37_SWITCH_INVALIDATED_IDEMPOTENT_REPLAY'; END IF;
 msg:='';
 BEGIN
  PERFORM private.world_boss_v27_donate(ev,acct,parked_id,
   'WB37_THIRD_BUNDLE','WB37_TEST_SUPPLIES');
 EXCEPTION WHEN raise_exception THEN msg:=SQLERRM; END;
 IF msg NOT LIKE '%WB27_ACCOUNT_BUNDLE_LIMIT%'
 THEN RAISE EXCEPTION 'WB37_CHARACTER_SWITCH_RESET_BUNDLE_LIMIT: %',msg; END IF;
 IF (SELECT count(*) FROM private.world_boss_war_donations_v27
     WHERE event_id=ev AND account_id=acct)<>2
 THEN RAISE EXCEPTION 'WB37_ACCOUNT_WIDE_DONATION_COUNT_BAD'; END IF;
 RAISE NOTICE 'WORLD_BOSS_V37_REAL_ACCOUNT_SAVE_DONATIONS=PASS';
END
$test$;
ROLLBACK;
