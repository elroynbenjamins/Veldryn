begin;

-- The player Market is retired; remove its last orphaned RPC after the tables are dropped.
drop function if exists public.reserve_market_buy_gold(uuid,uuid,bigint);

-- Respect caller RLS on the public active-content projection.
alter view public.active_region_content_records_v21 set (security_invoker=true);

create or replace function public.apply_shared_world_crisis_contribution(
  p_crisis_id uuid,p_source_event_id text,p_account_id uuid,p_occurred_at timestamptz,p_date_key date,
  p_category text,p_activity_kind text,p_content_id text,p_raw_points integer,p_requested_points integer,
  p_party_id uuid default null,p_party_name text default null,p_guild_id uuid default null,p_guild_name text default null
)
returns table(duplicate boolean,credited_points integer,total_points bigint,combat_points bigint,skilling_points bigint)
language plpgsql security definer set search_path=public as $$
declare v_crisis public.shared_world_regional_crises%rowtype;v_existing public.shared_world_crisis_contributions%rowtype;v_daily bigint;v_credit integer;
begin
  if p_category not in ('combat','skilling') then raise exception 'invalid_crisis_category';end if;
  if p_requested_points<0 or p_raw_points<0 then raise exception 'invalid_crisis_points';end if;
  select * into v_crisis from public.shared_world_regional_crises c where c.id=p_crisis_id for update;
  if not found then raise exception 'crisis_not_found';end if;
  select * into v_existing from public.shared_world_crisis_contributions c where c.crisis_id=p_crisis_id and c.source_event_id=p_source_event_id;
  if found then return query select true,v_existing.credited_points,v_crisis.credited_points,v_crisis.combat_points,v_crisis.skilling_points;return;end if;
  if v_crisis.state not in('active','secured') or p_occurred_at<v_crisis.starts_at or p_occurred_at>=v_crisis.ends_at then return query select false,0,v_crisis.credited_points,v_crisis.combat_points,v_crisis.skilling_points;return;end if;
  select coalesce(sum(c.credited_points),0) into v_daily from public.shared_world_crisis_contributions c where c.crisis_id=p_crisis_id and c.account_id=p_account_id and c.date_key=p_date_key;
  v_credit:=least(greatest(p_requested_points,0),greatest(v_crisis.daily_account_credit_cap-v_daily,0));
  insert into public.shared_world_crisis_contributions(crisis_id,source_event_id,account_id,occurred_at,date_key,category,activity_kind,content_id,raw_points,credited_points,party_id_at_settlement,party_name_snapshot,guild_id_at_settlement,guild_name_snapshot)
  values(p_crisis_id,p_source_event_id,p_account_id,p_occurred_at,p_date_key,p_category,p_activity_kind,p_content_id,p_raw_points,v_credit,p_party_id,left(p_party_name,80),p_guild_id,left(p_guild_name,80));
  if v_credit>0 then
    update public.shared_world_regional_crises as c set credited_points=c.credited_points+v_credit,combat_points=c.combat_points+case when p_category='combat' then v_credit else 0 end,skilling_points=c.skilling_points+case when p_category='skilling' then v_credit else 0 end,updated_at=now() where c.id=p_crisis_id returning c.* into v_crisis;
    insert into public.shared_world_crisis_account_progress(crisis_id,account_id,total_points,combat_points,skilling_points,qualifying_actions,first_contribution_at,last_contribution_at)
    values(p_crisis_id,p_account_id,v_credit,case when p_category='combat' then v_credit else 0 end,case when p_category='skilling' then v_credit else 0 end,1,p_occurred_at,p_occurred_at)
    on conflict(crisis_id,account_id) do update set total_points=public.shared_world_crisis_account_progress.total_points+excluded.total_points,combat_points=public.shared_world_crisis_account_progress.combat_points+excluded.combat_points,skilling_points=public.shared_world_crisis_account_progress.skilling_points+excluded.skilling_points,qualifying_actions=public.shared_world_crisis_account_progress.qualifying_actions+1,last_contribution_at=greatest(public.shared_world_crisis_account_progress.last_contribution_at,excluded.last_contribution_at),updated_at=now();
  end if;
  return query select false,v_credit,v_crisis.credited_points,v_crisis.combat_points,v_crisis.skilling_points;
end $$;

