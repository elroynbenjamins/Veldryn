-- Guild's Choice: actual varied objectives, XP and Bank Gold payouts.
BEGIN;
-- Authoritative completion checks for the optional Guild's Choice project.
-- Mixed effort must include both roles; all material goals must also be fulfilled.
CREATE OR REPLACE FUNCTION public.guild_project_choice_maybe_complete_v1(p_project uuid,p_now timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $complete$
DECLARE p public.guild_project_instances;v_mode text;v_floor integer;
BEGIN
 SELECT * INTO p FROM public.guild_project_instances WHERE id=p_project FOR UPDATE;
 IF NOT FOUND OR p.status<>'active' OR p.slot_index<>2 OR p.cycle_key NOT LIKE 'choice:%'
 OR p_now>=p.ends_at THEN RETURN false; END IF;
 v_mode:=coalesce(p.definition_snapshot->>'mode','effort');
 IF p.completion_points<p.target_points OR p.meaningful_contributors<p.minimum_meaningful_contributors
 THEN RETURN false; END IF;
 IF v_mode='donation' AND p.skilling_points<p.target_points THEN RETURN false; END IF;
 IF v_mode IN ('effort','hybrid') AND p.focus='combat' AND p.combat_points<p.target_points THEN RETURN false; END IF;
 IF v_mode IN ('effort','hybrid') AND p.focus='skilling' AND p.skilling_points<p.target_points THEN RETURN false; END IF;
 IF p.focus='mixed' THEN
  v_floor:=ceil(p.target_points*greatest(0,least(1,coalesce(p.mixed_minimum_fraction,0.30))))::integer;
  IF p.combat_points<v_floor OR p.skilling_points<v_floor THEN RETURN false; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.guild_project_resource_progress g
           WHERE g.project_instance_id=p.id AND g.contributed_amount<g.target_amount)
 THEN RETURN false; END IF;
 IF v_mode IN ('donation','hybrid') AND NOT EXISTS(
 SELECT 1 FROM public.guild_project_resource_progress WHERE project_instance_id=p.id)
 THEN RETURN false; END IF;
 UPDATE public.guild_project_instances
 SET status='completed',completed_at=p_now,completion_snapshot=jsonb_build_object(
  'hallProgress',coalesce((p.definition_snapshot->>'guildHallProgress')::integer,100),
  'guildXp',coalesce((p.definition_snapshot->>'guildXpReward')::integer,0),
  'gold',coalesce((p.definition_snapshot->>'goldReward')::integer,0),
  'rewardDestination','guild_bank')
 WHERE id=p.id AND status='active';
 RETURN true;
END $complete$;
REVOKE ALL ON FUNCTION public.guild_project_choice_maybe_complete_v1(uuid,timestamptz) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guild_project_choice_maybe_complete_v1(uuid,timestamptz) TO service_role;

-- The Guild's Choice XP award is an exactly-once state transition,
-- independent of how many members later claim their bank Gold.
CREATE OR REPLACE FUNCTION public.guild_choice_completion_xp_v1()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $xp$
DECLARE v_xp integer;
BEGIN
 IF tg_op<>'UPDATE' OR old.status='completed' OR new.status<>'completed'
 OR new.slot_index<>2 OR new.cycle_key NOT LIKE 'choice:%' THEN RETURN new; END IF;
 v_xp:=least(2600,greatest(0,coalesce((new.definition_snapshot->>'guildXpReward')::integer,0)));
 IF v_xp>0 THEN
  UPDATE public.guilds guild SET xp=guild.xp+v_xp,
    level=greatest(guild.level,1+(SELECT count(*) FROM unnest(
    array[1200,3200,6500,11000,17000,24500,33500,44000,56000]
    ) thresholds(required_xp) WHERE guild.xp+v_xp>=thresholds.required_xp))
  WHERE guild.id=new.guild_id;
 END IF;
 RETURN new;
END $xp$;
DROP TRIGGER IF EXISTS trg_guild_choice_completion_xp_v1 ON public.guild_project_instances;
CREATE TRIGGER trg_guild_choice_completion_xp_v1
AFTER UPDATE OF status ON public.guild_project_instances FOR EACH ROW
EXECUTE FUNCTION public.guild_choice_completion_xp_v1();
REVOKE ALL ON FUNCTION public.guild_choice_completion_xp_v1() FROM public,anon,authenticated;

