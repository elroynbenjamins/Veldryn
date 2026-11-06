-- Veldryn Guild's Choice: one automatic and one voted weekly Guild Project.
-- Safe by default: new choice slot is locked until Guild Level 3.
-- Candidates are published Thursday-Sunday, voting closes Monday 00:00 UTC.
BEGIN;
INSERT INTO public.guild_project_definitions(template_id,version,definition_json,config_hash)
VALUES
('guild_weekly_borderwatch',2,'{"name":"Borderwatch Offensive","description":"Fight regional enemies together; normal combat automatically contributes.","kind":"weekly_campaign","focus":"combat","mode":"effort","minGuildLevel":3,"effortPerMember":2000,"guildXpReward":1800,"goldReward":1000,"rewardDestination":"guild_bank","guildHallProgress":100}'::jsonb,'choice-guild_weekly_borderwatch-v2'),
('guild_weekly_elite_suppression',2,'{"name":"Elite Suppression","description":"A longer combat operation; defeat enemies and elites to advance.","kind":"weekly_campaign","focus":"combat","mode":"effort","minGuildLevel":3,"effortPerMember":2300,"guildXpReward":2200,"goldReward":1500,"rewardDestination":"guild_bank","guildHallProgress":100}'::jsonb,'choice-guild_weekly_elite_suppression-v2'),
('guild_weekly_makers_drive',2,'{"name":"Makers'' Supply Drive","description":"Gather, process and craft supplies together.","kind":"weekly_campaign","focus":"skilling","mode":"effort","minGuildLevel":3,"effortPerMember":1700,"guildXpReward":1800,"goldReward":1000,"rewardDestination":"guild_bank","guildHallProgress":100}'::jsonb,'choice-guild_weekly_makers_drive-v2'),
('guild_weekly_provision',1,'{"name":"Provision the Guild","description":"Donate common wood, fish and ores directly to the project. Donated items are consumed.","kind":"weekly_campaign","focus":"skilling","mode":"donation","minGuildLevel":3,"effortPerMember":0,"supplyGoals":[{"category":"wood","perMember":40,"label":"Wood supplies"},{"category":"fish","perMember":30,"label":"Food supplies"},{"category":"ore","perMember":30,"label":"Ore supplies"}],"guildXpReward":1800,"goldReward":1250,"rewardDestination":"guild_bank","guildHallProgress":100}'::jsonb,'choice-guild_weekly_provision-v1'),
('guild_weekly_frontier_relief',2,'{"name":"Frontier Relief","description":"Fight threats and gather or craft supplies. Combat and skilling each need at least 30% of total effort.","kind":"weekly_campaign","focus":"mixed","mode":"effort","minGuildLevel":3,"effortPerMember":2500,"mixedMinimumFraction":0.3,"guildXpReward":2200,"goldReward":1500,"rewardDestination":"guild_bank","guildHallProgress":100}'::jsonb,'choice-guild_weekly_frontier_relief-v2'),
('guild_weekly_watchtower',2,'{"name":"Watchtower Reconstruction","description":"Defend the workers, craft or gather materials, and donate common ores to finish the watchtower.","kind":"weekly_campaign","focus":"mixed","mode":"hybrid","minGuildLevel":3,"effortPerMember":1700,"mixedMinimumFraction":0.3,"supplyGoals":[{"category":"ore","perMember":50,"label":"Ore supplies"}],"guildXpReward":2600,"goldReward":2000,"rewardDestination":"guild_bank","guildHallProgress":100}'::jsonb,'choice-guild_weekly_watchtower-v2')
ON CONFLICT(template_id,version) DO NOTHING;

CREATE UNIQUE INDEX IF NOT EXISTS guild_choice_one_slot_per_week_v1
 ON public.guild_project_instances(guild_id,cycle_key,slot_index)
 WHERE slot_index=2 AND cycle_key LIKE 'choice:%';