create or replace function public.settle_shared_world_boss_attempt(
  p_encounter_id uuid,p_account_id uuid,p_role_profile text,p_raid_impact bigint,p_requested_damage bigint,p_combat_result jsonb,p_impact_breakdown jsonb
)
returns table(duplicate boolean,applied_damage bigint,remaining_hp bigint,defeated boolean)
language plpgsql security definer set search_path=public as $$
declare v_attempt public.shared_world_world_boss_attempts%rowtype;v_boss public.shared_world_world_bosses%rowtype;v_applied bigint;v_now timestamptz:=now();
begin
  select * into v_attempt from public.shared_world_world_boss_attempts a where a.encounter_id=p_encounter_id for update;
  if not found then raise exception 'world_boss_attempt_not_found';end if;
  if v_attempt.account_id<>p_account_id then raise exception 'world_boss_attempt_owner_mismatch';end if;
  select * into v_boss from public.shared_world_world_bosses b where b.id=v_attempt.boss_id for update;
  if v_attempt.state='settled' then return query select true,v_attempt.applied_global_damage,v_boss.remaining_hp,(v_boss.remaining_hp=0);return;end if;
  if v_attempt.state<>'reserved' then raise exception 'world_boss_attempt_not_settleable';end if;
  if v_now>v_attempt.expires_at then raise exception 'world_boss_attempt_expired';end if;
  v_applied:=case when v_attempt.echo_only or v_boss.remaining_hp=0 then 0 else least(v_boss.remaining_hp,greatest(p_requested_damage,0)) end;
  update public.shared_world_world_boss_attempts as a set state='settled',role_profile=left(p_role_profile,32),combat_result_json=coalesce(p_combat_result,'{}'::jsonb),impact_breakdown_json=coalesce(p_impact_breakdown,'{}'::jsonb),raid_impact=greatest(p_raid_impact,0),requested_global_damage=greatest(p_requested_damage,0),applied_global_damage=v_applied,settled_at=v_now where a.encounter_id=p_encounter_id;
  if v_applied>0 then update public.shared_world_world_bosses as b set remaining_hp=b.remaining_hp-v_applied,defeated_at=case when b.remaining_hp-v_applied=0 then coalesce(b.defeated_at,v_now) else b.defeated_at end,state=case when b.remaining_hp-v_applied=0 then 'defeated' else b.state end,updated_at=v_now where b.id=v_boss.id returning b.* into v_boss;end if;
  insert into public.shared_world_world_boss_account_progress(boss_id,account_id,valid_attempts,echo_attempts,raid_impact,echo_raid_impact,applied_global_damage,best_attempt_impact,first_attempt_at,last_attempt_at)
  values(v_boss.id,p_account_id,case when v_attempt.echo_only then 0 else 1 end,case when v_attempt.echo_only then 1 else 0 end,case when v_attempt.echo_only then 0 else greatest(p_raid_impact,0) end,case when v_attempt.echo_only then greatest(p_raid_impact,0) else 0 end,v_applied,case when v_attempt.echo_only then 0 else greatest(p_raid_impact,0) end,v_attempt.created_at,v_now)
  on conflict(boss_id,account_id) do update set valid_attempts=public.shared_world_world_boss_account_progress.valid_attempts+excluded.valid_attempts,echo_attempts=public.shared_world_world_boss_account_progress.echo_attempts+excluded.echo_attempts,raid_impact=public.shared_world_world_boss_account_progress.raid_impact+excluded.raid_impact,echo_raid_impact=public.shared_world_world_boss_account_progress.echo_raid_impact+excluded.echo_raid_impact,applied_global_damage=public.shared_world_world_boss_account_progress.applied_global_damage+excluded.applied_global_damage,best_attempt_impact=greatest(public.shared_world_world_boss_account_progress.best_attempt_impact,excluded.best_attempt_impact),last_attempt_at=v_now,updated_at=v_now;
  return query select false,v_applied,v_boss.remaining_hp,(v_boss.remaining_hp=0);
end $$;

