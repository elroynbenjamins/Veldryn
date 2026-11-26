-- Frostfall 2026 Winter Hearth — account-wide gated guild market contributions.
-- Source-only until independently deployed to staging and explicitly released.
-- Existing guild weekly projects, guild PvE, festival global tracks remain unchanged.
-- All four project tables are protected: no direct anon/authenticated Data API access.
begin;

create table if not exists public.guild_winter_hearth_2026_projects (
 guild_id uuid primary key references public.guilds(id) on delete cascade,
 event_id text not null default 'EVT_ANNUAL_012_2026'
  check (event_id='EVT_ANNUAL_012_2026'),
 logs integer not null default 0 check (logs between 0 and 25000),
 lights integer not null default 0 check (lights between 0 and 2500),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.guild_winter_hearth_2026_weekly (
 account_id uuid not null references auth.users(id) on delete cascade,
 week_start date not null,
 logs integer not null default 0 check (logs between 0 and 2500),
 lights integer not null default 0 check (lights between 0 and 250),
 primary key (account_id, week_start)
);
create table if not exists public.guild_winter_hearth_2026_donations (
 account_id uuid not null references auth.users(id) on delete cascade,
 request_key text not null,
 guild_id uuid not null references public.guilds(id) on delete cascade,
 item_id text not null,
 track text not null check (track in ('logs','lights')),
 quantity integer not null check (quantity>0 and quantity<=2500),
 week_start date not null,
 receipt jsonb not null,
 created_at timestamptz not null default now(),
 primary key (account_id,request_key)
);
create index if not exists guild_winter_hearth_2026_donations_guild_idx
 on public.guild_winter_hearth_2026_donations(guild_id);
create table if not exists public.guild_winter_hearth_2026_milestones (
 guild_id uuid not null references public.guild_winter_hearth_2026_projects(guild_id) on delete cascade,
 percent integer not null check (percent in (25,50,75,100)),
 guild_gold bigint not null check (guild_gold in (10000,20000,30000,50000)),
 earned_at timestamptz not null default now(),
 primary key (guild_id,percent)
);
alter table public.guild_winter_hearth_2026_projects enable row level security;
alter table public.guild_winter_hearth_2026_weekly enable row level security;
alter table public.guild_winter_hearth_2026_donations enable row level security;
alter table public.guild_winter_hearth_2026_milestones enable row level security;
revoke all on public.guild_winter_hearth_2026_projects from public,anon,authenticated;
revoke all on public.guild_winter_hearth_2026_weekly from public,anon,authenticated;
revoke all on public.guild_winter_hearth_2026_donations from public,anon,authenticated;
revoke all on public.guild_winter_hearth_2026_milestones from public,anon,authenticated;
grant select,insert,update,delete on public.guild_winter_hearth_2026_projects to service_role;
grant select,insert,update,delete on public.guild_winter_hearth_2026_weekly to service_role;
grant select,insert,update,delete on public.guild_winter_hearth_2026_donations to service_role;
grant select,insert,update,delete on public.guild_winter_hearth_2026_milestones to service_role;

-- No client-supplied account, guild, balance or event clock arguments.
-- This protected read function reveals only the signed-in member's own guild.
create or replace function public.winter_hearth_2026_snapshot_v1()
returns jsonb language plpgsql stable security definer set search_path='' as $snapshot$
declare
 v_uid uuid:=auth.uid();v_gid uuid;v_logs int:=0;v_lights int:=0;
 v_used_logs int:=0;v_used_lights int:=0;v_earned int:=0;v_stage int:=0;
 v_enabled boolean:=false;v_active boolean:=false;v_now timestamptz:=now();
 v_week date:=(date_trunc('week',now() at time zone 'UTC'))::date;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select m.guild_id into v_gid from public.guild_members m
 where m.account_id=v_uid order by m.joined_at desc limit 1;
 if v_gid is null then return jsonb_build_object('inGuild',false);end if;
 select e.enabled and coalesce(e.config->>'winterHearthGuildEnabled','false')='true',
        e.enabled and v_now>=greatest(e.starts_at,'2026-12-03 00:00:00+00'::timestamptz)
          and v_now<least(e.ends_at,'2026-12-27 00:00:00+00'::timestamptz)
 into v_enabled,v_active
 from public.live_events e where e.event_id='EVT_ANNUAL_012_2026';
 select coalesce(p.logs,0),coalesce(p.lights,0) into v_logs,v_lights
 from public.guild_winter_hearth_2026_projects p where p.guild_id=v_gid;
 v_logs:=coalesce(v_logs,0);v_lights:=coalesce(v_lights,0);
 select coalesce(w.logs,0),coalesce(w.lights,0) into v_used_logs,v_used_lights
 from public.guild_winter_hearth_2026_weekly w
 where w.account_id=v_uid and w.week_start=v_week;
 v_used_logs:=coalesce(v_used_logs,0);v_used_lights:=coalesce(v_used_lights,0);
 select coalesce(max(percent),0) into v_earned
 from public.guild_winter_hearth_2026_milestones where guild_id=v_gid;
 v_stage:=case when v_logs>=25000 and v_lights>=2500 then 100
  when v_logs>=18750 and v_lights>=1875 then 75
  when v_logs>=12500 and v_lights>=1250 then 50
  when v_logs>=6250 and v_lights>=625 then 25 else 0 end;
 return jsonb_build_object(
  'inGuild',true,'eventId','EVT_ANNUAL_012_2026',
  'enabled',coalesce(v_enabled,false),'active',coalesce(v_active,false) and coalesce(v_enabled,false),
  'logs',v_logs,'logsGoal',25000,'lights',v_lights,'lightsGoal',2500,
  'memberLogsThisWeek',v_used_logs,'memberLightsThisWeek',v_used_lights,
  'memberLogsRemaining',greatest(0,2500-v_used_logs),
  'memberLightsRemaining',greatest(0,250-v_used_lights),
  'weekStartUtc',v_week,'milestonePercent',v_stage,'permanentColorEarned',v_earned=100,
  'gatheringSpeedBps',case when coalesce(v_active,false) and coalesce(v_enabled,false) then
    case when v_stage=100 then 1000 when v_stage>=25 then 400 else 0 end else 0 end,
  'skillXpBps',case when coalesce(v_active,false) and coalesce(v_enabled,false) then
    case when v_stage=100 then 1000 when v_stage>=50 then 600 else 0 end else 0 end,
  'combatXpBps',case when coalesce(v_active,false) and coalesce(v_enabled,false) then
    case when v_stage=100 then 1000 when v_stage>=75 then 600 else 0 end else 0 end
 );
end $snapshot$;
revoke all on function public.winter_hearth_2026_snapshot_v1() from public,anon,authenticated;
grant execute on function public.winter_hearth_2026_snapshot_v1() to authenticated,service_role;

-- Donation writer: account+guild locks, immutable request receipts,
-- authoritative inventory debit, per-account UTC week cap and one-time payouts.
create or replace function public.winter_hearth_2026_donate_v1(
 p_item_id text,p_quantity integer,p_request_key text
) returns jsonb language plpgsql security definer set search_path='' as $donate$
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
 select m.guild_id,m.joined_at into v_gid,v_join
 from public.guild_members m where m.account_id=v_uid
 order by m.joined_at desc limit 1 for share;
 if v_gid is null or v_join>v_now then raise exception 'WINTER_HEARTH_GUILD_REQUIRED';end if;

 -- Lock online inventory before the guild: matches existing Guild Bank/Project lock order.
 select * into v_game from public.online_game_states
 where account_id=v_uid for update;
 if not found or v_game.character_id is null then
  raise exception 'WINTER_HEARTH_CHARACTER_REQUIRED';end if;
 -- Serialize concurrent players of the same guild before applying milestones.
 perform 1 from public.guilds g where g.id=v_gid for update;
 if not found then raise exception 'WINTER_HEARTH_GUILD_REQUIRED';end if;

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
end $donate$;
revoke all on function public.winter_hearth_2026_donate_v1(text,integer,text)
 from public,anon,authenticated;
grant execute on function public.winter_hearth_2026_donate_v1(text,integer,text) to authenticated,service_role;
commit;