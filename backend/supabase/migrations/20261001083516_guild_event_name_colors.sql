begin;
-- Retire level/raid colors. Only one basic color and earned event colors remain.
update public.guilds set name_color_id='name_ivory' where name_color_id not in('name_ivory','name_halloween_orange');
update public.guild_appearance set name_color_id='name_ivory' where name_color_id not in('name_ivory','name_halloween_orange');

create function public.guild_event_name_color_guard_v3() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.name_color_id='name_ivory' then return new;end if;
 if new.name_color_id is distinct from 'name_halloween_orange' then raise exception 'INVALID_GUILD_NAME_COLOR';end if;
 if not exists(select 1 from public.guild_cosmetic_unlocks u where u.guild_id=new.id and u.unlock_id=new.name_color_id and u.source_kind='event') then raise exception 'GUILD_NAME_COLOR_LOCKED';end if;
 return new;
end $$;
create trigger guild_event_name_color_guard_v3 before insert or update of name_color_id on public.guilds for each row execute function public.guild_event_name_color_guard_v3();
revoke all on function public.guild_event_name_color_guard_v3() from public,anon,authenticated;

-- The shared milestone earns the permanent guild color, independent of personal claims.
create function public.guild_event_name_color_milestone_v3() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.kind='event' and new.event_id ~ '^EVT_ANNUAL_010_[0-9]{4}$' and new.damage*100>=new.max_hp*25 then
 insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref) values(new.guild_id,'name_halloween_orange','event',new.event_id) on conflict do nothing;
 end if;
 return new;
end $$;
create trigger guild_event_name_color_milestone_v3 after insert or update of damage on public.guild_pve_encounters_v1 for each row execute function public.guild_event_name_color_milestone_v3();
revoke all on function public.guild_event_name_color_milestone_v3() from public,anon,authenticated;
insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref)
 select guild_id,'name_halloween_orange','event',event_id from public.guild_pve_encounters_v1 where kind='event' and event_id ~ '^EVT_ANNUAL_010_[0-9]{4}$' and damage*100>=max_hp*25 on conflict do nothing;
create or replace function public.guild_appearance_entitlements_v3()
returns table(guild_id uuid,guild_level integer,banner_gallery_tier integer,pve_achievement_ids text[],event_cosmetic_ids text[])
language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_progress bigint:=0;v_gallery_progress integer:=0;v_level integer:=1;v_tier integer:=0;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select gm.guild_id,g.level into v_gid,v_level from public.guild_members gm join public.guilds g on g.id=gm.guild_id where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'NOT_IN_GUILD';end if;
 select coalesce(h.hall_progress,0),coalesce((h.facilities->'banner_gallery'->>'progress')::integer,0) into v_progress,v_gallery_progress from public.guild_halls h where h.guild_id=v_gid;
 v_tier:=case when v_progress>=20900 and v_gallery_progress>=5450 then 5 when v_progress>=7700 and v_gallery_progress>=3350 then 4 when v_progress>=3500 and v_gallery_progress>=1850 then 3 when v_progress>=900 and v_gallery_progress>=850 then 2 when v_progress>=0 and v_gallery_progress>=250 then 1 else 0 end;
 return query select v_gid,coalesce(v_level,1),v_tier,
   coalesce((select array_agg(t.trophy_key order by t.trophy_key) from public.guild_hall_trophies t where t.guild_id=v_gid),'{}'::text[]),
   coalesce((select array_agg(u.unlock_id order by u.unlock_id) from public.guild_cosmetic_unlocks u where u.guild_id=v_gid and u.source_kind='event'),'{}'::text[]);
end $$;

