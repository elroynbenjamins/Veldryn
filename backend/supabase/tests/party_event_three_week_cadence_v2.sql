-- Hidden three-week Party Event calendar and secure creation checks.
-- Requires the 20261108203000 migration. No persistent changes.
BEGIN;
DO $checks$
DECLARE
  v record;
  v_anchor timestamptz:='2026-11-09 00:00:00+00';
BEGIN
  SELECT * INTO v FROM private.party_event_cadence_v2(v_anchor);
  IF NOT v.active OR v.family<>'broken_caravan'
     OR v.event_end<>v_anchor+interval '7 days'
     OR v.next_event_start<>v_anchor+interval '21 days'
  THEN RAISE EXCEPTION 'party event initial cadence mismatch'; END IF;

  SELECT * INTO v FROM private.party_event_cadence_v2(v_anchor+interval '7 days');
  IF v.active OR v.next_event_start<>v_anchor+interval '21 days'
  THEN RAISE EXCEPTION 'party event first rest week missing'; END IF;

  SELECT * INTO v FROM private.party_event_cadence_v2(v_anchor+interval '14 days');
  IF v.active OR v.next_event_start<>v_anchor+interval '21 days'
  THEN RAISE EXCEPTION 'party event second rest week missing'; END IF;

  SELECT * INTO v FROM private.party_event_cadence_v2(v_anchor+interval '21 days');
  IF NOT v.active OR v.family<>'nightfall_hunt'
  THEN RAISE EXCEPTION 'party event rotation did not resume'; END IF;

  SELECT * INTO v FROM private.party_event_cadence_v2(v_anchor+interval '42 days');
  IF NOT v.active OR v.family<>'broken_wards'
  THEN RAISE EXCEPTION 'party event third theme mismatch'; END IF;

  SELECT * INTO v FROM private.party_event_cadence_v2(v_anchor+interval '63 days');
  IF NOT v.active OR v.family<>'lost_reliquary'
  THEN RAISE EXCEPTION 'party event fourth theme mismatch'; END IF;

  SELECT * INTO v FROM private.party_event_cadence_v2(v_anchor-interval '1 day');
  IF v.active THEN RAISE EXCEPTION 'party event scheduled before epoch'; END IF;

  IF has_function_privilege('anon','private.party_event_cadence_v2(timestamptz)','EXECUTE')
     OR has_function_privilege('authenticated','private.party_event_cadence_v2(timestamptz)','EXECUTE')
     OR has_function_privilege('authenticated','private.party_event_create_with_supplies_v2(uuid,text,bigint,jsonb)','EXECUTE')
     OR has_function_privilege('anon','private.party_event_create_with_supplies_v2(uuid,text,bigint,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'Party Event event-creation API unexpectedly public'; END IF;

  IF has_table_privilege('authenticated','private.party_event_supply_item_policy_v2','SELECT')
     OR has_table_privilege('anon','private.party_event_supply_item_policy_v2','SELECT')
  THEN RAISE EXCEPTION 'private Party Event material policy unexpectedly public'; END IF;

  IF (SELECT count(*) FROM private.party_event_supply_item_policy_v2 WHERE enabled)<9
     OR NOT EXISTS (SELECT 1 FROM private.party_event_supply_item_policy_v2 WHERE item_id='DEWLEAF')
  THEN RAISE EXCEPTION 'canonical Party Event gatherable materials missing'; END IF;

  BEGIN
    PERFORM private.party_event_create_with_supplies_v2(
      gen_random_uuid(),'standard',1,'[]'::jsonb
    );
    RAISE EXCEPTION 'disabled feature allowed creation';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM<>'PARTY_WEEKLY_EVENTS_DISABLED' THEN RAISE; END IF;
  END;
  RAISE NOTICE 'Party Event 3-week calendar and hidden access checks passed';
END $checks$;
ROLLBACK;
