-- Read-only Guild detail projection matching guild_directory_v1.
-- Keep base capacity and skill allocations untouched; the existing server helper
-- is the authority for both recruitment enforcement and displayed capacity.
create or replace function public.guild_details_v2(p_guild_id uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $guild_details$
  select jsonb_build_object(
    'id',g.id,'name',g.name,'tag',g.tag,'tag_color_id',g.tag_color_id,
    'level',g.level,'member_cap',public.guild_member_cap_effective_server_v1(g.id),
    'member_count',(select count(*)::integer from public.guild_members gm where gm.guild_id=g.id),
    'minimum_level',g.minimum_level,'join_policy',g.join_policy,
    'banner_id',g.banner_id,'profile_frame_id',g.profile_frame_id,
    'name_color_id',g.name_color_id,'nameplate_id',g.nameplate_id,
    'motto',g.motto,'background_id',to_jsonb(g)->>'background_id'
  )
  from public.guilds g
  where auth.uid() is not null and g.id=p_guild_id;
$guild_details$;
revoke all on function public.guild_details_v2(uuid) from public, anon, authenticated;
grant execute on function public.guild_details_v2(uuid) to authenticated;
