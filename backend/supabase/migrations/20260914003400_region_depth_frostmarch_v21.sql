-- VELDRYN v21 — deepen versioned region content and add active-version routing.
-- Depends on v20 region_content_* registry. Equipment remains outside this pass.

alter table public.region_content_records_v20
  drop constraint if exists region_content_records_v20_record_type_check;
alter table public.region_content_records_v20
  add constraint region_content_records_v20_record_type_check check(record_type in (
    'region','zone','monster','boss','resource','quest','echo_condition','relic','collectible_unlock','live_dungeon','dungeon_node',
    'side_quest','activity','achievement','collection_book','weather_rule','region_contract','boss_mastery'
  ));

create table if not exists public.region_content_active_v21(
  region_id text primary key,
  content_version text not null references public.region_content_manifests_v20(content_version),
  activated_at timestamptz not null default now()
);
alter table public.region_content_active_v21 enable row level security;
create policy region_content_active_read_v21 on public.region_content_active_v21 for select using(
  exists(select 1 from public.region_content_manifests_v20 m where m.content_version=region_content_active_v21.content_version and m.region_id=region_content_active_v21.region_id and m.state='published')
);

create or replace function public.activate_region_content_v21_server(p_region_id text,p_content_version text) returns void
language plpgsql security definer set search_path=public as $$
declare v public.region_content_manifests_v20%rowtype;
begin
  select * into v from public.region_content_manifests_v20 where content_version=p_content_version;
  if not found then raise exception 'content manifest not found'; end if;
  if v.region_id<>p_region_id then raise exception 'region/content mismatch'; end if;
  if v.state<>'published' then raise exception 'only published content may be activated'; end if;
  insert into public.region_content_active_v21(region_id,content_version,activated_at)
  values(p_region_id,p_content_version,now())
  on conflict(region_id) do update set content_version=excluded.content_version,activated_at=excluded.activated_at;
end $$;
revoke all on function public.activate_region_content_v21_server(text,text) from public,anon,authenticated;
grant execute on function public.activate_region_content_v21_server(text,text) to service_role;

create or replace view public.active_region_content_records_v21 as
select a.region_id,a.content_version,r.record_type,r.record_id,r.sort_order,r.payload
from public.region_content_active_v21 a
join public.region_content_manifests_v20 m on m.content_version=a.content_version and m.region_id=a.region_id and m.state='published'
join public.region_content_records_v20 r on r.content_version=a.content_version;

revoke all on public.active_region_content_records_v21 from public,anon;
grant select on public.active_region_content_records_v21 to authenticated,service_role;

-- Schema-driven Control Center registrations. These are safe to include after the v17.3 dependency chain.
insert into public.ops_admin_command_registry
(command_key,category,label,description,target_scope,min_role,risk_tier,handler_key,params_schema,reversible,requires_approval,notes)
values
('region_content.activate_version','Content','Activate region version','Point a region at a published immutable content version.','none','owner','critical','region_content.activate_version','{"fields":[{"name":"regionId","label":"Region ID","type":"text","required":true,"minLength":3,"maxLength":40},{"name":"contentVersion","label":"Published content version","type":"text","required":true,"minLength":3,"maxLength":100}]}',true,true,'Activation changes routing only; it does not mutate published content.'),
('region_content.rollback_active_version','Content','Rollback region version','Return a region to a previously published immutable content version.','none','owner','critical','region_content.rollback_active_version','{"fields":[{"name":"regionId","label":"Region ID","type":"text","required":true,"minLength":3,"maxLength":40},{"name":"contentVersion","label":"Previous published version","type":"text","required":true,"minLength":3,"maxLength":100}]}',true,true,'Rollback is implemented by changing the active pointer, never editing live content.')
on conflict(command_key) do update set label=excluded.label,description=excluded.description,risk_tier=excluded.risk_tier,handler_key=excluded.handler_key,params_schema=excluded.params_schema,reversible=excluded.reversible,requires_approval=excluded.requires_approval,notes=excluded.notes,updated_at=now();

insert into public.ops_remote_config(config_key,category,label,description,value_type,default_value,current_value,exposure,risk_tier,live_change_safe,constraints_json,notes) values
('content.frostmarch.enabled','Content','Frostmarch','Master gate for starting new Frostmarch gameplay after the region is deployed.','boolean','true','true','client_safe','critical',true,'{}','Does not delete progression or terminate already-running dungeon attempts.'),
('content.sunscar.side_content.enabled','Content','Sunscar side content','Gate for v21 Sunscar side quests/journal activities. Core Sunscar story remains independently available.','boolean','true','true','client_safe','medium',true,'{}','Use only to disable the v21 side-content layer; do not hide core regional progression.')
on conflict(config_key) do nothing;
