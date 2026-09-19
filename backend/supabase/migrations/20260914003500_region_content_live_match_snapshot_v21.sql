-- VELDRYN v21 — retain the immutable regional content selection on live matches.
-- The expedition_runs.content_version remains the authoritative run snapshot;
-- this column lets queue/match operations reject mixed-version launches before a run exists.

alter table public.live_dungeon_matches
  add column if not exists region_id text,
  add column if not exists content_version text;

do $$ begin
  if not exists(select 1 from pg_constraint where conname='live_dungeon_matches_content_version_v21_fkey') then
    alter table public.live_dungeon_matches
      add constraint live_dungeon_matches_content_version_v21_fkey
      foreign key(content_version) references public.region_content_manifests_v20(content_version);
  end if;
end $$;

create index if not exists live_dungeon_match_content_v21
  on public.live_dungeon_matches(region_id,content_version,state,created_at);

comment on column public.live_dungeon_matches.content_version is
  'Immutable content version selected when this match was created; must be copied to expedition_runs.content_version on launch.';

create or replace function public.prevent_live_dungeon_match_content_mutation_v21() returns trigger
language plpgsql set search_path=public as $$
begin
  if old.content_version is not null and (new.region_id is distinct from old.region_id or new.content_version is distinct from old.content_version) then
    raise exception 'live dungeon match content snapshot is immutable';
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_live_dungeon_match_content_mutation_v21 on public.live_dungeon_matches;
create trigger trg_prevent_live_dungeon_match_content_mutation_v21
before update on public.live_dungeon_matches
for each row execute function public.prevent_live_dungeon_match_content_mutation_v21();

create or replace function public.assert_live_dungeon_match_content_v21(
  p_match_id uuid,
  p_region_id text,
  p_content_version text
) returns boolean
language plpgsql security definer set search_path=public as $$
declare v public.live_dungeon_matches%rowtype;
begin
  select * into v from public.live_dungeon_matches where id=p_match_id;
  if not found then raise exception 'live match not found'; end if;
  if v.region_id is distinct from p_region_id or v.content_version is distinct from p_content_version then
    raise exception 'live match content version mismatch';
  end if;
  return true;
end $$;

revoke all on function public.assert_live_dungeon_match_content_v21(uuid,text,text) from public,anon,authenticated;
grant execute on function public.assert_live_dungeon_match_content_v21(uuid,text,text) to service_role;
