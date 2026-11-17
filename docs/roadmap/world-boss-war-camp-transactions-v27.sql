-- VELDRYN WORLD BOSS V27: DISABLED PRIVATE WAR CAMP DRAFT.
-- NOT A PRODUCTION/STAGING MIGRATION. Use only disposable PostgreSQL 16
-- fixture after V17/V18, V22 and V26 draft SQL. NO public RPC.
-- SOURCE: authoritative online_game_states.state.inventory.stacks;
-- selected owned character's INVENTORY, not the shared bank or overflow.
-- TWO account-wide bundles, five prep days; a fixed community freeze
-- at Saturday 00:00 UTC. No actual World Sigil minting.
BEGIN;

CREATE TABLE private.world_boss_war_camps_v27 (
 event_id uuid PRIMARY KEY REFERENCES private.world_boss_events_v17(id) ON DELETE RESTRICT,
 revision bigint NOT NULL DEFAULT 0 CHECK (revision>=0),
 fortifications integer NOT NULL DEFAULT 0 CHECK (fortifications>=0),
 field_provisions integer NOT NULL DEFAULT 0 CHECK (field_provisions>=0),
 siegecraft integer NOT NULL DEFAULT 0 CHECK (siegecraft>=0),
 fort_tier1 integer NOT NULL CHECK(fort_tier1>0),
 fort_tier2 integer NOT NULL CHECK(fort_tier2>fort_tier1),
 field_tier1 integer NOT NULL CHECK(field_tier1>0),
 field_tier2 integer NOT NULL CHECK(field_tier2>field_tier1),
 siege_tier1 integer NOT NULL CHECK(siege_tier1>0),
 siege_tier2 integer NOT NULL CHECK(siege_tier2>siege_tier1),
 frozen_at timestamptz,
 frozen_snapshot jsonb,
 CHECK ((frozen_at IS NULL)=(frozen_snapshot IS NULL))
);
CREATE TABLE private.world_boss_war_recipes_v27 (
 event_id uuid NOT NULL REFERENCES private.world_boss_war_camps_v27(event_id) ON DELETE RESTRICT,
 recipe_id text NOT NULL CHECK(recipe_id ~ '^[A-Z0-9_]{4,100}$'),
 track text NOT NULL CHECK(track IN('fortifications','fieldProvisions','siegecraft')),
 tier smallint NOT NULL CHECK(tier BETWEEN 1 AND 4),
 materials jsonb NOT NULL CHECK(jsonb_typeof(materials)='array'
  AND jsonb_array_length(materials) BETWEEN 1 AND 12),
 PRIMARY KEY(event_id,recipe_id)
);
CREATE TABLE private.world_boss_war_donations_v27 (
 event_id uuid NOT NULL REFERENCES private.world_boss_war_camps_v27(event_id) ON DELETE RESTRICT,
 account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 request_id text NOT NULL CHECK(request_id ~ '^[A-Za-z0-9_-]{8,128}$'),
 -- Keep the immutable character identity even if its owner later deletes
 -- that character. Server-only V18/V22 reservation (or V27 donation) must
 -- verify the owner against public.characters BEFORE writing this receipt.
 -- An FK with ON DELETE RESTRICT would permanently block character deletion.
 character_id uuid NOT NULL,
 recipe_id text NOT NULL,
 track text NOT NULL CHECK(track IN('fortifications','fieldProvisions','siegecraft')),
 ordinal smallint NOT NULL CHECK(ordinal IN(1,2)),
 paid_materials jsonb NOT NULL,
 at_utc timestamptz NOT NULL DEFAULT clock_timestamp(),
 revision bigint NOT NULL CHECK(revision>=1),
 PRIMARY KEY(event_id,account_id,request_id),
 UNIQUE(event_id,account_id,ordinal),
 FOREIGN KEY(event_id,recipe_id)
  REFERENCES private.world_boss_war_recipes_v27(event_id,recipe_id)
);
CREATE INDEX world_boss_v27_donations_track_idx
 ON private.world_boss_war_donations_v27(event_id,track);
