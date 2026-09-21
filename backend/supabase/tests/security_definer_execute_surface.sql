begin;

do $$
declare
  forbidden regprocedure[] := array[
    'public.enforce_guild_member_cap_v54()'::regprocedure,
    'public.enforce_persistent_party_size_v16()'::regprocedure,
    'public.guild_launch_caps_guard_v54()'::regprocedure,
    'public.guild_open_halls_guard_v54()'::regprocedure,
    'public.guild_open_halls_sync_v54()'::regprocedure,
    'public.squad_assert_three_members(uuid)'::regprocedure
  ];
  allowed regprocedure[] := array[
    'public.active_live_events()'::regprocedure,
    'public.visible_live_events()'::regprocedure,
    'public.is_active_party_member_v16(uuid,uuid)'::regprocedure
  ];
  f regprocedure;
begin
  foreach f in array forbidden loop
    if has_function_privilege('anon',f,'EXECUTE') then
      raise exception 'anon must not execute %',f;
    end if;
    if has_function_privilege('authenticated',f,'EXECUTE') then
      raise exception 'authenticated must not execute internal helper %',f;
    end if;
    if not has_function_privilege('service_role',f,'EXECUTE') then
      raise exception 'service_role must retain trusted access to %',f;
    end if;
  end loop;

  foreach f in array allowed loop
    if has_function_privilege('anon',f,'EXECUTE') then
      raise exception 'anon must not execute %',f;
    end if;
    if not has_function_privilege('authenticated',f,'EXECUTE') then
      raise exception 'authenticated must retain read/RLS access to %',f;
    end if;
    if not has_function_privilege('service_role',f,'EXECUTE') then
      raise exception 'service_role must retain access to %',f;
    end if;
  end loop;

  if coalesce((select array_to_string(proconfig,',') from pg_proc where oid='public.squad_assert_three_members(uuid)'::regprocedure),'') not like '%search_path=public, pg_temp%' then
    raise exception 'squad_assert_three_members must pin search_path';
  end if;
end $$;

set local role authenticated;
select count(*) >= 0 from public.active_live_events();
select count(*) >= 0 from public.visible_live_events();
select public.is_active_party_member_v16(
 '00000000-0000-0000-0000-000000000001'::uuid,
 '00000000-0000-0000-0000-000000000002'::uuid
) is false;

rollback;
