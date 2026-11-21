-- MANUAL RELEASE SCRIPT, NOT A MIGRATION.
-- Do not execute until the client with DUNGEON_MARKS_SHOP_RELEASED=true is
-- approved, built, released, and has passed authenticated staging purchase QA.
-- Do not execute this script as part of normal migration/deployment.
--
-- Activates exactly 12 permanent collectibles (3 regions × pet/frame/
-- background/avatar). The global shop gate and existing 9 resource offers
-- are left unchanged. The 3 legacy bound-material offers remain disabled.
begin;
do $release$
declare
  v_valid_count integer;
begin
  if to_regclass('public.dungeon_shop_catalogue_v1') is null
     or to_regclass('public.dungeon_shop_settings_v1') is null
     or to_regprocedure('public.dungeon_shop_purchase_server_v1(uuid,text,text)') is null
  then raise exception 'DUNGEON_SHOP_FOUNDATION_REQUIRED'; end if;

  with expected(item_id,reward_field,reward_id,region,marks) as (
    values
    ('dshop_asterfall_icon','unlockedProfileIconIds','dungeon:asterfall:wardens-lantern','Asterfall',500),
    ('dshop_asterfall_border','unlockedProfileBorderIds','dungeon:asterfall:briarbound-frame','Asterfall',950),
    ('dshop_asterfall_background','unlockedProfileBackgroundIds','dungeon:asterfall:rootbound-sanctuary','Asterfall',1500),
    ('dshop_asterfall_pet','unlockedCosmeticPetIds','DUNGEON_PET_ASTERFALL_001','Asterfall',3000),
    ('dshop_sunscar_icon','unlockedProfileIconIds','dungeon:sunscar:solar-vault-key','Sunscar',500),
    ('dshop_sunscar_border','unlockedProfileBorderIds','dungeon:sunscar:amberglass-loop','Sunscar',950),
    ('dshop_sunscar_background','unlockedProfileBackgroundIds','dungeon:sunscar:buried-observatory','Sunscar',1500),
    ('dshop_sunscar_pet','unlockedCosmeticPetIds','DUNGEON_PET_SUNSCAR_001','Sunscar',3000),
    ('dshop_frostmarch_icon','unlockedProfileIconIds','dungeon:frostmarch:resonant-bell','Frostmarch',500),
    ('dshop_frostmarch_border','unlockedProfileBorderIds','dungeon:frostmarch:frostbound-chime','Frostmarch',950),
    ('dshop_frostmarch_background','unlockedProfileBackgroundIds','dungeon:frostmarch:shiverlake-reflections','Frostmarch',1500),
    ('dshop_frostmarch_pet','unlockedCosmeticPetIds','DUNGEON_PET_FROSTMARCH_001','Frostmarch',3000)
  )
  select count(*) into v_valid_count
  from expected e
  join public.dungeon_shop_catalogue_v1 c on c.item_id=e.item_id
  where c.grant_kind='profile_collectible'
    and c.reward_field=e.reward_field and c.reward_id=e.reward_id
    and c.required_region=e.region and c.price=e.marks
    and c.permanent and c.per_utc_week is null
    and c.reward_quantity=1;

  if v_valid_count<>12 then
    raise exception 'DUNGEON_SHOP_COLLECTIBLE_CONTRACT_MISMATCH (%/12)',v_valid_count;
  end if;

  if exists(select 1 from public.dungeon_shop_catalogue_v1
      where grant_kind='material' and enabled)
  then raise exception 'DUNGEON_SHOP_BOUND_MATERIALS_MUST_STAY_DISABLED';end if;
end
$release$;

update public.dungeon_shop_catalogue_v1
set enabled=true
where item_id in (
  'dshop_asterfall_icon',
  'dshop_asterfall_border',
  'dshop_asterfall_background',
  'dshop_asterfall_pet',
  'dshop_sunscar_icon',
  'dshop_sunscar_border',
  'dshop_sunscar_background',
  'dshop_sunscar_pet',
  'dshop_frostmarch_icon',
  'dshop_frostmarch_border',
  'dshop_frostmarch_background',
  'dshop_frostmarch_pet'
) and grant_kind='profile_collectible';

-- If an emergency rollback is needed, disable only these 12 offer IDs;
-- do not remove earned ownership or refund legitimate earlier purchases.
commit;
