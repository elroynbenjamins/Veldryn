-- Grant two Guild Skill points per guild level gained after level 1.
-- The shared pool is derived from guild level; existing ranks and bank balances
-- are unchanged. Apply snapshot and purchase gate together, atomically.
-- Preserve the production permission hotfix (guild advisory lock).
DO $double_guild_skill_points$
DECLARE
 v_source text;
 v_previous text;
 v_next text;
BEGIN
 SELECT pg_get_functiondef('public.guild_skill_snapshot_server_v1(uuid)'::regprocedure) INTO v_source;
 v_previous := 'v_points:=greatest(0,v_level-1-v_spent);';
 v_next := 'v_points:=greatest(0,2*greatest(0,v_level-1)-v_spent);';
 IF position(v_previous IN v_source)>0 THEN
  v_source := replace(v_source,v_previous,v_next);
 ELSIF position(v_next IN v_source)=0 THEN
  RAISE EXCEPTION 'guild_skill_snapshot_points_source_unexpected';
 END IF;
 v_previous := '''totalSkillPoints'',greatest(0,v_level-1)';
 v_next := '''totalSkillPoints'',2*greatest(0,v_level-1)';
 IF position(v_previous IN v_source)>0 THEN
  v_source := replace(v_source,v_previous,v_next);
 ELSIF position(v_next IN v_source)=0 THEN
  RAISE EXCEPTION 'guild_skill_snapshot_total_source_unexpected';
 END IF;
 EXECUTE v_source;
 SELECT pg_get_functiondef('public.guild_skill_upgrade_server_v1(uuid,text,text)'::regprocedure) INTO v_source;
 v_previous := 'if v_spent>=greatest(0,v_level-1) then raise exception ''insufficient_skill_points'';end if;';
 v_next := 'if v_spent>=2*greatest(0,v_level-1) then raise exception ''insufficient_skill_points'';end if;';
 IF position(v_previous IN v_source)>0 THEN
  v_source := replace(v_source,v_previous,v_next);
 ELSIF position(v_next IN v_source)=0 THEN
  RAISE EXCEPTION 'guild_skill_upgrade_gate_source_unexpected';
 END IF;
 IF position('guild-skill-upgrade-v1:' IN v_source)=0 THEN
  RAISE EXCEPTION 'guild_skill_upgrade_serialization_lock_missing';
 END IF;
 EXECUTE v_source;
 SELECT pg_get_functiondef('public.guild_skill_snapshot_server_v1(uuid)'::regprocedure) INTO v_source;
 IF position('v_points:=greatest(0,2*greatest(0,v_level-1)-v_spent);' IN v_source)=0
  OR position('''totalSkillPoints'',2*greatest(0,v_level-1)' IN v_source)=0
 THEN RAISE EXCEPTION 'guild_skill_snapshot_two_points_postcondition_failed'; END IF;
 SELECT pg_get_functiondef('public.guild_skill_upgrade_server_v1(uuid,text,text)'::regprocedure) INTO v_source;
 IF position('if v_spent>=2*greatest(0,v_level-1)' IN v_source)=0
 THEN RAISE EXCEPTION 'guild_skill_purchase_two_points_postcondition_failed'; END IF;
END $double_guild_skill_points$;