create or replace function public.update_guild_tag(p_tag text)
returns table(guild_id uuid,tag text,previous_tag text)
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_role text;v_tag text:=upper(trim(coalesce(p_tag,'')));v_previous text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
  select gm.guild_id,gm.role into v_gid,v_role from public.guild_members gm where gm.account_id=v_uid limit 1;
  if v_gid is null then raise exception 'NOT_IN_GUILD';end if;if v_role not in('leader','officer') then raise exception 'GUILD_OFFICER_REQUIRED';end if;
  if v_tag!~'^[A-Z]{3}$' then raise exception 'GUILD_TAG_INVALID_FORMAT';end if;
  if exists(select 1 from public.guild_tag_blocklist b where b.tag=v_tag) then raise exception 'GUILD_TAG_BLOCKED';end if;
  select g.tag into v_previous from public.guilds g where g.id=v_gid for update;
  if v_previous=v_tag then return query select v_gid,v_tag,v_previous;return;end if;
  if exists(select 1 from public.guild_tag_registry r where r.tag=v_tag) then raise exception 'GUILD_TAG_TAKEN';end if;
  update public.guild_tag_registry r set status='retired',retired_at=now() where r.guild_id=v_gid and r.status='active';
  begin insert into public.guild_tag_registry(tag,guild_id) values(v_tag,v_gid);exception when unique_violation then raise exception 'GUILD_TAG_TAKEN';end;
  update public.guilds g set tag=v_tag where g.id=v_gid;
  return query select v_gid,v_tag,v_previous;
end $$;

create or replace function public.update_guild_appearance_v52(p_banner_id text,p_border_id text,p_name_color_id text,p_tag_color_id text,p_nameplate_id text,p_motto text)
returns table(guild_id uuid,banner_id text,border_id text,name_color_id text,tag_color_id text,nameplate_id text,motto text,revision bigint)
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_role text;v_level integer;v_gallery integer;v_achievements text[];v_motto text:=regexp_replace(trim(coalesce(p_motto,'')),'\s+',' ','g');v_required integer;v_trophy text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED';end if;
 select gm.guild_id,gm.role into v_gid,v_role from public.guild_members gm where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'NOT_IN_GUILD';end if;if v_role not in('leader','officer') then raise exception 'GUILD_OFFICER_REQUIRED';end if;
 select e.guild_level,e.banner_gallery_tier,e.pve_achievement_ids into v_level,v_gallery,v_achievements from public.guild_appearance_entitlements_v52() e;
 if p_banner_id not in('swordwing_blue','world_tree_green','phoenix_crimson','moon_star_indigo','wolf_peak_charcoal','arcane_eye_purple','sun_lion_ivory','forge_anvil_teal') then raise exception 'INVALID_GUILD_BANNER';end if;
 if p_border_id not in('classic','bronze_fellowship','silver_fellowship','grand_gold','emerald_vine','sapphire_dungeon','crimson_bossbreaker','amethyst_raidforged','mythic_conqueror') then raise exception 'INVALID_GUILD_FRAME';end if;
 if p_name_color_id not in('name_ivory','name_steel','name_gold','name_emerald','name_sapphire','name_crimson','name_amethyst','name_frost','name_mythic') then raise exception 'INVALID_GUILD_NAME_COLOR';end if;
 if p_tag_color_id not in('tag_silver','tag_gold','tag_emerald','tag_sapphire','tag_frost','tag_crimson','tag_amethyst','tag_mythic') then raise exception 'INVALID_GUILD_TAG_COLOR';end if;
 if p_nameplate_id not in('classic','sapphire_royal') then raise exception 'INVALID_GUILD_NAMEPLATE';end if;if char_length(v_motto) not between 1 and 80 then raise exception 'INVALID_GUILD_MOTTO';end if;
 v_required:=case p_border_id when'bronze_fellowship'then 5 when'silver_fellowship'then 10 when'grand_gold'then 20 else 1 end;if v_level<v_required then raise exception 'GUILD_BORDER_LOCKED';end if;
 if p_border_id='emerald_vine' and v_gallery<3 then raise exception 'GUILD_BORDER_LOCKED';end if;if p_nameplate_id='sapphire_royal' and v_gallery<4 then raise exception 'GUILD_NAMEPLATE_LOCKED';end if;
 v_required:=case p_name_color_id when'name_gold'then 5 when'name_emerald'then 10 when'name_sapphire'then 15 else 1 end;if v_level<v_required then raise exception 'GUILD_NAME_COLOR_LOCKED';end if;
 v_required:=case p_tag_color_id when'tag_gold'then 5 when'tag_emerald'then 10 when'tag_sapphire'then 15 else 1 end;if v_level<v_required then raise exception 'GUILD_TAG_COLOR_LOCKED';end if;
 v_trophy:=case p_border_id when'sapphire_dungeon'then'guild_pve_dungeon_25' when'crimson_bossbreaker'then'guild_pve_bossbreaker' when'amethyst_raidforged'then'guild_pve_raid_first_clear' when'mythic_conqueror'then'guild_pve_raid_hard_clear' end;if v_trophy is not null and not(v_trophy=any(v_achievements))then raise exception 'GUILD_BORDER_LOCKED';end if;
 v_trophy:=case p_name_color_id when'name_frost'then'guild_pve_dungeon_25' when'name_crimson'then'guild_pve_bossbreaker' when'name_amethyst'then'guild_pve_raid_first_clear' when'name_mythic'then'guild_pve_raid_hard_clear' end;if v_trophy is not null and not(v_trophy=any(v_achievements))then raise exception 'GUILD_NAME_COLOR_LOCKED';end if;
 v_trophy:=case p_tag_color_id when'tag_frost'then'guild_pve_dungeon_25' when'tag_crimson'then'guild_pve_bossbreaker' when'tag_amethyst'then'guild_pve_raid_first_clear' when'tag_mythic'then'guild_pve_raid_hard_clear' end;if v_trophy is not null and not(v_trophy=any(v_achievements))then raise exception 'GUILD_TAG_COLOR_LOCKED';end if;
 update public.guilds g set banner_id=p_banner_id,profile_frame_id=p_border_id,name_color_id=p_name_color_id,tag_color_id=p_tag_color_id,nameplate_id=p_nameplate_id,motto=v_motto where g.id=v_gid;
 insert into public.guild_appearance(guild_id,banner_id,border_id,name_color_id,tag_color_id,nameplate_id,revision,updated_at) values(v_gid,p_banner_id,p_border_id,p_name_color_id,p_tag_color_id,p_nameplate_id,1,now()) on conflict on constraint guild_appearance_pkey do update set banner_id=excluded.banner_id,border_id=excluded.border_id,name_color_id=excluded.name_color_id,tag_color_id=excluded.tag_color_id,nameplate_id=excluded.nameplate_id,revision=public.guild_appearance.revision+1,updated_at=now();
 return query select g.id,g.banner_id,g.profile_frame_id,g.name_color_id,g.tag_color_id,g.nameplate_id,g.motto,a.revision from public.guilds g join public.guild_appearance a on a.guild_id=g.id where g.id=v_gid;
