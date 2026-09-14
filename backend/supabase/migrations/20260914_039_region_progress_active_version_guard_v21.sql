-- v21 progress may only be written against the version currently routed for the region.
create or replace function public.upsert_region_progress_v21_server(
  p_account_id uuid,p_region_id text,p_content_version text,p_story_completed integer default 0,
  p_side_quests_completed integer default 0,p_echoes_completed integer default 0,p_dungeons_completed integer default 0,
  p_collection_entries integer default 0,p_boss_mastery_tier integer default 0
) returns void
language plpgsql security definer set search_path=public as $$
declare v_manifest public.region_content_manifests_v20%rowtype; v_active text;
begin
  select * into v_manifest from public.region_content_manifests_v20 where content_version=p_content_version and region_id=p_region_id and state='published';
  if not found then raise exception 'invalid_or_unpublished_region_content'; end if;
  select content_version into v_active from public.region_content_active_v21 where region_id=p_region_id;
  if v_active is distinct from p_content_version then raise exception 'region_content_version_not_active'; end if;
  if p_story_completed not between 0 and 10 or p_side_quests_completed not between 0 and 8 or p_echoes_completed not between 0 and 4 or p_dungeons_completed not between 0 and 3 or p_collection_entries not between 0 and 16 or p_boss_mastery_tier not between 0 and 4 then raise exception 'invalid_region_progress'; end if;
  insert into public.region_progress_v21(account_id,region_id,content_version,story_completed,side_quests_completed,echoes_completed,dungeons_completed,collection_entries,boss_mastery_tier,updated_at)
  values(p_account_id,p_region_id,p_content_version,p_story_completed,p_side_quests_completed,p_echoes_completed,p_dungeons_completed,p_collection_entries,p_boss_mastery_tier,now())
  on conflict(account_id,region_id) do update set content_version=excluded.content_version,story_completed=greatest(public.region_progress_v21.story_completed,excluded.story_completed),side_quests_completed=greatest(public.region_progress_v21.side_quests_completed,excluded.side_quests_completed),echoes_completed=greatest(public.region_progress_v21.echoes_completed,excluded.echoes_completed),dungeons_completed=greatest(public.region_progress_v21.dungeons_completed,excluded.dungeons_completed),collection_entries=greatest(public.region_progress_v21.collection_entries,excluded.collection_entries),boss_mastery_tier=greatest(public.region_progress_v21.boss_mastery_tier,excluded.boss_mastery_tier),updated_at=excluded.updated_at;
end $$;
revoke all on function public.upsert_region_progress_v21_server(uuid,text,text,integer,integer,integer,integer,integer,integer) from public,anon,authenticated;
grant execute on function public.upsert_region_progress_v21_server(uuid,text,text,integer,integer,integer,integer,integer,integer) to service_role;
