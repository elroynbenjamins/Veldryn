-- Day 8 reward choice math, eligibility and privacy checks.
-- Applies only within a rolled-back staging transaction.
BEGIN;
DO $tests$
DECLARE
  v_bundle jsonb;
  v_offers integer;
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM private.party_weekly_event_gate_v2
    WHERE id=1 AND enabled=false
  ) THEN RAISE EXCEPTION 'Party Events gate unexpectedly enabled'; END IF;

  IF has_function_privilege('anon',
      'private.party_event_reward_choose_v2(uuid,uuid,text)','EXECUTE')
    OR has_function_privilege('authenticated',
      'private.party_event_reward_choose_v2(uuid,uuid,text)','EXECUTE')
    OR has_function_privilege('anon',
      'private.party_event_reward_bundle_v2(text,smallint,smallint,text)','EXECUTE')
    OR has_function_privilege('authenticated',
      'private.party_event_reward_bundle_v2(text,smallint,smallint,text)','EXECUTE')
  THEN RAISE EXCEPTION 'Reward selection RPC accessible to players'; END IF;

  SELECT private.party_event_reward_bundle_v2('standard',2::smallint,5::smallint,NULL)
    INTO v_bundle;
  IF v_bundle->>'kind'<>'participation'
    OR (v_bundle->>'gold')::integer<>540
    OR (v_bundle->>'partyRenown')::integer<>0
  THEN RAISE EXCEPTION 'Participation payout formula incorrect'; END IF;

  SELECT private.party_event_reward_bundle_v2('heroic',6::smallint,15::smallint,'companion')
    INTO v_bundle;
  IF (v_bundle->>'companionEssence')::integer<>473
    OR (v_bundle->>'bondstones')::integer<>2
    OR (v_bundle->>'partyRenown')::integer<>14
  THEN RAISE EXCEPTION 'Companion cache payout formula incorrect'; END IF;

  SELECT private.party_event_reward_bundle_v2('standard',1::smallint,15::smallint,'warrior')
    INTO v_bundle;
  IF (v_bundle->>'combatXp')::integer<>1650
    OR v_bundle->>'kind'<>'warrior'
    OR jsonb_typeof(v_bundle->'materials')<>'object'
  THEN RAISE EXCEPTION 'Warrior cache payout formula incorrect'; END IF;

  SELECT private.party_event_reward_bundle_v2('veteran',3::smallint,15::smallint,'artisan')
    INTO v_bundle;
  IF (v_bundle->>'skillXp')::integer<>3780
    OR (v_bundle->>'partyRenown')::integer<>12
  THEN RAISE EXCEPTION 'Artisan cache payout formula incorrect'; END IF;

  BEGIN
    PERFORM private.party_event_reward_bundle_v2('standard',1::smallint,14::smallint,'warrior');
    RAISE EXCEPTION 'Participation bypass accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'PARTY_EVENT_PARTICIPATION_HAS_NO_CACHE' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM private.party_event_reward_choose_v2(gen_random_uuid(),gen_random_uuid(),'warrior');
    RAISE EXCEPTION 'Disabled reward choice accepted';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'PARTY_WEEKLY_EVENTS_DISABLED' THEN RAISE; END IF;
  END;

  RAISE NOTICE 'Party reward options are private, locked, and mathematically validated';
END $tests$;
ROLLBACK;
