-- Dungeon Shop V3: one selectable x100 bundle of each reviewed core
-- equipment material (T1–T4). Mark prices are server-owned and grow by tier.
-- Bank delivery uses one locked game-state row and one locked Marks wallet;
-- it is atomic, idempotent, capacity checked, and capped at 1/SKU/UTC week.
-- The shop's existing global enabled switch is intentionally NOT changed.
begin;

do $guard$
begin
 if to_regclass('public.dungeon_shop_catalogue_v1') is null
    or to_regprocedure('public.dungeon_shop_purchase_server_v1(uuid,text,text)') is null
 then raise exception 'DUNGEON_SHOP_V2_REQUIRED';end if;
end $guard$;

alter table public.dungeon_shop_catalogue_v1
 drop constraint if exists dungeon_shop_catalogue_v1_grant_kind_check;
alter table public.dungeon_shop_catalogue_v1
 add constraint dungeon_shop_catalogue_v1_grant_kind_check
 check (grant_kind in ('material','account_resource','profile_collectible','crafting_bundle'));

-- Neither per-week caps nor the prices are trusted from the client.
insert into public.dungeon_shop_catalogue_v1
(item_id,name,price,grant_kind,reward_field,reward_id,reward_quantity,required_region,per_utc_week,permanent,enabled)
values
  ('dshop_moss_fiber_100','Moss Fiber ×100',150,'crafting_bundle','MOSS_FIBER',null,100,null,1,false,true),
  ('dshop_greenwood_log_100','Greenwood Log ×100',150,'crafting_bundle','GREENWOOD_LOG',null,100,null,1,false,true),
  ('dshop_wolf_pelt_100','Wolf Pelt ×100',300,'crafting_bundle','WOLF_PELT',null,100,null,1,false,true),
  ('dshop_ironwood_log_100','Ironwood Log ×100',300,'crafting_bundle','IRONWOOD_LOG',null,100,null,1,false,true),
  ('dshop_dunewood_100','Dunewood ×100',600,'crafting_bundle','DUNEWOOD',null,100,null,1,false,true),
  ('dshop_sunscale_100','Sunscale ×100',600,'crafting_bundle','SUNSCALE',null,100,null,1,false,true),
  ('dshop_sunstone_ingot_100','Sunstone Ingot ×100',1000,'crafting_bundle','SUNSTONE_INGOT',null,100,null,1,false,true)
on conflict (item_id) do nothing;

create or replace function public.dungeon_shop_purchase_server_v1(
 p_account_id uuid,p_item_id text,p_request_id text
) returns jsonb language plpgsql security invoker set search_path='' as $$
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
end $$;

revoke all on function public.dungeon_shop_purchase_server_v1(uuid,text,text)
 from public,anon,authenticated;
grant execute on function public.dungeon_shop_purchase_server_v1(uuid,text,text)
 to service_role;

-- This SKU family only; previously held-back materials and cosmetics stay held back.
-- An existing live global shop switch is left unchanged.
commit;