-- Credit the same verified gameplay to both weekly projects independently.
CREATE OR REPLACE FUNCTION public.credit_guild_project_effort_v2(p_account uuid, p_guild uuid, p_effort jsonb, p_now timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare p record;m record;a jsonb;s timestamptz;t timestamptz;day_start timestamptz;day_end timestamptz;j timestamptz;b bigint;c bigint;points bigint;combat bigint;skills bigint;allowed bigint;binding uuid;v_source text;v_credit bigint;v_project_skill_bps integer:=least(10000,greatest(0,coalesce((public.guild_skill_effects_server_v1(p_account)->>'guildProjectEfficiencyBps')::integer,0)));
begin
 perform pg_advisory_xact_lock(hashtextextended('party-account:'||p_account,0));
 perform ensure_guild_weekly_project_v2(p_guild,p_now);
 select joined_at into j from guild_members where account_id=p_account and guild_id=p_guild for share;
 if not found then return;end if;
 for p in select * from guild_project_instances where guild_id=p_guild and (
   (template_id='guild_weekly_shared_effort' and status in('active','expired','completed'))
   or (slot_index=2 and cycle_key like 'choice:%' and status='active')
 ) and ends_at+interval '7 days'>p_now order by id for update loop
 select * into m from guild_project_member_progress where project_instance_id=p.id and account_id=p_account;
 if not found and p.status='active' and p.ends_at>p_now then
   -- Allow an already-authorized new Guild member to start contributing midweek.
   -- Weekly targets remain frozen. Never credit time before guild membership.
   insert into public.guild_project_member_progress(
     project_instance_id,account_id,was_member_at_start,joined_at_snapshot,progress_fraction_at_join
   ) values(
     p.id,p_account,j<=p.started_at,greatest(p.started_at,j),
     least(1,p.completion_points::numeric/greatest(1,p.target_points)::numeric)
   ) on conflict do nothing;
   select * into m from guild_project_member_progress
   where project_instance_id=p.id and account_id=p_account;
 end if;
 if not found then continue;end if;
 -- Donation-only choice projects receive effort exclusively from verified items.
 if p.slot_index=2 and p.definition_snapshot->>'mode'='donation' then continue;end if;
 combat:=0;skills:=0;
 for a in select * from jsonb_array_elements(p_effort) loop
 if a->>'kind'='crafting' and jsonb_typeof(a->'units')='number' then
   -- Each verified crafted item is 15 seconds = 5 weekly effort, without
   -- granting any extra daily capacity or multiplying the existing reward.
   v_source:='crafting';
   t:=least(p_now,p.ends_at);
   s:=greatest(t-interval '15 seconds'*least(100,greatest(0,(a->>'units')::numeric)),p.started_at,m.joined_at_snapshot,j);
 elsif a->>'kind' in ('combat','skilling','crafting') and jsonb_typeof(a->'startsAtMs')='number' and jsonb_typeof(a->'endsAtMs')='number' then
   v_source:=case when a->>'kind'='combat' then 'combat' when a->>'kind'='crafting' then 'crafting' else 'gathering' end;
   s:=greatest(to_timestamp((a->>'startsAtMs')::numeric/1000),p.started_at,m.joined_at_snapshot,j);
   t:=least(to_timestamp((a->>'endsAtMs')::numeric/1000),p.ends_at,p_now);
 else continue;end if;
 if t<=s then continue;end if;
 insert into guild_project_cycle_bindings(cycle_key,account_id,guild_id,bound_at,points_at_bind) values(p.cycle_key,p_account,p_guild,p_now,1) on conflict do nothing;
 select guild_id into binding from guild_project_cycle_bindings where cycle_key=p.cycle_key and account_id=p_account;
 if binding<>p_guild then continue;end if;
 while s<t loop
 day_start:=date_trunc('day',s at time zone 'UTC') at time zone 'UTC';day_end:=least(t,day_start+interval '1 day');
 insert into guild_project_effort_days_v1 values(p.id,p_account,(day_start at time zone 'UTC')::date,0) on conflict do nothing;
 select credited_ms into b from guild_project_effort_days_v1 where project_id=p.id and account_id=p_account and earned_day=(day_start at time zone 'UTC')::date for update;
 c:=least(7200000,b+floor(extract(epoch from day_end-s)*1000));v_credit:=floor(floor(c/3000.0)*(10000+v_project_skill_bps)/10000.0)-floor(floor(b/3000.0)*(10000+v_project_skill_bps)/10000.0);points:=v_credit;
 if v_credit>0 then
  insert into public.guild_project_effort_sources_v1(project_id,account_id,source,points)
  values(p.id,p_account,v_source,v_credit)
  on conflict(project_id,account_id,source) do update set points=public.guild_project_effort_sources_v1.points+excluded.points;
 end if;
 update guild_project_effort_days_v1 set credited_ms=c where project_id=p.id and account_id=p_account and earned_day=(day_start at time zone 'UTC')::date;
 if v_source='combat' then combat:=combat+points;else skills:=skills+points;end if;s:=day_end;
 end loop;
 end loop;
 points:=combat+skills;
 if points=0 then continue;end if;
 allowed:=greatest(0,least(points,ceil(p.target_points*p.single_account_completion_share_cap)-m.completion_points));
 update guild_project_member_progress set raw_points=raw_points+points,completion_points=completion_points+allowed,combat_points=combat_points+combat,skilling_points=skilling_points+skills,first_contribution_at=coalesce(first_contribution_at,p_now),last_contribution_at=p_now where project_instance_id=p.id and account_id=p_account;
 update guild_project_instances set completion_points=completion_points+allowed,combat_points=combat_points+combat,skilling_points=skilling_points+skills,meaningful_contributors=(select count(*) from guild_project_member_progress where project_instance_id=p.id and raw_points>=250) where id=p.id;
 if p.slot_index=2 and p.cycle_key like 'choice:%' then
   perform public.guild_project_choice_maybe_complete_v1(p.id,p_now);
 else
 update guild_project_instances set status='completed',completed_at=p_now,completion_snapshot=jsonb_build_object('hallProgress',200,'gold',coalesce((p.definition_snapshot->>'goldReward')::integer,500),'rewardDestination',coalesce(p.definition_snapshot->>'rewardDestination','character')) where id=p.id and status<>'completed' and completion_points>=target_points and meaningful_contributors>=minimum_meaningful_contributors;
 end if;
 end loop;
end $function$;

REVOKE ALL ON FUNCTION public.credit_guild_project_effort_v2(uuid,uuid,jsonb,timestamptz) FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.credit_guild_project_effort_v2(uuid,uuid,jsonb,timestamptz) TO service_role;

-- Both weekly slots can claim their own versioned Bank Gold reward.
CREATE OR REPLACE FUNCTION public.claim_guild_project_reward_v2(p_project uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid:=auth.uid();v_game record;v_project record;v_gold integer;v_bank_reward boolean;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
 SELECT * INTO v_game FROM public.online_game_states WHERE account_id=v_uid FOR UPDATE;
 IF NOT FOUND OR v_game.character_id IS NULL THEN RAISE EXCEPTION 'CHARACTER_REQUIRED'; END IF;
 SELECT p.* INTO v_project FROM public.guild_project_instances p
 JOIN public.guild_members gm ON gm.guild_id=p.guild_id AND gm.account_id=v_uid
 WHERE p.id=p_project AND (p.template_id='guild_weekly_shared_effort'
 OR (p.slot_index=2 AND p.cycle_key LIKE 'choice:%')) FOR UPDATE OF p;
 IF NOT FOUND THEN RAISE EXCEPTION 'PROJECT_UNAVAILABLE'; END IF;
 IF EXISTS(SELECT 1 FROM public.guild_project_reward_claims c
  WHERE c.project_instance_id=v_project.id AND c.account_id=v_uid AND c.reward_key='completion')
 THEN RETURN jsonb_build_object('alreadyClaimed',true); END IF;
 IF v_project.status<>'completed' OR now()>=v_project.ends_at+interval '7 days'
 THEN RAISE EXCEPTION 'REWARD_UNAVAILABLE'; END IF;
 IF coalesce((SELECT raw_points FROM public.guild_project_member_progress
  WHERE project_instance_id=v_project.id AND account_id=v_uid),0)<v_project.personal_reward_threshold
 THEN RAISE EXCEPTION 'CONTRIBUTION_REQUIRED'; END IF;
 v_bank_reward:=coalesce(v_project.definition_snapshot->>'rewardDestination','character')='guild_bank';
 v_gold:=CASE WHEN v_bank_reward THEN
 LEAST(2500,GREATEST(0,COALESCE((v_project.definition_snapshot->>'goldReward')::integer,2500)))
 ELSE 500 END;
 INSERT INTO public.guild_project_reward_claims(project_instance_id,account_id,reward_key)
 VALUES(v_project.id,v_uid,'completion');
 IF v_bank_reward THEN
   INSERT INTO public.guild_bank_balances(guild_id,resource_id,amount)
   VALUES(v_project.guild_id,'gold',v_gold)
   ON CONFLICT(guild_id,resource_id) DO UPDATE SET amount=public.guild_bank_balances.amount+excluded.amount;
   INSERT INTO public.guild_bank_ledger(guild_id,account_id,request_key,kind,resource_id,amount,template_id)
   VALUES(v_project.guild_id,v_uid,'weekly-project:'||v_project.id::text,'project_reward','gold',v_gold,v_project.template_id);
   RETURN jsonb_build_object('alreadyClaimed',false,'guildBankGold',v_gold,'gold',0);
 END IF;
 -- Preserve old frozen v1/v2 weekly rewards and their original destination.
 INSERT INTO public.character_wallets(character_id,gold) VALUES(v_game.character_id,v_gold)
 ON CONFLICT(character_id) DO UPDATE SET gold=public.character_wallets.gold+excluded.gold;
 UPDATE public.online_game_states SET revision=revision+1,updated_at=now(),
 state=jsonb_set(state,'{character,gold}',to_jsonb(
  (SELECT gold FROM public.character_wallets WHERE character_id=v_game.character_id)))
 WHERE account_id=v_uid;
 RETURN jsonb_build_object('alreadyClaimed',false,'gold',v_gold);
end $function$;

REVOKE ALL ON FUNCTION public.claim_guild_project_reward_v2(uuid) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.claim_guild_project_reward_v2(uuid) TO authenticated,service_role;

-- The optional project gives half the Guild Hall progress of the main project.
CREATE OR REPLACE FUNCTION public.guild_hall_project_completion_v44()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_event_id text;
  v_fingerprint text:='guild-project-completed:v44';
  v_hall_award integer;
  v_facility text;
  v_facility_award integer;
  v_facilities jsonb;
  v_progress bigint;
  v_project_name text;
begin
  if tg_op<>'UPDATE' or old.status='completed' or new.status<>'completed' then
    return new;
  end if;

  v_event_id:='project:'||new.id::text;
  if exists(select 1 from private.guild_hall_receipts r where r.guild_id=new.guild_id and r.event_id=v_event_id) then
    return new;
  end if;

  v_hall_award:=case when new.slot_index=2 and new.cycle_key like 'choice:%'
   then least(200,greatest(0,coalesce((new.definition_snapshot->>'guildHallProgress')::integer,100)))
   else case new.kind when 'development' then 350 when 'event' then 250 else 200 end
 end;
  v_facility:=new.definition_snapshot->>'guildHallFacilityId';
  if v_facility not in ('banner_gallery','trophy_room','training_room','workshop','expedition_board','raid_memorial') then
    v_facility:=null;
  end if;
  begin
    v_facility_award:=greatest(0,coalesce((new.definition_snapshot->>'guildHallFacilityProgress')::integer,0));
  exception when others then
    v_facility_award:=0;
  end;

  insert into public.guild_halls(guild_id,hall_progress,lifetime_projects_completed,facilities,revision,updated_at)
  values(new.guild_id,v_hall_award,1,'{}'::jsonb,1,coalesce(new.completed_at,now()))
  on conflict(guild_id) do update
  set hall_progress=public.guild_halls.hall_progress+v_hall_award,
      lifetime_projects_completed=public.guild_halls.lifetime_projects_completed+1,
      revision=public.guild_halls.revision+1,
      updated_at=coalesce(new.completed_at,now())
  returning hall_progress,facilities into v_progress,v_facilities;

  if v_facility is not null and v_facility_award>0 then
    v_facilities:=jsonb_set(
      coalesce(v_facilities,'{}'::jsonb),
      array[v_facility],
      jsonb_build_object(
        'facilityId',v_facility,
        'progress',coalesce((v_facilities->v_facility->>'progress')::integer,0)+v_facility_award,
        'updatedAtMs',(extract(epoch from coalesce(new.completed_at,now()))*1000)::bigint
      ),
      true
    );
    update public.guild_halls
    set facilities=v_facilities,revision=revision+1,updated_at=coalesce(new.completed_at,now())
    where guild_id=new.guild_id;
  end if;

  v_project_name:=coalesce(new.definition_snapshot->>'name',new.definition_snapshot->>'title',new.template_id,'Guild Project');
  insert into public.guild_hall_trophies(guild_id,trophy_key,label,description,source_kind,source_id,earned_at)
  values(new.guild_id,'project:'||new.id::text,left(v_project_name,80),'Completed Guild Project','guild_project',new.id::text,coalesce(new.completed_at,now()))
  on conflict(guild_id,trophy_key) do nothing;

  insert into private.guild_hall_receipts(guild_id,event_id,fingerprint,result)
  values(new.guild_id,v_event_id,v_fingerprint,jsonb_build_object('hallProgressAward',v_hall_award,'facilityId',v_facility,'facilityProgressAward',v_facility_award))
  on conflict(guild_id,event_id) do nothing;

  return new;
end $function$;

REVOKE ALL ON FUNCTION public.guild_hall_project_completion_v44() FROM public,anon,authenticated;
COMMIT;
