-- Applied to staging only. Production release remains gated.
-- Wrap existing authoritative transaction with expected account, guild, character
-- and UTC week. A delayed request cannot spend in a different context.
BEGIN;
CREATE OR REPLACE FUNCTION public.winter_hearth_2026_donate_v1(p_item_id text, p_quantity integer, p_request_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_uid uuid:=auth.uid();v_gid uuid;v_join timestamptz;
 v_now timestamptz:=now();v_week date:=(date_trunc('week',now() at time zone 'UTC'))::date;
 v_existing public.guild_winter_hearth_2026_donations;
 v_game public.online_game_states;v_project public.guild_winter_hearth_2026_projects;
 v_weekly public.guild_winter_hearth_2026_weekly;
 v_track text;v_goal integer;v_cap integer;v_current integer;v_used integer;
 v_items jsonb;v_updated jsonb:='[]'::jsonb;v_stack jsonb;
 v_left integer;v_available integer;v_take integer;v_locked boolean;
 v_milestone record;v_new_gold bigint:=0;v_new_percents int[]:='{}'::int[];
 v_awarded int;v_result jsonb;v_final_logs int;v_final_lights int;v_color boolean:=false;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if p_quantity is null or p_quantity<1 or p_quantity>2500
  or p_request_key is null or p_request_key !~ '^[A-Za-z0-9_-]{8,96}$'
 then raise exception 'WINTER_HEARTH_INVALID_DONATION';end if;
 v_track:=case when p_item_id in (
  'GREENWOOD_LOG','IRONWOOD_LOG','CROWNWOOD_LOG','DUNEWOOD',
  'WHITEPINE_LOG','CINDERWOOD_LOG') then 'logs'
  when p_item_id='FROSTFALL_CHRISTMAS_LIGHTS_2026' then 'lights' else null end;
 if v_track is null then raise exception 'WINTER_HEARTH_INVALID_ITEM';end if;
 v_goal:=case when v_track='logs' then 25000 else 2500 end;
 v_cap:=case when v_track='logs' then 2500 else 250 end;
 if p_quantity>v_cap then raise exception 'WINTER_HEARTH_WEEKLY_CAP';end if;

 perform pg_advisory_xact_lock(hashtextextended('winter-hearth-account:'||v_uid::text,0));
 select * into v_existing from public.guild_winter_hearth_2026_donations
 where account_id=v_uid and request_key=p_request_key;
 if found then
  if v_existing.item_id is distinct from p_item_id
    or v_existing.quantity is distinct from p_quantity
  then raise exception 'WINTER_HEARTH_NONCE_CONFLICT';end if;
  return jsonb_set(v_existing.receipt,'{alreadyProcessed}','true'::jsonb);
 end if;

 if not exists(
  select 1 from public.live_events e
  where e.event_id='EVT_ANNUAL_012_2026' and e.enabled
  and e.config->>'winterHearthGuildEnabled'='true'
  and v_now>=greatest(e.starts_at,'2026-12-03 00:00:00+00'::timestamptz)
  and v_now<least(e.ends_at,'2026-12-27 00:00:00+00'::timestamptz)
 ) then raise exception 'WINTER_HEARTH_NOT_RELEASED_OR_CLOSED';end if;
 -- Lock inventory, guild, then recheck membership.
 select m.guild_id into v_gid from public.guild_members m where m.account_id=v_uid order by m.joined_at desc limit 1;
 if v_gid is null then raise exception 'WINTER_HEARTH_GUILD_REQUIRED';end if;
 select * into v_game from public.online_game_states where account_id=v_uid for update;
 if not found or v_game.character_id is null then raise exception 'WINTER_HEARTH_CHARACTER_REQUIRED';end if;
 perform 1 from public.guilds g where g.id=v_gid for update;
 if not found then raise exception 'WINTER_HEARTH_GUILD_REQUIRED';end if;
 select m.joined_at into v_join from public.guild_members m where m.guild_id=v_gid and m.account_id=v_uid for share;
 if not found or v_join>v_now then raise exception 'WINTER_HEARTH_GUILD_REQUIRED';end if;

insert into public.guild_winter_hearth_2026_projects(guild_id) values (v_gid)
 on conflict (guild_id) do nothing;
 select * into v_project from public.guild_winter_hearth_2026_projects
 where guild_id=v_gid for update;
 insert into public.guild_winter_hearth_2026_weekly(account_id,week_start)
 values(v_uid,v_week) on conflict(account_id,week_start) do nothing;
 select * into v_weekly from public.guild_winter_hearth_2026_weekly
 where account_id=v_uid and week_start=v_week for update;

 v_current:=case when v_track='logs' then v_project.logs else v_project.lights end;
 v_used:=case when v_track='logs' then v_weekly.logs else v_weekly.lights end;
 if v_current+p_quantity>v_goal then raise exception 'WINTER_HEARTH_TRACK_FULL';end if;
 if v_used+p_quantity>v_cap then raise exception 'WINTER_HEARTH_WEEKLY_CAP';end if;

 v_locked:=coalesce(v_game.state#>'{settings,lockedItemIds}','[]'::jsonb) ? p_item_id;
 if v_locked then raise exception 'WINTER_HEARTH_ITEM_LOCKED';end if;
 v_items:=coalesce(v_game.state#>'{inventory,stacks}','[]'::jsonb);
 if jsonb_typeof(v_items)<>'array' then raise exception 'WINTER_HEARTH_INVALID_INVENTORY';end if;
 v_left:=p_quantity;
 for v_stack in select value from jsonb_array_elements(v_items) loop
  if v_stack->>'itemId'=p_item_id
    and coalesce((v_stack->>'locked')::boolean,false)=false
    and v_left>0 then
   v_available:=greatest(0,coalesce((v_stack->>'quantity')::integer,0));
   v_take:=least(v_available,v_left);
   v_left:=v_left-v_take;
   if v_available>v_take then
    v_updated:=v_updated||jsonb_build_array(
     jsonb_set(v_stack,'{quantity}',to_jsonb(v_available-v_take)));
   end if;
  else
   v_updated:=v_updated||jsonb_build_array(v_stack);
  end if;
 end loop;
 if v_left>0 then raise exception 'WINTER_HEARTH_INSUFFICIENT_ITEMS';end if;

 -- This revision increments even when the last item stack disappears.
 update public.online_game_states set state=jsonb_set(state,'{inventory,stacks}',v_updated),
 revision=revision+1,updated_at=v_now where account_id=v_uid;
 if v_track='logs' then
  update public.guild_winter_hearth_2026_projects
   set logs=logs+p_quantity,updated_at=v_now where guild_id=v_gid;
  update public.guild_winter_hearth_2026_weekly
   set logs=logs+p_quantity where account_id=v_uid and week_start=v_week;
 else
  update public.guild_winter_hearth_2026_projects
   set lights=lights+p_quantity,updated_at=v_now where guild_id=v_gid;
  update public.guild_winter_hearth_2026_weekly
   set lights=lights+p_quantity where account_id=v_uid and week_start=v_week;
 end if;
 v_final_logs:=v_project.logs+case when v_track='logs' then p_quantity else 0 end;
 v_final_lights:=v_project.lights+case when v_track='lights' then p_quantity else 0 end;

 for v_milestone in
  select * from (values
   (25,6250,625,10000),
   (50,12500,1250,20000),
   (75,18750,1875,30000),
   (100,25000,2500,50000)
  ) as milestones(percent,required_logs,required_lights,gold)
  where v_final_logs>=required_logs and v_final_lights>=required_lights
  order by percent
 loop
  v_awarded:=null;
  insert into public.guild_winter_hearth_2026_milestones(guild_id,percent,guild_gold)
  values(v_gid,v_milestone.percent,v_milestone.gold)
  on conflict(guild_id,percent) do nothing returning percent into v_awarded;
  if v_awarded is not null then
   v_new_gold:=v_new_gold+v_milestone.gold;
   v_new_percents:=array_append(v_new_percents,v_awarded);
   if v_awarded=100 then
    -- Ownership persists independently of 2026 event flags; visual palette registration is a separate owner gate.
    insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref)
    values(v_gid,'name_frostfall_aurora_2026','event','EVT_ANNUAL_012_2026')
    on conflict(guild_id,unlock_id) do nothing;
    v_color:=true;
   end if;
  end if;
 end loop;
 if v_new_gold>0 then
  insert into public.guild_bank_balances(guild_id,resource_id,amount)
  values(v_gid,'gold',v_new_gold)
  on conflict(guild_id,resource_id) do update
  set amount=public.guild_bank_balances.amount+excluded.amount;
 end if;
 v_result:=jsonb_build_object(
  'alreadyProcessed',false,'guildId',v_gid,'itemId',p_item_id,
  'track',v_track,'quantity',p_quantity,'logs',v_final_logs,'lights',v_final_lights,
  'weekStartUtc',v_week,'newMilestones',to_jsonb(v_new_percents),
  'newGuildGold',v_new_gold,'newPermanentColor',v_color);
 insert into public.guild_winter_hearth_2026_donations
 (account_id,request_key,guild_id,item_id,track,quantity,week_start,receipt)
 values(v_uid,p_request_key,v_gid,p_item_id,v_track,p_quantity,v_week,v_result);
 return v_result;
end $function$;
CREATE OR REPLACE FUNCTION public.winter_hearth_2026_donate_v2(
 p_item_id text,p_quantity integer,p_request_key text,p_account_id uuid,
 p_guild_id uuid,p_character_id text,p_week_start date
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_uid uuid:=auth.uid();v_existing public.guild_winter_hearth_2026_donations;
 v_gid uuid;v_character text;
BEGIN
 IF v_uid IS NULL OR v_uid IS DISTINCT FROM p_account_id THEN RAISE EXCEPTION 'WINTER_HEARTH_CONTEXT_CHANGED'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('winter-hearth-account:'||v_uid::text,0));
 SELECT * INTO v_existing FROM public.guild_winter_hearth_2026_donations WHERE account_id=v_uid AND request_key=p_request_key;
 IF FOUND THEN
  IF v_existing.guild_id IS DISTINCT FROM p_guild_id OR v_existing.item_id IS DISTINCT FROM p_item_id OR v_existing.quantity IS DISTINCT FROM p_quantity OR v_existing.week_start IS DISTINCT FROM p_week_start THEN RAISE EXCEPTION 'WINTER_HEARTH_NONCE_CONFLICT';END IF;
  RETURN jsonb_set(v_existing.receipt,'{alreadyProcessed}','true'::jsonb);
 END IF;
 IF p_week_start IS DISTINCT FROM (date_trunc('week',now() AT TIME ZONE 'UTC'))::date THEN RAISE EXCEPTION 'WINTER_HEARTH_CONTEXT_CHANGED';END IF;
 -- Lock inventory, guild, then membership.
 SELECT g.character_id::text INTO v_character FROM public.online_game_states g WHERE g.account_id=v_uid FOR UPDATE;
 IF v_character IS NULL OR v_character IS DISTINCT FROM p_character_id THEN RAISE EXCEPTION 'WINTER_HEARTH_CONTEXT_CHANGED';END IF;
 PERFORM 1 FROM public.guilds g WHERE g.id=p_guild_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'WINTER_HEARTH_CONTEXT_CHANGED';END IF;
 SELECT m.guild_id INTO v_gid FROM public.guild_members m WHERE m.account_id=v_uid AND m.guild_id=p_guild_id FOR SHARE;
 IF v_gid IS NULL THEN RAISE EXCEPTION 'WINTER_HEARTH_CONTEXT_CHANGED';END IF;
 RETURN public.winter_hearth_2026_donate_v1(p_item_id,p_quantity,p_request_key);
END $$;
REVOKE ALL ON FUNCTION public.winter_hearth_2026_donate_v2(text,integer,text,uuid,uuid,text,date) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.winter_hearth_2026_donate_v1(text,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.winter_hearth_2026_donate_v2(text,integer,text,uuid,uuid,text,date) TO authenticated;
COMMIT;