create or replace function public.update_guild_appearance_events_v3(p_banner_id text,p_border_id text,p_name_color_id text,p_tag_color_id text,p_nameplate_id text,p_motto text)
returns table(guild_id uuid,banner_id text,border_id text,name_color_id text,tag_color_id text,nameplate_id text,motto text,revision bigint)
language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_role text;v_level integer;v_gallery integer;v_achievements text[];v_events text[];v_motto text:=regexp_replace(trim(coalesce(p_motto,'')),'\s+',' ','g');v_required integer;v_trophy text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED';end if;
 select gm.guild_id,gm.role into v_gid,v_role from public.guild_members gm where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'NOT_IN_GUILD';end if;if v_role not in('leader','officer') then raise exception 'GUILD_OFFICER_REQUIRED';end if;
 select e.guild_level,e.banner_gallery_tier,e.pve_achievement_ids,e.event_cosmetic_ids into v_level,v_gallery,v_achievements,v_events from public.guild_appearance_entitlements_v3() e;
 if p_banner_id not in('swordwing_blue','world_tree_green','phoenix_crimson','moon_star_indigo','wolf_peak_charcoal','arcane_eye_purple','sun_lion_ivory','forge_anvil_teal','halloween_pumpkin_lantern','halloween_bat_moon') then raise exception 'INVALID_GUILD_BANNER';end if;
 if p_border_id not in('classic','bronze_fellowship','silver_fellowship','grand_gold','emerald_vine','sapphire_dungeon','crimson_bossbreaker','amethyst_raidforged','mythic_conqueror','border_halloween_veil') then raise exception 'INVALID_GUILD_FRAME';end if;
 if p_name_color_id is null or p_name_color_id not in('name_ivory','name_halloween_orange') then raise exception 'INVALID_GUILD_NAME_COLOR';end if;
 if p_tag_color_id not in('tag_silver','tag_gold','tag_emerald','tag_sapphire','tag_frost','tag_crimson','tag_amethyst','tag_mythic') then raise exception 'INVALID_GUILD_TAG_COLOR';end if;
 if p_nameplate_id not in('classic','sapphire_royal') then raise exception 'INVALID_GUILD_NAMEPLATE';end if;if char_length(v_motto) not between 1 and 80 then raise exception 'INVALID_GUILD_MOTTO';end if;
 v_required:=case p_border_id when'bronze_fellowship'then 5 when'silver_fellowship'then 10 when'grand_gold'then 20 else 1 end;if v_level<v_required then raise exception 'GUILD_BORDER_LOCKED';end if;
 if p_border_id='emerald_vine' and v_gallery<3 then raise exception 'GUILD_BORDER_LOCKED';end if;if p_nameplate_id='sapphire_royal' and v_gallery<4 then raise exception 'GUILD_NAMEPLATE_LOCKED';end if;
 if p_border_id='border_halloween_veil' and not coalesce(p_border_id=any(v_events),false) then raise exception 'GUILD_BORDER_LOCKED';end if;
 if p_name_color_id='name_halloween_orange' and not coalesce(p_name_color_id=any(v_events),false) then raise exception 'GUILD_NAME_COLOR_LOCKED';end if;
 if p_banner_id like 'halloween_%' and not coalesce(p_banner_id=any(v_events),false) then raise exception 'GUILD_BANNER_LOCKED';end if;
 v_trophy:=case p_border_id when'sapphire_dungeon'then'guild_pve_dungeon_25' when'crimson_bossbreaker'then'guild_pve_bossbreaker' when'amethyst_raidforged'then'guild_pve_raid_first_clear' when'mythic_conqueror'then'guild_pve_raid_hard_clear' end;if v_trophy is not null and not(v_trophy=any(v_achievements))then raise exception 'GUILD_BORDER_LOCKED';end if;
 v_required:=case p_tag_color_id when'tag_gold'then 5 when'tag_emerald'then 10 when'tag_sapphire'then 15 else 1 end;if v_level<v_required then raise exception 'GUILD_TAG_COLOR_LOCKED';end if;
 v_trophy:=case p_tag_color_id when'tag_frost'then'guild_pve_dungeon_25' when'tag_crimson'then'guild_pve_bossbreaker' when'tag_amethyst'then'guild_pve_raid_first_clear' when'tag_mythic'then'guild_pve_raid_hard_clear' end;if v_trophy is not null and not(v_trophy=any(v_achievements))then raise exception 'GUILD_TAG_COLOR_LOCKED';end if;
 update public.guilds g set banner_id=p_banner_id,profile_frame_id=p_border_id,name_color_id=p_name_color_id,tag_color_id=p_tag_color_id,nameplate_id=p_nameplate_id,motto=v_motto where g.id=v_gid;
 insert into public.guild_appearance(guild_id,banner_id,border_id,name_color_id,tag_color_id,nameplate_id,revision,updated_at) values(v_gid,p_banner_id,p_border_id,p_name_color_id,p_tag_color_id,p_nameplate_id,1,now()) on conflict on constraint guild_appearance_pkey do update set banner_id=excluded.banner_id,border_id=excluded.border_id,name_color_id=excluded.name_color_id,tag_color_id=excluded.tag_color_id,nameplate_id=excluded.nameplate_id,revision=public.guild_appearance.revision+1,updated_at=now();
 return query select g.id,g.banner_id,g.profile_frame_id,g.name_color_id,g.tag_color_id,g.nameplate_id,g.motto,a.revision from public.guilds g join public.guild_appearance a on a.guild_id=g.id where g.id=v_gid;
