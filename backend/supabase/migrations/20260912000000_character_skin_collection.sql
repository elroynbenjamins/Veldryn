-- Character-bound, permanent equipment-set skin collection.
-- The client currently discovers complete sets locally. This persisted shape lets
-- ownership validation move server-side later without changing cosmetic IDs.
alter table public.characters
  add column if not exists unlocked_skin_ids text[] not null default array['starting']::text[];

comment on column public.characters.unlocked_skin_ids is
  'Permanent character-bound cosmetic unlock IDs. Set skins remain unlocked after their equipment leaves storage.';
