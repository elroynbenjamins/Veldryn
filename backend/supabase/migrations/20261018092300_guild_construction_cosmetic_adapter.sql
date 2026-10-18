-- Asset-independent integration of completed Guild Construction rewards with
-- canonical guild appearance. Nothing is selectable until an operator releases
-- the matching artwork; construction spending stays OFF in the earlier migration.

-- The old appearance writer has its own narrow allowlist, so extending the
-- stored value constraints alone does not give players free construction art.
alter table public.guilds drop constraint if exists guilds_banner_id_v52_check;
alter table public.guilds add constraint guilds_banner_id_v52_check check (
 banner_id in('swordwing_blue','world_tree_green','phoenix_crimson','moon_star_indigo',
 'wolf_peak_charcoal','arcane_eye_purple','sun_lion_ivory','forge_anvil_teal',
 'halloween_pumpkin_lantern','halloween_bat_moon','guild_banner_stormwatch')
);
alter table public.guilds drop constraint if exists guilds_profile_frame_id_v52_check;
alter table public.guilds add constraint guilds_profile_frame_id_v52_check check (
 profile_frame_id in('classic','bronze_fellowship','silver_fellowship','grand_gold',
 'emerald_vine','sapphire_dungeon','crimson_bossbreaker','amethyst_raidforged',
 'mythic_conqueror','border_halloween_veil','guild_frame_verdant')
);

-- Preserve ownership within the existing guild cosmetic records, which are
-- already consumed by other guild/profile systems.
alter table public.guild_cosmetic_unlocks
 drop constraint if exists guild_cosmetic_unlocks_source_kind_check;
alter table public.guild_cosmetic_unlocks
 add constraint guild_cosmetic_unlocks_source_kind_check check (
  source_kind in ('guild_level','guild_hall','guild_pve','event','admin','construction')
 );
-- The completion trigger runs as the trusted service caller (SECURITY INVOKER).
grant select,insert on public.guild_cosmetic_unlocks to service_role;

create table if not exists public.guild_construction_cosmetic_releases (
 unlock_id text primary key,
 template_id text not null unique references public.guild_construction_templates(template_id),
 cosmetic_kind text not null check(cosmetic_kind in ('banner','border','decoration')),
 released boolean not null default false
);
insert into public.guild_construction_cosmetic_releases(unlock_id,template_id,cosmetic_kind)
 values
 ('guild_banner_stormwatch','stormwatch_banner','banner'),
 ('guild_frame_verdant','verdant_guild_frame','border'),
 ('guild_decoration_fellowship_statue','fellowship_statue','decoration')
on conflict(unlock_id) do nothing;
alter table public.guild_construction_cosmetic_releases enable row level security;
revoke all on public.guild_construction_cosmetic_releases from anon,authenticated;
grant select,update on public.guild_construction_cosmetic_releases to service_role;

create or replace function public.guild_construction_publish_cosmetic_v1()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref,unlocked_at)
 values(new.guild_id,new.unlock_id,'construction',new.template_id,new.unlocked_at)
 on conflict(guild_id,unlock_id) do nothing;
 return new;
end $$;
drop trigger if exists guild_construction_publish_cosmetic_v1 on public.guild_construction_unlocks;
create trigger guild_construction_publish_cosmetic_v1
 after insert on public.guild_construction_unlocks for each row
 execute function public.guild_construction_publish_cosmetic_v1();
insert into public.guild_cosmetic_unlocks(guild_id,unlock_id,source_kind,source_ref,unlocked_at)
 select u.guild_id,u.unlock_id,'construction',u.template_id,u.unlocked_at
 from public.guild_construction_unlocks u
on conflict(guild_id,unlock_id) do nothing;

-- Read-only current-member projection. No account/guild parameters are accepted:
-- an authenticated user can never request another guild's cosmetic unlocks.
create or replace function public.guild_construction_appearance_rewards_v1()
returns table(unlock_id text,cosmetic_kind text,owned boolean,released boolean)
language plpgsql stable security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_guild uuid;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 select gm.guild_id into v_guild from public.guild_members gm
 where gm.account_id=v_uid limit 1;
 if v_guild is null then return;end if;
 return query select r.unlock_id,r.cosmetic_kind,
  exists(select 1 from public.guild_construction_unlocks u
   where u.guild_id=v_guild and u.unlock_id=r.unlock_id),
  r.released
 from public.guild_construction_cosmetic_releases r
 order by r.cosmetic_kind,r.unlock_id;
end $$;
revoke all on function public.guild_construction_appearance_rewards_v1() from public,anon,authenticated;
grant execute on function public.guild_construction_appearance_rewards_v1() to authenticated;

