-- Add three optional community priorities without resetting existing proposals or votes.
-- Keep Player Market unpublished until its trading system is fully implemented.
-- Keep the server-owned three-vote budget unchanged. Existing records remain
-- authoritative; on conflict do not overwrite admin-edited status or copy.
insert into public.community_roadmap_features
  (id,title,description,category,status,sort_order,published)
values
  ('player_market','Player Market',
   'Trade eligible equipment and resources with other players through a secure in-game marketplace.',
   'Economy','considering',70,false),
  ('tier_5_plus_equipment','Tier 5+ Equipment',
   'Expand Tier 5 and higher equipment progression with new materials, crafting recipes and gear upgrades.',
   'Equipment','considering',80,true),
  ('overall_refinement','Overall Refinement',
   'Improve existing systems with ongoing balancing, cleaner interfaces, better performance and quality-of-life updates.',
   'Quality of Life','considering',90,true)
on conflict (id) do nothing;
