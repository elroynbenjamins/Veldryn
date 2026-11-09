-- VELDRYN character and class combat XP rebalance: read-only production/staging preview.
-- No player data is changed. Run immediately before approving a maintenance backfill.
WITH threshold_steps AS (
  SELECT n + 1 AS level,
    sum(floor(90.0 * power(n::double precision,1.65) + n * 35)::bigint * 8)
      OVER (ORDER BY n) AS total_xp
  FROM generate_series(1,99) AS n
),
projection AS (
  SELECT c.id, c.level AS prior_level, c.xp,
    coalesce((SELECT max(level) FROM threshold_steps t WHERE c.xp >= t.total_xp),1)::int AS next_level
  FROM public.characters AS c
)
SELECT count(*) AS characters,
       count(*) FILTER (WHERE next_level < prior_level) AS lower_level,
       count(*) FILTER (WHERE next_level = prior_level) AS unchanged_level,
       count(*) FILTER (WHERE next_level > prior_level) AS higher_level,
       min(prior_level) AS prior_min_level,
       max(prior_level) AS prior_max_level,
       min(next_level) AS next_min_level,
       max(next_level) AS next_max_level,
       (SELECT total_xp FROM threshold_steps WHERE level=37) AS new_character_level_37_xp
FROM projection;

-- Must agree across both canonical table and online save before application.
SELECT
  count(*) AS matching_character_ids,
  count(*) FILTER (WHERE g.state->'character'->>'xp' IS DISTINCT FROM c.xp::text) AS xp_mismatches,
  count(*) FILTER (WHERE (g.state->'character'->>'level')::int IS DISTINCT FROM c.level) AS level_mismatches
FROM public.characters AS c
JOIN public.online_game_states AS g ON g.character_id=c.id
WHERE jsonb_typeof(g.state->'character')='object'
  AND (g.state->'character'->>'id')=c.id::text;

-- Class combat disciplines use a separate 2.09 exponent with skill scale 1.6.
-- Includes the active character and all parked roster characters.
WITH class_steps AS (
 SELECT n+1 AS level,
   sum(floor(floor(90.0 * power(n::double precision,2.09)+n*35)*1.6)::bigint)
     OVER (ORDER BY n) AS total_xp
 FROM generate_series(1,99) AS n
),
class_skill_records AS (
 SELECT skill.value AS skill
 FROM public.online_game_states AS g
 CROSS JOIN LATERAL jsonb_array_elements(
   CASE WHEN jsonb_typeof(g.state->'character'->'classSkills')='array'
   THEN g.state->'character'->'classSkills' ELSE '[]'::jsonb END
 ) AS skill(value)
 UNION ALL
 SELECT skill.value
 FROM public.online_game_states AS g
 CROSS JOIN LATERAL jsonb_array_elements(
   CASE WHEN jsonb_typeof(g.state->'otherCharacters')='array'
   THEN g.state->'otherCharacters' ELSE '[]'::jsonb END
 ) AS roster(value)
 CROSS JOIN LATERAL jsonb_array_elements(
   CASE WHEN jsonb_typeof(roster.value->'character'->'classSkills')='array'
   THEN roster.value->'character'->'classSkills' ELSE '[]'::jsonb END
 ) AS skill(value)
),
class_projection AS (
 SELECT (skill->>'level')::integer AS prior_level,
   coalesce((SELECT max(t.level) FROM class_steps AS t
             WHERE (skill->>'xp')::bigint>=t.total_xp),1)::integer AS next_level
 FROM class_skill_records
 WHERE jsonb_typeof(skill)='object'
   AND jsonb_typeof(skill->'xp')='number'
   AND jsonb_typeof(skill->'level')='number'
)
SELECT count(*) AS class_skills,
       count(*) FILTER (WHERE next_level<prior_level) AS lower_level,
       count(*) FILTER (WHERE next_level=prior_level) AS unchanged_level,
       count(*) FILTER (WHERE next_level>prior_level) AS higher_level,
       (SELECT total_xp FROM class_steps WHERE level=24) AS new_class_level_24_xp
FROM class_projection;