-- The existing writer remains the only path for ordinary guild cosmetics and
-- continues enforcing event/level/trophy and leader/officer permissions. This
-- narrow wrapper delegates every ordinary field to it and only overlays a
-- construction-specific banner or frame after checking ownership and release.
create or replace function public.update_guild_appearance_with_construction_v1(
 p_banner_id text,p_border_id text,p_name_color_id text,p_tag_color_id text,
 p_nameplate_id text,p_motto text,p_background_id text
) returns table(
 guild_id uuid,banner_id text,border_id text,name_color_id text,
 tag_color_id text,nameplate_id text,motto text,revision bigint,background_id text
) language plpgsql security definer set search_path='' as $$
declare v_uid uuid:=auth.uid();v_gid uuid;v_role text;v_level integer;
 v_banner text;v_frame text;
begin
 if v_uid is null then raise exception 'AUTH_REQUIRED';end if;
 if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
  raise exception 'LINK_ACCOUNT_REQUIRED';end if;
 select gm.guild_id into v_gid from public.guild_members gm
 where gm.account_id=v_uid limit 1;
 if v_gid is null then raise exception 'NOT_IN_GUILD';end if;
 select g.level into v_level from public.guilds g where g.id=v_gid for update;
 if not found then raise exception 'NOT_IN_GUILD';end if;
 select gm.role into v_role from public.guild_members gm
 where gm.guild_id=v_gid and gm.account_id=v_uid for update;
 if v_role not in ('leader','officer') then raise exception 'GUILD_OFFICER_REQUIRED';end if;
 if p_banner_id<>'guild_banner_stormwatch' and p_border_id<>'guild_frame_verdant'
 then raise exception 'NO_CONSTRUCTION_COSMETIC_SELECTED';end if;

 if p_banner_id='guild_banner_stormwatch' and not exists(
  select 1 from public.guild_construction_cosmetic_releases r
  join public.guild_construction_unlocks u on u.unlock_id=r.unlock_id
  join public.guild_construction_templates t on t.template_id=r.template_id
  where u.guild_id=v_gid and r.unlock_id=p_banner_id and r.cosmetic_kind='banner'
   and u.template_id=r.template_id and r.released and v_level>=t.required_guild_level
 ) then raise exception 'GUILD_CONSTRUCTION_BANNER_LOCKED';end if;
 if p_border_id='guild_frame_verdant' and not exists(
  select 1 from public.guild_construction_cosmetic_releases r
  join public.guild_construction_unlocks u on u.unlock_id=r.unlock_id
  join public.guild_construction_templates t on t.template_id=r.template_id
  where u.guild_id=v_gid and r.unlock_id=p_border_id and r.cosmetic_kind='border'
   and u.template_id=r.template_id and r.released and v_level>=t.required_guild_level
 ) then raise exception 'GUILD_CONSTRUCTION_FRAME_LOCKED';end if;

 v_banner:=case when p_banner_id='guild_banner_stormwatch'
  then 'world_tree_green' else p_banner_id end;
 v_frame:=case when p_border_id='guild_frame_verdant'
  then 'classic' else p_border_id end;
 -- Existing validator writes all fields and advances the revision once.
 perform public.update_guild_appearance_with_background_v3(
  v_banner,v_frame,p_name_color_id,p_tag_color_id,p_nameplate_id,p_motto,p_background_id
 );
 if p_banner_id='guild_banner_stormwatch' or p_border_id='guild_frame_verdant' then
  update public.guilds g set
   banner_id=case when p_banner_id='guild_banner_stormwatch' then p_banner_id else g.banner_id end,
   profile_frame_id=case when p_border_id='guild_frame_verdant' then p_border_id else g.profile_frame_id end
  where g.id=v_gid;
  update public.guild_appearance a set
   banner_id=case when p_banner_id='guild_banner_stormwatch' then p_banner_id else a.banner_id end,
   border_id=case when p_border_id='guild_frame_verdant' then p_border_id else a.border_id end
  where a.guild_id=v_gid;
 end if;
 return query select g.id,g.banner_id,g.profile_frame_id,g.name_color_id,
  g.tag_color_id,g.nameplate_id,g.motto,a.revision,g.background_id
 from public.guilds g join public.guild_appearance a on a.guild_id=g.id
 where g.id=v_gid;
end $$;
revoke all on function public.update_guild_appearance_with_construction_v1(
 text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.update_guild_appearance_with_construction_v1(
 text,text,text,text,text,text,text) to authenticated;
