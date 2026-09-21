begin;

-- Crafted equipment rarity is independent from equipment tier.
-- Every Forge craft uses the same universal roll table:
-- Common 89.00%, Uncommon 7.00%, Rare 3.00%, Epic 0.60%,
-- Legendary 0.30%, Mythic 0.10%.
alter table public.equipment_v24_item_instances
  alter column crafted_rarity set default 'Common';

alter table public.equipment_v24_item_instances
  drop constraint if exists equipment_v24_item_instances_crafted_rarity_check;

alter table public.equipment_v24_item_instances
  add constraint equipment_v24_item_instances_crafted_rarity_check
  check(crafted_rarity in('Common','Uncommon','Rare','Epic','Legendary','Mythic'));

comment on column public.equipment_v24_item_instances.crafted_rarity is
  'Forge quality roll independent of equipment tier. Universal odds: Common 89%, Uncommon 7%, Rare 3%, Epic 0.6%, Legendary 0.3%, Mythic 0.1%.';

commit;
