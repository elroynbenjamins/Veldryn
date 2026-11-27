-- Hidden V23a. Dedicated second-hand Forge custody; V1/V8 lifetime
-- escrow uniqueness and original V9 settlement remain unchanged.
begin;

alter table private.market_equipment_provenance_v19
 drop constraint if exists market_equipment_provenance_v19_storage_state_check;
alter table private.market_equipment_provenance_v19
 add constraint market_equipment_resale_storage_v23
 check(storage_state in ('character','bank','resale'));

create table private.market_equipment_resale_offers_v23 (
 resale_id uuid primary key default pg_catalog.gen_random_uuid(),
 exact_instance_id text not null check(length(exact_instance_id) between 1 and 180),
 first_source_hold_id uuid not null references
   private.market_equipment_sale_chain_v22(source_hold_id) on delete restrict,
 previous_resale_id uuid,
 last_sale_ordinal integer not null check(last_sale_ordinal between 1 and 99),
 seller_account_id uuid not null references public.online_game_states(account_id) on delete restrict,
 seller_character_id text not null,
 item_id text not null,
 source_location text not null check(source_location in ('inventory','equipment_pouch')),
 source_index integer not null check(source_index between 0 and 10000),
 source_revision bigint not null check(source_revision>=0),
 receipt_payload jsonb not null check(pg_catalog.jsonb_typeof(receipt_payload)='object'),
 stack_payload jsonb not null check(pg_catalog.jsonb_typeof(stack_payload)='object'),
 unit_price bigint not null check(unit_price between 1 and 1000000000000),
 status text not null default 'active'
   check(status in ('active','return_pending','returned','sold')),
 expires_at timestamptz not null default(now()+interval '7 days'),
 created_at timestamptz not null default now(),
 cancelled_at timestamptz,
 sold_at timestamptz,
 returned_at timestamptz,
 constraint market_resale_status_times_v23 check(
  (status='active' and cancelled_at is null and sold_at is null and returned_at is null)
  or (status='return_pending' and cancelled_at is not null and sold_at is null and returned_at is null)
  or (status='returned' and cancelled_at is not null and sold_at is null and returned_at is not null)
  or (status='sold' and cancelled_at is null and sold_at is not null and returned_at is null)
 )
);
create unique index market_resale_one_open_copy_v23
 on private.market_equipment_resale_offers_v23(exact_instance_id)
 where status in ('active','return_pending');
create index market_resale_seller_status_v23
 on private.market_equipment_resale_offers_v23(seller_account_id,status,created_at desc);
alter table private.market_equipment_resale_offers_v23 enable row level security;
revoke all on private.market_equipment_resale_offers_v23
 from public,anon,authenticated,service_role;

-- The first sale stays in V22. These rows append later successful sales
-- without weakening the old lifetime-unique original escrow indexes.
create table private.market_equipment_resale_chain_v23 (
 resale_id uuid primary key references private.market_equipment_resale_offers_v23(resale_id)
   on delete restrict,
 first_source_hold_id uuid not null references
   private.market_equipment_sale_chain_v22(source_hold_id) on delete restrict,
 previous_resale_id uuid references
   private.market_equipment_resale_chain_v23(resale_id) on delete restrict,
 sale_ordinal integer not null check(sale_ordinal between 2 and 100),
 exact_instance_id text not null check(length(exact_instance_id) between 1 and 180),
 seller_account_id uuid not null references public.online_game_states(account_id) on delete restrict,
 buyer_account_id uuid not null references public.online_game_states(account_id) on delete restrict,
 buyer_character_id uuid not null,
 item_id text not null,
 receipt_payload jsonb not null check(pg_catalog.jsonb_typeof(receipt_payload)='object'),
 gross_gold bigint not null check(gross_gold between 1 and 1000000000000000),
 fee_gold bigint not null check(fee_gold between 1 and 999999999999999),
 seller_payout_gold bigint not null check(seller_payout_gold>0),
 recorded_at timestamptz not null default now(),
 unique(exact_instance_id,sale_ordinal),
 unique(previous_resale_id),
 check(gross_gold=fee_gold+seller_payout_gold and seller_account_id<>buyer_account_id),
 check((sale_ordinal=2 and previous_resale_id is null) or
       (sale_ordinal>2 and previous_resale_id is not null))
);
create index market_resale_chain_by_instance_v23
 on private.market_equipment_resale_chain_v23(exact_instance_id,sale_ordinal desc);
