-- Hidden seller-listing V12 fully layered V10/V11 rollback integration regression.
-- Synthetic accounts; temporary gate overrides ONLY inside BEGIN/ROLLBACK.
begin;
set local statement_timeout='50s';
do $seller_lifecycle_test$
declare
  v_seller uuid:=gen_random_uuid();
  v_buyer uuid:=gen_random_uuid();
  v_sc uuid:=gen_random_uuid();
  v_bc uuid:=gen_random_uuid();
  v_hold uuid;
  v_offer uuid;
  v_second uuid;
  v_third uuid;
  v_i integer;
  v_rev bigint;
  v_test_hold uuid;
  v_old_offer uuid;
  v_res jsonb;
  v_published jsonb;
  v_cancel jsonb;
  v_buy jsonb;
  v_inbox jsonb;
  v_browse jsonb;
begin
  insert into auth.users(id,email) values
    (v_seller,'v5-seller-'||v_seller||'@example.invalid'),
    (v_buyer,'v5-buyer-'||v_buyer||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id,gold) values
    (v_sc,v_seller,'MarketSeller','BASTION',100),
    (v_bc,v_buyer,'MarketBuyer','BASTION',500);
  insert into public.character_wallets(character_id,gold) values
    (v_sc,100),(v_bc,500);
  insert into public.online_game_states(account_id,character_id,revision,state) values
    (v_seller,v_sc,5,jsonb_build_object(
      'version',11,'character',jsonb_build_object('id',v_sc::text,'gold',100),
      'inventory',jsonb_build_object('capacity',30,'stacks',jsonb_build_array(
        jsonb_build_object('itemId','COPPER_ORE','quantity',50))),
      'bank',jsonb_build_object('capacity',50,'stacks','[]'::jsonb),
      'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,
        'favoriteItemIds','[]'::jsonb))),
    (v_buyer,v_bc,7,jsonb_build_object(
      'version',11,'character',jsonb_build_object('id',v_bc::text,'gold',500,
        'xp',0,'classId','BASTION'),
      'inventory',jsonb_build_object('capacity',30,'stacks','[]'::jsonb),
      'bank',jsonb_build_object('capacity',50,'stacks','[]'::jsonb),
      'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,
        'favoriteItemIds','[]'::jsonb)));

  begin
    perform private.market_publish_sale_offer_v5(
      v_seller,gen_random_uuid(),10,2,'publish-disabled','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    raise exception 'seller offer published with market disabled';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise;end if;
  end;
  if has_function_privilege('authenticated',
    'private.market_publish_sale_offer_v5(uuid,uuid,bigint,integer,text,text)'::regprocedure,'EXECUTE')
    or has_function_privilege('service_role',
    'private.market_cancel_sale_offer_v5(uuid,uuid,text,text)'::regprocedure,'EXECUTE')
    or has_function_privilege('anon',
    'private.market_seller_offers_snapshot_v5(uuid,boolean,integer)'::regprocedure,'EXECUTE')
  then raise exception 'seller listing RPC unexpectedly exposed';end if;

  -- Only synthetic data. The committed schema retains all hard-false gates.
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_trading_enabled_check';
  execute 'alter table private.market_runtime_guard_v1 drop constraint market_runtime_guard_v1_snapshot_bridge_ready_check';
  execute 'alter table private.market_item_policy_v1 drop constraint market_item_policy_v1_tradable_check';
  update private.market_runtime_guard_v1 set trading_enabled=true,snapshot_bridge_ready=true;
  insert into private.market_item_policy_v1(item_id,asset_kind,tradable,binding_policy)
    values('COPPER_ORE','resource',true,'unbound');
  execute 'alter table private.market_acquisition_policy_v18 drop constraint market_acquisition_v18_approved_check';
  insert into private.market_acquisition_policy_v18(
    item_id,asset_kind,source_tier,item_required_level,approved)
    values('COPPER_ORE','resource','T1',1,true);

  -- CI-only policy approval; all changes and accounts roll back.
  update private.market_price_bands_v10
    set min_unit_price=10,max_unit_price=60,approved=true
    where item_id='COPPER_ORE';
  update private.market_listing_lot_policies_v11
    set approved=true where item_id='COPPER_ORE';
  if private.market_listing_lot_valid_v11('COPPER_ORE','resource',9)
    or not private.market_listing_lot_valid_v11('COPPER_ORE','resource',10)
  then raise exception 'default_minimum_lot_invalid';end if;

  v_res:=private.market_reserve_stack_v2(
    v_seller,5,'inventory',v_sc::text,0,'COPPER_ORE',6,
    'reserve-v5-one',repeat('a',64));
  v_hold:=(v_res->>'holdId')::uuid;
  begin
    perform private.market_publish_sale_offer_v5(
      v_seller,v_hold,40,6,'publish-v12-below-lot',repeat('9',64));
    raise exception 'minimum bundle bypassed';
  exception when raise_exception then
    if sqlerrm<>'market_listing_quantity_not_approved' then raise;end if;
  end;
  -- Legacy fixture tests caps using 1-6 units; lower ONLY in rolled-back CI.
  update private.market_listing_lot_policies_v11 set min_quantity=1
    where item_id='COPPER_ORE';
  v_published:=private.market_publish_sale_offer_v5(
    v_seller,v_hold,40,6,'publish-v5-one',repeat('b',64));
  v_offer:=(v_published->>'offerId')::uuid;
  v_browse:=private.market_browse_verified_offers_v12(
    'resource','COPPER_ORE','COPPER','price_asc',null,null,25,0);
  if (v_browse->>'total')::integer<>1
    or v_browse#>>'{entries,0,offerId}'<>v_offer::text
    or v_browse#>>'{entries,0,totalGold}'<>'240'
    or v_browse::text like '%sellerAccountId%'
  then raise exception 'market_resource_browse_missing_or_leaks_private_info';end if;
  if (private.market_browse_verified_offers_v12(
      'resource','COPPER_ORE',null,'price_asc',null,239,25,0)->>'total')::integer<>0
  then raise exception 'market_price_filter_leaks_out_of_range_listings';end if;
  if (select status from private.market_sale_offers_v3 where offer_id=v_offer)<>'active'
    or (select quantity from private.market_sale_offers_v3 where offer_id=v_offer)<>6
  then raise exception 'seller listing not published from exact held lot';end if;
  if private.market_publish_sale_offer_v5(
      v_seller,v_hold,40,6,'publish-v5-one',repeat('b',64))->>'replayed'<>'true'
  then raise exception 'seller publish retry was not idempotent';end if;
  begin
    perform private.market_publish_sale_offer_v5(
      v_seller,v_hold,41,6,'publish-v5-one',repeat('c',64));
    raise exception 'publish hash reuse accepted';
  exception when raise_exception then
    if sqlerrm<>'market_idempotency_conflict' then raise;end if;
  end;
  begin
    perform private.market_publish_sale_offer_v5(
      v_seller,v_hold,40,6,'publish-v5-again',repeat('d',64));
    raise exception 'same held lot listed twice';
  exception when raise_exception then
    if sqlerrm<>'market_hold_already_listed' then raise;end if;
  end;
  begin
    perform private.market_cancel_stack_hold_v2(
      v_seller,v_hold,'cancel-v5-direct',repeat('e',64));
    raise exception 'direct cancellation left a ghost active sale';
  exception when raise_exception then
    if sqlerrm<>'market_active_listing_requires_cancel_offer' then raise;end if;
  end;

  v_inbox:=private.market_seller_offers_snapshot_v5(v_seller,false,0);
  if (v_inbox->>'activeCount')::integer<>1
    or v_inbox#>>'{entries,0,displayStatus}'<>'active'
  then raise exception 'seller active listing read model incorrect';end if;
  begin
    perform private.market_cancel_sale_offer_v5(
      v_buyer,v_offer,'seller-cancel-wrong',repeat('f',64));
    raise exception 'another account cancelled seller offer';
  exception when raise_exception then
    if sqlerrm<>'market_offer_not_owned' then raise;end if;
  end;

  v_cancel:=private.market_cancel_sale_offer_v5(
    v_seller,v_offer,'seller-cancel-one',repeat('1',64));
  if (select status from private.market_sale_offers_v3 where offer_id=v_offer)<>'cancelled'
    or (select status from private.market_custody_holds_v1 where hold_id=v_hold)<>'released'
    or (select count(*) from private.market_return_deliveries_v2 where source_hold_id=v_hold)<>1
    or v_cancel->>'status'<>'pending_return'
  then raise exception 'cancelled seller listing did not queue item return atomically';end if;
  if private.market_cancel_sale_offer_v5(
      v_seller,v_offer,'seller-cancel-one',repeat('1',64))->>'replayed'<>'true'
  then raise exception 'seller cancel idempotency did not persist';end if;
  begin
    perform private.market_purchase_stack_offer_v3(
      v_buyer,v_offer,40,6,7,6,'buy-cancelled-v5',repeat('2',64));
    raise exception 'cancelled listing was purchased';
  exception when raise_exception then
    if sqlerrm<>'market_offer_not_available' then raise;end if;
  end;
  if (select gold from public.character_wallets where character_id=v_bc)<>500
    or (select gold from public.character_wallets where character_id=v_sc)<>100
  then raise exception 'cancelled listing unexpectedly moved Gold';end if;

  -- The second independent lot sells once. No cancellation after settlement.
  v_res:=private.market_reserve_stack_v2(
    v_seller,6,'inventory',v_sc::text,0,'COPPER_ORE',4,
    'reserve-v5-two',repeat('3',64));
  v_second:=(v_res->>'holdId')::uuid;
  v_published:=private.market_publish_sale_offer_v5(
    v_seller,v_second,30,4,'publish-v5-two',repeat('4',64));
  v_old_offer:=(v_published->>'offerId')::uuid;
  -- V18: a policy raised after listing must reject sale atomically.
  update private.market_acquisition_policy_v18 set item_required_level=20
    where item_id='COPPER_ORE';
  begin
    perform private.market_purchase_stack_offer_v3(
      v_buyer,v_old_offer,30,4,7,7,'buy-v18-resource-level',repeat('6',64));
    raise exception 'under-level resource purchase succeeded';
  exception when raise_exception then
    if sqlerrm<>'market_level_required' then raise;end if;
  end;
  if (select gold from public.character_wallets where character_id=v_bc)<>500
    or (select count(*) from private.market_purchase_receipts_v3)<>0
    or (select status from private.market_sale_offers_v3 where offer_id=v_old_offer)<>'active'
  then raise exception 'rejected resource purchase mutated settlement';end if;
  update private.market_acquisition_policy_v18 set item_required_level=1
    where item_id='COPPER_ORE';
  v_buy:=private.market_purchase_stack_offer_v3(
    v_buyer,v_old_offer,30,4,7,7,'buy-v5-two',repeat('5',64));
  if (select count(*) from private.market_completed_sale_history_v13)<>1
    or (select count(*) from private.market_completed_sale_history_v13
      where item_id='COPPER_ORE' and asset_kind='resource'
        and unit_gold=30 and quantity=4 and gross_gold=120
        and fee_gold=6 and seller_payout_gold=114)<>1
  then raise exception 'completed_resource_sale_history_not_recorded_atomically';end if;
  if private.market_completed_price_chart_v13('COPPER_ORE','resource',7,null)->>'hasEnoughData'<>'false'
  then raise exception 'single_resource_sale_created_misleading_chart';end if;
  if v_buy->>'goldSpent'<>'120'
    or v_buy->>'sellerGoldReceived'<>'114'
    or v_buy->>'feeGold'<>'6'
    or (select fee_gold from private.market_gold_intents_v2 where status='settled')<>6
    or (select status from private.market_sale_offers_v3 where offer_id=v_old_offer)<>'sold'
    or (select gold from public.character_wallets where character_id=v_bc)<>380
    or (select gold from public.character_wallets where character_id=v_sc)<>214
  then raise exception 'purchase failed to settle seller listing';end if;
  if (private.market_browse_verified_offers_v12(
      'resource','COPPER_ORE',null,'newest',null,null,25,0)->>'total')::integer<>0
  then raise exception 'sold resource remained listed';end if;
  begin
    perform private.market_cancel_sale_offer_v5(
      v_seller,v_old_offer,'cancel-v5-sold',repeat('6',64));
    raise exception 'sold listing cancelled or refunded';
  exception when raise_exception then
    if sqlerrm<>'market_offer_not_cancelable' then raise;end if;
  end;
  if (select count(*) from private.market_return_deliveries_v2 where source_hold_id=v_second)<>0
  then raise exception 'sold lot generated seller return entitlement';end if;

  -- An expired listing must be unlisted as part of automatic escrow expiry.
  v_res:=private.market_reserve_stack_v2(
    v_seller,8,'inventory',v_sc::text,0,'COPPER_ORE',2,
    'reserve-v5-three',repeat('7',64));
  v_third:=(v_res->>'holdId')::uuid;
  v_published:=private.market_publish_sale_offer_v5(
    v_seller,v_third,20,2,'publish-v5-three',repeat('8',64));
  v_offer:=(v_published->>'offerId')::uuid;
  update private.market_custody_holds_v1 set expires_at=now()-interval '1 second'
    where hold_id=v_third;
  if private.market_queue_due_returns_v2(20)<>1
  then raise exception 'expired active seller offer was not closed';end if;
  if (select status from private.market_sale_offers_v3 where offer_id=v_offer)<>'cancelled'
    or (select status from private.market_custody_holds_v1 where hold_id=v_third)<>'released'
    or (select count(*) from private.market_return_deliveries_v2 where source_hold_id=v_third)<>1
  then raise exception 'expired listing left ghost offer or lost escrow';end if;
  if private.market_queue_due_returns_v2(20)<>0
  then raise exception 'expired listing generated duplicate return';end if;

  -- Two guardrails: a previously listed hold cannot be reused and one
  -- seller cannot flood the market beyond the authored 20-active-offer cap.
  begin
    perform private.market_publish_sale_offer_v5(
      v_seller,v_hold,40,6,'publish-v5-old',repeat('a',64));
    raise exception 'cancelled hold was re-listed';
  exception when raise_exception then
    if sqlerrm<>'market_hold_already_listed' then raise;end if;
  end;
  select revision into v_rev from public.online_game_states
    where account_id=v_seller;
  for v_i in 1..20 loop
    v_res:=private.market_reserve_stack_v2(
      v_seller,v_rev,'inventory',v_sc::text,0,'COPPER_ORE',1,
      'reserve-cap-'||lpad(v_i::text,2,'0'),repeat('a',64));
    v_test_hold:=(v_res->>'holdId')::uuid;
    perform private.market_publish_sale_offer_v5(
      v_seller,v_test_hold,10,1,'publish-cap-'||lpad(v_i::text,2,'0'),repeat('b',64));
    v_rev:=v_rev+1;
  end loop;
  v_res:=private.market_reserve_stack_v2(
    v_seller,v_rev,'inventory',v_sc::text,0,'COPPER_ORE',1,
    'reserve-over-cap',repeat('c',64));
  v_test_hold:=(v_res->>'holdId')::uuid;
  begin
    perform private.market_publish_sale_offer_v5(
      v_seller,v_test_hold,10,1,'publish-over-cap',repeat('d',64));
    raise exception 'seller exceeded 20 active listings';
  exception when raise_exception then
    if sqlerrm<>'market_seller_listing_cap' then raise;end if;
  end;
  if (select count(*) from private.market_completed_sale_history_v13)<>1
  then raise exception 'cancelled_or_expired_listing_created_fake_sale_history';end if;
  if (select count(*) from private.market_sale_offers_v3
       where seller_account_id=v_seller and status='active')<>20
  then raise exception 'listing cap did not preserve exact active count';end if;

  v_inbox:=private.market_seller_offers_snapshot_v5(v_seller,true,0);
  if (v_inbox->>'total')::integer<>3
    or (select count(*) from private.market_sale_offers_v3 where status='active'
      and seller_account_id=v_seller)<>20
  then raise exception 'seller listing history or capped active count inconsistent';end if;
end
$seller_lifecycle_test$;
select 'PASS V12: price corridors, minimum lots, 5% tax, cancel/expire, idempotency and twenty-offer cap' as result;
rollback;
