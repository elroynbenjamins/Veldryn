begin;

alter table public.guilds add column if not exists background_id text not null default 'plain'
 check(background_id in('plain','guild_plaza','forest_sanctum'));
alter table public.guild_appearance add column if not exists background_id text not null default 'plain'
 check(background_id in('plain','guild_plaza','forest_sanctum'));

-- A distinct RPC preserves all existing six-argument callers. Calling the existing
-- appearance validator in this transaction preserves its cosmetic entitlements,
-- auditing revision and future fixes. Old callers leave the background intact.
create or replace function public.update_guild_appearance_with_background_v1(
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
 perform public.update_guild_appearance_v52(p_banner_id,p_border_id,p_name_color_id,p_tag_color_id,p_nameplate_id,p_motto);
 update public.guilds g set background_id=p_background_id where g.id=v_gid;
 update public.guild_appearance a set background_id=p_background_id where a.guild_id=v_gid;
 return query select g.id,g.banner_id,g.profile_frame_id,g.name_color_id,g.tag_color_id,
 g.nameplate_id,g.motto,a.revision,g.background_id from public.guilds g
 join public.guild_appearance a on a.guild_id=g.id where g.id=v_gid;
end $$;
revoke execute on function public.update_guild_appearance_with_background_v1(text,text,text,text,text,text,text) from public,anon;
grant execute on function public.update_guild_appearance_with_background_v1(text,text,text,text,text,text,text) to authenticated;
comment on column public.guilds.background_id is 'Cosmetic card background; never grants combat or progression power.';
commit;