alter table private.market_equipment_resale_chain_v23 enable row level security;
revoke all on private.market_equipment_resale_chain_v23
 from public,anon,authenticated,service_role;

create table private.market_equipment_resale_deliveries_v23 (
 delivery_id uuid primary key default pg_catalog.gen_random_uuid(),
 resale_id uuid not null unique references
   private.market_equipment_resale_offers_v23(resale_id) on delete restrict,
 exact_instance_id text not null,
 item_id text not null,
 buyer_account_id uuid not null references public.online_game_states(account_id) on delete restrict,
 seller_account_id uuid not null references public.online_game_states(account_id) on delete restrict,
 buyer_character_id uuid not null,
 stack_payload jsonb not null check(pg_catalog.jsonb_typeof(stack_payload)='object'),
 receipt_payload jsonb not null check(pg_catalog.jsonb_typeof(receipt_payload)='object'),
 status text not null default 'pending' check(status in ('pending','claimed')),
 created_at timestamptz not null default now(),
 claimed_at timestamptz,
 destination_character_id text,
 constraint market_resale_delivery_state_v23 check(
  (status='pending' and claimed_at is null and destination_character_id is null)
  or (status='claimed' and claimed_at is not null and destination_character_id is not null))
);
alter table private.market_equipment_resale_deliveries_v23 enable row level security;
revoke all on private.market_equipment_resale_deliveries_v23
 from public,anon,authenticated,service_role;

create table private.market_resale_gold_intents_v23 (
 resale_id uuid primary key references private.market_equipment_resale_offers_v23(resale_id)
   on delete restrict,
 buyer_account_id uuid not null references public.online_game_states(account_id) on delete restrict,
 seller_account_id uuid not null references public.online_game_states(account_id) on delete restrict,
 buyer_character_id uuid not null,
 seller_character_id uuid not null,
 gross_gold bigint not null check(gross_gold between 1 and 1000000000000000),
 fee_gold bigint not null check(fee_gold>0),
 seller_payout_gold bigint not null check(seller_payout_gold>0),
 created_at timestamptz not null default now(),
 check(gross_gold=fee_gold+seller_payout_gold),
 check(buyer_account_id<>seller_account_id)
);
alter table private.market_resale_gold_intents_v23 enable row level security;
revoke all on private.market_resale_gold_intents_v23
 from public,anon,authenticated,service_role;

-- Historical chain and settlement/delivery receipts are append-only.
create function private.market_block_resale_audit_mutation_v23()
returns trigger language plpgsql volatile security invoker set search_path=''
as $resale_audit_nochange$
begin
 raise exception 'market_resale_audit_immutable';
end;
$resale_audit_nochange$;
revoke all on function private.market_block_resale_audit_mutation_v23()
 from public,anon,authenticated,service_role;
create trigger market_resale_chain_immutable_v23
 before update or delete on private.market_equipment_resale_chain_v23
 for each row execute function private.market_block_resale_audit_mutation_v23();
create trigger market_resale_gold_immutable_v23
 before update or delete on private.market_resale_gold_intents_v23
 for each row execute function private.market_block_resale_audit_mutation_v23();

create table private.market_resale_action_receipts_v23 (
 actor_account_id uuid not null references public.online_game_states(account_id) on delete restrict,
 idempotency_key text not null check(idempotency_key ~ '^[A-Za-z0-9_-]{8,128}$'),
 request_hash text not null check(request_hash ~ '^[a-f0-9]{64}$'),
 action text not null check(action in ('reserve','cancel','return','purchase','claim')),
 inputs jsonb not null check(pg_catalog.jsonb_typeof(inputs)='object'),
 result jsonb not null check(pg_catalog.jsonb_typeof(result)='object'),
 created_at timestamptz not null default now(),
 primary key(actor_account_id,idempotency_key)
);
alter table private.market_resale_action_receipts_v23 enable row level security;
revoke all on private.market_resale_action_receipts_v23
 from public,anon,authenticated,service_role;

