begin;

-- Completes the cumulative V52 appearance model while preserving the host's established IDs.
alter table public.guilds add column if not exists name_color_id text not null default 'name_ivory';
alter table public.guilds drop constraint if exists guilds_profile_frame_id_v52_check;
alter table public.guilds add constraint guilds_profile_frame_id_v52_check check(profile_frame_id in(
 'classic','bronze_fellowship','silver_fellowship','grand_gold','emerald_vine','sapphire_dungeon','crimson_bossbreaker','amethyst_raidforged','mythic_conqueror'));
alter table public.guilds drop constraint if exists guilds_name_color_id_v52_check;
alter table public.guilds add constraint guilds_name_color_id_v52_check check(name_color_id in(
 'name_ivory','name_steel','name_gold','name_emerald','name_sapphire','name_crimson','name_amethyst','name_frost','name_mythic'));

create table if not exists public.guild_appearance(
 guild_id uuid primary key references public.guilds(id) on delete cascade,
 revision bigint not null default 0 check(revision>=0),schema_version integer not null default 53 check(schema_version in(52,53)),
 banner_id text not null default 'world_tree_green',border_id text not null default 'classic',name_color_id text not null default 'name_ivory',
 tag_color_id text not null default 'tag_silver',nameplate_id text not null default 'classic',updated_at timestamptz not null default now()
);
create table if not exists public.guild_cosmetic_unlocks(
 guild_id uuid not null references public.guilds(id) on delete cascade,unlock_id text not null,
 source_kind text not null check(source_kind in('guild_level','guild_hall','guild_pve','event','admin')),source_ref text not null,
 unlocked_at timestamptz not null default now(),primary key(guild_id,unlock_id)
);
create index if not exists guild_cosmetic_unlocks_guild_idx on public.guild_cosmetic_unlocks(guild_id,unlocked_at desc);
insert into public.guild_appearance(guild_id,banner_id,border_id,name_color_id,tag_color_id,nameplate_id)
select id,banner_id,profile_frame_id,name_color_id,tag_color_id,nameplate_id from public.guilds on conflict(guild_id) do nothing;

create or replace function public.initialize_guild_appearance_v52()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.guild_appearance(guild_id,banner_id,border_id,name_color_id,tag_color_id,nameplate_id)
 values(new.id,new.banner_id,new.profile_frame_id,new.name_color_id,new.tag_color_id,new.nameplate_id)
 on conflict(guild_id) do nothing;
 return new;
end $$;
drop trigger if exists initialize_guild_appearance_v52 on public.guilds;
create trigger initialize_guild_appearance_v52 after insert on public.guilds for each row execute function public.initialize_guild_appearance_v52();

alter table public.guild_appearance enable row level security;
alter table public.guild_cosmetic_unlocks enable row level security;
drop policy if exists "guild appearance publicly readable" on public.guild_appearance;
create policy "guild appearance publicly readable" on public.guild_appearance for select to anon,authenticated using(true);
drop policy if exists "guild cosmetic unlocks visible to guild members" on public.guild_cosmetic_unlocks;
create policy "guild cosmetic unlocks visible to guild members" on public.guild_cosmetic_unlocks for select to authenticated
using(exists(select 1 from public.guild_members gm where gm.guild_id=guild_cosmetic_unlocks.guild_id and gm.account_id=(select auth.uid())));
revoke all on public.guild_appearance,public.guild_cosmetic_unlocks from public,anon,authenticated;
grant select on public.guild_appearance to anon,authenticated;
grant select on public.guild_cosmetic_unlocks to authenticated;

create or replace function public.guild_appearance_entitlements_v52()
returns table(guild_id uuid,guild_level integer,banner_gallery_tier integer,pve_achievement_ids text[])
language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_progress bigint:=0;v_gallery_progress integer:=0;v_level integer:=1;v_tier integer:=0;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select gm.guild_id,g.level into v_gid,v_level from public.guild_members gm join public.guilds g on g.id=gm.guild_id where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'NOT_IN_GUILD';end if;
 select coalesce(h.hall_progress,0),coalesce((h.facilities->'banner_gallery'->>'progress')::integer,0) into v_progress,v_gallery_progress from public.guild_halls h where h.guild_id=v_gid;
 v_tier:=case when v_progress>=20900 and v_gallery_progress>=5450 then 5 when v_progress>=7700 and v_gallery_progress>=3350 then 4 when v_progress>=3500 and v_gallery_progress>=1850 then 3 when v_progress>=900 and v_gallery_progress>=850 then 2 when v_progress>=0 and v_gallery_progress>=250 then 1 else 0 end;
 return query select v_gid,coalesce(v_level,1),v_tier,coalesce((select array_agg(t.trophy_key order by t.trophy_key) from public.guild_hall_trophies t where t.guild_id=v_gid),'{}'::text[]);
end $$;

