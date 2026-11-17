-- Frostfall / Dungeon Marks shared equipment crafting tier unlock guard.
-- Keep the existing shop enabled flags and existing prices unchanged.
begin;
-- Server-side equivalent of minimum craftable released T1–T4 foundation recipe gates.
-- Never trust a tier or level sent by the client. Both shops use this progression.
create or replace function public.dungeon_shop_crafting_tier_unlocked_v1(p_state jsonb,p_tier integer)
returns boolean language sql immutable set search_path='' as $$
 select p_tier between 1 and 4
   and coalesce((p_state#>>'{character,level}')::integer,0)>=
       (case p_tier when 1 then 2 when 2 then 10 when 3 then 20 when 4 then 30 else 9999 end)
   and exists(
     select 1 from jsonb_array_elements(
       case when jsonb_typeof(p_state->'skills')='array' then p_state->'skills' else '[]'::jsonb end
     ) as skill
     where skill->>'skillId' in ('smithing','tailoring')
       and coalesce((skill->>'level')::integer,0)>=
         (case p_tier when 1 then 1 when 2 then 9 when 3 then 23 when 4 then 37 else 9999 end)
   );
$$;
revoke all on function public.dungeon_shop_crafting_tier_unlocked_v1(jsonb,integer) from public,anon,authenticated;
grant execute on function public.dungeon_shop_crafting_tier_unlocked_v1(jsonb,integer) to service_role;

CREATE OR REPLACE FUNCTION public.dungeon_shop_snapshot_server_v1(p_account_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
 v_wallet bigint:=0;
 v_account jsonb:='{}'::jsonb;
 v_state jsonb:='{}'::jsonb;
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
 select state,coalesce(state->'account','{}'::jsonb) into v_state,v_account
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
    'unlockedCraftingTiers',(select coalesce(jsonb_agg(tier),'[]'::jsonb) from generate_series(1,4) tier where public.dungeon_shop_crafting_tier_unlocked_v1(v_state,tier)),
   'releasedPrices',v_prices,'shopEnabled',coalesce(v_shop_enabled,false)
 );
end
$function$;
CREATE OR REPLACE FUNCTION public.dungeon_shop_purchase_server_v1(p_account_id uuid, p_item_id text, p_request_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 v_rec public.dungeon_shop_receipts_v1%rowtype;
 v_offer public.dungeon_shop_catalogue_v1%rowtype;
 v_game public.online_game_states%rowtype;
 v_account jsonb;
 v_owned jsonb;
 v_balance bigint;
 v_used integer;
 v_current bigint;
 v_week date:=(date_trunc('week',clock_timestamp() at time zone 'UTC'))::date;
 v_enabled boolean:=false;
 v_cleared text[];
 v_stacks jsonb;
 v_stack jsonb;
 v_capacity integer;
 v_index integer;
 v_stack_quantity bigint;
 v_added boolean:=false;
begin
 if p_account_id is null or p_item_id is null or p_request_id is null
   or p_item_id !~ '^dshop_[a-z0-9_]{1,80}$'
   or p_request_id !~ '^[a-zA-Z0-9_-]{8,128}$'
 then raise exception 'invalid_dungeon_shop_request';end if;

 -- Mirror the game's atomic revision lock order, before the wallet lock.
 select * into v_game from public.online_game_states where account_id=p_account_id for update;
 if not found or v_game.state is null or v_game.character_id is null then raise exception 'character_required';end if;
 v_account:=coalesce(v_game.state->'account','{}'::jsonb);
 if jsonb_typeof(v_account)<>'object' then raise exception 'invalid_game_account';end if;

 -- An authenticated retry must replay its old receipt even if the shop was disabled meanwhile.
 select * into v_rec from public.dungeon_shop_receipts_v1
 where account_id=p_account_id and request_id=p_request_id;
 if found then
   if v_rec.item_id<>p_item_id then raise exception 'idempotency_request_mismatch';end if;
   return jsonb_build_object('status','purchased','idempotentReplay',true,'receiptId',v_rec.id,
      'itemId',v_rec.item_id,'balance',v_rec.balance_after);
 end if;
 select enabled into v_enabled from public.dungeon_shop_settings_v1 where singleton=true;
 if not coalesce(v_enabled,false) then raise exception 'dungeon_shop_unreleased';end if;
 select * into v_offer from public.dungeon_shop_catalogue_v1 where item_id=p_item_id;
 if not found then raise exception 'unknown_dungeon_shop_offer';end if;
 if not v_offer.enabled then raise exception 'dungeon_shop_offer_unreleased';end if;
 -- Bound-material provenance is not implemented. Never generate tradeable stacks.
 if v_offer.grant_kind='material' then raise exception 'dungeon_shop_bound_materials_unavailable';end if;
 if v_offer.grant_kind='crafting_bundle' then
   if not public.dungeon_shop_crafting_tier_unlocked_v1(v_game.state,
       case v_offer.reward_field when 'MOSS_FIBER' then 1 when 'GREENWOOD_LOG' then 1
         when 'WOLF_PELT' then 2 when 'IRONWOOD_LOG' then 2
         when 'DUNEWOOD' then 3 when 'SUNSCALE' then 3
         when 'SUNSTONE_INGOT' then 4 else 0 end)
   then raise exception 'dungeon_shop_crafting_tier_locked';end if;
 end if;

 if v_offer.required_region is not null then
   v_cleared:=public.dungeon_shop_cleared_regions_server_v1(p_account_id);
   if not v_offer.required_region=any(v_cleared) then raise exception 'dungeon_shop_region_locked';end if;
 end if;

 insert into public.expedition_wallets(account_id)values(p_account_id) on conflict do nothing;
 select expedition_marks into v_balance from public.expedition_wallets
 where account_id=p_account_id for update;
 if v_offer.permanent then
   if exists(select 1 from public.dungeon_shop_receipts_v1
     where account_id=p_account_id and item_id=p_item_id and permanent)
   then return jsonb_build_object('status','already_owned','balance',v_balance);end if;
 end if;
 if v_offer.per_utc_week is not null then
   select coalesce(sum(quantity),0)::integer into v_used
   from public.expedition_shop_purchases
   where account_id=p_account_id and item_id=p_item_id and week_key=v_week;
   if v_used>=v_offer.per_utc_week then raise exception 'dungeon_shop_weekly_limit';end if;
 end if;
 if v_balance<v_offer.price then raise exception 'insufficient_expedition_marks';end if;

 if v_offer.grant_kind='profile_collectible' then
   if v_offer.reward_field not in ('unlockedProfileIconIds','unlockedProfileBorderIds',
     'unlockedProfileBackgroundIds','unlockedCosmeticPetIds') or v_offer.reward_id is null
   then raise exception 'invalid_dungeon_shop_reward';end if;
   v_owned:=coalesce(v_account->v_offer.reward_field,'[]'::jsonb);
   if jsonb_typeof(v_owned)<>'array' then raise exception 'invalid_reward_inventory';end if;
   if v_owned ? v_offer.reward_id then return jsonb_build_object('status','already_owned','balance',v_balance);end if;
   v_account:=jsonb_set(v_account,array[v_offer.reward_field],v_owned||to_jsonb(v_offer.reward_id),true);
 elsif v_offer.grant_kind='account_resource' then
   if v_offer.reward_field not in ('companionEssence','bondstones') or v_offer.reward_quantity<1 then
     raise exception 'invalid_dungeon_shop_reward';end if;
   v_current:=coalesce((v_account->>v_offer.reward_field)::bigint,0);
   if v_current<0 or v_current>1000000000 then raise exception 'invalid_companion_balance';end if;
   v_account:=jsonb_set(v_account,array[v_offer.reward_field],
     to_jsonb(v_current+v_offer.reward_quantity),true);
 elsif v_offer.grant_kind='crafting_bundle' then
   -- Only known, ordinary equipment inputs; never gems, boss uniques or bound materials.
   if v_offer.reward_field not in ('MOSS_FIBER','GREENWOOD_LOG','WOLF_PELT',
     'IRONWOOD_LOG','DUNEWOOD','SUNSCALE','SUNSTONE_INGOT')
     or v_offer.reward_quantity<>100 or v_offer.permanent
     or v_offer.per_utc_week<>1 or v_offer.reward_id is not null
   then raise exception 'invalid_dungeon_shop_crafting_bundle';end if;

   -- Bank is account-shared and already consumed by the equipment forge.
   -- Server row lock covers Bank + wallet; a failed slot check charges nothing.
   v_stacks:=v_game.state#>'{bank,stacks}';
   if jsonb_typeof(v_stacks)<>'array' then raise exception 'invalid_dungeon_shop_bank';end if;
   v_capacity:=coalesce((v_game.state#>>'{bank,capacity}')::integer,0);
   if v_capacity<1 or v_capacity>5000 then raise exception 'invalid_dungeon_shop_bank';end if;
   for v_index in 0..jsonb_array_length(v_stacks)-1 loop
     v_stack:=v_stacks->v_index;
     if v_stack->>'itemId'=v_offer.reward_field
        and not (v_stack ? 'instanceId')
        and (not (v_stack ? 'bound') or v_stack->>'bound'='false')
     then
       if jsonb_typeof(v_stack->'quantity')<>'number' then raise exception 'invalid_dungeon_shop_bank_stack';end if;
       v_stack_quantity:=(v_stack->>'quantity')::bigint;
       if v_stack_quantity<0 or v_stack_quantity>99999 then raise exception 'invalid_dungeon_shop_bank_stack';end if;
       if v_stack_quantity+v_offer.reward_quantity<=99999 then
         v_stacks:=jsonb_set(v_stacks,array[v_index::text,'quantity'],
           to_jsonb(v_stack_quantity+v_offer.reward_quantity),false);
         v_added:=true;
         exit;
       end if;
     end if;
   end loop;
   if not v_added then
     if jsonb_array_length(v_stacks)>=v_capacity then raise exception 'dungeon_shop_bank_full';end if;
     v_stacks:=v_stacks||jsonb_build_array(
       jsonb_build_object('itemId',v_offer.reward_field,'quantity',v_offer.reward_quantity));
   end if;
   v_game.state:=jsonb_set(v_game.state,'{bank,stacks}',v_stacks,false);
 else
   raise exception 'invalid_dungeon_shop_reward';
 end if;

 update public.online_game_states
 set state=jsonb_set(v_game.state,'{account}',v_account,true),
     revision=revision+1,updated_at=clock_timestamp()
 where account_id=p_account_id;
 update public.expedition_wallets set expedition_marks=expedition_marks-v_offer.price,
    updated_at=clock_timestamp() where account_id=p_account_id;
 insert into public.expedition_currency_ledger(account_id,run_id,currency,amount,reason,idempotency_key)
 values(p_account_id,null,'expedition_mark',-v_offer.price,'dungeon_shop_purchase',
        'dungeon-shop:'||p_account_id::text||':'||p_request_id);
 insert into public.expedition_shop_purchases(account_id,item_id,week_key,quantity,marks_spent)
 values(p_account_id,p_item_id,v_week,1,v_offer.price);
 insert into public.dungeon_shop_receipts_v1(account_id,request_id,item_id,marks_spent,balance_after,
        permanent,rewarded_id,week_key)
 values(p_account_id,p_request_id,p_item_id,v_offer.price,v_balance-v_offer.price,
        v_offer.permanent,v_offer.reward_id,v_week)
 returning * into v_rec;
 return jsonb_build_object('status','purchased','idempotentReplay',false,
       'receiptId',v_rec.id,'itemId',p_item_id,'balance',v_balance-v_offer.price);
end $function$;
revoke all on function public.dungeon_shop_snapshot_server_v1(uuid) from public,anon,authenticated;
grant execute on function public.dungeon_shop_snapshot_server_v1(uuid) to service_role;
revoke all on function public.dungeon_shop_purchase_server_v1(uuid,text,text) from public,anon,authenticated;
grant execute on function public.dungeon_shop_purchase_server_v1(uuid,text,text) to service_role;
commit;
