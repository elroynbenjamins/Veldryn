-- Reconcile the production hot-path policy/index cleanup applied on 2026-10-07.
-- The removed policies were exact duplicates of the original foundation policies.

drop policy if exists owner_read_activities on public.character_activities;
drop policy if exists owner_read_skills on public.character_skills;
drop policy if exists owner_read_crafts on public.crafting_jobs;
drop policy if exists owner_read_items on public.item_instances;

create index if not exists crafting_jobs_character_id_idx
  on public.crafting_jobs(character_id);
