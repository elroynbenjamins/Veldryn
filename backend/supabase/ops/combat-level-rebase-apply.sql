-- VELDRYN character + class combat XP rebase: MANUAL ONE-TIME MAINTENANCE BACKFILL.
-- Character: legacy 50 -> 37 (exponent 1.65, scale 8).
-- Class combat disciplines: prior class skill 50 -> 24 (exponent 2.09, scale 1.6).
-- Both levels are derived from existing XP; never reduce earned XP.
-- Never put this file under supabase/migrations/ or apply automatically on merge.
-- Prerequisites: new mobile build is mandatory, gameplay/co-op Edge Functions deployed,
-- player writes paused, read-only preview reviewed, fresh external backup secured.
-- In the same database session FIRST run:
--   BEGIN;
--   SET LOCAL veldryn.combat_rebase_approved = 'yes';
-- Then execute this SQL script; it ends by committing the same transaction.
-- Executing it without that explicit transaction setting intentionally fails.
-- No XP, inventory, unlocks, or achievements may be reset by this operation.
DO $guard$
BEGIN
 IF current_setting('veldryn.combat_rebase_approved', true) IS DISTINCT FROM 'yes' THEN
   RAISE EXCEPTION 'Combat XP rebase blocked: explicit same-session approval required';
 END IF;
END $guard$;

LOCK TABLE public.characters, public.online_game_states IN SHARE ROW EXCLUSIVE MODE;
CREATE SCHEMA IF NOT EXISTS veldryn_ops;
REVOKE ALL ON SCHEMA veldryn_ops FROM PUBLIC;

-- Private, immutable pre-change snapshots for recovery/audit. First successful
-- run captures them once; re-runs do not overwrite historical data.
CREATE TABLE IF NOT EXISTS veldryn_ops.characters_before_combat_rebase_20261107
AS SELECT * FROM public.characters;
CREATE TABLE IF NOT EXISTS veldryn_ops.game_states_before_combat_rebase_20261107
AS SELECT * FROM public.online_game_states;
ALTER TABLE veldryn_ops.characters_before_combat_rebase_20261107 ENABLE ROW LEVEL SECURITY;
ALTER TABLE veldryn_ops.game_states_before_combat_rebase_20261107 ENABLE ROW LEVEL SECURITY;

-- Exact match to apps/mobile/src/core/progression.ts characterXpForNextLevel.
CREATE OR REPLACE FUNCTION veldryn_ops.combat_level_from_xp_v1(p_xp bigint)
RETURNS integer
LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER
SET search_path = pg_catalog
AS $fn$
  SELECT coalesce((
    SELECT max(t.level)
    FROM (
      SELECT n + 1 AS level,
             sum(floor(90.0 * power(n::double precision, 1.65) + n * 35)::bigint * 8)
                OVER (ORDER BY n) AS minimum_xp
      FROM generate_series(1,99) AS n
    ) AS t
    WHERE p_xp >= t.minimum_xp
  ),1)::integer;
$fn$;
REVOKE ALL ON FUNCTION veldryn_ops.combat_level_from_xp_v1(bigint) FROM PUBLIC;

UPDATE public.characters AS c
SET level=veldryn_ops.combat_level_from_xp_v1(c.xp)
WHERE c.level IS DISTINCT FROM veldryn_ops.combat_level_from_xp_v1(c.xp);

-- Separate class-skill progression: floor(floor(base with exponent 2.09) * 1.6).
-- This is deliberately different from the character XP curve (1.65 * 8).
CREATE OR REPLACE FUNCTION veldryn_ops.class_combat_level_from_xp_v1(p_xp bigint)
RETURNS integer
LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER
SET search_path = pg_catalog
AS $fn$
 SELECT coalesce((
   SELECT max(t.level)
   FROM (
     SELECT n+1 AS level,
       sum(floor(floor(90.0 * power(n::double precision,2.09) + n*35) * 1.6)::bigint)
         OVER (ORDER BY n) AS minimum_xp
     FROM generate_series(1,99) AS n
   ) AS t
   WHERE p_xp>=t.minimum_xp
 ),1)::integer;
$fn$;
REVOKE ALL ON FUNCTION veldryn_ops.class_combat_level_from_xp_v1(bigint) FROM PUBLIC;

-- Normalize an active/parked character and its combat disciplines while
-- preserving XP, items, equipment, unlocks and every unrelated JSON field.
CREATE OR REPLACE FUNCTION veldryn_ops.rebase_combat_character_v1(p_character jsonb)
RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER
SET search_path = pg_catalog
AS $fn$
DECLARE result jsonb;
BEGIN
  IF jsonb_typeof(p_character) IS DISTINCT FROM 'object' THEN RETURN p_character; END IF;
  result := p_character;
  IF jsonb_typeof(p_character->'xp')='number' THEN
    result := jsonb_set(result,'{level}',
      to_jsonb(veldryn_ops.combat_level_from_xp_v1((p_character->>'xp')::bigint)),true);
  END IF;
  IF jsonb_typeof(p_character->'classSkills')='array' THEN
    result := jsonb_set(result,'{classSkills}',
      coalesce((
        SELECT jsonb_agg(
          CASE WHEN jsonb_typeof(s.value)='object' AND jsonb_typeof(s.value->'xp')='number'
               THEN jsonb_set(s.value,'{level}',
                 to_jsonb(veldryn_ops.class_combat_level_from_xp_v1((s.value->>'xp')::bigint)),true)
               ELSE s.value END ORDER BY s.ordinality)
        FROM jsonb_array_elements(p_character->'classSkills')
             WITH ORDINALITY AS s(value,ordinality)
      ),'[]'::jsonb),false);
  END IF;
  RETURN result;
