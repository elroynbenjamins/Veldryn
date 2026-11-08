-- Hidden Market V3 purchase + Gold transaction regression.
-- Synthetic accounts only. All changes AND any temporarily relaxed release
-- gates happen inside this ROLLBACK transaction, never in persistent staging.
begin;
set local statement_timeout='45s';

do $market_gold_test$
declare
  v_seller uuid:=pg_catalog.gen_random_uuid();
  v_buyer uuid:=pg_catalog.gen_random_uuid();
  v_rival uuid:=pg_catalog.gen_random_uuid();
  v_sc uuid:=pg_catalog.gen_random_uuid();
  v_bc uuid:=pg_catalog.gen_random_uuid();
  v_rc uuid:=pg_catalog.gen_random_uuid();
  v_hold uuid;
  v_offer uuid;
  v_delivery uuid;
  v_offer2 uuid;
  v_result jsonb;
  v_replay jsonb;
  v_reservation jsonb;
begin
  insert into auth.users(id,email) values
    (v_seller,'market-gold-seller-'||v_seller||'@example.invalid'),
    (v_buyer,'market-gold-buyer-'||v_buyer||'@example.invalid'),
    (v_rival,'market-gold-rival-'||v_rival||'@example.invalid');

  insert into public.characters(id,account_id,name,class_id,gold)
    values(v_sc,v_seller,'GoldSeller','BASTION',100),
      (v_bc,v_buyer,'GoldBuyer','BASTION',500),
      (v_rc,v_rival,'GoldRival','BASTION',900);
  insert into public.character_wallets(character_id,gold) values
    (v_sc,100),(v_bc,500),(v_rc,900);

  insert into public.online_game_states(account_id,character_id,revision,state) values
  (v_seller,v_sc,5,pg_catalog.jsonb_build_object(
    'version',11,
    'character',pg_catalog.jsonb_build_object('id',v_sc::text,'gold',100),
    'inventory',pg_catalog.jsonb_build_object('capacity',30,'stacks',
      pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('itemId','COPPER_ORE','quantity',10))),
    'bank',pg_catalog.jsonb_build_object('capacity',120,'stacks','[]'::jsonb),
    'settings',pg_catalog.jsonb_build_object(
      'lockedItemIds','[]'::jsonb,'favoriteItemIds','[]'::jsonb)
  )),
  (v_buyer,v_bc,8,pg_catalog.jsonb_build_object(
    'version',11,
    'character',pg_catalog.jsonb_build_object('id',v_bc::text,'gold',500),
    'inventory',pg_catalog.jsonb_build_object('capacity',30,'stacks','[]'::jsonb),
    'bank',pg_catalog.jsonb_build_object('capacity',120,'stacks','[]'::jsonb),
    'settings',pg_catalog.jsonb_build_object(
      'lockedItemIds','[]'::jsonb,'favoriteItemIds','[]'::jsonb)
  )),
  (v_rival,v_rc,9,pg_catalog.jsonb_build_object(
    'version',11,
    'character',pg_catalog.jsonb_build_object('id',v_rc::text,'gold',900),
    'inventory',pg_catalog.jsonb_build_object('capacity',30,'stacks','[]'::jsonb),
    'bank',pg_catalog.jsonb_build_object('capacity',120,'stacks','[]'::jsonb),
    'settings',pg_catalog.jsonb_build_object(
      'lockedItemIds','[]'::jsonb,'favoriteItemIds','[]'::jsonb)
  ));

  begin
    perform private.market_purchase_stack_offer_v3(
      v_buyer,pg_catalog.gen_random_uuid(),40,6,8,6,
      'buy-disabled-001',pg_catalog.repeat('a',64));
    raise exception 'purchase accepted while global flags are false';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise;end if;
  end;

  if pg_catalog.has_function_privilege('anon',
      'private.market_purchase_stack_offer_v3(uuid,uuid,bigint,integer,bigint,bigint,text,text)'::regprocedure,'EXECUTE')
    or pg_catalog.has_function_privilege('authenticated',
      'private.market_purchase_stack_offer_v3(uuid,uuid,bigint,integer,bigint,bigint,text,text)'::regprocedure,'EXECUTE')
    or pg_catalog.has_function_privilege('service_role',
      'private.market_purchase_stack_offer_v3(uuid,uuid,bigint,integer,bigint,bigint,text,text)'::regprocedure,'EXECUTE')
  then raise exception 'purchase function is exposed to Data API roles';end if;

  -- QA ONLY: unfreeze otherwise permanently false policy/runtime constraints.
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_trading_enabled_check';
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_snapshot_bridge_ready_check';
  execute 'alter table private.market_item_policy_v1 drop constraint market_item_policy_v1_tradable_check';
  update private.market_runtime_guard_v1
    set trading_enabled=true,snapshot_bridge_ready=true where singleton;
  insert into private.market_item_policy_v1(item_id,asset_kind,tradable,binding_policy)
    values('COPPER_ORE','resource',true,'unbound');

  v_reservation:=private.market_reserve_stack_v2(
    v_seller,5,'inventory',v_sc::text,0,'COPPER_ORE',6,
    'reserve-gold-01',pg_catalog.repeat('b',64));
  v_hold:=(v_reservation->>'holdId')::uuid;
  insert into private.market_sale_offers_v3(
    source_hold_id,seller_account_id,unit_price,quantity,status
  ) values(v_hold,v_seller,40,6,'active') returning offer_id into v_offer;

  begin
    perform private.market_purchase_stack_offer_v3(
      v_seller,v_offer,40,6,6,6,'buy-self-0001',pg_catalog.repeat('c',64));
    raise exception 'self-trade accepted';
  exception when raise_exception then
    if sqlerrm<>'market_self_trade_denied' then raise;end if;
  end;
  begin
    perform private.market_purchase_stack_offer_v3(
      v_buyer,v_offer,39,6,8,6,'buy-price-001',pg_catalog.repeat('d',64));
    raise exception 'stale price was accepted';
  exception when raise_exception then
    if sqlerrm<>'market_offer_not_available' then raise;end if;
  end;
  begin
    perform private.market_purchase_stack_offer_v3(
      v_buyer,v_offer,40,6,7,6,'buy-version01',pg_catalog.repeat('e',64));
    raise exception 'stale buyer revision accepted';
  exception when raise_exception then
    if sqlerrm<>'market_stale_state' then raise;end if;
  end;

  v_result:=private.market_purchase_stack_offer_v3(
    v_buyer,v_offer,40,6,8,6,'buy-happy-001',pg_catalog.repeat('f',64));
  v_delivery:=(v_result->>'deliveryId')::uuid;
  if v_result->>'goldSpent'<>'240'
    or v_result->>'sellerGoldReceived'<>'240'
    or v_result->>'feeGold'<>'0'
    or v_result->>'buyerRevision'<>'9'
    or v_result->>'sellerRevision'<>'7'
  then raise exception 'purchase returned incorrect settlement';end if;

  if (select gold from public.character_wallets where character_id=v_bc)<>260
    or (select gold from public.character_wallets where character_id=v_sc)<>340
    or (select gold from public.characters where id=v_bc)<>260
    or (select gold from public.characters where id=v_sc)<>340
    or (select state#>>'{character,gold}' from public.online_game_states
      where account_id=v_buyer)<>'260'
    or (select state#>>'{character,gold}' from public.online_game_states
      where account_id=v_seller)<>'340'
    or (select revision from public.online_game_states where account_id=v_buyer)<>9
    or (select revision from public.online_game_states where account_id=v_seller)<>7
  then raise exception 'wallet / snapshot / character Gold divergence';end if;

  if (select status from private.market_sale_offers_v3 where offer_id=v_offer)<>'sold'
    or (select status from private.market_custody_holds_v1 where hold_id=v_hold)<>'settled'
    or (select status from private.market_purchase_deliveries_v3 where delivery_id=v_delivery)<>'pending'
    or (select quantity from private.market_purchase_deliveries_v3 where delivery_id=v_delivery)<>6
    or (select state#>>'{inventory,stacks,0,itemId}' from public.online_game_states
      where account_id=v_buyer) is not null
  then raise exception 'buyer paid without durable pending item delivery';end if;

  if (select gross_gold from private.market_gold_intents_v2 where source_hold_id=v_hold)<>240
    or (select fee_gold from private.market_gold_intents_v2 where source_hold_id=v_hold)<>0
    or (select seller_payout_gold from private.market_gold_intents_v2 where source_hold_id=v_hold)<>240
  then raise exception 'Gold conservation ledger incorrect';end if;

  v_replay:=private.market_purchase_stack_offer_v3(
    v_buyer,v_offer,40,6,8,6,'buy-happy-001',pg_catalog.repeat('f',64));
  if v_replay->>'replayed'<>'true'
    or v_replay->>'deliveryId' is distinct from v_result->>'deliveryId'
    or (select gold from public.character_wallets where character_id=v_bc)<>260
  then raise exception 'replay duplicated Gold payment or item delivery';end if;

  begin
    perform private.market_purchase_stack_offer_v3(
      v_buyer,v_offer,40,6,8,6,'buy-happy-001',pg_catalog.repeat('1',64));
    raise exception 'purchase idempotency key reused for changed request';
  exception when raise_exception then
    if sqlerrm<>'market_idempotency_conflict' then raise;end if;
  end;

  begin
    perform private.market_purchase_stack_offer_v3(
      v_rival,v_offer,40,6,9,7,'buy-rival-001',pg_catalog.repeat('2',64));
    raise exception 'same offer purchased twice';
  exception when raise_exception then
    if sqlerrm<>'market_offer_not_available' then raise;end if;
  end;

  -- A second offer remains unpurchased if the buyer wallet is inconsistent.
  v_reservation:=private.market_reserve_stack_v2(
    v_seller,7,'inventory',v_sc::text,0,'COPPER_ORE',2,
    'reserve-gold-02',pg_catalog.repeat('3',64));
  insert into private.market_sale_offers_v3(
    source_hold_id,seller_account_id,unit_price,quantity,status
  ) values((v_reservation->>'holdId')::uuid,v_seller,1000,2,'active')
  returning offer_id into v_offer2;

  update public.character_wallets set gold=259 where character_id=v_bc;
  begin
    perform private.market_purchase_stack_offer_v3(
      v_buyer,v_offer2,1000,2,9,8,'buy-unsync-001',pg_catalog.repeat('4',64));
    raise exception 'unreconciled wallet accepted';
  exception when raise_exception then
    if sqlerrm<>'market_wallet_not_reconciled' then raise;end if;
  end;
  update public.character_wallets set gold=260 where character_id=v_bc;

  begin
    perform private.market_purchase_stack_offer_v3(
      v_buyer,v_offer2,1000,2,9,8,'buy-poor-0001',pg_catalog.repeat('5',64));
    raise exception 'insufficient Gold accepted';
  exception when raise_exception then
    if sqlerrm<>'market_insufficient_gold' then raise;end if;
  end;

  if (select status from private.market_sale_offers_v3 where offer_id=v_offer2)<>'active'
    or (select status from private.market_custody_holds_v1
      where hold_id=(v_reservation->>'holdId')::uuid)<>'held'
    or (select gold from public.character_wallets where character_id=v_bc)<>260
    or (select count(*) from private.market_purchase_deliveries_v3)<>1
  then raise exception 'failed purchase wrote partial settlement';end if;
end
$market_gold_test$;

select 'PASS: hidden market whole-lot purchase Gold conservation, wallet sync, replay and double-buy protection' as result;
rollback;
