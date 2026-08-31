alter table public.expedition_runs
  add column if not exists route_json jsonb not null default '[]'::jsonb,
  add column if not exists current_node_type text,
  add column if not exists run_nonce uuid not null default gen_random_uuid();

create table if not exists public.expedition_encounter_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  node_index integer not null,
  encounter_id text not null,
  resolution_mode text not null check (resolution_mode in ('live','qmode','server_simulation')),
  success boolean not null,
  result_json jsonb not null,
  state_version_before bigint not null,
  state_version_after bigint not null,
  created_at timestamptz not null default now(),
  unique(run_id, node_index, encounter_id)
);
alter table public.expedition_encounter_results enable row level security;

create policy expedition_encounter_results_read_member on public.expedition_encounter_results
for select using (exists (
  select 1 from public.expedition_run_members m
  where m.run_id = expedition_encounter_results.run_id and m.account_id = auth.uid()
));

-- Service-role only write helper. The caller prepares validated snapshots and a deterministic route.
create or replace function public.create_expedition_run_server(
  p_run_id uuid,
  p_expedition_id text,
  p_tier smallint,
  p_content_version text,
  p_seed_hash text,
  p_created_by uuid,
  p_route_json jsonb,
  p_members jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member jsonb;
begin
  if p_tier < 1 or p_tier > 5 then raise exception 'invalid tier'; end if;
  if jsonb_array_length(p_members) < 1 or jsonb_array_length(p_members) > 4 then raise exception 'invalid party size'; end if;

  insert into public.expedition_runs(id, expedition_id, tier, content_version, seed_hash, created_by, route_json, current_node_type)
  values(p_run_id, p_expedition_id, p_tier, p_content_version, p_seed_hash, p_created_by, p_route_json,
         coalesce(p_route_json->0->>'type','battle'));

  for v_member in select * from jsonb_array_elements(p_members)
  loop
    insert into public.expedition_run_members(run_id, character_id, account_id, role, synced_level, loadout_snapshot, stat_snapshot)
    values(
      p_run_id,
      (v_member->>'characterId')::uuid,
      (v_member->>'accountId')::uuid,
      v_member->>'role',
      (v_member->>'syncedLevel')::int,
      coalesce(v_member->'loadoutSnapshot','{}'::jsonb),
      coalesce(v_member->'statSnapshot','{}'::jsonb)
    );
  end loop;

  insert into public.expedition_telemetry(run_id, account_id, event_type, payload)
  values(p_run_id, p_created_by, 'expedition_run_created', jsonb_build_object('expedition_id',p_expedition_id,'tier',p_tier));
  return p_run_id;
end;
$$;

revoke all on function public.create_expedition_run_server(uuid,text,smallint,text,text,uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.create_expedition_run_server(uuid,text,smallint,text,text,uuid,jsonb,jsonb) to service_role;

create or replace function public.commit_expedition_encounter_server(
  p_run_id uuid,
  p_node_index integer,
  p_encounter_id text,
  p_resolution_mode text,
  p_success boolean,
  p_result_json jsonb,
  p_expected_state_version bigint
) returns bigint
language plpgsql
security definer
set search_path=public
as $$
declare
  v_run public.expedition_runs%rowtype;
  v_next_version bigint;
  v_next_index integer;
  v_route_len integer;
begin
  select * into v_run from public.expedition_runs where id=p_run_id for update;
  if not found then raise exception 'run not found'; end if;
  if v_run.status <> 'active' then raise exception 'run not active'; end if;
  if v_run.state_version <> p_expected_state_version then raise exception 'stale state version'; end if;
  if v_run.node_index <> p_node_index then raise exception 'node mismatch'; end if;

  v_next_version := v_run.state_version + 1;
  v_next_index := v_run.node_index + case when p_success then 1 else 0 end;
  v_route_len := jsonb_array_length(v_run.route_json);

  insert into public.expedition_encounter_results(run_id,node_index,encounter_id,resolution_mode,success,result_json,state_version_before,state_version_after)
  values(p_run_id,p_node_index,p_encounter_id,p_resolution_mode,p_success,p_result_json,v_run.state_version,v_next_version);

  update public.expedition_runs
  set state_version=v_next_version,
      node_index=v_next_index,
      route_progress=least(1, v_next_index::numeric / greatest(1,v_route_len)),
      current_node_type=case when v_next_index < v_route_len then route_json->v_next_index->>'type' else current_node_type end,
      status=case when p_success and v_next_index >= v_route_len then 'completed' when not p_success then 'failed' else status end,
      completed_at=case when (p_success and v_next_index >= v_route_len) or not p_success then now() else completed_at end,
      wipe_count=wipe_count + case when p_success then 0 else 1 end
  where id=p_run_id;

  return v_next_version;
end;
$$;

revoke all on function public.commit_expedition_encounter_server(uuid,integer,text,text,boolean,jsonb,bigint) from public, anon, authenticated;
grant execute on function public.commit_expedition_encounter_server(uuid,integer,text,text,boolean,jsonb,bigint) to service_role;
