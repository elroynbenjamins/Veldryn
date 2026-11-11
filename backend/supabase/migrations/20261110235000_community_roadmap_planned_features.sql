-- Publish major future roadmap work as Planned (not open for votes).
-- These entries describe the intended direction without promising a release date.
-- Preserve all unrelated features and their votes.
insert into public.community_roadmap_features
  (id,title,description,category,status,sort_order,published)
values
  ('achievements','Achievements',
   'Expand achievements with more progression milestones, challenges and meaningful rewards for player accomplishments.',
   'Progression','planned',18,true),
  ('cosmetics','Cosmetics',
   'Expand player customization with collectible visual rewards, profile cosmetics and additional ways to show off accomplishments.',
   'Customization','planned',19,true),
  ('community_rewards','Community Rewards',
   'Introduce shared community milestones and rewards that celebrate collective progress, participation and special occasions.',
   'Community','planned',20,true)
on conflict (id) do update
set title=excluded.title,
    description=excluded.description,
    category=excluded.category,
    status=excluded.status,
    sort_order=excluded.sort_order,
    published=excluded.published,
    updated_at=now();
