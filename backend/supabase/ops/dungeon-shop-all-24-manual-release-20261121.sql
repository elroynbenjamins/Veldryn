-- MANUAL 24/24 DUNGEON SHOP RELEASE; NEVER RUN AS A DEFAULT MIGRATION.
-- Precondition: compatible Android build with bound ItemStack support and
-- DUNGEON_MARKS_SHOP_RELEASED=true is approved, published and adoption checked.
-- Server V4 RPC must be installed; staging purchase receipts and app QA passed.
-- Existing two companion resources and seven crafting bundles stay enabled.
-- This enables exactly 12 regional collectibles + 3 account-bound materials.
begin;
do $validate$
declare
  v_collectibles integer;
  v_materials integer;
  v_global boolean;
  v_updated integer;
begin
 if to_regclass('public.dungeon_shop_catalogue_v1') is null
    or to_regclass('public.dungeon_shop_settings_v1') is null
    or to_regprocedure('public.dungeon_shop_purchase_server_v1(uuid,text,text)') is null
 then raise exception 'DUNGEON_SHOP_FOUNDATION_REQUIRED';end if;
 select enabled into v_global from public.dungeon_shop_settings_v1 where singleton=true;
 if v_global is distinct from true then raise exception 'DUNGEON_SHOP_GLOBAL_RELEASE_NOT_ENABLED';end if;
 if position('invalid_bound_dungeon_shop_material' in
     pg_get_functiondef('public.dungeon_shop_purchase_server_v1(uuid,text,text)'::regprocedure))=0
 then raise exception 'DUNGEON_SHOP_BOUND_MATERIAL_V4_REQUIRED';end if;
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
 select count(*) into v_collectibles
 from expected e join public.dungeon_shop_catalogue_v1 c on c.item_id=e.item_id
 where c.grant_kind='profile_collectible'
   and c.reward_field=e.reward_field and c.reward_id=e.reward_id
   and c.required_region=e.region and c.price=e.marks
   and c.permanent and c.per_utc_week is null and c.reward_quantity=1;
 if v_collectibles<>12 then raise exception 'DUNGEON_COLLECTIBLE_CONTRACT_MISMATCH';end if;

 with expected(item_id,reward_field,quantity,weekly_cap,marks) as (
   values
    ('dshop_tempering_satchel','TEMPERING_DUST',10,2,120),
    ('dshop_gem_dust_cache','GEM_DUST',8,1,240),
    ('dshop_tempering_core_cache','TEMPERING_CORE',2,1,450)
 )
 select count(*) into v_materials
 from expected e join public.dungeon_shop_catalogue_v1 c on c.item_id=e.item_id
 where c.grant_kind='material'
 and c.reward_field=e.reward_field and c.reward_quantity=e.quantity
 and c.per_utc_week=e.weekly_cap and c.price=e.marks
 and c.reward_id is null and c.required_region is null and not c.permanent;
 if v_materials<>3 then raise exception 'DUNGEON_BOUND_MATERIAL_CONTRACT_MISMATCH';end if;

 with release_ids(item_id,kind) as (
   values
    ('dshop_asterfall_icon','profile_collectible'),
    ('dshop_asterfall_border','profile_collectible'),
    ('dshop_asterfall_background','profile_collectible'),
    ('dshop_asterfall_pet','profile_collectible'),
    ('dshop_sunscar_icon','profile_collectible'),
    ('dshop_sunscar_border','profile_collectible'),
    ('dshop_sunscar_background','profile_collectible'),
    ('dshop_sunscar_pet','profile_collectible'),
    ('dshop_frostmarch_icon','profile_collectible'),
    ('dshop_frostmarch_border','profile_collectible'),
    ('dshop_frostmarch_background','profile_collectible'),
    ('dshop_frostmarch_pet','profile_collectible'),
    ('dshop_tempering_satchel','material'),
    ('dshop_gem_dust_cache','material'),
    ('dshop_tempering_core_cache','material')
 )
 update public.dungeon_shop_catalogue_v1 c set enabled=true
 from release_ids e where c.item_id=e.item_id and c.grant_kind=e.kind;
 get diagnostics v_updated=row_count;
 if v_updated<>15 then raise exception 'DUNGEON_SHOP_RELEASE_COUNT_MISMATCH %',v_updated;end if;
 if (select count(*) from public.dungeon_shop_catalogue_v1 where enabled)<>24
 then raise exception 'DUNGEON_SHOP_NOT_ALL_24_ENABLED';end if;
end $validate$;
commit;

-- Emergency pause: set enabled=false only for the 15 IDs above.
-- Do NOT delete any permanent ownership, receipts, wallet entries or rewards.
