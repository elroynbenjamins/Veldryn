-- Expedition Marks Shop V2: release only verified account-bound resources.
-- All tradeable materials and unregistered cosmetics remain disabled.
-- The global shop switch deliberately stays OFF until the matching Edge build
-- and mobile client have passed deployment checks.
begin;

do $validation$
begin
  if to_regclass('public.dungeon_shop_catalogue_v1') is null
     or to_regclass('public.dungeon_shop_settings_v1') is null
     or to_regclass('public.dungeon_shop_receipts_v1') is null
     or to_regprocedure('public.dungeon_shop_purchase_server_v1(uuid,text,text)') is null
  then raise exception 'DUNGEON_SHOP_FOUNDATION_REQUIRED'; end if;

  if (select count(*) from public.dungeon_shop_catalogue_v1
      where (item_id='dshop_companion_essence' and grant_kind='account_resource'
        and reward_field='companionEssence' and reward_quantity=100
        and price=400 and per_utc_week=1 and not permanent and required_region is null)
       or (item_id='dshop_bondstone' and grant_kind='account_resource'
        and reward_field='bondstones' and reward_quantity=1
        and price=750 and per_utc_week=1 and not permanent and required_region is null)
     )<>2
  then raise exception 'DUNGEON_SHOP_CATALOGUE_CONTRACT_MISMATCH'; end if;
end
$validation$;

-- These two grants are server-owned account resources, not marketable stacks.
-- Explicitly disable all other V1 SKUs until their art, effect and provenance
-- validation have been built. Never open the whole catalog accidentally.
update public.dungeon_shop_catalogue_v1
set enabled=item_id in ('dshop_companion_essence','dshop_bondstone');

-- Keep global switch disabled; a separately verified release step owns it.
update public.dungeon_shop_settings_v1
set enabled=false,updated_at=now() where singleton=true;

-- Add server-owned per-item release status and exact purchase price to the
-- snapshot, instead of presenting unpurchasable rewards as spendable.
create or replace function public.dungeon_shop_snapshot_server_v1(p_account_id uuid)
returns jsonb
language plpgsql stable security invoker
set search_path=''
as $shop$
declare
 v_wallet bigint:=0;
 v_account jsonb:='{}'::jsonb;
 v_owned jsonb:='[]'::jsonb;
 v_counts jsonb:='{}'::jsonb;
 v_prices jsonb:='{}'::jsonb;
 v_shop_enabled boolean:=false;
 v_week date:=(date_trunc('week',now() at time zone 'UTC'))::date;
 v_field text;
begin
 if p_account_id is null then raise exception 'invalid_account'; end if;
 select coalesce(expedition_marks,0) into v_wallet
   from public.expedition_wallets where account_id=p_account_id;
 select coalesce(state->'account','{}'::jsonb) into v_account
   from public.online_game_states where account_id=p_account_id;
 if not found then raise exception 'character_required'; end if;
 if jsonb_typeof(v_account)<>'object' then raise exception 'invalid_game_account'; end if;
 foreach v_field in array array[
   'unlockedProfileIconIds','unlockedProfileBorderIds',
   'unlockedProfileBackgroundIds','unlockedCosmeticPetIds'
 ] loop
   if jsonb_typeof(coalesce(v_account->v_field,'[]'::jsonb))<>'array'
   then raise exception 'invalid_reward_inventory';end if;
   v_owned:=v_owned||coalesce(v_account->v_field,'[]'::jsonb);
 end loop;
 select coalesce(jsonb_object_agg(item_id,used),'{}'::jsonb)
   into v_counts from (
     select item_id,sum(quantity)::integer as used
     from public.expedition_shop_purchases
     where account_id=p_account_id and week_key=v_week
     group by item_id
   ) purchases;
 select coalesce(jsonb_object_agg(item_id,price),'{}'::jsonb)
   into v_prices from public.dungeon_shop_catalogue_v1 where enabled;
 select coalesce(enabled,false) into v_shop_enabled
   from public.dungeon_shop_settings_v1 where singleton=true;
 return jsonb_build_object(
   'marks',coalesce(v_wallet,0),
   'clearedRegions',to_jsonb(public.dungeon_shop_cleared_regions_server_v1(p_account_id)),
   'ownedRewardIds',v_owned,'purchasesThisUtcWeek',v_counts,
   'releasedPrices',v_prices,'shopEnabled',coalesce(v_shop_enabled,false)
 );
end
$shop$;
revoke all on function public.dungeon_shop_snapshot_server_v1(uuid)
  from public,anon,authenticated;
grant execute on function public.dungeon_shop_snapshot_server_v1(uuid)
  to service_role;

commit;