CREATE FUNCTION private.world_boss_v27_guard_camp_update()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $guard$
BEGIN
 IF ROW(NEW.event_id,NEW.fort_tier1,NEW.fort_tier2,NEW.field_tier1,
        NEW.field_tier2,NEW.siege_tier1,NEW.siege_tier2)
    IS DISTINCT FROM
    ROW(OLD.event_id,OLD.fort_tier1,OLD.fort_tier2,OLD.field_tier1,
        OLD.field_tier2,OLD.siege_tier1,OLD.siege_tier2)
 THEN RAISE EXCEPTION 'WB27_IMMUTABLE_COMMUNITY_GOALS'; END IF;
 IF OLD.frozen_snapshot IS NOT NULL AND NEW IS DISTINCT FROM OLD
 THEN RAISE EXCEPTION 'WB27_FROZEN_CAMP_IMMUTABLE'; END IF;
 IF NEW.revision<OLD.revision OR NEW.revision>OLD.revision+1
 THEN RAISE EXCEPTION 'WB27_INVALID_REVISION'; END IF;
 RETURN NEW;
END
$guard$;
CREATE TRIGGER world_boss_v27_camp_guard
 BEFORE UPDATE ON private.world_boss_war_camps_v27
 FOR EACH ROW EXECUTE FUNCTION private.world_boss_v27_guard_camp_update();

