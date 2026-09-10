-- Service-owned co-op runtime state. Clients receive only the explicit projection.
create table if not exists public.coop_run_private_state (
  run_id uuid primary key references public.expedition_runs(id) on delete cascade,
  state_json jsonb not null,
  updated_at timestamptz not null default clock_timestamp()
);

create table if not exists public.coop_run_client_snapshots (
  run_id uuid primary key references public.expedition_runs(id) on delete cascade,
  state_version bigint not null,
  event_cursor bigint not null default 0,
  projection_json jsonb not null,
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.coop_run_private_state enable row level security;
alter table public.coop_run_client_snapshots enable row level security;
revoke all on public.coop_run_private_state from public, anon, authenticated;
revoke insert, update, delete on public.coop_run_client_snapshots from public, anon, authenticated;
grant select on public.coop_run_client_snapshots to authenticated;

create policy coop_client_snapshot_read_active_member on public.coop_run_client_snapshots
for select using (exists (
  select 1 from public.coop_run_access_memberships a
  where a.run_id=coop_run_client_snapshots.run_id and a.account_id=auth.uid() and a.active
));

-- Align the persisted state machine with the ready-check domain state.
alter table public.coop_ready_checks drop constraint if exists coop_ready_checks_status_check;
alter table public.coop_ready_checks add constraint coop_ready_checks_status_check
check (status in ('open','refilling','committed','expired','cancelled','requeued'));

alter table public.matchmaking_tickets add column if not exists loadout_id text;
alter table public.matchmaking_tickets drop constraint if exists matchmaking_tickets_status_check;
alter table public.matchmaking_tickets add constraint matchmaking_tickets_status_check
check (status in ('queued','reserved','matched','cancelled','expired'));

alter table public.coop_due_jobs add column if not exists lease_owner text;

create or replace function public.load_coop_runtime_server_v1(
  p_run_id uuid,
  p_actor_account_id uuid
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_result jsonb;
begin
  if not exists(
    select 1 from public.coop_run_access_memberships a
    where a.run_id=p_run_id and a.account_id=p_actor_account_id and a.active
  ) then raise exception 'NOT_PARTICIPANT'; end if;

  select jsonb_build_object(
    'runId',r.id,
    'mode',r.coop_mode,
    'phase',r.phase,
    'stateVersion',r.state_version,
    'currentNodeId',r.current_node_id,
    'clearedPreBossCount',r.cleared_pre_boss_count,
    'privateState',p.state_json,
    'clientProjection',c.projection_json,
    'eventCursor',c.event_cursor
  ) into v_result
  from public.expedition_runs r
  join public.coop_run_private_state p on p.run_id=r.id
  join public.coop_run_client_snapshots c on c.run_id=r.id
  where r.id=p_run_id and r.coop_mode is not null;
  if v_result is null then raise exception 'RUN_NOT_FOUND'; end if;
  return v_result;
end; $$;

create or replace function public.commit_coop_runtime_server_v1(
  p_run_id uuid,
  p_actor_account_id uuid,
  p_expected_state_version bigint,
  p_phase text,
  p_current_node_id text,
  p_cleared_pre_boss_count integer,
  p_private_state jsonb,
  p_client_projection jsonb,
  p_event_cursor bigint,
  p_event_type text,
  p_event_payload jsonb,
  p_semantic_key text
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare v_next_version bigint; v_channel_epoch integer;
begin
  if p_phase not in ('awaiting_choice','resolving_node','completed','failed','abandoned') then
    raise exception 'INVALID_PHASE';
  end if;
  if p_cleared_pre_boss_count < 0 or p_cleared_pre_boss_count > 7 then
    raise exception 'INVALID_ROUTE_PROGRESS';
  end if;
  if not exists(
    select 1 from public.coop_run_access_memberships a
    where a.run_id=p_run_id and a.account_id=p_actor_account_id and a.active
  ) then raise exception 'NOT_PARTICIPANT'; end if;

  update public.expedition_runs
  set state_version=state_version+1,
      phase=p_phase,
      current_node_id=p_current_node_id,
      cleared_pre_boss_count=p_cleared_pre_boss_count,
      status=case p_phase when 'completed' then 'completed' when 'failed' then 'failed'
             when 'abandoned' then 'abandoned' else status end,
      completed_at=case when p_phase in ('completed','failed','abandoned') then clock_timestamp() else completed_at end
  where id=p_run_id and coop_mode is not null and state_version=p_expected_state_version
  returning state_version into v_next_version;
  if v_next_version is null then raise exception 'STALE_STATE'; end if;

  insert into public.coop_run_private_state(run_id,state_json,updated_at)
  values(p_run_id,p_private_state,clock_timestamp())
  on conflict(run_id) do update set state_json=excluded.state_json,updated_at=excluded.updated_at;
  insert into public.coop_run_client_snapshots(run_id,state_version,event_cursor,projection_json,updated_at)
  values(p_run_id,v_next_version,p_event_cursor,p_client_projection,clock_timestamp())
  on conflict(run_id) do update set state_version=excluded.state_version,event_cursor=excluded.event_cursor,
    projection_json=excluded.projection_json,updated_at=excluded.updated_at;

  select max(channel_epoch) into v_channel_epoch from public.coop_run_access_memberships
  where run_id=p_run_id and active;
  insert into public.coop_outbox(semantic_key,run_id,channel_epoch,event_type,client_payload)
  values(p_semantic_key,p_run_id,v_channel_epoch,p_event_type,p_event_payload);
  return jsonb_build_object('runId',p_run_id,'stateVersion',v_next_version,'eventCursor',p_event_cursor);
end; $$;

create or replace function public.claim_coop_due_jobs_server_v1(
  p_worker_id text,
  p_limit integer default 16,
  p_lease_ms integer default 30000
) returns setof public.coop_due_jobs
language plpgsql security definer set search_path=public as $$
begin
  if char_length(p_worker_id) < 1 or p_limit < 1 or p_limit > 100 or p_lease_ms < 1000 then
    raise exception 'INVALID_LEASE_REQUEST';
  end if;
  return query
  with candidates as (
    select id from public.coop_due_jobs
    where (status='pending' and due_at<=clock_timestamp())
       or (status='leased' and lease_until<=clock_timestamp())
    order by due_at,id
    for update skip locked
    limit p_limit
  )
  update public.coop_due_jobs j
  set status='leased',lease_owner=p_worker_id,
      lease_until=clock_timestamp()+make_interval(secs=>p_lease_ms/1000.0),
      fencing_generation=j.fencing_generation+1,attempt=j.attempt+1
  from candidates c where j.id=c.id
  returning j.*;
end; $$;

create or replace function public.reserve_coop_match_server_v1(
  p_ticket_ids uuid[],
  p_reservation_id uuid,
  p_now timestamptz,
  p_expires_at timestamptz,
  p_readiness_floor numeric default 0.8
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_count integer; v_eligible integer; v_accounts integer; v_characters integer;
  v_partitions integer; v_tanks integer; v_damage integer; v_support integer;
  v_result jsonb;
begin
  if cardinality(p_ticket_ids)<>4 or p_expires_at<=p_now then raise exception 'INVALID_RESERVATION_REQUEST'; end if;
  perform 1 from public.matchmaking_tickets where id=any(p_ticket_ids) order by id for update;
  select count(*),
    count(*) filter(where status='queued' and heartbeat_expires_at>p_now and normalized_readiness>=p_readiness_floor
      and account_id is not null and loadout_id is not null and loadout_revision is not null and loadout_snapshot_hash is not null),
    count(distinct account_id),count(distinct character_id),
    count(distinct (expedition_id,tier,content_version,balance_version)),
    count(*) filter(where role='tank'),count(*) filter(where role='damage'),count(*) filter(where role='support')
  into v_count,v_eligible,v_accounts,v_characters,v_partitions,v_tanks,v_damage,v_support
  from public.matchmaking_tickets where id=any(p_ticket_ids);
  if v_count<>4 or v_eligible<>4 or v_accounts<>4 or v_characters<>4 or v_partitions<>1
    or v_tanks<>1 or v_damage<>2 or v_support<>1 then raise exception 'RESERVATION_CONFLICT'; end if;

  insert into public.coop_account_reservations(account_id,ticket_id,reservation_kind,expires_at)
  select account_id,id,'queue',p_expires_at from public.matchmaking_tickets where id=any(p_ticket_ids);
  update public.matchmaking_tickets set status='reserved',reservation_id=p_reservation_id,reservation_expires_at=p_expires_at
  where id=any(p_ticket_ids) and status='queued';
  if not found then raise exception 'RESERVATION_CONFLICT'; end if;
  select jsonb_agg(jsonb_build_object(
    'ticketId',id,'accountId',account_id,'characterId',character_id,'role',role,
    'loadoutId',loadout_id,'loadoutRevision',loadout_revision,'loadoutSnapshotHash',loadout_snapshot_hash,
    'originalEnqueuedAt',created_at,'reservationId',reservation_id,'reservationExpiresAt',reservation_expires_at
  ) order by role,id) into v_result from public.matchmaking_tickets where id=any(p_ticket_ids);
  return v_result;
exception when unique_violation then raise exception 'RESERVATION_CONFLICT';
end; $$;

create or replace function public.release_expired_coop_reservations_server_v1(
  p_now timestamptz
) returns integer
language plpgsql security definer set search_path=public as $$
declare v_released integer;
begin
  perform 1 from public.coop_account_reservations
  where reservation_kind='queue' and expires_at<=p_now order by account_id for update;
  update public.matchmaking_tickets t set status='queued',reservation_id=null,reservation_expires_at=null
  from public.coop_account_reservations r
  where r.ticket_id=t.id and r.reservation_kind='queue' and r.expires_at<=p_now and t.status='reserved';
  get diagnostics v_released=row_count;
  delete from public.coop_account_reservations where reservation_kind='queue' and expires_at<=p_now;
  return v_released;
end; $$;

revoke all on function public.load_coop_runtime_server_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.commit_coop_runtime_server_v1(uuid,uuid,bigint,text,text,integer,jsonb,jsonb,bigint,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.claim_coop_due_jobs_server_v1(text,integer,integer) from public,anon,authenticated;
revoke all on function public.reserve_coop_match_server_v1(uuid[],uuid,timestamptz,timestamptz,numeric) from public,anon,authenticated;
revoke all on function public.release_expired_coop_reservations_server_v1(timestamptz) from public,anon,authenticated;
grant execute on function public.load_coop_runtime_server_v1(uuid,uuid) to service_role;
grant execute on function public.commit_coop_runtime_server_v1(uuid,uuid,bigint,text,text,integer,jsonb,jsonb,bigint,text,jsonb,text) to service_role;
grant execute on function public.claim_coop_due_jobs_server_v1(text,integer,integer) to service_role;
grant execute on function public.reserve_coop_match_server_v1(uuid[],uuid,timestamptz,timestamptz,numeric) to service_role;
grant execute on function public.release_expired_coop_reservations_server_v1(timestamptz) to service_role;
