-- Dungeons are live but still receiving substantial encounter, balance and UX work.
-- Publish them under In Development, separately from community-voted proposals.
-- Idempotent upsert keeps existing votes/statuses on unrelated Roadmap features.
insert into public.community_roadmap_features
  (id,title,description,category,status,sort_order,published)
values
  ('dungeons','Dungeons',
   'Co-op dungeon expeditions are live. We are expanding encounter variety, refining difficulty tiers, companion loadouts and rewards.',
   'Co-op','in_progress',15,true)
on conflict (id) do update
set title=excluded.title,
    description=excluded.description,
    category=excluded.category,
    status=excluded.status,
    sort_order=excluded.sort_order,
    published=excluded.published,
    updated_at=now();
