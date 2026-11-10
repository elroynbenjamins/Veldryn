-- Advertise major upcoming and active Veldryn workstreams in the community roadmap.
-- Entries are informative Planned/In Development items, not community-votable proposals.
-- Upsert is idempotent and leaves all unrelated entries and account votes untouched.
insert into public.community_roadmap_features
  (id,title,description,category,status,sort_order,published)
values
  ('class_combat_refinement','Class & Combat Refinement',
   'Improve class identity, equipment stat scaling, combat pacing and encounter balance across progression.',
   'Combat','in_progress',21,true),
  ('guild_improvements','Guild Improvements',
   'Refine weekly projects, guild skills, progression, tutorials and cooperative guild activities.',
   'Guilds','in_progress',22,true),
  ('exploration_expansion','Exploration Expansion',
   'Expand exploration choices with more destinations, level requirements, rewards and progression.',
   'Exploration','in_progress',23,true),
  ('new_regions_chapters','New Regions & Chapters',
   'Continue Veldryn’s story with future regions, enemies, bosses, resources and equipment progression.',
   'World','planned',24,true)
on conflict (id) do update
set title=excluded.title,
    description=excluded.description,
    category=excluded.category,
    status=excluded.status,
    sort_order=excluded.sort_order,
    published=excluded.published,
    updated_at=now();