END;
$fn$;
REVOKE ALL ON FUNCTION veldryn_ops.rebase_combat_character_v1(jsonb) FROM PUBLIC;

-- Save-state revision increments on every changed snapshot so stale gameplay
-- commands cannot overwrite the rebase. Handle the active and parked roster.
WITH active_rebased AS (
 SELECT g.account_id,g.character_id,
   CASE WHEN jsonb_typeof(g.state->'character')='object'
        THEN jsonb_set(g.state,'{character}',
          veldryn_ops.rebase_combat_character_v1(g.state->'character'),false)
        ELSE g.state END AS snapshot
 FROM public.online_game_states AS g
), fully_rebased AS (
 SELECT a.account_id,a.character_id,
   CASE WHEN jsonb_typeof(a.snapshot->'otherCharacters')='array'
        THEN jsonb_set(a.snapshot,'{otherCharacters}',
          coalesce((
            SELECT jsonb_agg(
              CASE WHEN jsonb_typeof(member.value->'character')='object'
                   THEN jsonb_set(member.value,'{character}',
                       veldryn_ops.rebase_combat_character_v1(member.value->'character'),false)
                   ELSE member.value END ORDER BY member.ordinality)
            FROM jsonb_array_elements(a.snapshot->'otherCharacters')
                 WITH ORDINALITY AS member(value,ordinality)
          ),'[]'::jsonb),false)
        ELSE a.snapshot END AS next_state
 FROM active_rebased AS a
)
UPDATE public.online_game_states AS g
SET state=r.next_state,revision=g.revision+1,updated_at=now()
FROM fully_rebased AS r
WHERE g.account_id=r.account_id
  AND g.character_id IS NOT DISTINCT FROM r.character_id
  AND g.state IS DISTINCT FROM r.next_state;

-- Do not commit unless the backup is complete and all XP/level invariants hold.
DO $verify$
BEGIN
 IF (SELECT count(*) FROM veldryn_ops.characters_before_combat_rebase_20261107)
   <> (SELECT count(*) FROM public.characters) THEN
   RAISE EXCEPTION 'Character backup count mismatch; no commit';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.characters c
   JOIN veldryn_ops.characters_before_combat_rebase_20261107 b USING(id)
   WHERE c.xp IS DISTINCT FROM b.xp
 ) THEN
   RAISE EXCEPTION 'Character XP altered unexpectedly; no commit';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.characters c
   WHERE c.level IS DISTINCT FROM veldryn_ops.combat_level_from_xp_v1(c.xp)
 ) THEN
   RAISE EXCEPTION 'Canonical character level mismatch; no commit';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.online_game_states g
   WHERE jsonb_typeof(g.state->'character')='object'
     AND jsonb_typeof(g.state->'character'->'xp')='number'
     AND (g.state->'character'->>'level')::int
       IS DISTINCT FROM veldryn_ops.combat_level_from_xp_v1((g.state->'character'->>'xp')::bigint)
 ) THEN
   RAISE EXCEPTION 'Active save level mismatch; no commit';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.online_game_states g
   CROSS JOIN LATERAL jsonb_array_elements(
     CASE WHEN jsonb_typeof(g.state->'otherCharacters')='array'
          THEN g.state->'otherCharacters' ELSE '[]'::jsonb END
   ) AS parked(value)
   WHERE jsonb_typeof(parked.value->'character')='object'
     AND jsonb_typeof(parked.value->'character'->'xp')='number'
     AND (parked.value->'character'->>'level')::int
       IS DISTINCT FROM veldryn_ops.combat_level_from_xp_v1((parked.value->'character'->>'xp')::bigint)
 ) THEN
   RAISE EXCEPTION 'Parked roster level mismatch; no commit';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.online_game_states g
   CROSS JOIN LATERAL jsonb_array_elements(
     CASE WHEN jsonb_typeof(g.state->'character'->'classSkills')='array'
          THEN g.state->'character'->'classSkills' ELSE '[]'::jsonb END
   ) AS s(value)
   WHERE jsonb_typeof(s.value->'xp')='number'
     AND (s.value->>'level')::int IS DISTINCT FROM
       veldryn_ops.class_combat_level_from_xp_v1((s.value->>'xp')::bigint)
 ) THEN
   RAISE EXCEPTION 'Active class combat skill mismatch; no commit';
 END IF;
 IF EXISTS (
   SELECT 1 FROM public.online_game_states g
   CROSS JOIN LATERAL jsonb_array_elements(
     CASE WHEN jsonb_typeof(g.state->'otherCharacters')='array'
          THEN g.state->'otherCharacters' ELSE '[]'::jsonb END
   ) AS parked(value)
   CROSS JOIN LATERAL jsonb_array_elements(
     CASE WHEN jsonb_typeof(parked.value->'character'->'classSkills')='array'
          THEN parked.value->'character'->'classSkills' ELSE '[]'::jsonb END
   ) AS s(value)
   WHERE jsonb_typeof(s.value->'xp')='number'
     AND (s.value->>'level')::int IS DISTINCT FROM
       veldryn_ops.class_combat_level_from_xp_v1((s.value->>'xp')::bigint)
 ) THEN
   RAISE EXCEPTION 'Parked class combat skill mismatch; no commit';
 END IF;
END $verify$;
COMMIT;
