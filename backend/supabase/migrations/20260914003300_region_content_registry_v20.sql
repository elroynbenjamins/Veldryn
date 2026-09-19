-- VELDRYN v20 — versioned region-content registry for Sunscar and future regions.
-- Equipment is intentionally NOT part of this registry in v20; regional equipment is awaiting the richer-stat rework.
create table if not exists public.region_content_manifests_v20(
  content_version text primary key,
  region_id text not null,
  schema_version integer not null default 1,
  content_hash text not null,
  state text not null default 'draft' check(state in ('draft','published','retired')),
  minimum_client_build integer not null default 1,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.region_content_records_v20(
  content_version text not null references public.region_content_manifests_v20(content_version) on delete cascade,
  record_type text not null check(record_type in ('region','zone','monster','boss','resource','quest','echo_condition','relic','collectible_unlock','live_dungeon','dungeon_node')),
  record_id text not null,
  sort_order integer not null default 0,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key(content_version,record_type,record_id)
);
create index if not exists region_content_records_lookup_v20 on public.region_content_records_v20(record_type,record_id,content_version);
alter table public.region_content_manifests_v20 enable row level security;
alter table public.region_content_records_v20 enable row level security;
create policy region_content_manifest_read_published_v20 on public.region_content_manifests_v20 for select using(state='published');
create policy region_content_records_read_published_v20 on public.region_content_records_v20 for select using(exists(select 1 from public.region_content_manifests_v20 m where m.content_version=region_content_records_v20.content_version and m.state='published'));

create or replace function public.publish_region_content_v20_server(p_content_version text,p_expected_hash text) returns void
language plpgsql security definer set search_path=public as $$
declare v public.region_content_manifests_v20%rowtype;
begin
 select * into v from public.region_content_manifests_v20 where content_version=p_content_version for update;
 if not found then raise exception 'content manifest not found'; end if;
 if v.state<>'draft' then raise exception 'content manifest immutable after publish'; end if;
 if v.content_hash<>p_expected_hash then raise exception 'content hash mismatch'; end if;
 if not exists(select 1 from public.region_content_records_v20 where content_version=p_content_version and record_type='region') then raise exception 'region record required'; end if;
 if not exists(select 1 from public.region_content_records_v20 where content_version=p_content_version and record_type='boss') then raise exception 'boss record required'; end if;
 update public.region_content_manifests_v20 set state='published',published_at=now() where content_version=p_content_version;
end $$;
revoke all on function public.publish_region_content_v20_server(text,text) from public,anon,authenticated;
grant execute on function public.publish_region_content_v20_server(text,text) to service_role;


-- Published content is immutable. Retiring a manifest is allowed, editing its payload is not.
create or replace function public.prevent_published_region_record_mutation_v20() returns trigger
language plpgsql set search_path=public as $$
declare v_old_state text; v_new_state text;
begin
 if TG_OP in ('UPDATE','DELETE') then
   select state into v_old_state from public.region_content_manifests_v20 where content_version=old.content_version;
   if v_old_state in ('published','retired') then raise exception 'published region content is immutable; create a new content version'; end if;
 end if;
 if TG_OP in ('INSERT','UPDATE') then
   select state into v_new_state from public.region_content_manifests_v20 where content_version=new.content_version;
   if v_new_state in ('published','retired') then raise exception 'published region content is immutable; create a new content version'; end if;
 end if;
 if TG_OP='DELETE' then return old; else return new; end if;
end $$;
drop trigger if exists trg_prevent_published_region_record_mutation_v20 on public.region_content_records_v20;
create trigger trg_prevent_published_region_record_mutation_v20 before insert or update or delete on public.region_content_records_v20
for each row execute function public.prevent_published_region_record_mutation_v20();

create or replace function public.prevent_published_region_manifest_edit_v20() returns trigger
language plpgsql set search_path=public as $$
begin
 if TG_OP='DELETE' then
   if old.state in('published','retired') then raise exception 'published region manifest cannot be deleted'; end if;
   return old;
 end if;
 if old.state in('published','retired') then
   if new.content_hash<>old.content_hash or new.region_id<>old.region_id or new.schema_version<>old.schema_version or new.minimum_client_build<>old.minimum_client_build or new.published_at is distinct from old.published_at or new.created_at is distinct from old.created_at then
     raise exception 'published region manifest is immutable; create a new content version';
   end if;
   if old.state='retired' and new.state<>old.state then raise exception 'retired manifest cannot be reactivated'; end if;
   if old.state='published' and new.state not in('published','retired') then raise exception 'published manifest can only remain published or retire'; end if;
 end if;
 return new;
end $$;
drop trigger if exists trg_prevent_published_region_manifest_edit_v20 on public.region_content_manifests_v20;
create trigger trg_prevent_published_region_manifest_edit_v20 before update or delete on public.region_content_manifests_v20
for each row execute function public.prevent_published_region_manifest_edit_v20();
