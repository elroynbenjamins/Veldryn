-- Hidden Player Market V2 continuation: safe cancellation and expiry outbox.
-- Does NOT return goods to player inventory automatically. Each cancelled
-- lot becomes one durable, one-time return delivery awaiting an audited claim
-- method. No public/service execute grant, and all runtime gates remain false.

begin;

create or replace function private.market_cancel_stack_hold_v2(
  p_account_id uuid,p_hold_id uuid,p_idempotency_key text,
  p_request_hash text,p_expiration boolean default false
) returns jsonb
language plpgsql volatile security invoker set search_path=''
as $market_cancel$
declare
  v_hold private.market_custody_holds_v1%rowtype;
  v_asset private.market_custody_assets_v1%rowtype;
  v_receipt private.market_action_receipts_v2%rowtype;
  v_delivery uuid;
  v_stack jsonb;
  v_result jsonb;
  v_action text;
begin
  if p_account_id is null or p_hold_id is null
    or p_idempotency_key is null
    or p_idempotency_key !~ '^[a-zA-Z0-9_-]{8,128}$'
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$'
    or p_expiration is null
  then raise exception 'invalid_market_request';end if;

  -- Inert until a future audited migration unlocks both server-owned gates.
  if not exists(select 1 from private.market_runtime_guard_v1
    where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('party-account:'||p_account_id::text,0));

  v_action:=case when p_expiration then 'expire' else 'cancel' end;
  select * into v_receipt from private.market_action_receipts_v2
  where owner_account_id=p_account_id and idempotency_key=p_idempotency_key;
  if found then
    if v_receipt.action<>v_action or v_receipt.request_hash<>p_request_hash
    then raise exception 'market_idempotency_conflict';end if;
    return v_receipt.result||pg_catalog.jsonb_build_object('replayed',true);
  end if;

  select * into v_hold from private.market_custody_holds_v1
  where hold_id=p_hold_id and owner_account_id=p_account_id for update;
  if not found then raise exception 'market_hold_not_owned';end if;
  if v_hold.status<>'held' then raise exception 'market_hold_not_open';end if;
  if p_expiration and v_hold.expires_at>now()
  then raise exception 'market_hold_not_due';end if;

  select * into v_asset from private.market_custody_assets_v1
  where asset_id=v_hold.asset_id and owner_account_id=p_account_id for update;
  if not found or v_asset.verification_state<>'verified'
    or v_asset.asset_kind not in ('resource','gem')
    or v_asset.held_quantity<>v_hold.held_quantity
    or v_asset.quantity<>v_hold.held_quantity
    or v_asset.source_bound
  then raise exception 'market_hold_asset_mismatch';end if;
  v_stack:=v_asset.immutable_attributes->'stack';
  if pg_catalog.jsonb_typeof(v_stack) is distinct from 'object'
    or v_stack->>'itemId' is distinct from v_asset.item_id
    or (v_stack ? 'instanceId')
  then raise exception 'market_return_payload_invalid';end if;

  -- The hold can close only if exactly one durable return entitlement is
  -- inserted. All statements are atomic in one transaction.
  v_stack:=pg_catalog.jsonb_set(v_stack,'{quantity}',
    pg_catalog.to_jsonb(v_hold.held_quantity::integer),true);
  insert into private.market_return_deliveries_v2(
    source_hold_id,recipient_account_id,item_id,asset_kind,quantity,stack_payload
  ) values(
    v_hold.hold_id,p_account_id,v_asset.item_id,
    v_asset.asset_kind,v_hold.held_quantity,v_stack
  ) returning delivery_id into v_delivery;

  update private.market_custody_holds_v1
  set status='released',closed_at=now()
  where hold_id=v_hold.hold_id and status='held';
  if not found then raise exception 'market_hold_not_open';end if;

  update private.market_custody_assets_v1
  set held_quantity=0,updated_at=now()
  where asset_id=v_asset.asset_id and held_quantity=v_hold.held_quantity;
  if not found then raise exception 'market_hold_asset_mismatch';end if;

  v_result:=pg_catalog.jsonb_build_object(
    'holdId',v_hold.hold_id,
    'deliveryId',v_delivery,
    'itemId',v_asset.item_id,
    'quantity',v_hold.held_quantity,
    'status','pending_return',
    'replayed',false);
  insert into private.market_action_receipts_v2(
    owner_account_id,idempotency_key,request_hash,action,result)
  values(p_account_id,p_idempotency_key,p_request_hash,v_action,v_result);
  return v_result;
end;
$market_cancel$;

revoke all on function private.market_cancel_stack_hold_v2(
  uuid,uuid,text,text,boolean
) from public,anon,authenticated,service_role;

-- Internal maintenance prototype; no cron job or public execution grant.
-- This resolves each due hold under its seller account's advisory lock.
-- Closed holds cannot be refunded a second time, including replayed jobs.
create or replace function private.market_queue_due_returns_v2(p_limit integer default 25)
returns integer
language plpgsql volatile security invoker set search_path=''
as $market_expire$
declare
  v_hold record;
  v_done integer:=0;
begin
  if p_limit is null or p_limit<1 or p_limit>100
  then raise exception 'invalid_market_batch';end if;
  if not exists(select 1 from private.market_runtime_guard_v1
    where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;

  for v_hold in
    select owner_account_id,hold_id from private.market_custody_holds_v1
    where status='held' and expires_at<=now()
    order by expires_at,hold_id
    limit p_limit
  loop
    begin
      perform private.market_cancel_stack_hold_v2(
        v_hold.owner_account_id,v_hold.hold_id,
        'expire_'||pg_catalog.replace(v_hold.hold_id::text,'-',''),
        pg_catalog.repeat('e',64),true);
      v_done:=v_done+1;
    exception when raise_exception then
      if sqlerrm <> 'market_hold_not_open' then raise;end if;
    end;
  end loop;
  return v_done;
end;
$market_expire$;

revoke all on function private.market_queue_due_returns_v2(integer)
from public,anon,authenticated,service_role;

comment on table private.market_return_deliveries_v2 is
  'Hidden immutable cancelled/expired escrow entitlements; NOT yet claimable or exposed to players.';
comment on table private.market_gold_intents_v2 is
  'Hidden accounting-only draft obligations, with gross=fee+payout. No Gold movements until future audited settlement.';
comment on function private.market_reserve_stack_v2(
  uuid,bigint,text,text,integer,text,integer,text,text) is
  'Internal disabled prototype: atomically debit stack from canonical online snapshot and escrow on revision; no exposed caller.';
comment on function private.market_cancel_stack_hold_v2(uuid,uuid,text,text,boolean) is
  'Internal disabled prototype: close held lot exactly once and queue durable return entitlement; no inventory credit.';
comment on function private.market_queue_due_returns_v2(integer) is
  'Internal disabled prototype: expire due escrow holds by queuing one pending return each; no automatic job.';

commit;
