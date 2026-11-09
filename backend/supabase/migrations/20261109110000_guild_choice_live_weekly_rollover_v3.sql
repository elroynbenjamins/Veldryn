-- Guild's Choice release: level-independent member voting, reliable UTC rollover,
-- consistent no-ballot template identity, and idempotent current-week seeding.
-- No existing project, ballot, vote, claimed reward or contribution is reset.
BEGIN;
CREATE OR REPLACE FUNCTION public.guild_project_choice_tick_v1(p_guild uuid, p_now timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
 v_week timestamptz:=date_trunc('week',p_now at time zone 'UTC') at time zone 'UTC';
 v_next timestamptz:=v_week+interval '7 days';
 v_cycle text:='choice:'||to_char(v_week at time zone 'UTC','YYYY-MM-DD');
 v_next_cycle text:='choice:'||to_char(v_next at time zone 'UTC','YYYY-MM-DD');
 v_level integer;v_name text;v_n integer;v_idx integer;v_focus text;v_template text;
 v_definition jsonb;v_definition_version integer;v_hash text;v_candidate uuid;
 v_votes integer:=0;v_target integer;v_instance uuid;v_category jsonb;
 v_mode text;v_min integer;v_share numeric(6,5);
BEGIN
 SELECT level,name INTO v_level,v_name FROM public.guilds WHERE id=p_guild FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;

 UPDATE public.guild_project_instances SET status='expired'
 WHERE guild_id=p_guild AND slot_index=2 AND status='active' AND ends_at<=p_now;

 -- Publish the next three choices only from Thursday of the current UTC week.
 IF p_now >= v_week+interval '3 days' AND p_now<v_next THEN
  FOR v_focus IN SELECT unnest(ARRAY['combat','skilling','mixed']) LOOP
    v_idx:=mod(extract(epoch from v_next)::bigint/604800,2)::integer;
    v_template:=CASE
      WHEN v_focus='combat' THEN (ARRAY['guild_weekly_borderwatch','guild_weekly_elite_suppression'])[1+(v_idx%2)]
      WHEN v_focus='skilling' THEN (ARRAY['guild_weekly_makers_drive','guild_weekly_provision'])[1+(v_idx%2)]
      ELSE (ARRAY['guild_weekly_frontier_relief','guild_weekly_watchtower'])[1+(v_idx%2)]
    END;
    SELECT d.definition_json,d.version,d.config_hash INTO v_definition,v_definition_version,v_hash
    FROM public.guild_project_definitions d WHERE d.template_id=v_template ORDER BY d.version DESC LIMIT 1;
    INSERT INTO public.guild_project_board_candidates(
      guild_id,cycle_key,template_id,definition_version,focus,definition_snapshot,config_hash,expires_at
    ) VALUES(p_guild,v_next_cycle,v_template,v_definition_version,v_focus,v_definition,v_hash,v_next)
    ON CONFLICT(guild_id,cycle_key,focus) DO NOTHING;
  END LOOP;
 END IF;

 -- Avoid replayed starts, including after the selected project finishes.
 IF EXISTS(SELECT 1 FROM public.guild_project_instances
   WHERE guild_id=p_guild AND slot_index=2 AND cycle_key=v_cycle) THEN RETURN; END IF;

 -- Winner is determined from ACTIVE membership votes; ties are deterministic.
 SELECT c.id,c.definition_snapshot,c.definition_version,c.config_hash,
  (SELECT count(*)::integer FROM public.guild_project_board_votes vv
    JOIN public.guild_members gm ON gm.account_id=vv.account_id AND gm.guild_id=p_guild
    WHERE vv.candidate_id=c.id) AS votes
 INTO v_candidate,v_definition,v_definition_version,v_hash,v_votes
 FROM public.guild_project_board_candidates c
 WHERE c.guild_id=p_guild AND c.cycle_key=v_cycle AND c.status='available'
 ORDER BY votes DESC, CASE c.focus WHEN 'skilling' THEN 0 WHEN 'combat' THEN 1 ELSE 2 END, c.template_id
 LIMIT 1;

 -- With zero votes the ballot's Medium (skilling) candidate wins the tie.
 -- If no ballot was published, use that week's Medium template as the fallback.
 IF v_candidate IS NULL THEN
   -- One-time Nov 9 launch: distribute one of the six rotating choice templates
   -- across existing guilds. Future unvoted weeks retain the Medium fallback.
   v_template:=CASE
     WHEN v_week='2026-11-09 00:00:00+00'::timestamptz THEN
       (ARRAY['guild_weekly_borderwatch','guild_weekly_elite_suppression',
              'guild_weekly_makers_drive','guild_weekly_provision',
              'guild_weekly_frontier_relief','guild_weekly_watchtower'])
       [1+mod(abs(hashtextextended(p_guild::text||v_cycle,0)),6)::integer]
     WHEN mod(extract(epoch from v_week)::bigint/604800,2)=0
       THEN 'guild_weekly_makers_drive'
     ELSE 'guild_weekly_provision'
   END;
   SELECT definition_json,version,config_hash INTO v_definition,v_definition_version,v_hash
   FROM public.guild_project_definitions
   WHERE template_id=v_template ORDER BY version DESC LIMIT 1;
   v_candidate:=NULL;
 END IF;
 IF v_definition IS NULL THEN RAISE EXCEPTION 'GUILD_CHOICE_TEMPLATE_UNAVAILABLE'; END IF;

 SELECT greatest(1,count(*)::integer) INTO v_n FROM public.guild_members m
 WHERE m.guild_id=p_guild AND (m.joined_at>=p_now-interval '14 days'
   OR EXISTS(SELECT 1 FROM public.online_game_states gs
             WHERE gs.account_id=m.account_id AND gs.updated_at>=p_now-interval '14 days'));
 v_mode:=v_definition->>'mode';
 v_target:=CASE WHEN v_mode='donation' THEN
   v_n*(SELECT coalesce(sum((goal->>'perMember')::integer),0)
     FROM jsonb_array_elements(coalesce(v_definition->'supplyGoals','[]'::jsonb)) goal)
   ELSE greatest(1,coalesce((v_definition->>'effortPerMember')::integer,2000))*v_n END;
 v_min:=greatest(1,ceil(v_n*0.2)::integer);
 v_share:=CASE WHEN v_n=1 THEN 1 ELSE 0.50 END;
 INSERT INTO public.guild_project_instances(
    guild_id,guild_name_snapshot,template_id,definition_version,definition_snapshot,config_hash,
    kind,focus,slot_index,cycle_key,status,started_at,ends_at,
    active_member_snapshot,target_points,minimum_meaningful_contributors,
    meaningful_contributor_threshold,personal_reward_threshold,single_account_completion_share_cap,mixed_minimum_fraction
 ) VALUES(
    p_guild,v_name,COALESCE((SELECT template_id FROM public.guild_project_board_candidates WHERE id=v_candidate),v_template),
    v_definition_version,v_definition,v_hash,'weekly_campaign',v_definition->>'focus',
    2,v_cycle,'active',v_week,v_next,v_n,v_target,v_min,
    CASE WHEN v_mode='donation' THEN 40 ELSE 250 END,
    CASE WHEN v_mode='donation' THEN 50 ELSE 300 END,
    v_share,CASE WHEN v_definition->>'focus'='mixed' THEN 0.30 ELSE NULL END
 ) RETURNING id INTO v_instance;

 INSERT INTO public.guild_project_member_progress(
    project_instance_id,account_id,was_member_at_start,joined_at_snapshot)
 SELECT v_instance,m.account_id,m.joined_at<=v_week,greatest(m.joined_at,v_week)
 FROM public.guild_members m WHERE m.guild_id=p_guild ON CONFLICT DO NOTHING;

 FOR v_category IN SELECT * FROM jsonb_array_elements(coalesce(v_definition->'supplyGoals','[]'::jsonb)) LOOP
   INSERT INTO public.guild_project_resource_progress(
      project_instance_id,resource_kind,resource_id,target_amount,contributed_amount
   ) VALUES(v_instance,'item','supply:'||(v_category->>'category'),
      (v_category->>'perMember')::integer*v_n,0);
 END LOOP;
 UPDATE public.guild_project_board_candidates c
 SET status=CASE WHEN c.id=v_candidate THEN 'selected' ELSE 'cancelled' END
 WHERE c.guild_id=p_guild AND c.cycle_key=v_cycle AND c.status='available';
end $function$;
REVOKE ALL ON FUNCTION public.guild_project_choice_tick_v1(uuid,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guild_project_choice_tick_v1(uuid,timestamptz) TO service_role;

-- This routine is only reachable by the privileged weekly scheduler/service role.
-- Reuses the same locked, idempotent per-guild board preparation used by gameplay.
CREATE OR REPLACE FUNCTION public.guild_project_weekly_rollover_v1(p_now timestamptz DEFAULT now())
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $rollover$
DECLARE v_guild uuid;v_count integer:=0;
BEGIN
 FOR v_guild IN SELECT id FROM public.guilds ORDER BY id LOOP
  BEGIN
   PERFORM public.ensure_guild_weekly_project_v2(v_guild,p_now);
   v_count:=v_count+1;
  EXCEPTION WHEN OTHERS THEN
   RAISE WARNING 'Guild weekly rollover failed for guild %: %',v_guild,SQLERRM;
  END;
 END LOOP;
 RETURN v_count;
END $rollover$;
REVOKE ALL ON FUNCTION public.guild_project_weekly_rollover_v1(timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guild_project_weekly_rollover_v1(timestamptz) TO service_role;

-- Supabase Postgres scheduler uses UTC (the database timezone is UTC).
-- Monday: start the voted winner for the new week.
-- Thursday: publish that week's three ballot choices for next Monday.
SELECT cron.schedule('veldryn-guild-choice-weekly-v3','0 0 * * 1,4',
  'SELECT public.guild_project_weekly_rollover_v1(now());');

-- Seed the currently-running week once, including guilds below Level 3.
-- The per-(guild,week,slot) index and the server tick prevent duplicates.
DO $seed$
BEGIN
 IF now()>='2026-11-09 00:00:00+00'::timestamptz
    AND now()<'2026-11-16 00:00:00+00'::timestamptz THEN
  PERFORM public.guild_project_weekly_rollover_v1(now());
 END IF;
END $seed$;
COMMIT;
