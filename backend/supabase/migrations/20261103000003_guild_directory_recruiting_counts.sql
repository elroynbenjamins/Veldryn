-- Read-only Guild recruitment projection. Intentionally returns only public Guild
-- presentation fields and aggregated membership counts, never member identities.
-- SECURITY DEFINER is scoped to authenticated sessions and a fixed search path.
create or replace function public.guild_directory_v1(
 p_search text default '',
 p_filter text default 'recruiting',
 p_limit integer default 50
) returns setof jsonb
language sql stable security definer
set search_path = ''
as $guild_directory$
 select jsonb_build_object(
  'id',g.id,'name',g.name,'tag',g.tag,'tag_color_id',g.tag_color_id,
  'level',g.level,'member_cap',g.member_cap,'member_count',(
    select count(*)::integer from public.guild_members gm where gm.guild_id=g.id
  ),
  'minimum_level',g.minimum_level,'join_policy',g.join_policy,
  'banner_id',g.banner_id,'profile_frame_id',g.profile_frame_id,
  'name_color_id',g.name_color_id,'nameplate_id',g.nameplate_id,
  'motto',g.motto,'background_id',to_jsonb(g)->>'background_id'
 )
 from public.guilds g
 where auth.uid() is not null
  and (
    p_filter='all'
    or (p_filter='recruiting' and g.join_policy in ('open','apply'))
    or g.join_policy=p_filter
  )
  and (
    nullif(btrim(p_search),'') is null
    or g.name ilike '%'||left(btrim(p_search),40)||'%'
    or g.tag ilike '%'||left(btrim(p_search),40)||'%'
  )
 order by g.level desc,g.name asc,g.id asc
 limit least(50,greatest(1,coalesce(p_limit,50)));
$guild_directory$;

revoke all on function public.guild_directory_v1(text,text,integer) from public,anon;
grant execute on function public.guild_directory_v1(text,text,integer) to authenticated;
comment on function public.guild_directory_v1(text,text,integer) is
 'Public Guild directory identities and aggregate member counts, for authenticated players only; no roster disclosure.';