end $$;

create or replace function public.update_guild_tag_color(p_tag_color_id text)
returns table(guild_id uuid,tag_color_id text)
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_role text;v_level integer;v_trophy text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select gm.guild_id,gm.role,g.level into v_gid,v_role,v_level from public.guild_members gm join public.guilds g on g.id=gm.guild_id where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'NOT_IN_GUILD';end if;if v_role not in('leader','officer') then raise exception 'GUILD_OFFICER_REQUIRED';end if;
 if p_tag_color_id not in('tag_silver','tag_gold','tag_emerald','tag_sapphire','tag_frost','tag_crimson','tag_amethyst','tag_mythic') then raise exception 'INVALID_GUILD_TAG_COLOR';end if;
 if v_level<(case p_tag_color_id when'tag_gold'then 5 when'tag_emerald'then 10 when'tag_sapphire'then 15 else 1 end) then raise exception 'GUILD_TAG_COLOR_LOCKED';end if;
 v_trophy:=case p_tag_color_id when'tag_frost'then'guild_pve_dungeon_25' when'tag_crimson'then'guild_pve_bossbreaker' when'tag_amethyst'then'guild_pve_raid_first_clear' when'tag_mythic'then'guild_pve_raid_hard_clear' end;
 if v_trophy is not null and not exists(select 1 from public.guild_hall_trophies t where t.guild_id=v_gid and t.trophy_key=v_trophy)then raise exception 'GUILD_TAG_COLOR_LOCKED';end if;
 update public.guilds g set tag_color_id=p_tag_color_id where g.id=v_gid;
 update public.guild_appearance a set tag_color_id=p_tag_color_id,revision=a.revision+1,updated_at=now() where a.guild_id=v_gid;
 return query select v_gid,p_tag_color_id;
end $$;

commit;