create function private.market_resale_absent_from_snapshot_v23(
 p_state jsonb,p_instance text
) returns boolean
language sql immutable security invoker set search_path=''
as $resale_absent$
 select p_state is not null and p_instance is not null
   and not pg_catalog.jsonb_path_exists(p_state,
    '$.**.stacks[*] ? (@.instanceId == $id)',
    pg_catalog.jsonb_build_object('id',p_instance))
   and not pg_catalog.jsonb_path_exists(p_state,
    '$.**.equipmentInstanceIds.* ? (@ == $id)',
    pg_catalog.jsonb_build_object('id',p_instance))
   and not exists(select 1 from pg_catalog.jsonb_array_elements(
     case when pg_catalog.jsonb_typeof(p_state#>'{account,craftedGearInstances}')='array'
     then p_state#>'{account,craftedGearInstances}' else '[]'::jsonb end) e(value)
     where e.value->>'id'=p_instance);
$resale_absent$;
revoke all on function private.market_resale_absent_from_snapshot_v23(jsonb,text)
 from public,anon,authenticated,service_role;

-- The private online snapshot trigger checks full strict copy conservation:
-- a purchased copy must be in the validated owner, a validated bank, or
-- a verified, uniquely active/return-pending resale custody record.
create or replace function private.market_guard_owned_equipment_snapshot_v19()
returns trigger language plpgsql volatile security definer set search_path=''
as $market_saved_provenance$
declare
  v_p private.market_equipment_provenance_v19%rowtype;
  v_valid boolean;
begin
  for v_p in select * from private.market_equipment_provenance_v19 p
    where p.buyer_account_id=new.account_id and p.status='claimed'
  loop
    if v_p.storage_state='character' then
      v_valid:=private.market_owned_copy_valid_v19(
        new.state,v_p.recipient_character_id,v_p.exact_instance_id,
        v_p.item_id,v_p.original_receipt);
    elsif v_p.storage_state='bank' then
      v_valid:=private.market_owned_banked_copy_valid_v21(
        new.state,v_p.recipient_character_id,v_p.exact_instance_id,
        v_p.item_id,v_p.original_receipt);
    elsif v_p.storage_state='resale' then
      v_valid:=private.market_resale_absent_from_snapshot_v23(
        new.state,v_p.exact_instance_id)
        and (select count(*) from private.market_equipment_resale_offers_v23 o
          where o.exact_instance_id=v_p.exact_instance_id
            and o.seller_account_id=new.account_id
            and o.seller_character_id=v_p.recipient_character_id
            and o.first_source_hold_id=v_p.source_hold_id
            and o.item_id=v_p.item_id
            and o.status in ('active','return_pending'))=1;
    else v_valid:=false;end if;
    if v_valid is distinct from true
    then raise exception 'market_equipment_provenance_transfer_blocked';end if;
  end loop;
  -- Only V23 pending resales require zero copies before their private
  -- claim; V9 original delivery's pending->claimed transition is unchanged.
  for v_p in select p.* from private.market_equipment_provenance_v19 p
    join private.market_equipment_resale_deliveries_v23 d
      on d.exact_instance_id=p.exact_instance_id
      and d.buyer_account_id=p.buyer_account_id and d.status='pending'
    where p.buyer_account_id=new.account_id and p.status='pending'
  loop
    if not private.market_resale_absent_from_snapshot_v23(
      new.state,v_p.exact_instance_id)
    then raise exception 'market_resale_pending_copy_injected';end if;
  end loop;
  return new;
end;
$market_saved_provenance$;
revoke all on function private.market_guard_owned_equipment_snapshot_v19()
 from public,anon,authenticated,service_role;

create function private.market_reserve_equipment_resale_v23(
 p_account_id uuid,p_expected_revision bigint,p_instance_id text,
 p_holder text,p_location text,p_index integer,p_unit_price bigint,
 p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $resale_reserve$
declare
 v_game public.online_game_states%rowtype;
 v_p private.market_equipment_provenance_v19%rowtype;
 v_last private.market_equipment_resale_chain_v23%rowtype;
 v_first private.market_equipment_sale_chain_v22%rowtype;
 v_saved private.market_resale_action_receipts_v23%rowtype;
 v_inputs jsonb;
 v_path text[];
 v_stacks jsonb;
 v_stack jsonb;
 v_ledger jsonb;
 v_receipt jsonb;
 v_remaining jsonb;
 v_new jsonb;
 v_ord integer;
 v_prev uuid;
 v_offer_id uuid;
 v_result jsonb;
begin
 v_inputs:=pg_catalog.jsonb_build_object('instanceId',p_instance_id,
   'revision',p_expected_revision,'holder',p_holder,'location',p_location,
   'index',p_index,'unitPrice',p_unit_price);
 if p_account_id is null or p_expected_revision is null or p_expected_revision<0
   or p_instance_id is null or length(p_instance_id) not between 1 and 180
   or p_holder is null or length(p_holder)=0 or p_location is null
   or p_location not in ('inventory','equipment_pouch')
   or p_index is null or p_index not between 0 and 10000
   or p_unit_price is null or p_unit_price not between 1 and 1000000000000
   or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
   or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'market_resale_invalid_request';end if;
 if not exists(select 1 from private.market_runtime_guard_v1
    where singleton and trading_enabled and snapshot_bridge_ready)
    or not exists(select 1 from private.market_equipment_guard_v8
    where singleton and equipment_transfers_enabled)
 then raise exception 'market_disabled';end if;
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('party-account:'||p_account_id::text,0));
 select * into v_game from public.online_game_states
    where account_id=p_account_id for update;
 if not found then raise exception 'market_state_missing';end if;
 select * into v_saved from private.market_resale_action_receipts_v23
   where actor_account_id=p_account_id and idempotency_key=p_idempotency_key;
 if found then
   if v_saved.action<>'reserve' or v_saved.inputs is distinct from v_inputs
     or v_saved.request_hash<>p_request_hash
   then raise exception 'market_idempotency_conflict';end if;
   return v_saved.result||pg_catalog.jsonb_build_object('replayed',true);
 end if;
 if v_game.revision<>p_expected_revision
 then raise exception 'market_stale_state';end if;
 select * into v_p from private.market_equipment_provenance_v19 p
   where p.exact_instance_id=p_instance_id and p.buyer_account_id=p_account_id
     and p.recipient_character_id=p_holder and p.status='claimed'
     and p.storage_state='character' for update;
 if not found then raise exception 'market_resale_not_owned';end if;
 if not exists(select 1 from private.market_item_policy_v1 p
   where p.item_id=v_p.item_id and p.asset_kind='equipment'
     and p.tradable and p.binding_policy='unbound')
 then raise exception 'market_equipment_not_tradable';end if;
 if not private.market_owned_copy_valid_v19(
   v_game.state,p_holder,p_instance_id,v_p.item_id,v_p.original_receipt)
 then raise exception 'market_resale_source_identity_invalid';end if;
 if not exists(select 1 from public.characters c
   where c.account_id=p_account_id and c.id::text=p_holder)
 then raise exception 'market_resale_not_owned';end if;
 select * into v_first from private.market_equipment_sale_chain_v22
   where source_hold_id=v_p.source_hold_id and exact_instance_id=p_instance_id
     and item_id=v_p.item_id;
 if not found then raise exception 'market_resale_history_mismatch';end if;
 select * into v_last from private.market_equipment_resale_chain_v23
   where exact_instance_id=p_instance_id order by sale_ordinal desc limit 1;
 v_ord:=case when found then v_last.sale_ordinal else 1 end;
 v_prev:=case when v_ord=1 then null else v_last.resale_id end;
 if v_ord>=99
   or (v_ord=1 and v_first.buyer_account_id<>p_account_id)
   or (v_ord>1 and (v_last.buyer_account_id<>p_account_id
       or v_last.first_source_hold_id<>v_first.source_hold_id))
 then raise exception 'market_resale_history_mismatch';end if;
 if exists(select 1 from private.market_equipment_resale_offers_v23 o
    where o.exact_instance_id=p_instance_id and o.status in ('active','return_pending'))
 then raise exception 'market_resale_escrow_already_open';end if;
 -- A resale consumes the same global listing allowance as ordinary Market
 -- offers: sellers may not bypass the existing twenty-open-offer cap by
 -- splitting listings between the V9 and versioned-resale ledgers.
 if (select count(*) from private.market_sale_offers_v3 o
     where o.seller_account_id=p_account_id and o.status='active')
    +(select count(*) from private.market_equipment_resale_offers_v23 o
     where o.seller_account_id=p_account_id
       and o.status in ('active','return_pending'))>=20
 then raise exception 'market_offer_limit_reached';end if;
 v_path:=private.market_source_stack_path_v2(
   v_game.state,p_location,p_holder,p_index);
 v_stack:=v_game.state#>v_path;
 if v_path is null or v_stack->>'instanceId' is distinct from p_instance_id
   or v_stack->>'itemId' is distinct from v_p.item_id
   or v_stack->>'quantity' is distinct from '1'
   or exists(select 1 from pg_catalog.jsonb_object_keys(
     case when pg_catalog.jsonb_typeof(v_stack)='object' then v_stack
       else '{}'::jsonb end) k(key)
     where k.key not in ('itemId','instanceId','quantity'))
 then raise exception 'market_resale_source_location_invalid';end if;
 v_ledger:=v_game.state#>'{account,craftedGearInstances}';
 select e.value into v_receipt from pg_catalog.jsonb_array_elements(v_ledger) e(value)
   where e.value->>'id'=p_instance_id;
 if v_receipt->>'itemId' is distinct from v_p.item_id
   or v_receipt->>'ownerCharacterId' is distinct from p_holder
   or v_receipt->>'acquireSource' is distinct from 'craft'
   or nullif(v_receipt->>'sourceReceiptKey','') is null
   or v_receipt->>'locked'='true'
 then raise exception 'market_resale_receipt_invalid';end if;
 if not private.market_offer_price_valid_v10(
   v_p.item_id,'equipment',pg_catalog.jsonb_build_object('exactReceipt',v_receipt),p_unit_price)
 then raise exception 'market_price_out_of_range';end if;
 if pg_catalog.jsonb_path_exists(v_game.state,
   '$.**.savedLoadouts[*].equipment.* ? (@ == $item)',
   pg_catalog.jsonb_build_object('item',v_p.item_id))
   or pg_catalog.jsonb_path_exists(v_game.state,
   '$.**.equipmentInstanceIds.* ? (@ == $inst)',
   pg_catalog.jsonb_build_object('inst',p_instance_id))
   or coalesce(v_game.state#>'{settings,lockedItemIds}','[]'::jsonb)
     @>pg_catalog.jsonb_build_array(v_p.item_id)
   or coalesce(v_game.state#>'{settings,favoriteItemIds}','[]'::jsonb)
     @>pg_catalog.jsonb_build_array(v_p.item_id)
   or pg_catalog.jsonb_path_exists(v_game.state,
    '$.**.reservedInputs[*] ? (@.itemId == $item)',
    pg_catalog.jsonb_build_object('item',v_p.item_id))
 then raise exception 'market_resale_equipment_protected';end if;
 if (v_receipt#>>'{enhancement,statGemId}' is not null
   and not exists(select 1 from private.market_item_policy_v1 p
     where p.item_id=v_receipt#>>'{enhancement,statGemId}'
       and p.asset_kind='gem' and p.tradable and p.binding_policy='unbound'))
   or (v_receipt#>>'{enhancement,effectGemId}' is not null
   and not exists(select 1 from private.market_item_policy_v1 p
     where p.item_id=v_receipt#>>'{enhancement,effectGemId}'
       and p.asset_kind='gem' and p.tradable and p.binding_policy='unbound'))
 then raise exception 'market_equipment_socket_unverified';end if;
 select coalesce(pg_catalog.jsonb_agg(e.value order by e.ordinality),'[]'::jsonb)
   into v_remaining from pg_catalog.jsonb_array_elements(v_ledger)
     with ordinality e(value,ordinality)
   where e.value->>'id' is distinct from p_instance_id;
 v_new:=pg_catalog.jsonb_set(v_game.state#-v_path,
   '{account,craftedGearInstances}',v_remaining,false);
 insert into private.market_equipment_resale_offers_v23(
   exact_instance_id,first_source_hold_id,previous_resale_id,
   last_sale_ordinal,seller_account_id,seller_character_id,item_id,
   source_location,source_index,source_revision,receipt_payload,
   stack_payload,unit_price)
 values(p_instance_id,v_first.source_hold_id,v_prev,v_ord,
   p_account_id,p_holder,v_p.item_id,p_location,p_index,
   p_expected_revision,v_receipt,v_stack,p_unit_price)
 returning resale_id into v_offer_id;
 update private.market_equipment_provenance_v19
   set storage_state='resale'
   where exact_instance_id=p_instance_id and buyer_account_id=p_account_id
     and status='claimed' and storage_state='character';
 if not found then raise exception 'market_resale_custody_changed';end if;
 update public.online_game_states
   set state=v_new,revision=v_game.revision+1,updated_at=now()
   where account_id=p_account_id and revision=v_game.revision;
 if not found then raise exception 'market_stale_state';end if;
 v_result:=pg_catalog.jsonb_build_object(
   'resaleId',v_offer_id,'instanceId',p_instance_id,'itemId',v_p.item_id,
   'status','active','lastSaleOrdinal',v_ord,'unitPrice',p_unit_price,
   'sellerRevision',v_game.revision+1,'replayed',false);
 insert into private.market_resale_action_receipts_v23(
   actor_account_id,idempotency_key,request_hash,action,inputs,result)
 values(p_account_id,p_idempotency_key,p_request_hash,'reserve',v_inputs,v_result);
 return v_result;
end;
$resale_reserve$;
revoke all on function private.market_reserve_equipment_resale_v23(
 uuid,bigint,text,text,text,integer,bigint,text,text)
 from public,anon,authenticated,service_role;

create function private.market_cancel_equipment_resale_v23(
 p_account_id uuid,p_resale_id uuid,p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $resale_cancel$
declare
 v_game public.online_game_states%rowtype;
 v_offer private.market_equipment_resale_offers_v23%rowtype;
 v_p private.market_equipment_provenance_v19%rowtype;
 v_saved private.market_resale_action_receipts_v23%rowtype;
 v_inputs jsonb;v_result jsonb;
begin
 v_inputs:=pg_catalog.jsonb_build_object('resaleId',p_resale_id);
 if p_account_id is null or p_resale_id is null or p_idempotency_key is null
   or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
   or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'market_resale_invalid_request';end if;
 if not exists(select 1 from private.market_runtime_guard_v1
   where singleton and trading_enabled and snapshot_bridge_ready)
   or not exists(select 1 from private.market_equipment_guard_v8
   where singleton and equipment_transfers_enabled)
 then raise exception 'market_disabled';end if;
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('party-account:'||p_account_id::text,0));
 select * into v_game from public.online_game_states
   where account_id=p_account_id for update;
 if not found then raise exception 'market_state_missing';end if;
 select * into v_saved from private.market_resale_action_receipts_v23
   where actor_account_id=p_account_id and idempotency_key=p_idempotency_key;
 if found then
   if v_saved.action<>'cancel' or v_saved.inputs is distinct from v_inputs
     or v_saved.request_hash<>p_request_hash
   then raise exception 'market_idempotency_conflict';end if;
   return v_saved.result||pg_catalog.jsonb_build_object('replayed',true);
 end if;
 select * into v_offer from private.market_equipment_resale_offers_v23
   where resale_id=p_resale_id and seller_account_id=p_account_id for update;
 if not found then raise exception 'market_resale_not_owned';end if;
 if v_offer.status<>'active' then raise exception 'market_resale_not_cancelable';end if;
 select * into v_p from private.market_equipment_provenance_v19
   where exact_instance_id=v_offer.exact_instance_id
     and buyer_account_id=p_account_id and storage_state='resale'
     and status='claimed' for update;
 if not found or v_p.recipient_character_id<>v_offer.seller_character_id
 then raise exception 'market_resale_custody_changed';end if;
 update private.market_equipment_resale_offers_v23
   set status='return_pending',cancelled_at=now()
   where resale_id=p_resale_id and status='active';
 if not found then raise exception 'market_resale_not_cancelable';end if;
 v_result:=pg_catalog.jsonb_build_object('resaleId',p_resale_id,
   'instanceId',v_offer.exact_instance_id,'status','return_pending','replayed',false);
 insert into private.market_resale_action_receipts_v23(
   actor_account_id,idempotency_key,request_hash,action,inputs,result)
 values(p_account_id,p_idempotency_key,p_request_hash,'cancel',v_inputs,v_result);
 return v_result;
end;
$resale_cancel$;
revoke all on function private.market_cancel_equipment_resale_v23(uuid,uuid,text,text)
 from public,anon,authenticated,service_role;

create function private.market_claim_resale_return_v23(
 p_account_id uuid,p_resale_id uuid,p_expected_revision bigint,
 p_holder text,p_location text,p_idempotency_key text,p_request_hash text
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $resale_return$
declare
 v_game public.online_game_states%rowtype;
 v_offer private.market_equipment_resale_offers_v23%rowtype;
 v_p private.market_equipment_provenance_v19%rowtype;
 v_saved private.market_resale_action_receipts_v23%rowtype;
 v_inputs jsonb;v_dest jsonb;v_held jsonb;v_count integer:=0;
 v_path text[];v_stack_path text[];v_stacks jsonb;v_capacity bigint;
 v_new jsonb;v_receipt jsonb;v_level integer;v_result jsonb;
begin
 v_inputs:=pg_catalog.jsonb_build_object('resaleId',p_resale_id,
   'revision',p_expected_revision,'holder',p_holder,'location',p_location);
 if p_account_id is null or p_resale_id is null
   or p_expected_revision is null or p_expected_revision<0
   or p_holder is null or length(p_holder)=0 or p_location is null
   or p_location not in ('inventory','equipment_pouch')
   or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
   or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
 then raise exception 'market_resale_invalid_request';end if;
 if not exists(select 1 from private.market_runtime_guard_v1
   where singleton and trading_enabled and snapshot_bridge_ready)
   or not exists(select 1 from private.market_equipment_guard_v8
   where singleton and equipment_transfers_enabled)
 then raise exception 'market_disabled';end if;
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('party-account:'||p_account_id::text,0));
 select * into v_game from public.online_game_states
   where account_id=p_account_id for update;
 if not found then raise exception 'market_state_missing';end if;
 select * into v_saved from private.market_resale_action_receipts_v23
   where actor_account_id=p_account_id and idempotency_key=p_idempotency_key;
 if found then
   if v_saved.action<>'return' or v_saved.inputs is distinct from v_inputs
      or v_saved.request_hash<>p_request_hash
   then raise exception 'market_idempotency_conflict';end if;
   return v_saved.result||pg_catalog.jsonb_build_object('replayed',true);
 end if;
 if v_game.revision<>p_expected_revision then raise exception 'market_stale_state';end if;
 select * into v_offer from private.market_equipment_resale_offers_v23
   where resale_id=p_resale_id and seller_account_id=p_account_id for update;
 if not found then raise exception 'market_resale_not_owned';end if;
 if v_offer.status<>'return_pending' then raise exception 'market_resale_return_not_ready';end if;
 select * into v_p from private.market_equipment_provenance_v19
   where exact_instance_id=v_offer.exact_instance_id
     and buyer_account_id=p_account_id and status='claimed'
     and storage_state='resale' for update;
 if not found or v_p.recipient_character_id<>v_offer.seller_character_id
   or not private.market_resale_absent_from_snapshot_v23(
      v_game.state,v_offer.exact_instance_id)
 then raise exception 'market_resale_custody_changed';end if;
 if v_game.state#>>'{character,id}'=p_holder then
   v_count:=v_count+1;v_dest:=v_game.state->'character';end if;
 for v_held in select value from pg_catalog.jsonb_array_elements(
   case when pg_catalog.jsonb_typeof(v_game.state->'otherCharacters')='array'
    then v_game.state->'otherCharacters' else '[]'::jsonb end)
 loop
   if v_held#>>'{character,id}'=p_holder
   then v_count:=v_count+1;v_dest:=v_held->'character';end if;
 end loop;
 if v_count<>1 or v_dest->>'classId' is distinct from v_p.required_class_id
   or not exists(select 1 from public.characters c
     where c.id::text=p_holder and c.account_id=p_account_id
       and c.class_id::text=v_p.required_class_id)
 then raise exception 'market_class_or_recipient_required';end if;
 if pg_catalog.jsonb_typeof(v_dest->'xp') is distinct from 'number'
   or coalesce(v_dest->>'xp','') !~ '^[0-9]{1,16}$'
   or (v_dest->>'xp')::numeric>9007199254740991
 then raise exception 'market_character_xp_invalid';end if;
 v_level:=private.market_character_level_from_xp_v18((v_dest->>'xp')::bigint);
 if v_level<v_p.required_character_level
 then raise exception 'market_level_required';end if;
 v_path:=private.market_source_stack_path_v2(v_game.state,p_location,p_holder,0);
 if v_path is null then raise exception 'market_resale_destination_invalid';end if;
 v_stack_path:=v_path[1:pg_catalog.array_length(v_path,1)-1];
 v_stacks:=v_game.state#>v_stack_path;
 if pg_catalog.jsonb_typeof(v_stacks) is distinct from 'array'
 then raise exception 'market_resale_destination_invalid';end if;
 v_capacity:=(v_game.state#>>(
   v_stack_path[1:pg_catalog.array_length(v_stack_path,1)-1]
   ||array['capacity']))::bigint;
 if v_capacity is null or v_capacity<1 or v_capacity>1000
 then raise exception 'market_equipment_capacity_unverified';end if;
 if pg_catalog.jsonb_array_length(v_stacks)>=v_capacity
 then raise exception 'market_equipment_destination_full';end if;
 if pg_catalog.jsonb_typeof(v_game.state#>'{account,craftedGearInstances}')<>'array'
   or pg_catalog.jsonb_array_length(v_game.state#>'{account,craftedGearInstances}')>=500
 then raise exception 'market_resale_destination_invalid';end if;
 v_receipt:=pg_catalog.jsonb_set(v_offer.receipt_payload,'{ownerCharacterId}',
   pg_catalog.to_jsonb(p_holder),false);
 v_new:=pg_catalog.jsonb_set(v_game.state,v_stack_path,
   v_stacks||pg_catalog.jsonb_build_array(v_offer.stack_payload),false);
 v_new:=pg_catalog.jsonb_set(v_new,'{account,craftedGearInstances}',
   (v_game.state#>'{account,craftedGearInstances}')
   ||pg_catalog.jsonb_build_array(v_receipt),false);
 update private.market_equipment_provenance_v19
   set storage_state='character',recipient_character_id=p_holder
   where exact_instance_id=v_offer.exact_instance_id
     and buyer_account_id=p_account_id and status='claimed'
     and storage_state='resale';
 if not found then raise exception 'market_resale_custody_changed';end if;
 update public.online_game_states
   set state=v_new,revision=v_game.revision+1,updated_at=now()
   where account_id=p_account_id and revision=v_game.revision;
 if not found then raise exception 'market_stale_state';end if;
 update private.market_equipment_resale_offers_v23
   set status='returned',returned_at=now()
   where resale_id=p_resale_id and status='return_pending';
 if not found then raise exception 'market_resale_return_not_ready';end if;
 v_result:=pg_catalog.jsonb_build_object('resaleId',p_resale_id,
   'instanceId',v_offer.exact_instance_id,'status','returned',
   'destinationCharacterId',p_holder,'newRevision',v_game.revision+1,
   'replayed',false);
 insert into private.market_resale_action_receipts_v23(
   actor_account_id,idempotency_key,request_hash,action,inputs,result)
 values(p_account_id,p_idempotency_key,p_request_hash,'return',v_inputs,v_result);
 return v_result;
end;
$resale_return$;
revoke all on function private.market_claim_resale_return_v23(
 uuid,uuid,bigint,text,text,text,text)
 from public,anon,authenticated,service_role;

-- V23b will add separate private resale delivery + settlement. Deliberately
-- preserve all legacy V1/V8 unique indexes and V22 second-sale denial.
commit;
