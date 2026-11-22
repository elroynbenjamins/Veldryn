-- Increase Guild Project daily effort allowance from 2,400 to 3,500 base points
-- per account / project / UTC calendar day (3 seconds of verified effort = 1 point).
-- Keep guild-project efficiency perks, receipt idempotency, weekly completion caps,
-- guild membership checks, and server-side time validation unchanged.
--
-- 2,400 points = 7,200,000 ms; 3,500 points = 10,500,000 ms.
-- Safe to replay in environments that received the hosted hotfix first.
BEGIN;

DO $guild_daily_cap$
DECLARE
  v_name text;
  v_definition text;
  v_old_count integer;
  v_new_count integer;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'credit_guild_project_effort_v2',
    'guild_project_my_daily_effort_v1'
  ]
  LOOP
    SELECT pg_get_functiondef(p.oid)
      INTO STRICT v_definition
    FROM pg_proc AS p
    JOIN pg_namespace AS n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = v_name;

    v_old_count := (length(v_definition)
      - length(replace(v_definition, '7200000', ''))) / 7;
    v_new_count := (length(v_definition)
      - length(replace(v_definition, '10500000', ''))) / 8;

    IF v_old_count = 1 AND v_new_count = 0 THEN
      EXECUTE replace(v_definition, '7200000', '10500000');
    ELSIF v_old_count = 0 AND v_new_count = 1 THEN
      -- Already applied on the hosted database.
      CONTINUE;
    ELSE
      RAISE EXCEPTION
        'Unexpected cap definition in public.%, old occurrences=%, new occurrences=%',
        v_name, v_old_count, v_new_count;
    END IF;
  END LOOP;
END
$guild_daily_cap$;

COMMIT;
