-- HIDDEN Player Market V30. This additive release-off fence permanently
-- excludes the old V33/1.x equipment transaction family from a future Market 2.0.
-- Genuine EQ2 items require a DIFFERENT authoritative mint/custody adapter;
-- an EQ2_ item name, client tag, V33 Forge receipt or listing whitelist is not proof.
-- NO release flags, item approvals, routes, grants or player data changes.
begin;

-- Legacy Market V8/V9 and V23 resale functions are still V33-receipt based.
-- They MUST NOT become the EQ2 transaction path by relaxing this fence.
-- Resources retain their existing independent Market policy.
create function private.market_reject_legacy_equipment_v30()
returns trigger language plpgsql volatile security definer set search_path=''
as $market_legacy_eq2_fence$
begin
  if tg_table_schema <> 'private'
    then raise exception 'market_equipment_fence_wrong_schema'; end if;

  if tg_table_name = 'market_custody_assets_v1' then
    if new.asset_kind = 'equipment' then
      raise exception 'market_legacy_equipment_denied';
    end if;
    return new;
  end if;

  if tg_table_name = 'market_sale_offers_v3' then
    -- An existing old hold must not escape via direct offer SQL. No changes
    -- to resource offers, partial fills, tax, or other Market stack flows.
    if exists (
      select 1 from private.market_custody_holds_v1 h
      join private.market_custody_assets_v1 a on a.asset_id = h.asset_id
      where h.hold_id = new.source_hold_id and a.asset_kind = 'equipment'
    ) then
      raise exception 'market_legacy_equipment_denied';
    end if;
    return new;
  end if;

  -- Every table in this group belongs exclusively to OLD Forge equipment
  -- escrow/list/settlement/delivery/resale. This includes direct SQL writes
  -- and attempts to change an existing legacy row after the cutover.
  if tg_table_name in (
    'market_equipment_escrows_v8',
    'market_equipment_purchase_deliveries_v9',
    'market_equipment_sale_chain_v22',
    'market_equipment_resale_offers_v23',
    'market_equipment_resale_chain_v23',
    'market_equipment_resale_deliveries_v23'
  ) then
    raise exception 'market_legacy_equipment_denied';
  end if;

  raise exception 'market_equipment_fence_unknown_target';
end;
$market_legacy_eq2_fence$;
revoke all on function private.market_reject_legacy_equipment_v30()
  from public,anon,authenticated,service_role;

-- This blocks direct inserts/updates, as well as calls through the original
-- private V8/V9/V23 routines. UPDATE checks also stop historical V33 escrow
-- from being settled or re-sold if a later release accidentally flips flags.
create trigger market_eq2_only_assets_v30
 before insert or update on private.market_custody_assets_v1
 for each row execute function private.market_reject_legacy_equipment_v30();
create trigger market_eq2_only_offers_v30
 before insert or update on private.market_sale_offers_v3
 for each row execute function private.market_reject_legacy_equipment_v30();
create trigger market_eq2_only_escrows_v30
 before insert or update on private.market_equipment_escrows_v8
 for each row execute function private.market_reject_legacy_equipment_v30();
create trigger market_eq2_only_first_delivery_v30
 before insert or update on private.market_equipment_purchase_deliveries_v9
 for each row execute function private.market_reject_legacy_equipment_v30();
create trigger market_eq2_only_first_sale_v30
 before insert on private.market_equipment_sale_chain_v22
 for each row execute function private.market_reject_legacy_equipment_v30();
create trigger market_eq2_only_resale_offers_v30
 before insert or update on private.market_equipment_resale_offers_v23
 for each row execute function private.market_reject_legacy_equipment_v30();
create trigger market_eq2_only_resale_chain_v30
 before insert on private.market_equipment_resale_chain_v23
 for each row execute function private.market_reject_legacy_equipment_v30();
create trigger market_eq2_only_resale_delivery_v30
 before insert or update on private.market_equipment_resale_deliveries_v23
 for each row execute function private.market_reject_legacy_equipment_v30();

comment on function private.market_reject_legacy_equipment_v30() is
 'HIDDEN release-off V30: V33/legacy equipment is never eligible for Market 2.0. Does not authorize EQ2; actual exact-mint/custody API must be separately integrated, transactionally validated and reviewed.';

-- IMPORTANT for actual migration planning: preexisting active legacy offers,
-- held escrow, pending deliveries and return entitlements must be reconciled
-- BEFORE enabling any new Market route. This review-only migration does not
-- cancel, seize, delete or rewrite anybody's equipment or transaction history.
commit;
