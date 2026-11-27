-- REVIEW CANDIDATE ONLY. No deployment or grants.
-- Apply in the same isolated transaction as the unified six-set grant catalogue
-- and ultra-luxe-full-set-commit-candidate.sql. The canonical set-definition
-- helper in that file must exist first. These changes do not expand collection
-- ownership; a preset is owned only if its exact active collection grant exists.

alter table private.ultra_luxe_name_selection_v1
 drop constraint ultra_luxe_name_selection_v1_preset_id_check,
 add constraint ultra_luxe_name_selection_v1_preset_id_check check(preset_id in (
 'ascendant-celestial-name','ascendant-draconic-name','ascendant-abyssal-name',
 'ascendant-paradox-name','ascendant-sakura-name','ascendant-stormforged-name'));

create or replace function private.ultra_luxe_owned_names_v1(p_account_id uuid)
returns text[] language sql stable security invoker set search_path='' as $names$
 select coalesce(array_agg(d.preset_id order by g.collection_id),array[]::text[])
 from private.ultra_luxe_collection_grants_v1 g
 cross join lateral private.ultra_luxe_full_set_definition_v1(g.collection_id) d
 where g.account_id=p_account_id and g.revoked_at is null
$names$;

-- Existing self-selection and public identity projection consume these same
-- helpers, so no client supplies colors or bypasses VIP+/Supporter fallback.
create or replace function private.ultra_luxe_name_style_v1(p_account_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $style$
 select jsonb_build_object('mode','gradient','gradientColors',to_jsonb(v.colors),
  'animation','flow','ultraLuxePresetId',v.id)
 from (values
 ('ascendant-celestial-name',array['#F3C86F','#FFF4D9','#D6E8FF']),
 ('ascendant-draconic-name',array['#FF9460','#FFE0A1','#EE6651']),
 ('ascendant-abyssal-name',array['#55C8C9','#D4FFF4','#70A9F2']),
 ('ascendant-paradox-name',array['#B9A0F9','#F4EDFF','#8FB5F9']),
 ('ascendant-sakura-name',array['#F5A6C8','#FFF5FA','#E58BB7']),
 ('ascendant-stormforged-name',array['#63CFFF','#E0EAF5','#639AF8'])
 ) as v(id,colors) where v.id=private.ultra_luxe_selected_name_v1(p_account_id)
$style$;

-- #1834's existing revoke trigger handles first two presets plus badge cleanup.
-- Preserve it; add only missing name cleanup for the other four. Regrant never
-- resurrects an old selected name. This private trigger needs no client ACL.
grant delete on private.ultra_luxe_name_selection_v1 to service_role;
create function private.ultra_luxe_revoke_new_name_v1() returns trigger
language plpgsql security invoker set search_path='' as $revoke$
declare target_preset text;
begin
 if new.collection_id not in ('ascendant-celestial-sovereign','ascendant-draconic-dominion') then
  select d.preset_id into target_preset from private.ultra_luxe_full_set_definition_v1(new.collection_id) d;
  if target_preset is not null then
   delete from private.ultra_luxe_name_selection_v1 where account_id=new.account_id and preset_id=target_preset;
  end if;
 end if;
 return new;
end $revoke$;
revoke all on function private.ultra_luxe_revoke_new_name_v1() from public,anon,authenticated;
grant execute on function private.ultra_luxe_revoke_new_name_v1() to service_role;
create trigger ultra_luxe_revoke_new_name_v1 after update of revoked_at on private.ultra_luxe_collection_grants_v1
 for each row when (old.revoked_at is null and new.revoked_at is not null) execute function private.ultra_luxe_revoke_new_name_v1();

-- Existing owner/ACL of replaced helpers retained. Explicitly close public roles,
-- while preserving service-only access required by the combined commit.
revoke all on function private.ultra_luxe_owned_names_v1(uuid),private.ultra_luxe_name_style_v1(uuid) from public,anon,authenticated;
grant execute on function private.ultra_luxe_owned_names_v1(uuid),private.ultra_luxe_name_style_v1(uuid) to service_role;
-- Candidate remains unexecuted. Verify constraint name, function ownership,
-- role privileges, self-only RPC readback, public projection, concurrent
-- grant/selection/commit and all-six revocation/regrant in rollback fixture.
