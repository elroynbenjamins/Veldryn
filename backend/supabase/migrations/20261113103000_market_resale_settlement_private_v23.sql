-- Hidden V23b. Separate second-hand Forge settlement and pending buyer claim.
-- Existing first-sale V9/V18/V19/V22 settlement is never rewritten or unlocked.
begin;

create function private.market_purchase_equipment_resale_v23(
 p_buyer_account_id uuid,p_resale_id uuid,p_expected_unit_price bigint,
 p_buyer_expected_revision bigint,p_seller_expected_revision bigint,
 p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $resale_buy$
declare
 v_offer private.market_equipment_resale_offers_v23%rowtype;
 v_p private.market_equipment_provenance_v19%rowtype;
 v_chain private.market_equipment_resale_chain_v23%rowtype;
 v_first private.market_equipment_sale_chain_v22%rowtype;
 v_saved private.market_resale_action_receipts_v23%rowtype;
 v_seller public.online_game_states%rowtype;
 v_buyer public.online_game_states%rowtype;
 v_policy private.market_acquisition_policy_v18%rowtype;
 v_inputs jsonb;
 v_seller_id uuid;
 v_required integer;
 v_floor integer;
 v_premium integer;
 v_xp_text text;
 v_buyer_gold bigint;
 v_seller_gold bigint;
 v_buyer_wallet bigint;
 v_seller_wallet bigint;
 v_buyer_profile bigint;
 v_seller_profile bigint;
 v_gross bigint;
 v_fee bigint;
 v_net bigint;
 v_quote jsonb;
 v_delivery uuid;
 v_result jsonb;
begin
 v_inputs:=pg_catalog.jsonb_build_object('resaleId',p_resale_id,
   'unitPrice',p_expected_unit_price,'buyerRevision',p_buyer_expected_revision,
   'sellerRevision',p_seller_expected_revision);
 if p_buyer_account_id is null or p_resale_id is null or
   p_expected_unit_price is null or p_expected_unit_price not between 1 and 1000000000000
   or p_buyer_expected_revision is null or p_buyer_expected_revision<0
   or p_seller_expected_revision is null or p_seller_expected_revision<0
   or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
   or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'market_resale_invalid_request';end if;
 if not exists(select 1 from private.market_runtime_guard_v1
     where singleton and trading_enabled and snapshot_bridge_ready)
   or not exists(select 1 from private.market_equipment_guard_v8
     where singleton and equipment_transfers_enabled)
 then raise exception 'market_disabled';end if;

 select seller_account_id into v_seller_id
   from private.market_equipment_resale_offers_v23
   where resale_id=p_resale_id;
 if not found then raise exception 'market_resale_not_found';end if;
 if v_seller_id=p_buyer_account_id
 then raise exception 'market_self_trade_denied';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   'party-account:'||least(v_seller_id::text,p_buyer_account_id::text),0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   'party-account:'||greatest(v_seller_id::text,p_buyer_account_id::text),0));
 select * into v_seller from public.online_game_states
   where account_id=v_seller_id for update;
 select * into v_buyer from public.online_game_states
   where account_id=p_buyer_account_id for update;
 if v_seller.state is null or v_buyer.state is null
 then raise exception 'market_state_missing';end if;
 select * into v_saved from private.market_resale_action_receipts_v23
   where actor_account_id=p_buyer_account_id and idempotency_key=p_idempotency_key;
 if found then
   if v_saved.action<>'purchase'
     or v_saved.request_hash<>p_request_hash
     or v_saved.inputs is distinct from v_inputs
   then raise exception 'market_idempotency_conflict';end if;
   return v_saved.result||pg_catalog.jsonb_build_object('replayed',true);
 end if;
 if v_buyer.revision<>p_buyer_expected_revision
   or v_seller.revision<>p_seller_expected_revision
 then raise exception 'market_stale_state';end if;
 select * into v_offer from private.market_equipment_resale_offers_v23
   where resale_id=p_resale_id for update;
 if not found or v_offer.status<>'active' or v_offer.expires_at<=now()
   or v_offer.unit_price<>p_expected_unit_price
   or v_offer.seller_account_id<>v_seller_id
 then raise exception 'market_offer_not_available';end if;
 select * into v_p from private.market_equipment_provenance_v19
   where exact_instance_id=v_offer.exact_instance_id
     and buyer_account_id=v_seller_id
     and status='claimed' and storage_state='resale'
     and source_hold_id=v_offer.first_source_hold_id
     and recipient_character_id=v_offer.seller_character_id
   for update;
 if not found or v_p.item_id<>v_offer.item_id
   or v_p.original_receipt->>'rarity' is distinct from v_offer.receipt_payload->>'rarity'
   or not private.market_resale_absent_from_snapshot_v23(
      v_seller.state,v_offer.exact_instance_id)
 then raise exception 'market_resale_custody_changed';end if;
 select * into v_first from private.market_equipment_sale_chain_v22
   where source_hold_id=v_offer.first_source_hold_id
     and exact_instance_id=v_offer.exact_instance_id;
 if not found then raise exception 'market_resale_history_mismatch';end if;
 select * into v_chain from private.market_equipment_resale_chain_v23
   where exact_instance_id=v_offer.exact_instance_id
   order by sale_ordinal desc limit 1;
 if found then
   if v_offer.last_sale_ordinal<>v_chain.sale_ordinal
      or v_offer.previous_resale_id is distinct from v_chain.resale_id
      or v_chain.buyer_account_id<>v_seller_id
      or v_chain.first_source_hold_id<>v_first.source_hold_id
   then raise exception 'market_resale_history_mismatch';end if;
 else
   if v_offer.last_sale_ordinal<>1 or v_offer.previous_resale_id is not null
     or v_first.buyer_account_id<>v_seller_id
   then raise exception 'market_resale_history_mismatch';end if;
 end if;
 if v_offer.receipt_payload->>'id' is distinct from v_offer.exact_instance_id
   or v_offer.receipt_payload->>'itemId' is distinct from v_offer.item_id
   or v_offer.receipt_payload->>'ownerCharacterId'
      is distinct from v_offer.seller_character_id
   or v_offer.receipt_payload->>'acquireSource' is distinct from 'craft'
   or v_offer.stack_payload->>'instanceId' is distinct from v_offer.exact_instance_id
   or v_offer.stack_payload->>'itemId' is distinct from v_offer.item_id
   or v_offer.stack_payload->>'quantity' is distinct from '1'
   or (v_offer.receipt_payload-'enhancement'-'locked'-'ownerCharacterId')
      is distinct from (v_p.original_receipt-'enhancement'-'locked'-'ownerCharacterId')
 then raise exception 'market_resale_receipt_invalid';end if;
 if not exists(select 1 from private.market_item_policy_v1 p
   where p.item_id=v_offer.item_id and p.asset_kind='equipment'
     and p.tradable and p.binding_policy='unbound')
 then raise exception 'market_item_not_verified';end if;
 if not private.market_offer_price_valid_v10(v_offer.item_id,'equipment',
   pg_catalog.jsonb_build_object('exactReceipt',v_offer.receipt_payload),
   v_offer.unit_price)
 then raise exception 'market_price_out_of_range';end if;
 if (v_offer.receipt_payload#>>'{enhancement,statGemId}' is not null
     and not exists(select 1 from private.market_item_policy_v1 p
       where p.item_id=v_offer.receipt_payload#>>'{enhancement,statGemId}'
         and p.asset_kind='gem' and p.tradable and p.binding_policy='unbound'))
   or (v_offer.receipt_payload#>>'{enhancement,effectGemId}' is not null
     and not exists(select 1 from private.market_item_policy_v1 p
       where p.item_id=v_offer.receipt_payload#>>'{enhancement,effectGemId}'
         and p.asset_kind='gem' and p.tradable and p.binding_policy='unbound'))
 then raise exception 'market_equipment_socket_policy_changed';end if;
 select * into v_policy from private.market_acquisition_policy_v18 p
   where p.item_id=v_offer.item_id and p.asset_kind='equipment'
     and p.approved and p.catalog_revision=33 for share;
 if not found then raise exception 'market_item_policy_unapproved';end if;
 v_floor:=case v_policy.source_tier
   when 'T1' then 6 when 'T2' then 18
   when 'T3' then 30 when 'T4' then 52 else null end;
 v_premium:=case v_offer.receipt_payload->>'rarity'
   when 'common' then 0 when 'uncommon' then 0
   when 'rare' then 2 when 'epic' then 4
   when 'legendary' then 6 when 'mythic' then 8 else null end;
 if v_floor is null or v_premium is null
 then raise exception 'market_tier_not_approved';end if;
 v_required:=greatest(v_floor,v_policy.item_required_level)+v_premium;
 if v_buyer.character_id is null or v_seller.character_id is null
   or v_buyer.state#>>'{character,id}' is distinct from v_buyer.character_id::text
   or v_seller.state#>>'{character,id}' is distinct from v_seller.character_id::text
   or v_buyer.state#>>'{character,classId}' is distinct from v_policy.required_class_id
   or not exists(select 1 from public.characters c
     where c.id=v_buyer.character_id and c.account_id=p_buyer_account_id
       and c.class_id::text=v_policy.required_class_id)
 then raise exception 'market_class_required';end if;
 if pg_catalog.jsonb_typeof(v_buyer.state#>'{character,xp}') is distinct from 'number'
   or coalesce(v_buyer.state#>>'{character,xp}','') !~ '^[0-9]{1,16}$'
   or (v_buyer.state#>>'{character,xp}')::numeric>9007199254740991
 then raise exception 'market_character_xp_invalid';end if;
 v_xp_text:=v_buyer.state#>>'{character,xp}';
 if private.market_character_level_from_xp_v18(v_xp_text::bigint)<v_required
 then raise exception 'market_level_required';end if;
 if not private.market_resale_absent_from_snapshot_v23(
   v_buyer.state,v_offer.exact_instance_id)
   or pg_catalog.jsonb_typeof(v_buyer.state#>'{account,craftedGearInstances}')<>'array'
   or pg_catalog.jsonb_array_length(v_buyer.state#>'{account,craftedGearInstances}')>=500
 then raise exception 'market_equipment_buyer_identity_collision';end if;

 if pg_catalog.jsonb_typeof(v_buyer.state#>'{character,gold}')<>'number'
   or pg_catalog.jsonb_typeof(v_seller.state#>'{character,gold}')<>'number'
   or coalesce(v_buyer.state#>>'{character,gold}','') !~ '^[0-9]{1,16}$'
   or coalesce(v_seller.state#>>'{character,gold}','') !~ '^[0-9]{1,16}$'
 then raise exception 'market_wallet_identity_unverified';end if;
 v_buyer_gold:=(v_buyer.state#>>'{character,gold}')::bigint;
 v_seller_gold:=(v_seller.state#>>'{character,gold}')::bigint;
 select gold into v_buyer_wallet from public.character_wallets
   where character_id=v_buyer.character_id for update;
 if not found then raise exception 'market_buyer_wallet_missing';end if;
 select gold into v_seller_wallet from public.character_wallets
   where character_id=v_seller.character_id for update;
 if not found then raise exception 'market_seller_wallet_missing';end if;
 select gold into v_buyer_profile from public.characters
   where id=v_buyer.character_id and account_id=p_buyer_account_id for update;
 if not found then raise exception 'market_buyer_character_not_owned';end if;
 select gold into v_seller_profile from public.characters
   where id=v_seller.character_id and account_id=v_seller_id for update;
 if not found then raise exception 'market_seller_character_not_owned';end if;
 if v_buyer_gold is distinct from v_buyer_wallet
   or v_buyer_gold is distinct from v_buyer_profile
   or v_seller_gold is distinct from v_seller_wallet
   or v_seller_gold is distinct from v_seller_profile
   or v_buyer_gold>9007199254740991
   or v_seller_gold>9007199254740991
 then raise exception 'market_wallet_not_reconciled';end if;
 v_gross:=v_offer.unit_price;
 v_quote:=private.market_sale_tax_quote_v11(v_gross);
 if v_quote->>'valid'<>'true'
 then raise exception 'market_tax_quote_invalid';end if;
 v_fee:=(v_quote->>'feeGold')::bigint;
 v_net:=(v_quote->>'sellerGold')::bigint;
 if v_buyer_gold<v_gross then raise exception 'market_insufficient_gold';end if;
 if v_seller_gold>9007199254740991-v_net
 then raise exception 'market_seller_gold_overflow';end if;

 insert into private.market_resale_gold_intents_v23(
   resale_id,buyer_account_id,seller_account_id,
   buyer_character_id,seller_character_id,gross_gold,fee_gold,seller_payout_gold)
 values(p_resale_id,p_buyer_account_id,v_seller_id,
   v_buyer.character_id,v_seller.character_id,v_gross,v_fee,v_net);
 insert into private.market_equipment_resale_chain_v23(
   resale_id,first_source_hold_id,previous_resale_id,sale_ordinal,
   exact_instance_id,seller_account_id,buyer_account_id,buyer_character_id,
   item_id,receipt_payload,gross_gold,fee_gold,seller_payout_gold)
 values(p_resale_id,v_first.source_hold_id,v_offer.previous_resale_id,
   v_offer.last_sale_ordinal+1,v_offer.exact_instance_id,
   v_seller_id,p_buyer_account_id,v_buyer.character_id,
   v_offer.item_id,v_offer.receipt_payload,v_gross,v_fee,v_net);
 insert into private.market_equipment_resale_deliveries_v23(
   resale_id,exact_instance_id,item_id,buyer_account_id,seller_account_id,
   buyer_character_id,stack_payload,receipt_payload)
 values(p_resale_id,v_offer.exact_instance_id,v_offer.item_id,
   p_buyer_account_id,v_seller_id,v_buyer.character_id,
   v_offer.stack_payload,v_offer.receipt_payload)
 returning delivery_id into v_delivery;
 update private.market_equipment_resale_offers_v23
   set status='sold',sold_at=now()
   where resale_id=p_resale_id and status='active';
 if not found then raise exception 'market_offer_not_available';end if;
 update private.market_equipment_provenance_v19
   set buyer_account_id=p_buyer_account_id,
       buyer_character_id=v_buyer.character_id,
       required_class_id=v_policy.required_class_id,
       required_character_level=v_required,
       status='pending',storage_state='character',
       recipient_character_id=null,claimed_at=null,acquired_at=now()
   where exact_instance_id=v_offer.exact_instance_id
     and buyer_account_id=v_seller_id and status='claimed' and storage_state='resale';
 if not found then raise exception 'market_resale_custody_changed';end if;

 update public.character_wallets
   set gold=v_buyer_gold-v_gross,updated_at=now()
   where character_id=v_buyer.character_id and gold=v_buyer_gold;
 if not found then raise exception 'market_buyer_wallet_changed';end if;
 update public.character_wallets
   set gold=v_seller_gold+v_net,updated_at=now()
   where character_id=v_seller.character_id and gold=v_seller_gold;
 if not found then raise exception 'market_seller_wallet_changed';end if;
 update public.characters
   set gold=v_buyer_gold-v_gross,updated_at=now()
   where id=v_buyer.character_id and account_id=p_buyer_account_id;
 if not found then raise exception 'market_buyer_character_not_owned';end if;
 update public.characters
   set gold=v_seller_gold+v_net,updated_at=now()
   where id=v_seller.character_id and account_id=v_seller_id;
 if not found then raise exception 'market_seller_character_not_owned';end if;
 update public.online_game_states
   set state=pg_catalog.jsonb_set(v_buyer.state,'{character,gold}',
     pg_catalog.to_jsonb(v_buyer_gold-v_gross),false),
     revision=v_buyer.revision+1,updated_at=now()
   where account_id=p_buyer_account_id and revision=v_buyer.revision;
 if not found then raise exception 'market_buyer_state_changed';end if;
 update public.online_game_states
   set state=pg_catalog.jsonb_set(v_seller.state,'{character,gold}',
     pg_catalog.to_jsonb(v_seller_gold+v_net),false),
     revision=v_seller.revision+1,updated_at=now()
   where account_id=v_seller_id and revision=v_seller.revision;
 if not found then raise exception 'market_seller_state_changed';end if;
 v_result:=pg_catalog.jsonb_build_object(
   'resaleId',p_resale_id,'deliveryId',v_delivery,
   'instanceId',v_offer.exact_instance_id,'saleOrdinal',v_offer.last_sale_ordinal+1,
   'goldSpent',v_gross,'sellerGoldReceived',v_net,
   'feeGold',v_fee,'buyerRevision',v_buyer.revision+1,
   'sellerRevision',v_seller.revision+1,'status','pending_delivery',
   'replayed',false);
 insert into private.market_resale_action_receipts_v23(
   actor_account_id,idempotency_key,request_hash,action,inputs,result)
 values(p_buyer_account_id,p_idempotency_key,p_request_hash,'purchase',v_inputs,v_result);
 return v_result;
end;
$resale_buy$;
revoke all on function private.market_purchase_equipment_resale_v23(
 uuid,uuid,bigint,bigint,bigint,text,text)
 from public,anon,authenticated,service_role;

create function private.market_claim_equipment_resale_v23(
 p_buyer_account_id uuid,p_delivery_id uuid,p_expected_revision bigint,
 p_holder text,p_location text,p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $resale_claim$
declare
 v_game public.online_game_states%rowtype;
 v_delivery private.market_equipment_resale_deliveries_v23%rowtype;
 v_offer private.market_equipment_resale_offers_v23%rowtype;
 v_p private.market_equipment_provenance_v19%rowtype;
 v_chain private.market_equipment_resale_chain_v23%rowtype;
 v_saved private.market_resale_action_receipts_v23%rowtype;
 v_inputs jsonb;
 v_dest jsonb;
 v_other jsonb;
 v_found integer:=0;
 v_level integer;
 v_path text[];
 v_stack_path text[];
 v_stacks jsonb;
 v_capacity bigint;
 v_new jsonb;
 v_receipt jsonb;
 v_result jsonb;
begin
 v_inputs:=pg_catalog.jsonb_build_object('deliveryId',p_delivery_id,
   'revision',p_expected_revision,'holder',p_holder,'location',p_location);
 if p_buyer_account_id is null or p_delivery_id is null
   or p_expected_revision is null or p_expected_revision<0
   or p_holder is null or length(p_holder)=0
   or p_location is null or p_location not in ('inventory','equipment_pouch')
   or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
   or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'market_resale_invalid_request';end if;
 if not exists(select 1 from private.market_runtime_guard_v1
     where singleton and trading_enabled and snapshot_bridge_ready)
   or not exists(select 1 from private.market_equipment_guard_v8
     where singleton and equipment_transfers_enabled)
 then raise exception 'market_disabled';end if;
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('party-account:'||p_buyer_account_id::text,0));
 select * into v_game from public.online_game_states
   where account_id=p_buyer_account_id for update;
 if not found then raise exception 'market_state_missing';end if;
 select * into v_saved from private.market_resale_action_receipts_v23
   where actor_account_id=p_buyer_account_id and idempotency_key=p_idempotency_key;
 if found then
   if v_saved.action<>'claim' or v_saved.request_hash<>p_request_hash
     or v_saved.inputs is distinct from v_inputs
   then raise exception 'market_idempotency_conflict';end if;
   return v_saved.result||pg_catalog.jsonb_build_object('replayed',true);
 end if;
 if v_game.revision<>p_expected_revision then raise exception 'market_stale_state';end if;
 select * into v_delivery from private.market_equipment_resale_deliveries_v23
   where delivery_id=p_delivery_id and buyer_account_id=p_buyer_account_id for update;
 if not found then raise exception 'market_resale_delivery_not_owned';end if;
 if v_delivery.status<>'pending'
 then raise exception 'market_resale_delivery_already_claimed';end if;
 select * into v_offer from private.market_equipment_resale_offers_v23
   where resale_id=v_delivery.resale_id and status='sold';
 select * into v_chain from private.market_equipment_resale_chain_v23
   where resale_id=v_delivery.resale_id and buyer_account_id=p_buyer_account_id;
 select * into v_p from private.market_equipment_provenance_v19
   where exact_instance_id=v_delivery.exact_instance_id
     and buyer_account_id=p_buyer_account_id and status='pending'
     and storage_state='character' for update;
 if v_offer.resale_id is null or v_chain.resale_id is null
   or v_p.exact_instance_id is null
   or v_offer.seller_account_id<>v_delivery.seller_account_id
   or v_p.buyer_character_id<>v_delivery.buyer_character_id
   or v_chain.exact_instance_id<>v_delivery.exact_instance_id
   or v_chain.item_id<>v_delivery.item_id
   or v_chain.receipt_payload is distinct from v_delivery.receipt_payload
   or v_offer.receipt_payload is distinct from v_delivery.receipt_payload
   or v_offer.stack_payload is distinct from v_delivery.stack_payload
 then raise exception 'market_resale_delivery_ledger_mismatch';end if;
 if v_game.state#>>'{character,id}'=p_holder then
   v_found:=v_found+1;v_dest:=v_game.state->'character';end if;
 for v_other in select value from pg_catalog.jsonb_array_elements(
   case when pg_catalog.jsonb_typeof(v_game.state->'otherCharacters')='array'
   then v_game.state->'otherCharacters' else '[]'::jsonb end)
 loop
   if v_other#>>'{character,id}'=p_holder then
     v_found:=v_found+1;v_dest:=v_other->'character';end if;
 end loop;
 if v_found<>1 or v_dest->>'classId' is distinct from v_p.required_class_id
   or not exists(select 1 from public.characters c
     where c.id::text=p_holder and c.account_id=p_buyer_account_id
       and c.class_id::text=v_p.required_class_id)
 then raise exception 'market_class_or_recipient_required';end if;
 if pg_catalog.jsonb_typeof(v_dest->'xp') is distinct from 'number'
   or coalesce(v_dest->>'xp','') !~ '^[0-9]{1,16}$'
   or (v_dest->>'xp')::numeric>9007199254740991
 then raise exception 'market_character_xp_invalid';end if;
 v_level:=private.market_character_level_from_xp_v18((v_dest->>'xp')::bigint);
 if v_level<v_p.required_character_level
 then raise exception 'market_level_required';end if;
 if not private.market_resale_absent_from_snapshot_v23(
   v_game.state,v_delivery.exact_instance_id)
   or pg_catalog.jsonb_typeof(v_game.state#>'{account,craftedGearInstances}')<>'array'
   or pg_catalog.jsonb_array_length(v_game.state#>'{account,craftedGearInstances}')>=500
 then raise exception 'market_equipment_destination_identity_conflict';end if;
 v_path:=private.market_source_stack_path_v2(
   v_game.state,p_location,p_holder,0);
 if v_path is null then raise exception 'market_resale_destination_invalid';end if;
 v_stack_path:=v_path[1:pg_catalog.array_length(v_path,1)-1];
 v_stacks:=v_game.state#>v_stack_path;
 if pg_catalog.jsonb_typeof(v_stacks) is distinct from 'array'
 then raise exception 'market_resale_destination_invalid';end if;
 v_capacity:=(v_game.state#>>(
   v_stack_path[1:pg_catalog.array_length(v_stack_path,1)-1]||array['capacity']))::bigint;
 if v_capacity is null or v_capacity<1 or v_capacity>1000
 then raise exception 'market_equipment_capacity_unverified';end if;
 if pg_catalog.jsonb_array_length(v_stacks)>=v_capacity
 then raise exception 'market_equipment_destination_full';end if;
 if v_delivery.stack_payload->>'itemId' is distinct from v_delivery.item_id
   or v_delivery.stack_payload->>'instanceId' is distinct from v_delivery.exact_instance_id
   or v_delivery.stack_payload->>'quantity' is distinct from '1'
   or v_delivery.receipt_payload->>'itemId' is distinct from v_delivery.item_id
   or v_delivery.receipt_payload->>'id' is distinct from v_delivery.exact_instance_id
   or v_delivery.receipt_payload->>'ownerCharacterId'
     is distinct from v_offer.seller_character_id
   or (v_delivery.receipt_payload-'enhancement'-'locked'-'ownerCharacterId')
     is distinct from (v_p.original_receipt-'enhancement'-'locked'-'ownerCharacterId')
 then raise exception 'market_resale_delivery_ledger_mismatch';end if;
 v_receipt:=pg_catalog.jsonb_set(v_delivery.receipt_payload,
   '{ownerCharacterId}',pg_catalog.to_jsonb(p_holder),false);
 v_new:=pg_catalog.jsonb_set(v_game.state,v_stack_path,
   v_stacks||pg_catalog.jsonb_build_array(v_delivery.stack_payload),false);
 v_new:=pg_catalog.jsonb_set(v_new,'{account,craftedGearInstances}',
   (v_game.state#>'{account,craftedGearInstances}')
   ||pg_catalog.jsonb_build_array(v_receipt),false);
 update private.market_equipment_provenance_v19
   set status='claimed',recipient_character_id=p_holder,claimed_at=now()
   where exact_instance_id=v_delivery.exact_instance_id
     and buyer_account_id=p_buyer_account_id and status='pending';
 if not found then raise exception 'market_resale_delivery_ledger_mismatch';end if;
 update public.online_game_states
   set state=v_new,revision=v_game.revision+1,updated_at=now()
   where account_id=p_buyer_account_id and revision=v_game.revision;
 if not found then raise exception 'market_stale_state';end if;
 update private.market_equipment_resale_deliveries_v23
   set status='claimed',claimed_at=now(),destination_character_id=p_holder
   where delivery_id=p_delivery_id and status='pending';
 if not found then raise exception 'market_resale_delivery_already_claimed';end if;
 v_result:=pg_catalog.jsonb_build_object(
   'deliveryId',p_delivery_id,'resaleId',v_delivery.resale_id,
   'instanceId',v_delivery.exact_instance_id,'status','claimed',
   'destinationCharacterId',p_holder,'newRevision',v_game.revision+1,
   'replayed',false);
 insert into private.market_resale_action_receipts_v23(
   actor_account_id,idempotency_key,request_hash,action,inputs,result)
 values(p_buyer_account_id,p_idempotency_key,p_request_hash,'claim',v_inputs,v_result);
 return v_result;
end;
$resale_claim$;
revoke all on function private.market_claim_equipment_resale_v23(
 uuid,uuid,bigint,text,text,text,text)
 from public,anon,authenticated,service_role;

commit;
