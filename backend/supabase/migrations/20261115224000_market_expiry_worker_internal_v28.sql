-- Hidden Player Market V28: database-owner-only, single-item expiry passes.
-- NOT A SCHEDULER. No cron, Edge route, Market write/claim grants or launch.
-- Worker callers must run each function invocation in its own DB transaction.
begin;

-- Resale expiry preserves the V24 locked/account-serialized cancellation path.
-- The key/hash are stable per resale across retries, enabling safe replay.
create function private.market_expire_next_resale_v28()
returns jsonb
language plpgsql volatile security invoker set search_path = ''
as $expire_next_resale$
declare
  v_resale_id uuid;
  v_return jsonb;
  v_hash text;
begin
  if not exists(select 1 from private.market_runtime_guard_v1
       where singleton and trading_enabled and snapshot_bridge_ready)
     or not exists(select 1 from private.market_equipment_guard_v8
       where singleton and equipment_transfers_enabled)
  then raise exception 'market_disabled'; end if;

  -- Deliberately avoid locking a resale row before taking the seller's
  -- account/advisory lock: V24 establishes a consistent seller-first order.
  select o.resale_id into v_resale_id
    from private.market_equipment_resale_offers_v23 o
    where o.status='active' and o.expires_at<=pg_catalog.now()
    order by o.expires_at,o.resale_id
    limit 1;
  if v_resale_id is null
  then return pg_catalog.jsonb_build_object('processed',false,'type','resale'); end if;

  v_hash:=pg_catalog.encode(
    pg_catalog.sha256(pg_catalog.convert_to('market-auto-expire-resale:'||v_resale_id::text,'UTF8')),
    'hex');
  begin
    v_return:=private.market_expire_resale_v24(
      v_resale_id,'autoexp_'||pg_catalog.replace(v_resale_id::text,'-',''),v_hash);
  exception when raise_exception then
    -- A competing seller cancellation, buyer purchase or other worker may
    -- have won during account-lock acquisition. Do NOT create a second return.
    if sqlerrm in ('market_resale_not_expired_or_not_open','market_resale_not_found')
    then return pg_catalog.jsonb_build_object(
      'processed',false,'type','resale','reason','changed');
    end if;
    raise;
  end;
  return pg_catalog.jsonb_build_object(
    'processed',true,'type','resale','resaleId',v_resale_id,'result',v_return);
end;
$expire_next_resale$;
revoke all on function private.market_expire_next_resale_v28()
  from public,anon,authenticated,service_role;

-- The original V2 queue serializes accounts and closes an expired stack
-- hold / active resource listing while queuing ONE durable return entitlement
-- in the same transaction. It does not credit inventory or Gold directly.
create function private.market_expire_next_stack_v28()
returns jsonb
language plpgsql volatile security invoker set search_path = ''
as $expire_next_stack$
declare v_count integer;
begin
  if not exists(select 1 from private.market_runtime_guard_v1
       where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled'; end if;
  v_count:=private.market_queue_due_returns_v2(1);
  if v_count<0 or v_count>1
  then raise exception 'market_expiry_invalid_count'; end if;
  return pg_catalog.jsonb_build_object(
    'processed',v_count=1,'type','stack','count',v_count);
end;
$expire_next_stack$;
revoke all on function private.market_expire_next_stack_v28()
  from public,anon,authenticated,service_role;

comment on function private.market_expire_next_resale_v28() is
 'V28 restricted single-resale expiry, no schedule; creates one V24 return entitlement, no inventory/Gold payout.';
comment on function private.market_expire_next_stack_v28() is
 'V28 restricted single-stack expiry, no schedule; reuses V2 idempotent return queue.';
commit;
