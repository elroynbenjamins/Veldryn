-- Align server-authoritative Guild membership with the mobile Level 7 Guild unlock.
-- Limit changes to the six entry/approval RPCs. Guild-specific minimums,
-- account ownership checks, role checks, and invite/application policies remain intact.
DO $guild_join_level_seven$
DECLARE
  function_name text;
  function_oid oid;
  previous_definition text;
  next_definition text;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'create_guild',
    'request_guild_membership',
    'review_guild_application',
    'respond_guild_application',
    'respond_guild_invite',
    'respond_guild_invitation_v1'
  ]
  LOOP
    SELECT p.oid INTO function_oid
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.proname = function_name;

    IF function_oid IS NULL THEN
      RAISE EXCEPTION 'Missing Guild RPC %; aborting Level 7 migration', function_name;
    END IF;

    previous_definition := pg_get_functiondef(function_oid);
    next_definition := replace(
      replace(
        previous_definition,
        'if v_level<10 then raise exception ''GUILD_LEVEL_10_REQUIRED'';',
        'if v_level<7 then raise exception ''GUILD_LEVEL_7_REQUIRED'';'
      ),
      'if v_level<10 then raise exception ''guild_level_10_required'';',
      'if v_level<7 then raise exception ''guild_level_7_required'';'
    );

    IF next_definition = previous_definition THEN
      IF position('if v_level<7 then raise exception ''GUILD_LEVEL_7_REQUIRED'';' IN previous_definition) = 0
         AND position('if v_level<7 then raise exception ''guild_level_7_required'';' IN previous_definition) = 0 THEN
        RAISE EXCEPTION 'Unexpected Guild RPC guard in %; no changes applied', function_name;
      END IF;
    ELSE
      EXECUTE next_definition;
    END IF;
  END LOOP;
END
$guild_join_level_seven$;