-- The automatic service-only entry point never accepts caller-chosen guild IDs.
-- Only the already authorized project preparation/credit routines invoke it.
CREATE OR REPLACE FUNCTION public.guild_project_choice_tick_v1(p_guild uuid,p_now timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $choice$
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
 IF NOT FOUND OR v_level<3 THEN RETURN; END IF;

 UPDATE public.guild_project_instances SET status='expired'
 WHERE guild_id=p_guild AND slot_index=2 AND status='active' AND ends_at<=p_now;

 -- Publish the next three choices only from Thursday of the current UTC week.
 IF p_now >= v_week+interval '3 days' AND p_now<v_next THEN
  FOR v_focus IN SELECT unnest(ARRAY['combat','skilling','mixed']) LOOP
    v_idx:=(abs(hashtext(p_guild::text||v_next_cycle||v_focus)::bigint))::integer;
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

 -- With no votes (including no ballot prepared last week), choose a standard project.
 IF v_candidate IS NULL OR v_votes=0 THEN
   SELECT definition_json,version,config_hash INTO v_definition,v_definition_version,v_hash
   FROM public.guild_project_definitions
   WHERE template_id='guild_weekly_borderwatch' ORDER BY version DESC LIMIT 1;
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
    p_guild,v_name,CASE WHEN v_candidate IS NULL THEN 'guild_weekly_borderwatch'
       ELSE (SELECT template_id FROM public.guild_project_board_candidates WHERE id=v_candidate) END,
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
END $choice$;
REVOKE ALL ON FUNCTION public.guild_project_choice_tick_v1(uuid,timestamptz) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guild_project_choice_tick_v1(uuid,timestamptz) TO service_role;

-- No manual vote starts or extra weekly instances: the schedule selects the winner.
CREATE OR REPLACE FUNCTION public.guild_project_start_v1(p_candidate_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $blocked$
BEGIN
 RAISE EXCEPTION 'GUILD_PROJECT_STARTS_AUTOMATICALLY';
END $blocked$;
REVOKE ALL ON FUNCTION public.guild_project_start_v1(uuid) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guild_project_start_v1(uuid) TO service_role;

-- Expose ballot details, vote totals and reward values, but only to current Guild members.
CREATE OR REPLACE FUNCTION public.guild_project_choice_ballot_v1()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $board$
DECLARE v_uid uuid:=auth.uid();v_guild uuid;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT guild_id INTO v_guild FROM public.guild_members WHERE account_id=v_uid;
 IF v_guild IS NULL THEN RETURN '[]'::jsonb; END IF;
 RETURN coalesce((
 SELECT jsonb_agg(jsonb_build_object(
   'id',c.id,'cycleKey',c.cycle_key,'templateId',c.template_id,
   'name',c.definition_snapshot->>'name','description',c.definition_snapshot->>'description',
   'focus',c.focus,'expiresAt',c.expires_at,'guildXp',c.definition_snapshot->>'guildXpReward',
   'goldReward',c.definition_snapshot->>'goldReward','mode',c.definition_snapshot->>'mode',
   'voteCount',(SELECT count(*) FROM public.guild_project_board_votes v
       JOIN public.guild_members m ON m.account_id=v.account_id AND m.guild_id=v_guild
       WHERE v.candidate_id=c.id),
   'myVote',EXISTS(SELECT 1 FROM public.guild_project_board_votes v
       WHERE v.candidate_id=c.id AND v.account_id=v_uid)
 ) ORDER BY c.focus,c.template_id)
 FROM public.guild_project_board_candidates c
 WHERE c.guild_id=v_guild AND c.status='available' AND c.expires_at>now()
 ),'[]'::jsonb);
END $board$;
REVOKE ALL ON FUNCTION public.guild_project_choice_ballot_v1() FROM public,anon;
GRANT EXECUTE ON FUNCTION public.guild_project_choice_ballot_v1() TO authenticated,service_role;

-- Plug into the already-authoritative project tick. The automatic main project
-- keeps its existing reward/effort rules, and two slots now coexist.
CREATE OR REPLACE FUNCTION public.ensure_guild_weekly_project_v2(p_guild uuid, p_now timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s timestamptz:=date_trunc('week',p_now at time zone 'UTC') at time zone 'UTC';p uuid;n integer;d jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('guild-project:'||p_guild,0));
 update guild_project_instances set status='expired' where guild_id=p_guild and status='active' and ends_at<=p_now;
 perform public.guild_project_choice_tick_v1(p_guild,p_now);
 if exists(select 1 from guild_project_instances where guild_id=p_guild and (cycle_key='weekly:'||to_char(s at time zone 'UTC','YYYY-MM-DD') or status='active')) then return;end if;
 perform 1 from guild_members where guild_id=p_guild for share;
 select count(*) into n from guild_members gm where gm.guild_id=p_guild and (gm.joined_at>=p_now-interval '14 days' or exists(select 1 from online_game_states gs where gs.account_id=gm.account_id and gs.updated_at>=p_now-interval '14 days'));
 if n=0 then return;end if;
 select definition_json into d from guild_project_definitions where template_id='guild_weekly_shared_effort' and version=3;
 insert into guild_project_instances(guild_id,template_id,definition_version,definition_snapshot,config_hash,kind,focus,slot_index,cycle_key,started_at,ends_at,active_member_snapshot,target_points,minimum_meaningful_contributors,meaningful_contributor_threshold,personal_reward_threshold,single_account_completion_share_cap,mixed_minimum_fraction)
 values(p_guild,'guild_weekly_shared_effort',3,d,'shared-effort-bank-v3','weekly_campaign','mixed',1,'weekly:'||to_char(s at time zone 'UTC','YYYY-MM-DD'),s,s+interval '7 days',n,ceil(n*9600*(1-least(0.10,greatest(0,n-5)*0.004)))::bigint,greatest(1,ceil(n*.2)),250,300,case when n=1 then 1 else .5 end,0) returning id into p;
 insert into guild_project_member_progress(project_instance_id,account_id,was_member_at_start,joined_at_snapshot)
 select p,account_id,true,greatest(joined_at,s) from guild_members where guild_id=p_guild;
end $function$
;
REVOKE ALL ON FUNCTION public.ensure_guild_weekly_project_v2(uuid,timestamptz) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_guild_weekly_project_v2(uuid,timestamptz) TO service_role;
COMMIT;
