begin;

-- VELDRYN V52: server-authoritative guild visual customization.
-- Does not introduce any player Market dependency.

alter table public.guilds
  add column if not exists banner_id text not null default 'world_tree_green',
  add column if not exists profile_frame_id text not null default 'classic',
  add column if not exists nameplate_id text not null default 'classic',
  add column if not exists motto text not null default 'Stronger together.';

do $$ begin
  if not exists(select 1 from pg_constraint where conname='guilds_banner_id_v52_check') then
    alter table public.guilds add constraint guilds_banner_id_v52_check check(banner_id in(
      'swordwing_blue','world_tree_green','phoenix_crimson','moon_star_indigo',
      'wolf_peak_charcoal','arcane_eye_purple','sun_lion_ivory','forge_anvil_teal'
    ));
  end if;
  if not exists(select 1 from pg_constraint where conname='guilds_profile_frame_id_v52_check') then
    alter table public.guilds add constraint guilds_profile_frame_id_v52_check check(profile_frame_id in('classic','emerald_vine'));
  end if;
  if not exists(select 1 from pg_constraint where conname='guilds_nameplate_id_v52_check') then
    alter table public.guilds add constraint guilds_nameplate_id_v52_check check(nameplate_id in('classic','sapphire_royal'));
  end if;
  if not exists(select 1 from pg_constraint where conname='guilds_motto_v52_check') then
    alter table public.guilds add constraint guilds_motto_v52_check check(char_length(trim(motto)) between 1 and 80);
  end if;
end $$;

create or replace function public.update_guild_customization(
  p_banner_id text,
  p_profile_frame_id text,
  p_nameplate_id text,
  p_motto text
)
returns table(
  guild_id uuid,
  banner_id text,
  profile_frame_id text,
  nameplate_id text,
  motto text
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_uid uuid:=auth.uid();
  v_gid uuid;
  v_role text;
  v_motto text:=regexp_replace(trim(coalesce(p_motto,'')),'\s+',' ','g');
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'LINK_ACCOUNT_REQUIRED'; end if;

  select gm.guild_id,gm.role into v_gid,v_role
  from public.guild_members gm
  where gm.account_id=v_uid
  limit 1;

  if v_gid is null then raise exception 'NOT_IN_GUILD'; end if;
  if v_role not in('leader','officer') then raise exception 'GUILD_OFFICER_REQUIRED'; end if;

  if p_banner_id not in(
    'swordwing_blue','world_tree_green','phoenix_crimson','moon_star_indigo',
    'wolf_peak_charcoal','arcane_eye_purple','sun_lion_ivory','forge_anvil_teal'
  ) then raise exception 'INVALID_GUILD_BANNER'; end if;
  if p_profile_frame_id not in('classic','emerald_vine') then raise exception 'INVALID_GUILD_FRAME'; end if;
  if p_nameplate_id not in('classic','sapphire_royal') then raise exception 'INVALID_GUILD_NAMEPLATE'; end if;
  if char_length(v_motto) not between 1 and 80 then raise exception 'INVALID_GUILD_MOTTO'; end if;

  update public.guilds g
  set banner_id=p_banner_id,
      profile_frame_id=p_profile_frame_id,
      nameplate_id=p_nameplate_id,
      motto=v_motto
  where g.id=v_gid;

  return query
  select g.id,g.banner_id,g.profile_frame_id,g.nameplate_id,g.motto
  from public.guilds g
  where g.id=v_gid;
end $$;

revoke all on function public.update_guild_customization(text,text,text,text) from public,anon;
grant execute on function public.update_guild_customization(text,text,text,text) to authenticated;

commit;
