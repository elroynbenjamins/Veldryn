-- Hidden V17b: exact equipment listing expiry must preserve the Forge receipt
-- and create one durable return without changing Gold. Synthetic/ROLLBACK only.
begin;
set local statement_timeout='55s';
do $market_gear_expiry_v17$
declare
  v_seller uuid:=gen_random_uuid();
  v_sc uuid:=gen_random_uuid();
  v_item text:='FORGE_T1_BASTION';
  v_instance text:='forge-v17-expire-001';
  v_stack jsonb;
  v_receipt jsonb;
  v_hold uuid;
  v_offer uuid;
  v_delivery uuid;
  v_result jsonb;
  v_expired integer;
begin
  if has_function_privilege('authenticated',
    'private.market_queue_due_returns_v17(integer)'::regprocedure,'EXECUTE')
    or has_function_privilege('service_role',
    'private.market_queue_due_returns_v17(integer)'::regprocedure,'EXECUTE')
  then raise exception 'market_expiry_dispatcher_exposed';end if;
  begin
    perform private.market_queue_due_returns_v17(10);
    raise exception 'market_expiry_worker_enabled_early';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise;end if;
  end;

  insert into auth.users(id,email) values
    (v_seller,'v17-gear-'||v_seller::text||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id,gold)
    values(v_sc,v_seller,'GearTrader','BASTION',100);
  insert into public.character_wallets(character_id,gold) values(v_sc,100);

  v_stack:=jsonb_build_object('itemId',v_item,'quantity',1,'instanceId',v_instance);
  v_receipt:=jsonb_build_object(
    'id',v_instance,'itemId',v_item,'ownerCharacterId',v_sc::text,
    'rarity','mythic','quality',93,'statRoll',0.732,'locked',false,
    'acquireSource','craft','sourceReceiptKey','craft-v17-expire',
    'createdAtMs',1234,'enhancement',jsonb_build_object(
      'rank',3,'failures',2,'statGemId','gem:stat_might:g2',
      'statGemRollPercent',115,'effectGemRollPercent',85,
      'effectGemId','gem:effect_momentum:g1',
      'gemIds',jsonb_build_array('gem:stat_might:g2','gem:effect_momentum:g1')));
  insert into public.online_game_states(account_id,character_id,revision,state)
  values(v_seller,v_sc,5,jsonb_build_object(
    'character',jsonb_build_object('id',v_sc::text,'gold',100,
      'equipment','{}'::jsonb,'savedLoadouts','[]'::jsonb),
    'account',jsonb_build_object('craftedGearInstances',jsonb_build_array(v_receipt)),
    'inventory',jsonb_build_object('capacity',20,'stacks',jsonb_build_array(v_stack)),
    'bank',jsonb_build_object('capacity',20,'stacks','[]'::jsonb),
    'otherCharacters','[]'::jsonb,
    'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,
      'favoriteItemIds','[]'::jsonb)));

  -- Relax only inside this rollback-scoped synthetic transaction.
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_trading_enabled_check';
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_snapshot_bridge_ready_check';
  execute 'alter table private.market_item_policy_v1 drop constraint market_item_policy_v1_tradable_check';
  execute 'alter table private.market_equipment_guard_v8 drop constraint market_equipment_guard_v8_equipment_transfers_enabled_check';
  update private.market_runtime_guard_v1 set trading_enabled=true,snapshot_bridge_ready=true;
  update private.market_equipment_guard_v8 set equipment_transfers_enabled=true;
  insert into private.market_item_policy_v1(item_id,asset_kind,tradable,binding_policy)
    values(v_item,'equipment',true,'unbound'),
      ('gem:stat_might:g2','gem',true,'unbound'),
      ('gem:effect_momentum:g1','gem',true,'unbound');
  insert into private.market_price_bands_v10(
    item_id,asset_kind,min_unit_price,max_unit_price,approved
  ) values(v_item,'equipment',5,30,true);

  v_result:=private.market_reserve_exact_equipment_v8(
    v_seller,5,'inventory',v_sc::text,0,v_item,v_instance,
    'gear-v17-reserve',repeat('1',64));
  v_hold:=(v_result->>'holdId')::uuid;
  v_result:=private.market_publish_equipment_offer_v9(
    v_seller,v_hold,125,1,'gear-v17-publish',repeat('2',64));
  v_offer:=(v_result->>'offerId')::uuid;

  update private.market_custody_holds_v1
    set expires_at=now()-interval '1 second' where hold_id=v_hold;
  v_expired:=private.market_queue_due_returns_v17(10);
  if v_expired<>1 then raise exception 'market_equipment_expiry_not_processed';end if;
  select delivery_id into v_delivery
    from private.market_equipment_return_deliveries_v8
    where source_hold_id=v_hold and recipient_account_id=v_seller
      and exact_instance_id=v_instance and status='pending';
  if v_delivery is null
    or (select status from private.market_sale_offers_v3 where offer_id=v_offer)<>'cancelled'
    or (select status from private.market_custody_holds_v1 where hold_id=v_hold)<>'released'
    or (select status from private.market_equipment_escrows_v8 where source_hold_id=v_hold)<>'returned'
    or (select receipt_payload from private.market_equipment_return_deliveries_v8
        where delivery_id=v_delivery) is distinct from v_receipt
    or (select count(*) from private.market_completed_sale_history_v13)<>0
    or (select gold from public.character_wallets where character_id=v_sc)<>100
  then raise exception 'market_equipment_expiry_custody_or_gold_invalid';end if;
  if private.market_queue_due_returns_v17(10)<>0
    or (select count(*) from private.market_equipment_return_deliveries_v8
        where source_hold_id=v_hold)<>1
  then raise exception 'market_equipment_expiry_not_idempotent';end if;
end
$market_gear_expiry_v17$;
select 'PASS V17b: expired exact gear closes the offer once, preserves full receipt and Gold, and queues one safe claim' as result;
rollback;
