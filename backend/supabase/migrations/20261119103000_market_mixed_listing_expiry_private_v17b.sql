-- Hidden Player Market V17b: one safe expiry dispatcher for resource
-- stacks and exact equipment copies. No scheduled job or API grants.
-- Existing V2 queue remains for legacy stack-only contract/regressions.
-- The future trusted server scheduler must call THIS V17b dispatcher.
begin;

create or replace function private.market_queue_due_returns_v17(
 p_limit integer default 25
) returns integer
language plpgsql volatile security invoker set search_path=''
as $market_expiry_v17$
declare
  v_due record;
  v_offer_status text;
  v_done integer:=0;
begin
  if p_limit is null or p_limit not between 1 and 100
  then raise exception 'invalid_market_batch';end if;
  if not exists(select 1 from private.market_runtime_guard_v1
    where singleton and trading_enabled and snapshot_bridge_ready)
  then raise exception 'market_disabled';end if;

  -- Small, bounded batches. Each close is atomic with the return entitlement;
  -- if a verification fails, the transaction rejects rather than leaking or
  -- silently consuming an asset. The scheduled caller may retry safely.
  for v_due in
    select h.owner_account_id,h.hold_id,a.asset_kind
    from private.market_custody_holds_v1 h
    join private.market_custody_assets_v1 a on a.asset_id=h.asset_id
      and a.owner_account_id=h.owner_account_id
    where h.status='held' and h.expires_at<=now()
    order by h.expires_at,h.hold_id
    limit p_limit
  loop
    begin
      if v_due.asset_kind='equipment' then
        -- Gear uses its own exact-receipt return ledger and claim bridge.
        -- The account lock and listing lock mirror the normal V9 cancel path.
        perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
          'party-account:'||v_due.owner_account_id::text,0));
        v_offer_status:=null;
        select status into v_offer_status from private.market_sale_offers_v3
          where source_hold_id=v_due.hold_id
            and seller_account_id=v_due.owner_account_id for update;
        if found and v_offer_status in ('draft','active') then
          update private.market_sale_offers_v3
            set status='cancelled'
            where source_hold_id=v_due.hold_id
              and seller_account_id=v_due.owner_account_id
              and status in ('draft','active');
          if not found then raise exception 'market_offer_changed';end if;
        elsif found and v_offer_status='sold' then
          raise exception 'market_expired_sold_equipment_escrow';
        end if;
        perform private.market_cancel_exact_equipment_v8(
          v_due.owner_account_id,v_due.hold_id,
          'expire_eq_'||pg_catalog.replace(v_due.hold_id::text,'-',''),
          pg_catalog.repeat('e',64),true
        );
      elsif v_due.asset_kind in ('resource','gem') then
        -- V5 stack cancellation closes the listing and creates exactly one
        -- pending return for the CURRENT unsold quantity after V17 fills.
        perform private.market_cancel_stack_hold_v2(
          v_due.owner_account_id,v_due.hold_id,
          'expire_'||pg_catalog.replace(v_due.hold_id::text,'-',''),
          pg_catalog.repeat('e',64),true
        );
      else
        raise exception 'market_expiry_unknown_asset_kind';
      end if;
      v_done:=v_done+1;
    exception when raise_exception then
      if sqlerrm not in ('market_hold_not_open','market_equipment_hold_not_open')
      then raise;end if;
    end;
  end loop;
  return v_done;
end;
$market_expiry_v17$;

revoke all on function private.market_queue_due_returns_v17(integer)
 from public,anon,authenticated,service_role;

comment on function private.market_queue_due_returns_v17(integer) is
 'PRIVATE, DISABLED. On a trusted scheduler after launch, close due resource and exact-equipment offers and preserve owner-owned claimable returns; no cron job installed.';

commit;
