-- Hidden Market V9: no real accounts, no persistence, no runtime activation.
-- All synthetic identities, gate loosening, Gold and equipment are ROLLBACK.
begin;
set local statement_timeout='65s';
do $v9_test$
declare
  v_seller uuid:=gen_random_uuid();
  v_buyer uuid:=gen_random_uuid();
  v_rival uuid:=gen_random_uuid();
  v_seller_char uuid:=gen_random_uuid();
  v_buyer_main uuid:=gen_random_uuid();
  v_buyer_alt uuid:=gen_random_uuid();
  v_rival_char uuid:=gen_random_uuid();
  v_item text:='FORGE_T1_BASTION';
  v_instance text:='forge-v9-mythic-001';
  v_stack jsonb;
  v_receipt jsonb;
  v_result jsonb;
  v_retry jsonb;
  v_hold uuid;
  v_offer uuid;
  v_delivery uuid;
  v_rebound jsonb;
  v_claim jsonb;
  v_inbox jsonb;
  v_other_instance text:='forge-v9-mythic-002';
  v_hold2 uuid;
  v_offer2 uuid;
  v_return_id uuid;
begin
  insert into auth.users(id,email) values
    (v_seller,'v9-seller-'||v_seller||'@example.invalid'),
    (v_buyer,'v9-buyer-'||v_buyer||'@example.invalid'),
    (v_rival,'v9-rival-'||v_rival||'@example.invalid');
  insert into public.characters(id,account_id,name,class_id,gold) values
    (v_seller_char,v_seller,'GearTrader','BASTION',100),
    (v_buyer_main,v_buyer,'GearBuyer','BASTION',500),
    (v_buyer_alt,v_buyer,'GearAlt','BASTION',0),
    (v_rival_char,v_rival,'GearRival','BASTION',300);
  insert into public.character_wallets(character_id,gold) values
    (v_seller_char,100),(v_buyer_main,500),(v_buyer_alt,0),(v_rival_char,300);
  v_stack:=jsonb_build_object(
    'itemId',v_item,'quantity',1,'instanceId',v_instance);
  v_receipt:=jsonb_build_object(
    'id',v_instance,'itemId',v_item,'ownerCharacterId',v_seller_char::text,
    'rarity','mythic','quality',93,'statRoll',0.732,'locked',false,
    'acquireSource','craft','sourceReceiptKey','craft-v9-first',
    'createdAtMs',1234,'enhancement',jsonb_build_object(
      'rank',3,'failures',2,'statGemId','gem:stat_might:g2',
      'effectGemId','gem:effect_momentum:g1',
      'gemIds',jsonb_build_array('gem:stat_might:g2','gem:effect_momentum:g1')));
  insert into public.online_game_states(account_id,character_id,revision,state) values
    (v_seller,v_seller_char,5,jsonb_build_object(
      'character',jsonb_build_object('id',v_seller_char::text,'gold',100,
        'equipment','{}'::jsonb,'savedLoadouts','[]'::jsonb),
      'account',jsonb_build_object('craftedGearInstances',jsonb_build_array(v_receipt)),
      'inventory',jsonb_build_object('capacity',20,'stacks',jsonb_build_array(v_stack,
        jsonb_build_object('itemId','COPPER_ORE','quantity',7))),
      'bank',jsonb_build_object('capacity',20,'stacks','[]'::jsonb),
      'otherCharacters','[]'::jsonb,
      'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,
        'favoriteItemIds','[]'::jsonb))),
    (v_buyer,v_buyer_main,7,jsonb_build_object(
      'character',jsonb_build_object('id',v_buyer_main::text,'gold',500,
        'equipment','{}'::jsonb),
      'account',jsonb_build_object('craftedGearInstances','[]'::jsonb),
      'inventory',jsonb_build_object('capacity',1,'stacks',jsonb_build_array(
        jsonb_build_object('itemId','COPPER_ORE','quantity',1))),
      'bank',jsonb_build_object('capacity',1,'stacks',jsonb_build_array(
        jsonb_build_object('itemId','COPPER_ORE','quantity',1))),
      'otherCharacters',jsonb_build_array(jsonb_build_object(
        'character',jsonb_build_object('id',v_buyer_alt::text,
           'equipmentPouch',jsonb_build_object('capacity',3,'stacks','[]'::jsonb),
           'equipment','{}'::jsonb),
        'inventory',jsonb_build_object('capacity',2,'stacks','[]'::jsonb))),
      'settings',jsonb_build_object('lockedItemIds','[]'::jsonb,'favoriteItemIds','[]'::jsonb))),
    (v_rival,v_rival_char,4,jsonb_build_object(
      'character',jsonb_build_object('id',v_rival_char::text,'gold',300),
      'account',jsonb_build_object('craftedGearInstances','[]'::jsonb),
      'inventory',jsonb_build_object('capacity',10,'stacks','[]'::jsonb),
      'bank',jsonb_build_object('capacity',10,'stacks','[]'::jsonb)));

  -- Function ACLs and hard-false gate deny all live operations.
  if has_function_privilege('anon',
       'private.market_publish_equipment_offer_v9(uuid,uuid,bigint,integer,text,text)'::regprocedure,
       'EXECUTE')
    or has_function_privilege('authenticated',
       'private.market_purchase_equipment_offer_v9(uuid,uuid,bigint,integer,bigint,bigint,text,text)'::regprocedure,
       'EXECUTE')
    or has_function_privilege('service_role',
       'private.market_claim_equipment_purchase_v9(uuid,uuid,bigint,text,text,text,text)'::regprocedure,
       'EXECUTE')
  then raise exception 'market_v9_exposed_to_api';end if;
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_buyer,gen_random_uuid(),125,1,7,6,'gear-v9-disabled',repeat('a',64));
    raise exception 'disabled equipment purchase was accepted';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise;end if;
  end;

  -- QA ONLY. Every row & gate change below ends in transaction ROLLBACK.
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

  v_result:=private.market_reserve_exact_equipment_v8(
    v_seller,5,'inventory',v_seller_char::text,0,v_item,v_instance,
    'gear-v9-reserve',repeat('b',64));
  v_hold:=(v_result->>'holdId')::uuid;
  v_result:=private.market_publish_equipment_offer_v9(
    v_seller,v_hold,125,1,'gear-v9-list',repeat('c',64));
  v_offer:=(v_result->>'offerId')::uuid;
  if v_result->>'instanceId'<>v_instance
    or (select status from private.market_sale_offers_v3 where offer_id=v_offer)<>'active'
  then raise exception 'exact equipment offer was not published';end if;

  -- Ordinary resource-only buy must NOT claim a gear listing.
  begin
    perform private.market_purchase_stack_offer_v3(
      v_buyer,v_offer,125,1,7,6,'v9-stack-wrong-type',repeat('d',64));
    raise exception 'resource purchase wrongly accepted exact equipment';
  exception when raise_exception then
    if sqlerrm<>'market_asset_not_eligible' then raise;end if;
  end;
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_seller,v_offer,125,1,6,6,'gear-v9-self',repeat('e',64));
    raise exception 'self-buy of gear was accepted';
  exception when raise_exception then
    if sqlerrm<>'market_self_trade_denied' then raise;end if;
  end;
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_buyer,v_offer,124,1,7,6,'gear-v9-stale-price',repeat('f',64));
    raise exception 'buyer stale price was accepted';
  exception when raise_exception then
    if sqlerrm<>'market_offer_not_available' then raise;end if;
  end;

  -- A missing account Forge ledger would make a paid purchase unclaimable.
  -- Reject before charging Gold, rather than leaving a stranded delivery.
  update public.online_game_states set state=state #- '{account,craftedGearInstances}'
    where account_id=v_buyer;
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_buyer,v_offer,125,1,7,6,'gear-v9-no-ledger',repeat('a',64));
    raise exception 'buyer without Forge ledger was charged';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_buyer_ledger_unavailable' then raise;end if;
  end;
  update public.online_game_states set state=jsonb_set(state,
    '{account,craftedGearInstances}','[]'::jsonb,true) where account_id=v_buyer;
  -- A socket gem whose policy was revoked must halt an outstanding sale.
  update private.market_item_policy_v1 set tradable=false
    where item_id='gem:stat_might:g2';
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_buyer,v_offer,125,1,7,6,'gear-v9-gem-block',repeat('b',64));
    raise exception 'revoked socket gem was sold';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_socket_policy_changed' then raise;end if;
  end;
  update private.market_item_policy_v1 set tradable=true
    where item_id='gem:stat_might:g2';

  -- Buyer already holding the same exact instance ID cannot be charged.
  update public.online_game_states set state=jsonb_set(state,
    '{account,craftedGearInstances}',jsonb_build_array(v_receipt),false)
    where account_id=v_buyer;
  begin
    perform private.market_purchase_equipment_offer_v9(
      v_buyer,v_offer,125,1,7,6,'gear-v9-collision',repeat('b',64));
    raise exception 'buyer identity collision was charged';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_buyer_identity_collision' then raise;end if;
  end;
  update public.online_game_states set state=jsonb_set(state,
    '{account,craftedGearInstances}','[]'::jsonb,false)
    where account_id=v_buyer;

  v_result:=private.market_purchase_equipment_offer_v9(
    v_buyer,v_offer,125,1,7,6,'gear-v9-purchase',repeat('1',64));
  v_delivery:=(v_result->>'deliveryId')::uuid;
  if v_result->>'itemStatus'<>'pending_equipment_delivery'
    or v_result->>'goldSpent'<>'125'
    or v_result->>'instanceId'<>v_instance
    or (select status from private.market_equipment_escrows_v8 where source_hold_id=v_hold)<>'sold'
    or (select status from private.market_sale_offers_v3 where offer_id=v_offer)<>'sold'
    or (select status from private.market_equipment_purchase_deliveries_v9
        where delivery_id=v_delivery)<>'pending'
    or (select receipt_payload from private.market_equipment_purchase_deliveries_v9
        where delivery_id=v_delivery) is distinct from v_receipt
    or (select gold from public.character_wallets where character_id=v_buyer_main)<>375
    or (select gold from public.characters where id=v_buyer_main)<>375
    or (select (state#>>'{character,gold}')::bigint from public.online_game_states
        where account_id=v_buyer)<>375
    or (select gold from public.character_wallets where character_id=v_seller_char)<>225
    or (select gold from public.characters where id=v_seller_char)<>225
    or (select (state#>>'{character,gold}')::bigint from public.online_game_states
        where account_id=v_seller)<>225
    or (select count(*) from private.market_gold_intents_v2 where status='settled')<>1
    or (select count(*) from private.market_purchase_deliveries_v3)<>0
  then raise exception 'equipment purchase did not conserve Forge receipt and Gold';end if;
  v_inbox:=private.market_inbox_snapshot_v4(v_buyer,false,0);
  if (v_inbox->>'pendingCount')::integer<>1
    or v_inbox#>>'{entries,0,kind}'<>'purchased'
    or v_inbox#>>'{entries,0,assetKind}'<>'equipment'
    or v_inbox#>>'{entries,0,deliveryId}'<>v_delivery::text
    or v_inbox#>>'{entries,0,goldChange}'<>'-125'
  then raise exception 'bought equipment not queued in Market Inbox';end if;
  v_inbox:=private.market_inbox_snapshot_v4(v_seller,true,0);
  if v_inbox#>>'{entries,0,kind}'<>'sold'
    or v_inbox#>>'{entries,0,status}'<>'credited'
    or v_inbox#>>'{entries,0,goldChange}'<>'125'
  then raise exception 'seller sold equipment Gold receipt missing';end if;
  v_retry:=private.market_purchase_equipment_offer_v9(
    v_buyer,v_offer,125,1,7,6,'gear-v9-purchase',repeat('1',64));
  if v_retry->>'replayed'<>'true'
    or (select count(*) from private.market_equipment_purchase_deliveries_v9)<>1
  then raise exception 'equipment purchase replay double-charged or duplicated';end if;
  begin
    perform private.market_cancel_equipment_offer_v9(
      v_seller,v_offer,'gear-v9-cancel-sold',repeat('2',64));
    raise exception 'sold Forge copy was returned to seller';
  exception when raise_exception then
    if sqlerrm<>'market_offer_not_cancelable' then raise;end if;
  end;

  -- Claims into full inventory fail without losing the item entitlement.
  begin
    perform private.market_claim_equipment_purchase_v9(
      v_buyer,v_delivery,8,'inventory',v_buyer_main::text,
      'gear-v9-full-inv',repeat('3',64));
    raise exception 'equipment claim bypassed inventory capacity';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_destination_full' then raise;end if;
  end;
  begin
    perform private.market_claim_equipment_purchase_v9(
      v_buyer,v_delivery,8,'equipment_pouch',v_rival_char::text,
      'gear-v9-foreign-char',repeat('4',64));
    raise exception 'another account character accepted for equipment';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_buyer_character_not_owned' then raise;end if;
  end;
  begin
    perform private.market_claim_equipment_purchase_v9(
      v_rival,v_delivery,4,'inventory',v_rival_char::text,
      'gear-v9-foreign-account',repeat('5',64));
    raise exception 'other account claimed equipment';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_delivery_not_owned' then raise;end if;
  end;
  if (select status from private.market_equipment_purchase_deliveries_v9
        where delivery_id=v_delivery)<>'pending'
    or (select revision from public.online_game_states where account_id=v_buyer)<>8
    or (select gold from public.character_wallets where character_id=v_buyer_main)<>375
  then raise exception 'failed buyer claim consumed equipment or moved Gold';end if;

  v_claim:=private.market_claim_equipment_purchase_v9(
    v_buyer,v_delivery,8,'equipment_pouch',v_buyer_alt::text,
    'gear-v9-claim-alt',repeat('6',64));
  v_rebound:=jsonb_set(v_receipt,'{ownerCharacterId}',to_jsonb(v_buyer_alt::text),false);
  if v_claim->>'status'<>'claimed'
    or v_claim->>'buyerCharacterId'<>v_buyer_alt::text
    or (select state#>'{account,craftedGearInstances,0}' from public.online_game_states
         where account_id=v_buyer) is distinct from v_rebound
    or (select state#>'{otherCharacters,0,character,equipmentPouch,stacks,0}'
         from public.online_game_states where account_id=v_buyer) is distinct from v_stack
    or (select state#>'{account,craftedGearInstances}' from public.online_game_states
         where account_id=v_seller)<>'[]'::jsonb
    or (select status from private.market_equipment_purchase_deliveries_v9
         where delivery_id=v_delivery)<>'claimed'
    or (select gold from public.character_wallets where character_id=v_buyer_main)<>375
    or (select gold from public.character_wallets where character_id=v_seller_char)<>225
  then raise exception 'buyer claim changed Forge metadata, sockets or Gold';end if;
  v_inbox:=private.market_inbox_snapshot_v4(v_buyer,true,0);
  if v_inbox#>>'{entries,0,kind}'<>'purchased'
    or v_inbox#>>'{entries,0,status}'<>'claimed'
    or v_inbox#>>'{entries,0,assetKind}'<>'equipment'
  then raise exception 'claimed equipment missing from Market Inbox history';end if;
  v_inbox:=private.market_inbox_snapshot_v4(v_buyer,false,0);
  if (v_inbox->>'pendingCount')::integer<>0
  then raise exception 'equipment claimed twice on Market Inbox';end if;
  v_retry:=private.market_claim_equipment_purchase_v9(
    v_buyer,v_delivery,8,'equipment_pouch',v_buyer_alt::text,
    'gear-v9-claim-alt',repeat('6',64));
  if v_retry->>'replayed'<>'true' then raise exception 'buyer gear claim replay not idempotent';end if;
  begin
    perform private.market_claim_equipment_purchase_v9(
      v_buyer,v_delivery,9,'equipment_pouch',v_buyer_alt::text,
      'gear-v9-claim-twice',repeat('7',64));
    raise exception 'buyer received duplicate Forge gear';
  exception when raise_exception then
    if sqlerrm<>'market_equipment_delivery_already_claimed' then raise;end if;
  end;

  -- Separate unsold listing: seller cancellation returns original copy.
  -- A sold listing can never enter this path.
  update public.online_game_states set state=jsonb_set(
    jsonb_set(state,'{inventory,stacks}',
      (state#>'{inventory,stacks}')||jsonb_build_array(
        jsonb_set(v_stack,'{instanceId}',to_jsonb(v_other_instance),false)),false),
    '{account,craftedGearInstances}',jsonb_build_array(
      jsonb_set(jsonb_set(v_receipt,'{id}',to_jsonb(v_other_instance),false),
        '{sourceReceiptKey}',to_jsonb('craft-v9-second'::text),false)),false)
   where account_id=v_seller;
  v_result:=private.market_reserve_exact_equipment_v8(
    v_seller,7,'inventory',v_seller_char::text,1,v_item,v_other_instance,
    'gear-v9-second-reserve',repeat('8',64));
  v_hold2:=(v_result->>'holdId')::uuid;
  v_result:=private.market_publish_equipment_offer_v9(
    v_seller,v_hold2,75,1,'gear-v9-second-list',repeat('9',64));
  v_offer2:=(v_result->>'offerId')::uuid;
  v_result:=private.market_cancel_equipment_offer_v9(
    v_seller,v_offer2,'gear-v9-second-cancel',repeat('a',64));
  v_return_id:=(v_result->>'returnDeliveryId')::uuid;
  if (select status from private.market_sale_offers_v3 where offer_id=v_offer2)<>'cancelled'
    or (select status from private.market_custody_holds_v1 where hold_id=v_hold2)<>'released'
    or (select status from private.market_equipment_return_deliveries_v8
         where delivery_id=v_return_id)<>'pending'
    or (select count(*) from private.market_equipment_purchase_deliveries_v9)<>1
    or (select gold from public.character_wallets where character_id=v_seller_char)<>225
  then raise exception 'seller cancellation after equipment listing did not preserve custody';end if;
  v_inbox:=private.market_inbox_snapshot_v4(v_seller,false,0);
  if v_inbox#>>'{entries,0,kind}'<>'returned'
    or v_inbox#>>'{entries,0,assetKind}'<>'equipment'
    or v_inbox#>>'{entries,0,deliveryId}'<>v_return_id::text
  then raise exception 'cancelled equipment missing from Market Inbox';end if;
  v_retry:=private.market_cancel_equipment_offer_v9(
    v_seller,v_offer2,'gear-v9-second-cancel',repeat('a',64));
  if v_retry->>'replayed'<>'true'
  then raise exception 'equipment offer cancellation not idempotent';end if;
end
$v9_test$;
select 'PASS: disabled V9 equipment sale, all Gold views, alternate-character receipt rebind, full storage and seller return and Inbox history' as result;
rollback;
