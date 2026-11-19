-- Hidden V17 regression: synthetic multi-character accounts, bulk partial fills,
-- exact custody, Gold conservation, idempotent retries, cancellation and expiry.
-- All test-only policy overrides and transactions are ROLLED BACK.
begin;
set local statement_timeout='55s';
do $market_v17$
declare
  v_seller uuid:=gen_random_uuid();
  v_buyer uuid:=gen_random_uuid();
  v_seller_char uuid:=gen_random_uuid();
  v_second_char uuid:=gen_random_uuid();
  v_buyer_char uuid:=gen_random_uuid();
  v_hold uuid;
  v_offer uuid;
  v_offer_two uuid;
  v_offer_three uuid;
  v_buy jsonb;
  v_replay jsonb;
  v_return jsonb;
  v_result jsonb;
  v_revision bigint;
  v_held_at timestamptz;
  v_i integer;
begin
  -- Nothing is usable before the market release gates are deliberately relaxed
  -- inside this rollback-only test.
  begin
    perform private.market_purchase_resource_quantity_v17(
      v_buyer,gen_random_uuid(),10,100,0,0,
      'v17-disabled-test',repeat('0',64));
    raise exception 'market_partial_function_exposed_while_disabled';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise;end if;
  end;
  if has_function_privilege('authenticated',
      'private.market_purchase_resource_quantity_v17(uuid,uuid,bigint,integer,bigint,bigint,text,text)'::regprocedure,
      'EXECUTE')
    or has_function_privilege('service_role',
      'private.market_purchase_resource_quantity_v17(uuid,uuid,bigint,integer,bigint,bigint,text,text)'::regprocedure,
      'EXECUTE')
  then raise exception 'market_partial_rpc_exposed';end if;

  insert into auth.users(id,email) values
    (v_seller,'market-v17-s-'||v_seller::text||'@example.invalid'),
    (v_buyer,'market-v17-b-'||v_buyer::text||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id,gold) values
    (v_seller_char,v_seller,'MarketSeller','BASTION',100),
    (v_second_char,v_seller,'MarketAlt','BASTION',100),
    (v_buyer_char,v_buyer,'MarketBuyer','BASTION',100000);
  insert into public.character_wallets(character_id,gold) values
    (v_seller_char,100),(v_second_char,100),(v_buyer_char,100000);
  insert into public.online_game_states(account_id,character_id,revision,state) values
    (v_seller,v_seller_char,5,jsonb_build_object(
      'version',11,'character',jsonb_build_object(
        'id',v_seller_char::text,'gold',100),
      'inventory',jsonb_build_object('capacity',30,'stacks',jsonb_build_array(
        jsonb_build_object('itemId','COPPER_ORE','quantity',800))),
      'bank',jsonb_build_object('capacity',50,'stacks','[]'::jsonb),
      'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,
        'favoriteItemIds','[]'::jsonb))),
    (v_buyer,v_buyer_char,7,jsonb_build_object(
      'version',11,'character',jsonb_build_object(
        'id',v_buyer_char::text,'gold',100000),
      'inventory',jsonb_build_object('capacity',30,'stacks','[]'::jsonb),
      'bank',jsonb_build_object('capacity',50,'stacks','[]'::jsonb),
      'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,
        'favoriteItemIds','[]'::jsonb)));

  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_trading_enabled_check';
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_snapshot_bridge_ready_check';
  execute 'alter table private.market_item_policy_v1 drop constraint market_item_policy_v1_tradable_check';
  update private.market_runtime_guard_v1
    set trading_enabled=true,snapshot_bridge_ready=true;
  insert into private.market_item_policy_v1(item_id,asset_kind,tradable,binding_policy)
    values ('COPPER_ORE','resource',true,'unbound');
  update private.market_price_bands_v10
    set min_unit_price=10,max_unit_price=60,approved=true
    where item_id='COPPER_ORE';
  update private.market_listing_lot_policies_v11
    set approved=true where item_id='COPPER_ORE';

  -- One seller ACCOUNT owns the listing, even though it has two characters.
  v_result:=private.market_reserve_stack_v2(
    v_seller,5,'inventory',v_seller_char::text,0,'COPPER_ORE',500,
    'v17-reserve-bulk-one',repeat('1',64));
  v_hold:=(v_result->>'holdId')::uuid;
  v_result:=private.market_publish_sale_offer_v5(
    v_seller,v_hold,10,500,'v17-publish-bulk-one',repeat('2',64));
  v_offer:=(v_result->>'offerId')::uuid;
  select expires_at into v_held_at from private.market_custody_holds_v1 where hold_id=v_hold;
  if v_held_at<now()+interval '6 days 23 hours'
    or v_held_at>now()+interval '7 days 1 minute'
  then raise exception 'market_seven_day_expiry_not_set';end if;
  if (select count(*) from private.market_sale_offers_v3
      where seller_account_id=v_seller and status='active')<>1
  then raise exception 'market_account_listing_identity_invalid';end if;
  begin
    perform private.market_purchase_resource_quantity_v17(
      v_seller,v_offer,10,100,6,6,'v17-self-buy',repeat('3',64));
    raise exception 'same_account_characters_can_self_trade';
  exception when raise_exception then
    if sqlerrm<>'market_self_trade_denied' then raise;end if;
  end;

  -- First buyer receives 100; 400 remains listed in the SAME original offer.
  v_buy:=private.market_purchase_resource_quantity_v17(
    v_buyer,v_offer,10,100,7,6,'v17-buy-one-hundred',repeat('4',64));
  if v_buy->>'filledQuantity'<>'100'
    or v_buy->>'remainingQuantity'<>'400'
    or v_buy->>'sourceOfferId'<>v_offer::text
    or (select quantity from private.market_sale_offers_v3 where offer_id=v_offer)<>400
    or (select held_quantity from private.market_custody_holds_v1 where hold_id=v_hold)<>400
    or (select quantity from private.market_custody_assets_v1
        where asset_id=(select asset_id from private.market_custody_holds_v1
          where hold_id=v_hold))<>400
  then raise exception 'market_first_partial_fill_or_custody_invalid';end if;
  v_replay:=private.market_purchase_resource_quantity_v17(
    v_buyer,v_offer,10,100,7,6,'v17-buy-one-hundred',repeat('4',64));
  if v_replay->>'replayed'<>'true'
    or v_replay->>'deliveryId'<>v_buy->>'deliveryId'
  then raise exception 'market_partial_retry_not_idempotent';end if;
  begin
    perform private.market_purchase_resource_quantity_v17(
      v_buyer,v_offer,10,101,7,6,'v17-buy-one-hundred',repeat('4',64));
    raise exception 'market_partial_key_reuse_accepted';
  exception when raise_exception then
    if sqlerrm<>'market_idempotency_conflict' then raise;end if;
  end;

  -- Another partial purchase and the final whole remainder complete the lot.
  perform private.market_purchase_resource_quantity_v17(
    v_buyer,v_offer,10,300,8,7,'v17-buy-three-hundred',repeat('5',64));
  v_buy:=private.market_purchase_resource_quantity_v17(
    v_buyer,v_offer,10,100,9,8,'v17-buy-final-one',repeat('6',64));
  if v_buy->>'remainingQuantity'<>'0'
    or (select status from private.market_sale_offers_v3 where offer_id=v_offer)<>'sold'
    or (select count(*) from private.market_partial_custody_lineage_v17
        where source_offer_id=v_offer)<>2
    or (select sum(quantity) from private.market_completed_sale_history_v13
        where seller_account_id=v_seller)<>500
    or (select count(*) from private.market_completed_sale_history_v13
        where seller_account_id=v_seller)<>3
  then raise exception 'market_bulk_multi_fill_history_invalid';end if;

  -- Cancel after a fourth partial sale. Only the UNSOLD remainder may return.
  v_result:=private.market_reserve_stack_v2(
    v_seller,9,'inventory',v_seller_char::text,0,'COPPER_ORE',200,
    'v17-reserve-bulk-two',repeat('7',64));
  v_hold:=(v_result->>'holdId')::uuid;
  v_result:=private.market_publish_sale_offer_v5(
    v_seller,v_hold,10,200,'v17-publish-bulk-two',repeat('8',64));
  v_offer_two:=(v_result->>'offerId')::uuid;
  perform private.market_purchase_resource_quantity_v17(
    v_buyer,v_offer_two,10,100,10,10,'v17-buy-two-part',repeat('9',64));
  v_return:=private.market_cancel_sale_offer_v5(
    v_seller,v_offer_two,'v17-cancel-remainder',repeat('a',64));
  if v_return->>'quantity'<>'100'
    or (select count(*) from private.market_return_deliveries_v2
        where source_hold_id=v_hold and quantity=100 and status='pending')<>1
  then raise exception 'market_cancel_remaining_balance_invalid';end if;

  -- Expiry cannot refund any previously sold quantity or create two returns.
  select revision into v_revision from public.online_game_states where account_id=v_seller;
  v_result:=private.market_reserve_stack_v2(
    v_seller,v_revision,'inventory',v_seller_char::text,0,'COPPER_ORE',100,
    'v17-reserve-expiry',repeat('b',64));
  v_hold:=(v_result->>'holdId')::uuid;
  v_result:=private.market_publish_sale_offer_v5(
    v_seller,v_hold,10,100,'v17-publish-expiry',repeat('c',64));
  v_offer_three:=(v_result->>'offerId')::uuid;
  update private.market_custody_holds_v1
    set expires_at=now()-interval '1 second' where hold_id=v_hold;
  if private.market_queue_due_returns_v2(10)<>1
    or private.market_queue_due_returns_v2(10)<>0
    or (select status from private.market_sale_offers_v3
        where offer_id=v_offer_three)<>'cancelled'
    or (select count(*) from private.market_return_deliveries_v2
        where source_hold_id=v_hold and quantity=100 and status='pending')<>1
  then raise exception 'market_seven_day_expiry_return_invalid';end if;

  -- 800 resource units are accounted for: 600 purchased + 200 pending return.
  if (select coalesce(sum(quantity),0) from private.market_purchase_deliveries_v3
       where seller_account_id=v_seller)<>600
    or (select coalesce(sum(quantity),0) from private.market_return_deliveries_v2
        where recipient_account_id=v_seller)<>200
    or (select coalesce(sum(fee_gold),0) from private.market_gold_intents_v2
        where seller_account_id=v_seller and status='settled')<>300
    or (select gold from public.character_wallets where character_id=v_buyer_char)<>94000
    or (select gold from public.character_wallets where character_id=v_seller_char)<>5800
    or (select gold from public.character_wallets where character_id=v_second_char)<>100
  then raise exception 'market_partial_gold_or_asset_conservation_failed';end if;
end
$market_v17$;
select 'PASS V17: account-owned multi-character listings, 100/300/100 partial fills, exact sale history, expiry, cancellation, and conservation' as result;
rollback;