create or replace function public.update_guild_appearance_v52(p_banner_id text,p_border_id text,p_name_color_id text,p_tag_color_id text,p_nameplate_id text,p_motto text)
returns table(guild_id uuid,banner_id text,border_id text,name_color_id text,tag_color_id text,nameplate_id text,motto text,revision bigint)
language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_role text;v_level integer;v_gallery integer;v_achievements text[];v_motto text:=regexp_replace(trim(coalesce(p_motto,'')),'\s+',' ','g');v_required integer;v_trophy text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED';end if;
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
 update public.guilds set banner_id=p_banner_id,profile_frame_id=p_border_id,name_color_id=p_name_color_id,tag_color_id=p_tag_color_id,nameplate_id=p_nameplate_id,motto=v_motto where id=v_gid;
 insert into public.guild_appearance(guild_id,banner_id,border_id,name_color_id,tag_color_id,nameplate_id,revision,updated_at) values(v_gid,p_banner_id,p_border_id,p_name_color_id,p_tag_color_id,p_nameplate_id,1,now()) on conflict(guild_id) do update set banner_id=excluded.banner_id,border_id=excluded.border_id,name_color_id=excluded.name_color_id,tag_color_id=excluded.tag_color_id,nameplate_id=excluded.nameplate_id,revision=public.guild_appearance.revision+1,updated_at=now();
 return query select g.id,g.banner_id,g.profile_frame_id,g.name_color_id,g.tag_color_id,g.nameplate_id,g.motto,a.revision from public.guilds g join public.guild_appearance a on a.guild_id=g.id where g.id=v_gid;
end $$;

create or replace function public.update_guild_customization(p_banner_id text,p_profile_frame_id text,p_nameplate_id text,p_motto text)
returns table(guild_id uuid,banner_id text,profile_frame_id text,nameplate_id text,motto text)
language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_name_color text;v_tag_color text;
begin
 select gm.guild_id into v_gid from public.guild_members gm where gm.account_id=v_uid limit 1;
 select g.name_color_id,g.tag_color_id into v_name_color,v_tag_color from public.guilds g where g.id=v_gid;
 perform public.update_guild_appearance_v52(p_banner_id,p_profile_frame_id,v_name_color,v_tag_color,p_nameplate_id,p_motto);
 return query select g.id,g.banner_id,g.profile_frame_id,g.nameplate_id,g.motto from public.guilds g where g.id=v_gid;
end $$;

create or replace function public.update_guild_tag_color(p_tag_color_id text)
returns table(guild_id uuid,tag_color_id text)
language plpgsql security definer set search_path=''
as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_role text;v_level integer;v_trophy text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select gm.guild_id,gm.role,g.level into v_gid,v_role,v_level from public.guild_members gm join public.guilds g on g.id=gm.guild_id where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'NOT_IN_GUILD';end if;if v_role not in('leader','officer') then raise exception 'GUILD_OFFICER_REQUIRED';end if;
 if p_tag_color_id not in('tag_silver','tag_gold','tag_emerald','tag_sapphire','tag_frost','tag_crimson','tag_amethyst','tag_mythic') then raise exception 'INVALID_GUILD_TAG_COLOR';end if;
 if v_level<(case p_tag_color_id when'tag_gold'then 5 when'tag_emerald'then 10 when'tag_sapphire'then 15 else 1 end) then raise exception 'GUILD_TAG_COLOR_LOCKED';end if;
 v_trophy:=case p_tag_color_id when'tag_frost'then'guild_pve_dungeon_25' when'tag_crimson'then'guild_pve_bossbreaker' when'tag_amethyst'then'guild_pve_raid_first_clear' when'tag_mythic'then'guild_pve_raid_hard_clear' end;
 if v_trophy is not null and not exists(select 1 from public.guild_hall_trophies t where t.guild_id=v_gid and t.trophy_key=v_trophy)then raise exception 'GUILD_TAG_COLOR_LOCKED';end if;
 update public.guilds set tag_color_id=p_tag_color_id where id=v_gid;update public.guild_appearance set tag_color_id=p_tag_color_id,revision=revision+1,updated_at=now() where guild_id=v_gid;
 return query select v_gid,p_tag_color_id;
end $$;

revoke execute on function public.guild_appearance_entitlements_v52(),public.update_guild_appearance_v52(text,text,text,text,text,text),public.update_guild_customization(text,text,text,text),public.update_guild_tag_color(text) from public,anon;
grant execute on function public.guild_appearance_entitlements_v52(),public.update_guild_appearance_v52(text,text,text,text,text,text),public.update_guild_customization(text,text,text,text),public.update_guild_tag_color(text) to authenticated;
revoke execute on function public.initialize_guild_appearance_v52() from public,anon,authenticated;
comment on table public.guild_appearance is 'V52/V53 cosmetic-only guild identity state. Gameplay power must never depend on these selections.';
commit;
