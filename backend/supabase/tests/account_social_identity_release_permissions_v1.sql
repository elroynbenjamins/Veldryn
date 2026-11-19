-- Read-only Social Names release permission gate. Run on staging and again on
-- production AFTER approved migrations. This script does not change player data.
do $readiness$
declare
  fn text;
  fn_oid oid;
  fn_definer boolean;
  fn_settings text[];
  enabled_triggers int;
begin
  if to_regclass('public.character_profile_showcases_v1') is null then
    raise exception 'SOCIAL_RELEASE_GATE: showcases table missing';
  end if;
  if not (select relrowsecurity from pg_class
    where oid='public.character_profile_showcases_v1'::regclass) then
    raise exception 'SOCIAL_RELEASE_GATE: showcases RLS disabled';
  end if;
  if has_table_privilege('anon','public.character_profile_showcases_v1','SELECT')
    or has_table_privilege('authenticated','public.character_profile_showcases_v1','SELECT')
    or has_table_privilege('authenticated','public.character_profile_showcases_v1','INSERT')
    or has_table_privilege('authenticated','public.character_profile_showcases_v1','UPDATE')
    or has_table_privilege('authenticated','public.character_profile_showcases_v1','DELETE') then
    raise exception 'SOCIAL_RELEASE_GATE: showcases direct client access exposed';
  end if;
  if not exists(select 1 from pg_attribute
    where attrelid='public.player_profiles'::regclass and attname='social_name' and not attisdropped)
    or not exists(select 1 from pg_attribute
    where attrelid='public.player_profiles'::regclass and attname='social_name_changed_at' and not attisdropped) then
    raise exception 'SOCIAL_RELEASE_GATE: account name columns missing';
  end if;
  select count(*) into enabled_triggers from pg_trigger
  where tgrelid='public.player_profiles'::regclass and not tgisinternal
    and tgname in ('protect_social_name_v1','protect_social_profile_delete_v1')
    and tgenabled <> 'D';
  if enabled_triggers<>2 then
    raise exception 'SOCIAL_RELEASE_GATE: direct name mutation/delete guards missing';
  end if;
  foreach fn in array array[
    'account_social_name_self_v1','set_account_social_name_v1',
    'character_showcase_self_v1','profile_identity_update_v2',
    'profile_character_showcase_update_v2','profile_featured_character_update_v2',
    'profile_character_public_v1','profile_character_gear_v1'
  ] loop
    select p.oid,p.prosecdef,p.proconfig into fn_oid,fn_definer,fn_settings
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=fn order by p.oid limit 1;
    if fn_oid is null then
      raise exception 'SOCIAL_RELEASE_GATE: required RPC missing: %',fn;
    end if;
    if not fn_definer or not exists(select 1 from unnest(coalesce(fn_settings,array[]::text[])) s
      where s like 'search_path=%') then
      raise exception 'SOCIAL_RELEASE_GATE: elevated RPC search_path/definer drift: %',fn;
    end if;
    if has_function_privilege('anon',fn_oid,'EXECUTE')
      or not has_function_privilege('authenticated',fn_oid,'EXECUTE') then
      raise exception 'SOCIAL_RELEASE_GATE: API role grant drift: %',fn;
    end if;
  end loop;
  foreach fn in array array['protect_social_name_v1','store_character_showcase_from_extension_v1'] loop
    select p.oid into fn_oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname=fn order by p.oid limit 1;
    if fn_oid is null or has_function_privilege('anon',fn_oid,'EXECUTE')
      or has_function_privilege('authenticated',fn_oid,'EXECUTE') then
      raise exception 'SOCIAL_RELEASE_GATE: trigger helper exposed: %',fn;
    end if;
  end loop;
  foreach fn in array array[
    'profile_public_v43','profile_extension_self_v43',
    'profile_extension_update_v43','profile_equipped_gear_v1'
  ] loop
    if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname=fn) then
      raise exception 'SOCIAL_RELEASE_GATE: legacy profile RPC unavailable: %',fn;
    end if;
  end loop;
end $readiness$;
select 'PASS: Social Names role grants, RLS, guards and legacy compatibility' as result;
