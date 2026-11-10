-- Publish two currently active workstreams on the Community Roadmap.
-- These are not votable proposals; keep other entries and user votes untouched.
insert into public.community_roadmap_features
  (id,title,description,category,status,sort_order,published)
values
  ('seasonal_events','Seasonal Events',
   'Expanding seasonal celebrations with event previews, limited-time activities, themed rewards and improved event access.',
   'Events','in_progress',16,true),
  ('companion_refinement','Companion Refinement',
   'Refining companion selection, role balance, training, ascension and their impact across combat and dungeons.',
   'Companions','in_progress',17,true)
on conflict (id) do update
set title=excluded.title,
    description=excluded.description,
    category=excluded.category,
    status=excluded.status,
    sort_order=excluded.sort_order,
    published=excluded.published,
    updated_at=now();
