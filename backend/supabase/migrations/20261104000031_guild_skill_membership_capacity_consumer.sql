-- VELDRYN 1.0.4: authoritative Fellowship Membership cap consumer.
-- Existing guilds.member_cap includes legacy Open Halls capacity;
-- Fellowship adds distinct +1 per released rank, never double-applying perks.
create or replace function public.guild_member_cap_effective_server_v1(p_guild_id uuid)
returns integer
language sql stable security definer set search_path=''
as $guild_cap$
  select g.member_cap + coalesce((
    select least(a.rank,c.max_rank)*c.bonus_per_rank
    from public.guild_skill_allocations a
    join public.guild_skill_catalogue_v1 c on c.skill_id=a.skill_id
    where a.guild_id=g.id and a.skill_id='fellowship_membership' and c.is_released
  ),0)::integer
  from public.guilds g where g.id=p_guild_id
$guild_cap$;
revoke all on function public.guild_member_cap_effective_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.guild_member_cap_effective_server_v1(uuid) to service_role;

-- Final row-locking insert guard; early checks are also patched below.
create or replace function public.enforce_guild_member_cap_v54()
returns trigger language plpgsql security definer set search_path='' as $guild_cap_trigger$
declare v_cap integer;v_count integer;
begin
  select g.member_cap into v_cap from public.guilds g where g.id=new.guild_id for update;
  if v_cap is null then raise exception 'GUILD_NOT_FOUND';end if;
  v_cap:=public.guild_member_cap_effective_server_v1(new.guild_id);
  select count(*) into v_count from public.guild_members where guild_id=new.guild_id;
  if v_count>=v_cap then raise exception 'GUILD_FULL';end if;
  return new;
end
$guild_cap_trigger$;

-- Preserve environment-specific invitation/minimum-level/auth hardening.
-- Fail atomically if an expected RPC changed instead of silently skipping it.
do $guild_cap_patch$
declare v_name text;v_source text;v_updated text;v_old text;v_new text;
begin
  for v_name in
    select unnest(array[
      'apply_to_guild','invite_to_guild','respond_guild_application',
      'respond_guild_invitation_v1','respond_guild_invite','review_guild_application',
      'send_guild_invitation_v1','guild_directory_v1',
      'social_invitation_state_v1','social_invite_capabilities_v1'
    ])
  loop
    select pg_get_functiondef(p.oid) into v_source
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=v_name;
    if v_source is null then raise exception 'guild_capacity_missing_rpc: %',v_name;end if;
    if position('public.guild_member_cap_effective_server_v1(' in v_source)>0 then continue;end if;
    if v_name in ('apply_to_guild','invite_to_guild',
                  'respond_guild_application','respond_guild_invite') then
      v_old:='select member_cap';
      v_new:='select public.guild_member_cap_effective_server_v1(id)';
    elsif v_name in ('respond_guild_invitation_v1','review_guild_application') then
      v_old:='v_guild.member_cap';
      v_new:='public.guild_member_cap_effective_server_v1(v_guild.id)';
    else
      v_old:='g.member_cap';
      v_new:='public.guild_member_cap_effective_server_v1(g.id)';
    end if;
    v_updated:=replace(v_source,v_old,v_new);
    if v_updated=v_source then
      raise exception 'guild_capacity_patch_pattern_missing: % [%]',v_name,v_old;
    end if;
    execute v_updated;
  end loop;
end
$guild_cap_patch$;
