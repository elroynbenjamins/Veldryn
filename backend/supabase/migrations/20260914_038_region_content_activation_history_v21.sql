-- VELDRYN v21 — append-only activation history for operational rollback review.

create table if not exists public.region_content_activation_history_v21(
  id bigint generated always as identity primary key,
  region_id text not null,
  previous_content_version text,
  content_version text not null references public.region_content_manifests_v20(content_version),
  activated_at timestamptz not null default now()
);
alter table public.region_content_activation_history_v21 enable row level security;
revoke all on public.region_content_activation_history_v21 from public,anon,authenticated;
grant select on public.region_content_activation_history_v21 to service_role;

create or replace function public.activate_region_content_v21_server(p_region_id text,p_content_version text) returns void
language plpgsql security definer set search_path=public as $$
declare v public.region_content_manifests_v20%rowtype; v_previous text;
begin
  select * into v from public.region_content_manifests_v20 where content_version=p_content_version;
  if not found then raise exception 'content manifest not found'; end if;
  if v.region_id<>p_region_id then raise exception 'region/content mismatch'; end if;
  if v.state<>'published' then raise exception 'only published content may be activated'; end if;
  select content_version into v_previous from public.region_content_active_v21 where region_id=p_region_id for update;
  insert into public.region_content_active_v21(region_id,content_version,activated_at)
  values(p_region_id,p_content_version,now())
  on conflict(region_id) do update set content_version=excluded.content_version,activated_at=excluded.activated_at;
  insert into public.region_content_activation_history_v21(region_id,previous_content_version,content_version)
  values(p_region_id,v_previous,p_content_version);
end $$;
revoke all on function public.activate_region_content_v21_server(text,text) from public,anon,authenticated;
grant execute on function public.activate_region_content_v21_server(text,text) to service_role;
