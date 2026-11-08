-- Hidden Party Events v2: a seven-day adventure every THIRD week, with two
-- full rest weeks. This adds server-only event creation, never enables launch.
BEGIN;

CREATE OR REPLACE FUNCTION private.party_event_cadence_v2(p_at timestamptz)
RETURNS TABLE(
  active boolean, event_start timestamptz, event_end timestamptz,
  next_event_start timestamptz, cycle_index integer, family text
) LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $calendar$
DECLARE
  v_anchor constant timestamptz:='2026-11-09 00:00:00+00';
  v_cycle integer;
  v_start timestamptz;
  v_family text[]:=ARRAY[
    'broken_caravan','nightfall_hunt','broken_wards','lost_reliquary'
  ];
BEGIN
  IF p_at IS NULL THEN RAISE EXCEPTION 'PARTY_EVENT_INVALID_TIME'; END IF;
  v_cycle:=floor(extract(epoch FROM p_at-v_anchor)/(21*86400))::integer;
  v_start:=v_anchor+(v_cycle*21)*interval '1 day';
  active:=v_cycle>=0 AND p_at>=v_start AND p_at<v_start+interval '7 days';
  event_start:=v_start;
  event_end:=v_start+interval '7 days';
  next_event_start:=CASE WHEN v_cycle<0 THEN v_anchor ELSE v_start+interval '21 days' END;
  cycle_index:=v_cycle;
  family:=v_family[greatest(0,v_cycle)%4+1];
  RETURN NEXT;
END $calendar$;
REVOKE ALL ON FUNCTION private.party_event_cadence_v2(timestamptz)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_cadence_v2(timestamptz)
  TO service_role;

-- Canonical items confirmed in the existing skill definitions. Seconds are
-- preliminary gathering-equivalent budgets, not permanent live economy values.
-- Correct values before release and never price them using fluctuating market bids.
CREATE TABLE IF NOT EXISTS private.party_event_supply_item_policy_v2(
  item_id text PRIMARY KEY,
  category text NOT NULL CHECK(category IN ('wood','ore','herb')),
  tier text NOT NULL CHECK(tier IN ('common','uncommon','advanced')),
  expected_seconds_per_item numeric(10,2) NOT NULL CHECK(expected_seconds_per_item>0),
  min_skill_level integer NOT NULL CHECK(min_skill_level BETWEEN 1 AND 100),
  enabled boolean NOT NULL DEFAULT true
);
ALTER TABLE private.party_event_supply_item_policy_v2 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.party_event_supply_item_policy_v2 FROM PUBLIC,anon,authenticated;
GRANT ALL ON private.party_event_supply_item_policy_v2 TO service_role;
INSERT INTO private.party_event_supply_item_policy_v2(
  item_id,category,tier,expected_seconds_per_item,min_skill_level
) VALUES
  ('GREENWOOD_LOG','wood','common',20,1),
  ('IRONWOOD_LOG','wood','uncommon',32,7),
  ('CROWNWOOD_LOG','wood','advanced',72,15),
  ('COPPER_ORE','ore','common',20,1),
  ('ASTER_IRON_ORE','ore','uncommon',32,8),
  ('OATHSTONE_ORE','ore','advanced',72,16),
  ('DEWLEAF','herb','common',30,1),
  ('RIVER_MINT','herb','common',40,8),
  ('IRONBLOOM','herb','uncommon',50,18),
  ('CAVELICHEN','herb','uncommon',60,30),
  ('CROWN_SAGE','herb','advanced',70,45)
ON CONFLICT(item_id) DO NOTHING;

-- Even a trusted worker cannot insert instances in the two rest weeks.
CREATE OR REPLACE FUNCTION private.party_event_validate_creation_v2()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $guard$
DECLARE
  v_cadence record;
  v_count integer;
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM private.party_weekly_event_gate_v2 WHERE id=1 AND enabled
  ) THEN RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED'; END IF;
  SELECT * INTO v_cadence FROM private.party_event_cadence_v2(NEW.starts_at);
  IF NOT v_cadence.active OR NEW.starts_at IS DISTINCT FROM v_cadence.event_start
    OR NEW.ends_at IS DISTINCT FROM v_cadence.event_end
    OR NEW.family IS DISTINCT FROM v_cadence.family
  THEN RAISE EXCEPTION 'PARTY_EVENT_OUTSIDE_ROTATION_WINDOW'; END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.parties WHERE id=NEW.party_id AND status='active'
  ) THEN RAISE EXCEPTION 'PARTY_EVENT_PARTY_INACTIVE'; END IF;
  SELECT count(*) INTO v_count FROM public.party_members pm
  WHERE pm.party_id=NEW.party_id AND pm.left_at IS NULL;
  IF v_count<>NEW.member_count OR v_count NOT BETWEEN 2 AND 4 THEN
    RAISE EXCEPTION 'PARTY_EVENT_INVALID_ROSTER';
  END IF;
  RETURN NEW;
