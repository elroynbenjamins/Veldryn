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

-- Preserve the existing v16 approved wood/ore IDs (including optional
-- material variants) for backwards compatibility. The v22 deterministic
-- starter planner itself only selects GREENWOOD_LOG and COPPER_ORE.
-- Disable any herb other than the verified Level 1 Dewleaf node.
update private.party_event_supply_catalogue_v16
 set enabled=false
 where category='herb' and item_id<>'DEWLEAF' and enabled=true;

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
  where enabled and category='herb' and item_id<>'DEWLEAF'
 ) then raise exception 'party_event_v22_starter_catalog_not_audited';end if;
end;$$;

comment on table private.party_event_supply_catalogue_v16 is
 'Hidden Party Events supply allowlist: v22 starts with Greenwood Log, Copper Ore, gatherable Dewleaf only. Additional herbs need a fresh independent gathering audit before enabling. Existing v16 wood/ore sources remain approved; v22 starter planner chooses only Level 1 wood and ore.';

commit;
