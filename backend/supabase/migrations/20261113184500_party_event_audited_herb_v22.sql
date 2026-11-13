-- Hidden Party Events v22: make the real Greenfields Dewleaf gather node
-- available to the service-only v16 donation sink. Keep Thorn Sap disabled:
-- it is a recipe resource but not a direct Herbalism gathering node.
-- Evidence: apps/mobile/src/content/herbalism.ts (DEWLEAF_PATCH, level 1,
-- GREENFIELDS, DEWLEAF, 30s), and skills.ts starting wood/mining sources.
-- No event, grant, job, public RPC or client route is enabled.
begin;

insert into private.party_event_supply_catalogue_v16(item_id,category,enabled)
values('DEWLEAF','herb',true)
on conflict (item_id) do update
 set category='herb',enabled=true;

-- Only the three audited level-one resources are eligible for the initial
-- v22 plan. Existing unrelated catalog rows remain in place for later
-- audited expansions, but cannot be frozen into new orders through the v16
-- service-only writer while disabled.
update private.party_event_supply_catalogue_v16
 set enabled=(item_id in ('GREENWOOD_LOG','COPPER_ORE','DEWLEAF'))
 where enabled is distinct from (item_id in ('GREENWOOD_LOG','COPPER_ORE','DEWLEAF'));

do $$
declare v_approved integer;
begin
 select count(*)::integer into v_approved
 from private.party_event_supply_catalogue_v16
 where enabled
  and ((item_id='GREENWOOD_LOG' and category='wood')
    or (item_id='COPPER_ORE' and category='ore')
    or (item_id='DEWLEAF' and category='herb'));
 if v_approved<>3 or exists (
  select 1 from private.party_event_supply_catalogue_v16
  where enabled and item_id not in ('GREENWOOD_LOG','COPPER_ORE','DEWLEAF')
 ) then raise exception 'party_event_v22_starter_catalog_not_audited';end if;
end;$$;

comment on table private.party_event_supply_catalogue_v16 is
 'Hidden Party Events supply allowlist: v22 starts with Greenwood Log, Copper Ore, gatherable Dewleaf only. New item sources need a fresh independent gathering audit before enabling.';

commit;
