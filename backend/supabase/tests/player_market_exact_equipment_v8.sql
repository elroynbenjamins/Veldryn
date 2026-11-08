-- Synthetic hidden exact-Forge equipment escrow/return integration.
-- No deployment. This script and every temporary runtime unlock occur ONLY
-- inside a transaction that ends in ROLLBACK.
begin;
set local statement_timeout='60s';
do $market_gear_test$
declare
 v_seller uuid:=pg_catalog.gen_random_uuid();
 v_buyer uuid:=pg_catalog.gen_random_uuid();
 v_sc uuid:=pg_catalog.gen_random_uuid();
 v_bc uuid:=pg_catalog.gen_random_uuid();
 v_instance text:='forge-v8-mythic-001';
 v_item text:='FORGE_T1_BASTION';
 v_stack jsonb;
 v_receipt jsonb;
 v_seller_state jsonb;
 v_reserved jsonb;
 v_cancelled jsonb;
 v_claimed jsonb;
 v_replay jsonb;
 v_inbox jsonb;
 v_hold uuid;
 v_delivery uuid;
begin
  insert into auth.users(id,email) values
    (v_seller,'gear-v8-seller-'||v_seller||'@example.invalid'),
    (v_buyer,'gear-v8-buyer-'||v_buyer||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id,gold) values
    (v_sc,v_seller,'GearSeller','BASTION',100),
    (v_bc,v_buyer,'GearBuyer','BASTION',500);
  insert into public.character_wallets(character_id,gold) values
    (v_sc,100),(v_bc,500);

  v_stack:=pg_catalog.jsonb_build_object(
    'itemId',v_item,'quantity',1,'instanceId',v_instance);
  v_receipt:=pg_catalog.jsonb_build_object(
    'id',v_instance,'itemId',v_item,'ownerCharacterId',v_sc::text,
    'rarity','mythic','quality',93,'statRoll',0.732,'locked',false,
    'acquireSource','craft','sourceReceiptKey','craft-job-v8',
    'createdAtMs',1234,'enhancement',pg_catalog.jsonb_build_object(
      'rank',3,'failures',2,'statGemId','gem:stat_might:g2',
      'effectGemId','gem:effect_momentum:g1',
      'gemIds',pg_catalog.jsonb_build_array(
        'gem:stat_might:g2','gem:effect_momentum:g1')));
  v_seller_state:=pg_catalog.jsonb_build_object(
    'version',11,'character',pg_catalog.jsonb_build_object(
      'id',v_sc::text,'gold',100,'equipment','{}'::jsonb,
      'savedLoadouts','[]'::jsonb),
    'inventory',pg_catalog.jsonb_build_object(
      'capacity',4,'stacks',pg_catalog.jsonb_build_array(
        v_stack,pg_catalog.jsonb_build_object('itemId','COPPER_ORE','quantity',5))),
    'bank',pg_catalog.jsonb_build_object(
      'capacity',1,'stacks',pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object('itemId','COPPER_ORE','quantity',1))),
    'otherCharacters','[]'::jsonb,
    'account',pg_catalog.jsonb_build_object(
      'craftedGearInstances',pg_catalog.jsonb_build_array(v_receipt)),
    'settings',pg_catalog.jsonb_build_object(
      'lockedItemIds','[]'::jsonb,'favoriteItemIds','[]'::jsonb));
  insert into public.online_game_states(account_id,character_id,revision,state) values
    (v_seller,v_sc,5,v_seller_state),
    (v_buyer,v_bc,7,pg_catalog.jsonb_build_object(
      'version',11,'character',pg_catalog.jsonb_build_object('id',v_bc::text,'gold',500),
      'inventory',pg_catalog.jsonb_build_object(
        'capacity',10,'stacks','[]'::jsonb),
      'bank',pg_catalog.jsonb_build_object('capacity',10,'stacks','[]'::jsonb),
      'account',pg_catalog.jsonb_build_object('craftedGearInstances','[]'::jsonb)));

  -- New routines are not executable by clients or service-role REST.
  if pg_catalog.has_function_privilege('authenticated',
       'private.market_reserve_exact_equipment_v8(uuid,bigint,text,text,integer,text,text,text,text)'::regprocedure,'EXECUTE')
    or pg_catalog.has_function_privilege('anon',
       'private.market_cancel_exact_equipment_v8(uuid,uuid,text,text,boolean)'::regprocedure,'EXECUTE')
    or pg_catalog.has_function_privilege('service_role',
       'private.market_claim_equipment_return_v8(uuid,uuid,bigint,text,text,text,text)'::regprocedure,'EXECUTE')
  then raise exception 'market_equipment_api_exposed';end if;

  begin
    perform private.market_reserve_exact_equipment_v8(
      v_seller,5,'inventory',v_sc::text,0,v_item,v_instance,
      'gear-res-disabled',repeat('a',64));
    raise exception 'disabled equipment market accepted escrow';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise;end if;
  end;
  if (select revision from public.online_game_states where account_id=v_seller)<>5
  then raise exception 'disabled market touched game state';end if;

  -- All relaxations below are synthetic QA only, rolled back at end of file.
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_trading_enabled_check';
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_snapshot_bridge_ready_check';
  execute 'alter table private.market_item_policy_v1 drop constraint market_item_policy_v1_tradable_check';
  execute 'alter table private.market_equipment_guard_v8 drop constraint market_equipment_guard_v8_equipment_transfers_enabled_check';
  update private.market_runtime_guard_v1
    set trading_enabled=true,snapshot_bridge_ready=true;
  update private.market_equipment_guard_v8 set equipment_transfers_enabled=true;
  insert into private.market_item_policy_v1(item_id,asset_kind,tradable,binding_policy)
  values(v_item,'equipment',true,'unbound'),
    ('gem:stat_might:g2','gem',true,'unbound'),
    ('gem:effect_momentum:g1','gem',true,'unbound');

  -- Locked, favorited and stale states never remove a physical Forge copy.
  update public.online_game_states
    set state=pg_catalog.jsonb_set(state,'{settings,favoriteItemIds}',
       pg_catalog.jsonb_build_array(v_item),false)
    where account_id=v_seller;
  begin
    perform private.market_reserve_exact_equipment_v8(
      v_seller,5,'inventory',v_sc::text,0,v_item,v_instance,
      'gear-res-favorite',repeat('b',64));
    raise exception 'favorited gear escaped into custody';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_protected' then raise;end if;
  end;
  update public.online_game_states
    set state=pg_catalog.jsonb_set(state,'{settings,favoriteItemIds}','[]'::jsonb,false)
    where account_id=v_seller;

  begin
    perform private.market_reserve_exact_equipment_v8(
      v_seller,4,'inventory',v_sc::text,0,v_item,v_instance,
      'gear-res-stale',repeat('c',64));
    raise exception 'stale equipment rev escaped into custody';
  exception when raise_exception then
    if sqlerrm<>'market_stale_state' then raise;end if;
  end;

  v_reserved:=private.market_reserve_exact_equipment_v8(
    v_seller,5,'inventory',v_sc::text,0,v_item,v_instance,
    'gear-res-valid',repeat('d',64));
  v_hold:=(v_reserved->>'holdId')::uuid;
  if v_reserved->>'revision'<>'6'
    or (select revision from public.online_game_states where account_id=v_seller)<>6
    or (select state#>>'{inventory,stacks,0,itemId}' from public.online_game_states
        where account_id=v_seller)<>'COPPER_ORE'
    or (select state#>'{account,craftedGearInstances}' from public.online_game_states
        where account_id=v_seller)<>'[]'::jsonb
    or (select exact_receipt from private.market_equipment_escrows_v8
        where source_hold_id=v_hold) is distinct from v_receipt
    or (select immutable_attributes->'stack' from private.market_custody_assets_v1
        where asset_id=(v_reserved->>'assetId')::uuid) is distinct from v_stack
    or (select held_quantity from private.market_custody_holds_v1
        where hold_id=v_hold)<>1
    or (select gold from public.character_wallets where character_id=v_sc)<>100
  then raise exception 'exact Forge copy escrow did not atomically preserve receipt';end if;

  v_replay:=private.market_reserve_exact_equipment_v8(
    v_seller,5,'inventory',v_sc::text,0,v_item,v_instance,
    'gear-res-valid',repeat('d',64));
  if v_replay->>'replayed'<>'true'
    or (select count(*) from private.market_equipment_escrows_v8 where owner_account_id=v_seller)<>1
  then raise exception 'equipment reserve replay duplicated escrow';end if;
  begin
    perform private.market_reserve_exact_equipment_v8(
      v_seller,5,'inventory',v_sc::text,0,v_item,'forged-other-instance',
      'gear-res-valid',repeat('d',64));
    raise exception 'equipment reserve idempotency accepted altered instance';
  exception when raise_exception then
    if sqlerrm<>'market_idempotency_conflict' then raise;end if;
  end;

  v_cancelled:=private.market_cancel_exact_equipment_v8(
    v_seller,v_hold,'gear-cancel-valid',repeat('e',64),false);
  v_delivery:=(v_cancelled->>'deliveryId')::uuid;
  if (select status from private.market_custody_holds_v1 where hold_id=v_hold)<>'released'
    or (select status from private.market_equipment_escrows_v8 where source_hold_id=v_hold)<>'returned'
    or (select held_quantity from private.market_custody_assets_v1
        where asset_id=(v_reserved->>'assetId')::uuid)<>0
    or (select status from private.market_equipment_return_deliveries_v8
        where delivery_id=v_delivery)<>'pending'
    or (select state#>'{account,craftedGearInstances}' from public.online_game_states
        where account_id=v_seller)<>'[]'::jsonb
  then raise exception 'equipment cancellation failed to queue exact durable return';end if;

  v_inbox:=private.market_equipment_return_inbox_v8(v_seller,false);
  if v_inbox#>>'{entries,0,instanceId}'<>v_instance
    or v_inbox#>>'{entries,0,status}'<>'pending'
  then raise exception 'equipment return missing from private Market Inbox';end if;

  -- Full Bank must leave both receipt and item in private entitlement.
  begin
    perform private.market_claim_equipment_return_v8(
      v_seller,v_delivery,6,'bank',null,
      'gear-claim-full',repeat('f',64));
    raise exception 'full bank consumed exact Forge return';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_destination_full' then raise;end if;
  end;
  if (select status from private.market_equipment_return_deliveries_v8
      where delivery_id=v_delivery)<>'pending'
    or (select revision from public.online_game_states where account_id=v_seller)<>6
  then raise exception 'failed equipment claim consumed the item';end if;

  begin
    perform private.market_claim_equipment_return_v8(
      v_buyer,v_delivery,7,'inventory',v_bc::text,
      'gear-claim-other',repeat('1',64));
    raise exception 'non-owner claimed original equipment';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_delivery_not_owned' then raise;end if;
  end;

  v_claimed:=private.market_claim_equipment_return_v8(
    v_seller,v_delivery,6,'inventory',v_sc::text,
    'gear-claim-valid',repeat('2',64));
  if v_claimed->>'newRevision'<>'7'
    or (select state#>'{account,craftedGearInstances,0}' from public.online_game_states
       where account_id=v_seller) is distinct from v_receipt
    or (select state#>'{inventory,stacks,1}' from public.online_game_states
       where account_id=v_seller) is distinct from v_stack
    or (select status from private.market_equipment_return_deliveries_v8
        where delivery_id=v_delivery)<>'claimed'
    or (select gold from public.character_wallets where character_id=v_sc)<>100
  then raise exception 'return claim did not preserve Forge item, quality, gems and upgrades';end if;

  v_replay:=private.market_claim_equipment_return_v8(
    v_seller,v_delivery,6,'inventory',v_sc::text,
    'gear-claim-valid',repeat('2',64));
  if v_replay->>'replayed'<>'true'
    or (select pg_catalog.jsonb_array_length(state#>'{inventory,stacks}')
        from public.online_game_states where account_id=v_seller)<>2
  then raise exception 'equipment claim replay duplicated Forge copy';end if;
  begin
    perform private.market_claim_equipment_return_v8(
      v_seller,v_delivery,7,'inventory',v_sc::text,
      'gear-claim-twice',repeat('3',64));
    raise exception 'claimed Forge equipment was credited again';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_delivery_already_claimed' then raise;end if;
  end;

  if (select count(*) from private.market_equipment_escrows_v8)<>1
    or (select gold from public.characters where id=v_sc)<>100
    or (select gold from public.character_wallets where character_id=v_bc)<>500
  then raise exception 'equipment cycle altered Gold or duplicated custody';end if;
end
$market_gear_test$;
select 'PASS: exact Forge copy escrow, protected restrictions, cancellation, full-bank replay-safe return and Gold preservation' as result;
rollback;
