-- Hidden Market V28 restricted single-item expiry adapter.
-- Staging and synthetic CI must keep Market disabled, with no scheduler.
begin;
set local statement_timeout='35s';

do $market_v28_acl$
begin
  if to_regprocedure('private.market_expire_next_resale_v28()') is null
    or to_regprocedure('private.market_expire_next_stack_v28()') is null
  then raise exception 'market_v28_missing_functions'; end if;

  if has_function_privilege('anon','private.market_expire_next_resale_v28()','EXECUTE')
    or has_function_privilege('authenticated','private.market_expire_next_resale_v28()','EXECUTE')
    or has_function_privilege('service_role','private.market_expire_next_resale_v28()','EXECUTE')
    or has_function_privilege('anon','private.market_expire_next_stack_v28()','EXECUTE')
    or has_function_privilege('authenticated','private.market_expire_next_stack_v28()','EXECUTE')
    or has_function_privilege('service_role','private.market_expire_next_stack_v28()','EXECUTE')
    or (select prosecdef from pg_catalog.pg_proc
      where oid='private.market_expire_next_resale_v28()'::regprocedure)
    or (select prosecdef from pg_catalog.pg_proc
      where oid='private.market_expire_next_stack_v28()'::regprocedure)
  then raise exception 'market_v28_worker_acl_breach'; end if;

  if exists(select 1 from private.market_runtime_guard_v1
     where trading_enabled or snapshot_bridge_ready)
    or exists(select 1 from private.market_equipment_guard_v8
     where equipment_transfers_enabled)
  then raise exception 'market_v28_unexpected_active_market'; end if;

  begin
    perform private.market_expire_next_resale_v28();
    raise exception 'market_v28_resale_disabled_bypassed';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise; end if;
  end;
  begin
    perform private.market_expire_next_stack_v28();
    raise exception 'market_v28_stack_disabled_bypassed';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise; end if;
  end;

  if exists(select 1 from private.market_return_deliveries_v2)
    or exists(select 1 from private.market_resale_gold_intents_v23)
    or exists(select 1 from private.market_equipment_resale_deliveries_v23)
  then raise exception 'market_v28_disabled_work_created_entitlements';end if;
end;
$market_v28_acl$;

-- Only for ephemeral synthetic CI or the outer staging ROLLBACK wrapper.
-- Relaxing false CHECKs is transaction-local, and no claim/payment fixtures
-- are created. With zero due items, both owner-only routines return false.
do $market_v28_idle$
declare v_count integer;
begin
  for v_count in select c.oid::integer from pg_catalog.pg_constraint c
    where c.conrelid='private.market_runtime_guard_v1'::regclass
      and c.contype='c'
      and (pg_catalog.pg_get_constraintdef(c.oid) like '%trading_enabled%'
        or pg_catalog.pg_get_constraintdef(c.oid) like '%snapshot_bridge_ready%')
  loop
    execute pg_catalog.format(
      'alter table private.market_runtime_guard_v1 drop constraint %I',
      (select conname from pg_catalog.pg_constraint where oid=v_count));
  end loop;
  update private.market_runtime_guard_v1
    set trading_enabled=true,snapshot_bridge_ready=true where singleton;

  if (private.market_expire_next_stack_v28()->>'processed')<>'false'
  then raise exception 'market_v28_idle_stack_not_empty';end if;
end;
$market_v28_idle$;

-- Equipment guard remains disabled, so resale worker must STILL fail closed,
-- even with the main trading/snapshot flags relaxed above.
do $market_v28_equipment_gate$
begin
  begin
    perform private.market_expire_next_resale_v28();
    raise exception 'market_v28_equipment_disabled_bypassed';
  exception when raise_exception then
    if sqlerrm<>'market_disabled' then raise;end if;
  end;
end;
$market_v28_equipment_gate$;

rollback;