END $guard$;
DROP TRIGGER IF EXISTS party_event_validate_creation_v2
  ON private.party_weekly_event_instances_v2;
CREATE TRIGGER party_event_validate_creation_v2
BEFORE INSERT OR UPDATE OF party_id,starts_at,ends_at,family,member_count
ON private.party_weekly_event_instances_v2
FOR EACH ROW EXECUTE FUNCTION private.party_event_validate_creation_v2();
REVOKE ALL ON FUNCTION private.party_event_validate_creation_v2()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_validate_creation_v2()
  TO service_role;

-- Restricted to service_role; actual item unlock decisions must be derived
-- from authoritative player states, never from a mobile client input.
CREATE OR REPLACE FUNCTION private.party_event_create_with_supplies_v2(
  p_party_id uuid, p_difficulty text, p_seed bigint, p_orders jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $create$
DECLARE
  v_cadence record;
  v_party public.parties%ROWTYPE;
  v_existing private.party_weekly_event_instances_v2%ROWTYPE;
  v_members integer;
  v_target integer;
  v_required_minutes integer;
  v_optional_minutes integer;
  v_variants text[];
  v_variant text;
  v_row jsonb;
  v_item private.party_event_supply_item_policy_v2%ROWTYPE;
  v_item_id text;
  v_category text;
  v_tier text;
  v_kind text;
  v_preparation text;
  v_stage integer;
  v_quantity integer;
  v_estimated numeric;
  v_expected numeric;
  v_required_seconds numeric:=0;
  v_optional_seconds numeric:=0;
  v_stage_counts integer[]:=ARRAY[0,0,0];
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM private.party_weekly_event_gate_v2 WHERE id=1 AND enabled
  ) THEN RAISE EXCEPTION 'PARTY_WEEKLY_EVENTS_DISABLED'; END IF;
  IF p_party_id IS NULL OR p_difficulty NOT IN ('standard','veteran','heroic')
    OR p_difficulty IS NULL OR p_seed IS NULL OR p_seed<0
    OR p_orders IS NULL OR jsonb_typeof(p_orders)<>'array'
    OR jsonb_array_length(p_orders) NOT BETWEEN 6 AND 60
  THEN RAISE EXCEPTION 'PARTY_EVENT_INVALID_CREATION_INPUT'; END IF;
  SELECT * INTO v_cadence FROM private.party_event_cadence_v2(now());
  IF NOT v_cadence.active THEN RAISE EXCEPTION 'PARTY_EVENT_NOT_SCHEDULED'; END IF;

  -- Serialize creation with party mutations and against another creation call.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'party-event-create:'||p_party_id::text||':'||v_cadence.event_start::text,0
  ));
  SELECT * INTO v_party FROM public.parties WHERE id=p_party_id FOR UPDATE;
  IF NOT FOUND OR v_party.status<>'active' THEN RAISE EXCEPTION 'PARTY_EVENT_PARTY_INACTIVE'; END IF;
  SELECT * INTO v_existing FROM private.party_weekly_event_instances_v2
  WHERE party_id=p_party_id AND starts_at=v_cadence.event_start FOR UPDATE;
  IF FOUND THEN
    IF v_existing.difficulty<>p_difficulty THEN
      RAISE EXCEPTION 'PARTY_EVENT_ALREADY_STARTED_DIFFERENT_DIFFICULTY';
    END IF;
    RETURN jsonb_build_object('alreadyCreated',true,'eventId',v_existing.id,
      'startsAt',v_existing.starts_at,'endsAt',v_existing.ends_at);
  END IF;

  SELECT count(*) INTO v_members
  FROM public.party_members pm WHERE pm.party_id=p_party_id AND pm.left_at IS NULL;
  IF v_members NOT BETWEEN 2 AND 4 THEN RAISE EXCEPTION 'PARTY_EVENT_REQUIRES_TWO_TO_FOUR'; END IF;
  v_target:=CASE v_members WHEN 2 THEN 100 WHEN 3 THEN 135 ELSE 170 END;
  v_required_minutes:=v_members*CASE p_difficulty
    WHEN 'standard' THEN 90 WHEN 'veteran' THEN 120 ELSE 150 END;
  v_optional_minutes:=v_members*CASE p_difficulty
    WHEN 'standard' THEN 45 WHEN 'veteran' THEN 60 ELSE 75 END;
  v_variants:=CASE v_cadence.family
    WHEN 'broken_caravan' THEN ARRAY['bandits_crossing','fogbound_trail','collapsed_crossing']
    WHEN 'nightfall_hunt' THEN ARRAY['moonfang_pack','hollow_stag','ashclaw_behemoth']
    WHEN 'broken_wards' THEN ARRAY['overgrown_runestones','stormward_spires','blighted_roots']
    ELSE ARRAY['sunken_archive','vault_of_echoes','starlit_crypt'] END;
  v_variant:=v_variants[(p_seed%3+1)::integer];

  INSERT INTO private.party_weekly_event_instances_v2(
    party_id,starts_at,ends_at,family,variation,difficulty,seed,
    member_count,target_points
  ) VALUES (
    p_party_id,v_cadence.event_start,v_cadence.event_end,
    v_cadence.family,v_variant,p_difficulty,p_seed,v_members,v_target
  ) RETURNING * INTO v_existing;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_orders) LOOP
    v_item_id:=v_row->>'itemId';
    v_stage:=(v_row->>'stage')::integer;
    v_kind:=v_row->>'kind';
    v_preparation:=nullif(v_row->>'preparation','');
    v_category:=v_row->>'category';
    v_tier:=v_row->>'tier';
    v_quantity:=(v_row->>'quantity')::integer;
    v_estimated:=(v_row->>'estimatedGatherSeconds')::numeric;

    SELECT * INTO v_item FROM private.party_event_supply_item_policy_v2
      WHERE item_id=v_item_id AND enabled;
    IF NOT FOUND OR v_stage NOT BETWEEN 1 AND 3
      OR v_kind NOT IN ('required','optional')
      OR v_quantity NOT BETWEEN 1 AND 1000000
      OR v_category IS DISTINCT FROM v_item.category
      OR v_tier IS DISTINCT FROM v_item.tier
      OR ((v_kind='required') IS DISTINCT FROM (v_preparation IS NULL))
      OR (v_kind='optional' AND (v_preparation NOT IN
        ('reinforced','provisions','specialist') OR v_stage<>2))
    THEN RAISE EXCEPTION 'PARTY_EVENT_INVALID_SUPPLY_ORDER'; END IF;

    v_expected:=v_quantity*v_item.expected_seconds_per_item;
    IF v_estimated IS NULL OR abs(v_expected-v_estimated)>0.1 THEN
      RAISE EXCEPTION 'PARTY_EVENT_INVALID_SUPPLY_VALUATION';
    END IF;

    INSERT INTO private.party_weekly_event_supply_orders_v2(
      event_id,stage,kind,preparation,item_id,category,tier,
      target_quantity,estimated_gather_seconds
    ) VALUES (v_existing.id,v_stage,v_kind,v_preparation,
      v_item_id,v_category,v_tier,v_quantity,v_expected);
    IF v_kind='required' THEN
      v_required_seconds:=v_required_seconds+v_expected;
      v_stage_counts[v_stage]:=v_stage_counts[v_stage]+1;
    ELSE
      v_optional_seconds:=v_optional_seconds+v_expected;
    END IF;
  END LOOP;
  IF 0=ANY(v_stage_counts)
    OR v_required_seconds NOT BETWEEN v_required_minutes*60*0.9 AND v_required_minutes*60*1.1
    OR v_optional_seconds NOT BETWEEN v_optional_minutes*60*0.9 AND v_optional_minutes*60*1.1
  THEN RAISE EXCEPTION 'PARTY_EVENT_SUPPLY_BUDGET_MISMATCH'; END IF;

  -- Atomic enrollment: no partial party is created if a member is bound to
  -- another party event this cycle.
  INSERT INTO private.party_weekly_event_members_v2(event_id,account_id,week_start)
  SELECT v_existing.id,pm.account_id,v_cadence.event_start
  FROM public.party_members pm WHERE pm.party_id=p_party_id AND pm.left_at IS NULL;
  RETURN jsonb_build_object(
    'alreadyCreated',false,'eventId',v_existing.id,'family',v_existing.family,
    'variation',v_variant,'difficulty',p_difficulty,
    'startsAt',v_cadence.event_start,'endsAt',v_cadence.event_end,
    'enrolledMembers',v_members,'requiredSupplySeconds',v_required_seconds,
    'optionalSupplySeconds',v_optional_seconds
  );
END $create$;
REVOKE ALL ON FUNCTION private.party_event_create_with_supplies_v2(uuid,text,bigint,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.party_event_create_with_supplies_v2(uuid,text,bigint,jsonb)
  TO service_role;

COMMENT ON FUNCTION private.party_event_create_with_supplies_v2(uuid,text,bigint,jsonb)
 IS 'Dormant service-only atomic event/supply enrollment. Caller must construct supplies from canonical server resource unlocks.';
COMMIT;