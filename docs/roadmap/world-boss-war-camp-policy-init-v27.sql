-- V27 PRIVATE War Camp event-policy bootstrap (disposable review only).
-- Must be run after world-boss-war-camp-transactions-v27.sql.
-- Not a Supabase migration; no public RPC or event activation.
-- Policy material prices/goal thresholds are prepared by trusted admin code,
-- frozen BEFORE the seven-day event begins. Never accept from players.
BEGIN;
ALTER TABLE private.world_boss_war_recipes_v27
 ADD CONSTRAINT world_boss_v27_one_recipe_per_tier_track
 UNIQUE(event_id,tier,track);

CREATE FUNCTION private.world_boss_v27_initialize(
 p_event uuid,p_goals jsonb,p_recipes jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $init$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 r jsonb;
 m jsonb;
 tracks text[]:=ARRAY['fortifications','fieldProvisions','siegecraft'];
 track text;
 tier integer;
 t1 integer;
 t2 integer;
 recipe_id text;
 seen_recipe_ids text[]:=ARRAY[]::text[];
 seen_positions text[]:=ARRAY[]::text[];
 seen_material_ids text[];
 material_id text;
 q bigint;
 count_recipes integer:=0;
BEGIN
 SELECT * INTO e FROM private.world_boss_events_v17 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB27_INIT_EVENT_NOT_FOUND'; END IF;
 IF e.status<>'draft' OR e.starts_at<=clock_timestamp() OR
    e.ends_at<>e.starts_at+interval '7 days' OR
    private.world_boss_v22_window_at(e.starts_at,e.starts_at+interval '5 days')<>0
 THEN RAISE EXCEPTION 'WB27_INIT_EVENT_ALREADY_STARTED_OR_MISALIGNED'; END IF;
 IF EXISTS(SELECT 1 FROM private.world_boss_war_camps_v27 WHERE event_id=p_event)
 THEN RAISE EXCEPTION 'WB27_INIT_POLICY_ALREADY_FROZEN'; END IF;
 IF jsonb_typeof(p_goals)<>'object' OR jsonb_typeof(p_recipes)<>'array'
    OR jsonb_array_length(p_recipes)<>12
 THEN RAISE EXCEPTION 'WB27_INIT_INVALID_POLICY'; END IF;
 FOREACH track IN ARRAY tracks LOOP
  IF jsonb_typeof(p_goals->track)<>'object' OR
     (p_goals->track->>'tier1At') !~ '^[0-9]{1,7}$' OR
     (p_goals->track->>'tier2At') !~ '^[0-9]{1,7}$'
  THEN RAISE EXCEPTION 'WB27_INIT_INVALID_GOALS'; END IF;
  t1:=(p_goals->track->>'tier1At')::integer;
  t2:=(p_goals->track->>'tier2At')::integer;
  IF t1<1 OR t2<=t1 OR t2>1000000
  THEN RAISE EXCEPTION 'WB27_INIT_INVALID_GOALS'; END IF;
 END LOOP;
 INSERT INTO private.world_boss_war_camps_v27(
  event_id,fort_tier1,fort_tier2,field_tier1,field_tier2,
  siege_tier1,siege_tier2)
 VALUES(p_event,
  (p_goals->'fortifications'->>'tier1At')::integer,
  (p_goals->'fortifications'->>'tier2At')::integer,
  (p_goals->'fieldProvisions'->>'tier1At')::integer,
  (p_goals->'fieldProvisions'->>'tier2At')::integer,
  (p_goals->'siegecraft'->>'tier1At')::integer,
  (p_goals->'siegecraft'->>'tier2At')::integer);
 FOR r IN SELECT value FROM jsonb_array_elements(p_recipes) LOOP
  IF jsonb_typeof(r)<>'object' OR
     r->>'id' IS NULL OR r->>'id' !~ '^[A-Z0-9_]{4,100}$' OR
     r->>'track' IS NULL OR
     NOT ((r->>'track')=ANY(tracks)) OR
     (r->>'tier') !~ '^[1-4]$' OR
     jsonb_typeof(r->'materials')<>'array' OR
     jsonb_array_length(r->'materials')<>2
  THEN RAISE EXCEPTION 'WB27_INIT_INVALID_RECIPE'; END IF;
  recipe_id:=r->>'id';track:=r->>'track';tier:=(r->>'tier')::integer;
  IF NOT(track=ANY(tracks)) OR
     recipe_id=ANY(seen_recipe_ids) OR
     (track||':'||tier::text)=ANY(seen_positions)
  THEN RAISE EXCEPTION 'WB27_INIT_DUPLICATE_RECIPE'; END IF;
  seen_recipe_ids:=array_append(seen_recipe_ids,recipe_id);
  seen_positions:=array_append(seen_positions,track||':'||tier::text);
  seen_material_ids:=ARRAY[]::text[];
  FOR m IN SELECT value FROM jsonb_array_elements(r->'materials') LOOP
   material_id:=m->>'itemId';
   IF material_id IS NULL OR material_id !~ '^[A-Z0-9_]{2,100}$' OR
      material_id=ANY(seen_material_ids) OR
      (m->>'quantity') IS NULL OR
      (m->>'quantity') !~ '^[0-9]{1,9}$'
   THEN RAISE EXCEPTION 'WB27_INIT_INVALID_MATERIAL'; END IF;
   q:=(m->>'quantity')::bigint;
   IF q<1 OR q>1000000 THEN RAISE EXCEPTION 'WB27_INIT_INVALID_MATERIAL'; END IF;
   seen_material_ids:=array_append(seen_material_ids,material_id);
  END LOOP;
  INSERT INTO private.world_boss_war_recipes_v27(
   event_id,recipe_id,tier,track,materials)
  VALUES(p_event,recipe_id,tier,track,r->'materials');
  count_recipes:=count_recipes+1;
 END LOOP;
 IF count_recipes<>12 OR array_length(seen_positions,1)<>12
 THEN RAISE EXCEPTION 'WB27_INIT_INCOMPLETE_RECIPES'; END IF;
 RETURN jsonb_build_object('eventId',p_event::text,
  'recipesInstalled',count_recipes,'policyLocked',true);
END
$init$;
REVOKE ALL ON FUNCTION private.world_boss_v27_initialize(uuid,jsonb,jsonb)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.world_boss_v27_initialize(uuid,jsonb,jsonb)
 TO service_role;
COMMIT;