end $$;

create or replace function public.update_guild_appearance_with_background_v3(
 p_banner_id text,p_border_id text,p_name_color_id text,p_tag_color_id text,
 p_nameplate_id text,p_motto text,p_background_id text
)
returns table(guild_id uuid,banner_id text,border_id text,name_color_id text,
 tag_color_id text,nameplate_id text,motto text,revision bigint,background_id text)
language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_role text;v_level integer;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED';end if;
 select gm.guild_id into v_gid from public.guild_members gm where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'NOT_IN_GUILD';end if;
 -- Same order as leadership/disband: guild first, membership second. Recheck
 -- membership under lock so removal/demotion cannot race with this write.
 select g.level into v_level from public.guilds g where g.id=v_gid for update;
 if not found then raise exception 'NOT_IN_GUILD';end if;
 select gm.role into v_role from public.guild_members gm
 where gm.guild_id=v_gid and gm.account_id=v_uid for update;
 if not found then raise exception 'NOT_IN_GUILD';end if;
 if v_role not in('leader','officer') then raise exception 'GUILD_OFFICER_REQUIRED';end if;
 if p_background_id is null or p_background_id not in('plain','guild_plaza','forest_sanctum') then raise exception 'INVALID_GUILD_BACKGROUND';end if;
 if p_background_id='forest_sanctum' and coalesce(v_level,1)<10 then raise exception 'GUILD_BACKGROUND_LOCKED';end if;
 -- v52 validates every other cosmetic and increments the revision exactly once.
 perform public.update_guild_appearance_events_v3(p_banner_id,p_border_id,p_name_color_id,p_tag_color_id,p_nameplate_id,p_motto);
 update public.guilds g set background_id=p_background_id where g.id=v_gid;
 update public.guild_appearance a set background_id=p_background_id where a.guild_id=v_gid;
 return query select g.id,g.banner_id,g.profile_frame_id,g.name_color_id,g.tag_color_id,
 g.nameplate_id,g.motto,a.revision,g.background_id from public.guilds g
 join public.guild_appearance a on a.guild_id=g.id where g.id=v_gid;
end $$;
revoke execute on function public.update_guild_appearance_with_background_v3(text,text,text,text,text,text,text) from public,anon;
grant execute on function public.update_guild_appearance_with_background_v3(text,text,text,text,text,text,text) to authenticated;

revoke all on function public.guild_appearance_entitlements_v3() from public,anon;
grant execute on function public.guild_appearance_entitlements_v3() to authenticated;
revoke all on function public.update_guild_appearance_events_v3(text,text,text,text,text,text) from public,anon,authenticated;
commit;
