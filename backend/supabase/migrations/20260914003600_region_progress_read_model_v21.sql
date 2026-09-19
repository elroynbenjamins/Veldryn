-- VELDRYN v21 — server-owned regional journal read model.
-- Gameplay services are the only writers; clients may read their own projection.

create table if not exists public.region_progress_v21(
  account_id uuid not null references auth.users(id) on delete cascade,
  region_id text not null,
  content_version text not null references public.region_content_manifests_v20(content_version),
  story_completed integer not null default 0 check(story_completed between 0 and 10),
  side_quests_completed integer not null default 0 check(side_quests_completed between 0 and 8),
  echoes_completed integer not null default 0 check(echoes_completed between 0 and 4),
  dungeons_completed integer not null default 0 check(dungeons_completed between 0 and 3),
  collection_entries integer not null default 0 check(collection_entries between 0 and 16),
  boss_mastery_tier integer not null default 0 check(boss_mastery_tier between 0 and 4),
  updated_at timestamptz not null default now(),
  primary key(account_id,region_id)
);

alter table public.region_progress_v21 enable row level security;
drop policy if exists region_progress_read_own_v21 on public.region_progress_v21;
create policy region_progress_read_own_v21 on public.region_progress_v21
  for select using(account_id=auth.uid());

create or replace function public.get_region_progress_v21(p_region_id text)
returns table(region_id text,content_version text,story_completed integer,side_quests_completed integer,echoes_completed integer,dungeons_completed integer,collection_entries integer,boss_mastery_tier integer,updated_at timestamptz)
language sql stable security invoker set search_path=public as $$
  select r.region_id,r.content_version,r.story_completed,r.side_quests_completed,r.echoes_completed,r.dungeons_completed,r.collection_entries,r.boss_mastery_tier,r.updated_at
  from public.region_progress_v21 r
  where r.account_id=auth.uid() and r.region_id=p_region_id;
$$;
revoke all on function public.get_region_progress_v21(text) from public,anon;
grant execute on function public.get_region_progress_v21(text) to authenticated,service_role;

create or replace function public.upsert_region_progress_v21_server(
  p_account_id uuid,p_region_id text,p_content_version text,p_story_completed integer default 0,
  p_side_quests_completed integer default 0,p_echoes_completed integer default 0,p_dungeons_completed integer default 0,
  p_collection_entries integer default 0,p_boss_mastery_tier integer default 0
) returns void
language plpgsql security definer set search_path=public as $$
declare v_manifest public.region_content_manifests_v20%rowtype;
begin
  select * into v_manifest from public.region_content_manifests_v20 where content_version=p_content_version and region_id=p_region_id and state='published';
  if not found then raise exception 'invalid_or_unpublished_region_content'; end if;
  if p_story_completed not between 0 and 10 or p_side_quests_completed not between 0 and 8 or p_echoes_completed not between 0 and 4 or p_dungeons_completed not between 0 and 3 or p_collection_entries not between 0 and 16 or p_boss_mastery_tier not between 0 and 4 then raise exception 'invalid_region_progress'; end if;
  insert into public.region_progress_v21(account_id,region_id,content_version,story_completed,side_quests_completed,echoes_completed,dungeons_completed,collection_entries,boss_mastery_tier,updated_at)
  values(p_account_id,p_region_id,p_content_version,p_story_completed,p_side_quests_completed,p_echoes_completed,p_dungeons_completed,p_collection_entries,p_boss_mastery_tier,now())
  on conflict(account_id,region_id) do update set content_version=excluded.content_version,story_completed=greatest(public.region_progress_v21.story_completed,excluded.story_completed),side_quests_completed=greatest(public.region_progress_v21.side_quests_completed,excluded.side_quests_completed),echoes_completed=greatest(public.region_progress_v21.echoes_completed,excluded.echoes_completed),dungeons_completed=greatest(public.region_progress_v21.dungeons_completed,excluded.dungeons_completed),collection_entries=greatest(public.region_progress_v21.collection_entries,excluded.collection_entries),boss_mastery_tier=greatest(public.region_progress_v21.boss_mastery_tier,excluded.boss_mastery_tier),updated_at=excluded.updated_at;
end $$;
revoke all on function public.upsert_region_progress_v21_server(uuid,text,text,integer,integer,integer,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.upsert_region_progress_v21_server(uuid,text,text,integer,integer,integer,integer,integer,integer) to service_role;
