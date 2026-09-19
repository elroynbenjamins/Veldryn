-- v21 live matches must capture the active regional content before launch.

create or replace function public.prevent_live_dungeon_launch_without_content_v21() returns trigger
language plpgsql set search_path=public as $$
begin
  if new.region_id is not null and new.state in ('launching','launched') and new.content_version is null then
    raise exception 'live match content snapshot required';
  end if;
  return new;
end $$;
drop trigger if exists trg_live_dungeon_launch_content_guard_v21 on public.live_dungeon_matches;
create trigger trg_live_dungeon_launch_content_guard_v21
before insert or update on public.live_dungeon_matches
for each row execute function public.prevent_live_dungeon_launch_without_content_v21();

create or replace function public.create_live_dungeon_match_v21_server(
  p_match_id uuid,p_content_id text,p_region_id text,p_created_at timestamptz default now()
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_content_version text;
begin
  select a.content_version into v_content_version
  from public.region_content_active_v21 a
  join public.region_content_records_v20 r on r.content_version=a.content_version and r.record_type='live_dungeon' and r.record_id=p_content_id
  join public.region_content_manifests_v20 m on m.content_version=a.content_version and m.state='published'
  where a.region_id=p_region_id;
  if v_content_version is null then raise exception 'active_live_dungeon_content_not_found'; end if;
  insert into public.live_dungeon_matches(id,content_id,region_id,content_version,state,created_at,updated_at)
  values(p_match_id,p_content_id,p_region_id,v_content_version,'forming',p_created_at,p_created_at);
  return p_match_id;
end $$;
revoke all on function public.create_live_dungeon_match_v21_server(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.create_live_dungeon_match_v21_server(uuid,text,text,timestamptz) to service_role;