-- SHA-256 of EXACTLY the JS V11 canonical JSON field order. PostgreSQL
-- jsonb's alphabetical output cannot be hashed directly for this purpose.
CREATE FUNCTION private.world_boss_v27_snapshot(
 p_event uuid,p_revision bigint,p_fort integer,p_field integer,p_siege integer
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE STRICT SECURITY INVOKER
 SET search_path='' AS $snap$
DECLARE
 canonical text;
BEGIN
 canonical:=format('{"version":"world-boss-war-camp-v11","eventId":"%s","revision":%s,"levels":{"fortifications":%s,"fieldProvisions":%s,"siegecraft":%s}}',
  p_event::text,p_revision,p_fort,p_field,p_siege);
 RETURN jsonb_build_object('version','world-boss-war-camp-v11',
  'eventId',p_event::text,'revision',p_revision,
  'levels',jsonb_build_object('fortifications',p_fort,
   'fieldProvisions',p_field,'siegecraft',p_siege),
  'digest',encode(sha256(convert_to(canonical,'UTF8')),'hex'));
END
$snap$;

-- Use event-first lock ordering everywhere, including other World Boss
-- transactions. This call freezes at (or after) Saturday 00:00 UTC,
-- never in preparation. The stored snapshot is immutable after first freeze.
CREATE FUNCTION private.world_boss_v27_freeze(p_event uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $freeze$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 w private.world_boss_war_camps_v27%ROWTYPE;
 snap jsonb;
 now_at timestamptz;
BEGIN
 SELECT * INTO e FROM private.world_boss_events_v17 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB27_EVENT_MISSING'; END IF;
 now_at:=clock_timestamp();
 SELECT * INTO w FROM private.world_boss_war_camps_v27 WHERE event_id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB27_WAR_CAMP_MISSING'; END IF;
 IF w.frozen_snapshot IS NOT NULL THEN RETURN w.frozen_snapshot; END IF;
 IF e.status NOT IN('active','closed') OR
    e.ends_at<>e.starts_at+interval '7 days'
    OR private.world_boss_v22_window_at(e.starts_at,e.starts_at+interval '5 days')<>0
    OR now_at<e.starts_at+interval '5 days'
 THEN RAISE EXCEPTION 'WB27_PREPARATION_NOT_FINISHED'; END IF;
 snap:=private.world_boss_v27_snapshot(
  p_event,w.revision,
  CASE WHEN w.fortifications>=w.fort_tier2 THEN 2
    WHEN w.fortifications>=w.fort_tier1 THEN 1 ELSE 0 END,
  CASE WHEN w.field_provisions>=w.field_tier2 THEN 2
    WHEN w.field_provisions>=w.field_tier1 THEN 1 ELSE 0 END,
  CASE WHEN w.siegecraft>=w.siege_tier2 THEN 2
    WHEN w.siegecraft>=w.siege_tier1 THEN 1 ELSE 0 END);
 UPDATE private.world_boss_war_camps_v27
  SET frozen_at=now_at,frozen_snapshot=snap WHERE event_id=p_event;
 RETURN snap;
END
$freeze$;

-- Authenticated principal injected by the PRIVATE service. Only the
-- selected ACTIVE owned character's unslotted material stacks can be debited.
-- The account has one save row (active + inactive). Players must switch to
-- the donating character first; never debit a parked character or the bank.
-- Lock event -> war camp -> online save; no partial item debits on failure.
CREATE FUNCTION private.world_boss_v27_donate(
 p_event uuid,p_account uuid,p_character uuid,p_request text,p_recipe text
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $donate$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 w private.world_boss_war_camps_v27%ROWTYPE;
 old private.world_boss_war_donations_v27%ROWTYPE;
 recipe private.world_boss_war_recipes_v27%ROWTYPE;
 material_ids text[]:=ARRAY[]::text[];
 saved record;
 now_at timestamptz;
 current_count integer;
 goal2 integer;
 already integer;
 ordinal_slot integer;
 mat jsonb;
 stack jsonb;
 stacks jsonb;
 new_stacks jsonb;
 remaining bigint;
 amount bigint;
 take_qty bigint;
 item_id text;
 qty bigint;
 new_state jsonb;
 new_count integer;
 new_revision bigint;
 updated_snapshot jsonb;
BEGIN
 IF p_account IS NULL OR p_character IS NULL OR p_request IS NULL OR
    p_request !~ '^[A-Za-z0-9_-]{8,128}$' OR
    p_recipe IS NULL OR p_recipe !~ '^[A-Z0-9_]{4,100}$'
 THEN RAISE EXCEPTION 'WB27_INVALID_REQUEST'; END IF;
 SELECT * INTO e FROM private.world_boss_events_v17 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB27_EVENT_MISSING'; END IF;
 now_at:=clock_timestamp();
 SELECT * INTO old FROM private.world_boss_war_donations_v27
  WHERE event_id=p_event AND account_id=p_account AND request_id=p_request FOR UPDATE;
 IF FOUND THEN
  IF old.character_id IS DISTINCT FROM p_character OR
     old.recipe_id IS DISTINCT FROM p_recipe
  THEN RAISE EXCEPTION 'WB27_IDEMPOTENCY_CONFLICT'; END IF;
  RETURN jsonb_build_object('eventId',p_event::text,'accountId',p_account::text,
   'requestId',p_request,'recipeId',p_recipe,'ordinal',old.ordinal,
   'track',old.track,'revision',old.revision,'paidMaterials',old.paid_materials,
   'repeated',true);
 END IF;
 IF e.status<>'active' OR e.ends_at<>e.starts_at+interval '7 days' OR
    now_at<e.starts_at OR now_at>=e.starts_at+interval '5 days'
 THEN RAISE EXCEPTION 'WB27_PREPARATION_CLOSED'; END IF;
 SELECT * INTO w FROM private.world_boss_war_camps_v27
  WHERE event_id=p_event FOR UPDATE;
 IF NOT FOUND OR w.frozen_snapshot IS NOT NULL
 THEN RAISE EXCEPTION 'WB27_WAR_CAMP_FROZEN'; END IF;
 SELECT * INTO recipe FROM private.world_boss_war_recipes_v27
  WHERE event_id=p_event AND recipe_id=p_recipe;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB27_UNKNOWN_RECIPE'; END IF;
 IF recipe.track='fortifications' THEN
  current_count:=w.fortifications;goal2:=w.fort_tier2;
 ELSIF recipe.track='fieldProvisions' THEN
  current_count:=w.field_provisions;goal2:=w.field_tier2;
 ELSE
  current_count:=w.siegecraft;goal2:=w.siege_tier2;
 END IF;
 IF current_count>=goal2 THEN RAISE EXCEPTION 'WB27_TRACK_COMPLETE'; END IF;
 SELECT count(*) INTO already FROM private.world_boss_war_donations_v27
  WHERE event_id=p_event AND account_id=p_account;
 IF already>=2 THEN RAISE EXCEPTION 'WB27_ACCOUNT_BUNDLE_LIMIT'; END IF;
 ordinal_slot:=already+1;
 IF NOT EXISTS(SELECT 1 FROM public.characters
  WHERE id=p_character AND account_id=p_account)
 THEN RAISE EXCEPTION 'WB27_CHARACTER_NOT_OWNED'; END IF;
 SELECT s.account_id,s.character_id,s.revision,s.state INTO saved
 FROM public.online_game_states s
 WHERE s.account_id=p_account AND s.character_id=p_character FOR UPDATE;
 IF NOT FOUND OR saved.state#>>'{character,id}' IS DISTINCT FROM p_character::text
    OR jsonb_typeof(saved.state#>'{inventory,stacks}')<>'array'
 THEN RAISE EXCEPTION 'WB27_MISSING_AUTHORITY_INVENTORY'; END IF;
 stacks:=saved.state#>'{inventory,stacks}';
 FOR mat IN SELECT value FROM jsonb_array_elements(recipe.materials) LOOP
  item_id:=mat->>'itemId';
  IF item_id IS NULL OR item_id !~ '^[A-Z0-9_]{2,100}$'
    OR item_id=ANY(material_ids)
    OR mat->>'quantity' IS NULL OR (mat->>'quantity') !~ '^[0-9]{1,9}$'
  THEN RAISE EXCEPTION 'WB27_CORRUPT_RECIPE'; END IF;
  material_ids:=array_append(material_ids,item_id);
  remaining:=(mat->>'quantity')::bigint;
  IF remaining<1 THEN RAISE EXCEPTION 'WB27_CORRUPT_RECIPE'; END IF;
  new_stacks:='[]'::jsonb;
  FOR stack IN SELECT value FROM jsonb_array_elements(stacks) LOOP
   IF jsonb_typeof(stack)<>'object' OR stack->>'quantity' IS NULL OR
      (stack->>'quantity') !~ '^[0-9]{1,12}$'
   THEN RAISE EXCEPTION 'WB27_INVALID_INVENTORY_STACK'; END IF;
   qty:=(stack->>'quantity')::bigint;
   IF qty<1 OR qty>1000000000 THEN RAISE EXCEPTION 'WB27_INVALID_INVENTORY_QUANTITY'; END IF;
   IF remaining>0 AND stack->>'itemId'=item_id
      AND NOT(stack ? 'instanceId') THEN
    take_qty:=LEAST(qty,remaining);
    remaining:=remaining-take_qty;
    IF qty>take_qty THEN
     new_stacks:=new_stacks||jsonb_build_array(
      jsonb_set(stack,'{quantity}',to_jsonb(qty-take_qty)));
    END IF;
   ELSE
    new_stacks:=new_stacks||jsonb_build_array(stack);
   END IF;
  END LOOP;
  IF remaining>0 THEN RAISE EXCEPTION 'WB27_INSUFFICIENT_MATERIALS'; END IF;
  stacks:=new_stacks;
 END LOOP;
 new_state:=jsonb_set(saved.state,'{inventory,stacks}',stacks,false);
 UPDATE public.online_game_states
  SET state=new_state,revision=revision+1,updated_at=now_at
  WHERE account_id=p_account AND character_id=p_character;
 new_count:=current_count+1;
 new_revision:=w.revision+1;
 IF recipe.track='fortifications' THEN
  UPDATE private.world_boss_war_camps_v27
   SET fortifications=new_count,revision=new_revision WHERE event_id=p_event;
 ELSIF recipe.track='fieldProvisions' THEN
  UPDATE private.world_boss_war_camps_v27
   SET field_provisions=new_count,revision=new_revision WHERE event_id=p_event;
 ELSE
  UPDATE private.world_boss_war_camps_v27
   SET siegecraft=new_count,revision=new_revision WHERE event_id=p_event;
 END IF;
 INSERT INTO private.world_boss_war_donations_v27(
  event_id,account_id,request_id,character_id,recipe_id,
  track,ordinal,paid_materials,at_utc,revision)
 VALUES(p_event,p_account,p_request,p_character,p_recipe,
  recipe.track,ordinal_slot,recipe.materials,now_at,new_revision);
 RETURN jsonb_build_object('eventId',p_event::text,'accountId',p_account::text,
  'requestId',p_request,'recipeId',p_recipe,'ordinal',ordinal_slot,
  'track',recipe.track,'revision',new_revision,'paidMaterials',recipe.materials,
  'repeated',false);
END
$donate$;

-- One atomic entry for authored V26 reservations: freezes War Camp on demand
-- under event lock and requires exact frozen digest before allocating an attempt.
CREATE FUNCTION private.world_boss_v27_reserve_frozen(
 p_event uuid,p_account uuid,p_character uuid,p_request text,
 p_order text,p_seed text,p_digest text,p_account_roster jsonb,
 p_engine text,p_worker text,p_camp_digest text,p_profile_digest text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $reserve$
DECLARE
 snap jsonb;
BEGIN
 -- Same event-first row lock order. V22 handles duplicate attempt receipts.
 snap:=private.world_boss_v27_freeze(p_event);
 IF snap->>'digest' IS DISTINCT FROM p_camp_digest
    OR p_account_roster->'warCamp'->>'digest' IS DISTINCT FROM snap->>'digest'
 THEN RAISE EXCEPTION 'WB27_FROZEN_CAMP_DIGEST_MISMATCH'; END IF;
 RETURN private.world_boss_v22_reserve_account(
  p_event,p_account,p_character,p_request,p_order,p_seed,p_digest,
  p_account_roster,p_engine,p_worker,p_camp_digest,p_profile_digest);
END
$reserve$;

-- Read-only board projection: community progress is server-owned. After
-- Saturday, the first reader freezes the snapshot; no last-second donation
-- can sneak across the event-row transaction boundary.
CREATE FUNCTION private.world_boss_v27_progress(p_event uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $progress$
DECLARE
 e private.world_boss_events_v17%ROWTYPE;
 w private.world_boss_war_camps_v27%ROWTYPE;
 frozen jsonb;
BEGIN
 SELECT * INTO e FROM private.world_boss_events_v17 WHERE id=p_event FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB27_EVENT_MISSING'; END IF;
 IF clock_timestamp()>=e.starts_at+interval '5 days'
 THEN PERFORM private.world_boss_v27_freeze(p_event); END IF;
 SELECT * INTO w FROM private.world_boss_war_camps_v27 WHERE event_id=p_event;
 IF NOT FOUND THEN RAISE EXCEPTION 'WB27_WAR_CAMP_MISSING'; END IF;
 RETURN jsonb_build_object(
  'eventId',p_event::text,
  'revision',w.revision,
  'contributions',jsonb_build_object(
   'fortifications',w.fortifications,
   'fieldProvisions',w.field_provisions,
   'siegecraft',w.siegecraft),
  'goals',jsonb_build_object(
   'fortifications',jsonb_build_object('tier1At',w.fort_tier1,'tier2At',w.fort_tier2),
   'fieldProvisions',jsonb_build_object('tier1At',w.field_tier1,'tier2At',w.field_tier2),
   'siegecraft',jsonb_build_object('tier1At',w.siege_tier1,'tier2At',w.siege_tier2)),
  'frozen',w.frozen_snapshot IS NOT NULL,
  'snapshot',w.frozen_snapshot);
END
$progress$;

ALTER TABLE private.world_boss_war_camps_v27 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_war_recipes_v27 ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.world_boss_war_donations_v27 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.world_boss_war_camps_v27,
 private.world_boss_war_recipes_v27,
 private.world_boss_war_donations_v27 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v27_snapshot(uuid,bigint,integer,integer,integer)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v27_freeze(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v27_progress(uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v27_donate(uuid,uuid,uuid,text,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v27_reserve_frozen(uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.world_boss_v27_guard_camp_update()
 FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON private.world_boss_war_camps_v27 TO service_role;
GRANT SELECT,INSERT ON private.world_boss_war_recipes_v27,
 private.world_boss_war_donations_v27 TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v27_guard_camp_update()
 TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v27_snapshot(uuid,bigint,integer,integer,integer)
 TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v27_freeze(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v27_progress(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v27_donate(uuid,uuid,uuid,text,text)
 TO service_role;
GRANT EXECUTE ON FUNCTION private.world_boss_v27_reserve_frozen(uuid,uuid,uuid,text,text,text,text,jsonb,text,text,text,text)
 TO service_role;
COMMIT;
