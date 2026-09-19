-- VELDRYN v20 — production hardening for synchronous Live Dungeons.
-- Additive to the existing expedition/live queue schema. Current repository migrations remain authoritative.

create table if not exists public.live_dungeon_account_slots(
  account_id uuid primary key references auth.users(id) on delete cascade,
  character_id uuid not null,
  content_id text not null,
  slot_state text not null check(slot_state in ('queue','ready_check','run')),
  queue_ticket_id uuid,
  match_id uuid,
  run_id uuid references public.expedition_runs(id) on delete cascade,
  acquired_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.live_dungeon_matches(
  id uuid primary key default gen_random_uuid(),
  content_id text not null,
  state text not null default 'forming' check(state in ('forming','ready_check','launching','launched','cancelled')),
  state_version bigint not null default 1,
  ready_started_at timestamptz,
  ready_deadline_at timestamptz,
  replacement_cycle integer not null default 0 check(replacement_cycle between 0 and 3),
  run_id uuid references public.expedition_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_dungeon_match_members(
  match_id uuid not null references public.live_dungeon_matches(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null,
  ticket_id uuid,
  role text not null check(role in ('tank','damage','support')),
  class_id text not null,
  combat_level integer not null check(combat_level between 1 and 100),
  power_index numeric not null check(power_index>0),
  loadout_version integer not null check(loadout_version>0),
  ready_response text not null default 'pending' check(ready_response in ('pending','ready','declined','timed_out')),
  ready_responded_at timestamptz,
  primary key(match_id,account_id),
  unique(match_id,character_id)
);

create table if not exists public.live_dungeon_presence(
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null,
  last_heartbeat_at timestamptz not null default now(),
  last_meaningful_input_at timestamptz not null default now(),
  presence_state text not null default 'connected' check(presence_state in ('connected','grace','safety_ai','dropped')),
  live_controlled_seconds integer not null default 0 check(live_controlled_seconds>=0),
  safety_ai_seconds integer not null default 0 check(safety_ai_seconds>=0),
  afk_seconds integer not null default 0 check(afk_seconds>=0),
  manual_contribution_score integer not null default 0 check(manual_contribution_score>=0),
  left_run boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(run_id,account_id)
);

create table if not exists public.live_dungeon_vote_windows(
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  branch_id text not null,
  node_index integer not null,
  option_ids text[] not null,
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  resolved_option_id text,
  resolution_reason text check(resolution_reason in ('unanimous','majority','deadline','tie_break')),
  resolved_at timestamptz,
  state_version bigint not null default 1,
  primary key(run_id,branch_id)
);

create table if not exists public.live_dungeon_recovery_jobs(
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  reason text not null,
  state text not null default 'queued' check(state in ('queued','claimed','resolved','dead_letter')),
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_by text,
  last_error text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create unique index if not exists live_dungeon_one_open_recovery_per_run on public.live_dungeon_recovery_jobs(run_id) where state in ('queued','claimed');

create table if not exists public.live_dungeon_chat_channels(
  run_id uuid primary key references public.expedition_runs(id) on delete cascade,
  channel_id uuid not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.expedition_runs
  add column if not exists live_state text,
  add column if not exists live_server_lease_expires_at timestamptz,
  add column if not exists live_server_heartbeat_at timestamptz,
  add column if not exists live_recovery_count integer not null default 0,
  add column if not exists live_content_revision text;

alter table public.live_dungeon_account_slots enable row level security;
alter table public.live_dungeon_matches enable row level security;
alter table public.live_dungeon_match_members enable row level security;
alter table public.live_dungeon_presence enable row level security;
alter table public.live_dungeon_vote_windows enable row level security;
alter table public.live_dungeon_recovery_jobs enable row level security;
alter table public.live_dungeon_chat_channels enable row level security;

-- Membership helper avoids recursive RLS evaluation on live_dungeon_match_members.
create or replace function public.is_live_dungeon_match_member_v20(p_match_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.live_dungeon_match_members m
    where m.match_id=p_match_id and m.account_id=auth.uid()
  );
$$;
revoke all on function public.is_live_dungeon_match_member_v20(uuid) from public,anon;
grant execute on function public.is_live_dungeon_match_member_v20(uuid) to authenticated,service_role;

-- Use a definer helper here as well so Live Dungeon visibility does not depend on the current
-- RLS implementation of the older expedition_run_members table.
create or replace function public.is_live_dungeon_run_member_v20(p_run_id uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.expedition_run_members me
    where me.run_id=p_run_id and me.account_id=auth.uid()
  );
$$;
revoke all on function public.is_live_dungeon_run_member_v20(uuid) from public,anon;
grant execute on function public.is_live_dungeon_run_member_v20(uuid) to authenticated,service_role;

create policy live_slot_read_self on public.live_dungeon_account_slots for select using(account_id=auth.uid());
create policy live_match_read_member on public.live_dungeon_matches for select using(public.is_live_dungeon_match_member_v20(id));
create policy live_match_member_read_same_match on public.live_dungeon_match_members for select using(public.is_live_dungeon_match_member_v20(match_id));
create policy live_presence_read_same_run on public.live_dungeon_presence for select using(public.is_live_dungeon_run_member_v20(run_id));
create policy live_vote_window_read_same_run on public.live_dungeon_vote_windows for select using(public.is_live_dungeon_run_member_v20(run_id));
create policy live_chat_channel_read_same_run on public.live_dungeon_chat_channels for select using(public.is_live_dungeon_run_member_v20(run_id));
-- Recovery jobs are service/admin-only. No authenticated read policy.

create or replace function public.acquire_live_dungeon_account_slot_server(
  p_account_id uuid,p_character_id uuid,p_content_id text,p_slot_state text,p_expires_at timestamptz,
  p_queue_ticket_id uuid default null,p_match_id uuid default null,p_run_id uuid default null
) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  if p_slot_state not in ('queue','ready_check','run') then raise exception 'invalid live slot state'; end if;
  delete from public.live_dungeon_account_slots where account_id=p_account_id and expires_at<=now();
  begin
    insert into public.live_dungeon_account_slots(account_id,character_id,content_id,slot_state,queue_ticket_id,match_id,run_id,expires_at)
    values(p_account_id,p_character_id,p_content_id,p_slot_state,p_queue_ticket_id,p_match_id,p_run_id,p_expires_at);
    return true;
  exception when unique_violation then return false; end;
end $$;
revoke all on function public.acquire_live_dungeon_account_slot_server(uuid,uuid,text,text,timestamptz,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.acquire_live_dungeon_account_slot_server(uuid,uuid,text,text,timestamptz,uuid,uuid,uuid) to service_role;

create or replace function public.commit_live_dungeon_ready_response_server(
  p_match_id uuid,p_account_id uuid,p_response text,p_expected_state_version bigint
) returns bigint
language plpgsql security definer set search_path=public as $$
declare v_match public.live_dungeon_matches%rowtype;
begin
  if p_response not in ('ready','declined') then raise exception 'invalid ready response'; end if;
  -- The shared state_version identifies this ready-check generation. Individual member responses
  -- do NOT increment it, otherwise the first Ready would make the other three clients stale.
  select * into v_match from public.live_dungeon_matches where id=p_match_id for update;
  if not found then raise exception 'match not found'; end if;
  if v_match.state<>'ready_check' then raise exception 'match not in ready check'; end if;
  if v_match.state_version<>p_expected_state_version then raise exception 'stale match version'; end if;
  if v_match.ready_deadline_at<=now() then raise exception 'ready check expired'; end if;
  update public.live_dungeon_match_members set ready_response=p_response,ready_responded_at=now()
   where match_id=p_match_id and account_id=p_account_id and ready_response='pending';
  if not found then
    if exists(select 1 from public.live_dungeon_match_members where match_id=p_match_id and account_id=p_account_id and ready_response=p_response) then
      return v_match.state_version; -- idempotent retry of the same response
    end if;
    raise exception 'member response already committed';
  end if;
  update public.live_dungeon_matches set updated_at=now() where id=p_match_id;
  return v_match.state_version;
end $$;
revoke all on function public.commit_live_dungeon_ready_response_server(uuid,uuid,text,bigint) from public,anon,authenticated;
grant execute on function public.commit_live_dungeon_ready_response_server(uuid,uuid,text,bigint) to service_role;

create or replace function public.release_live_dungeon_account_slot_server(p_account_id uuid,p_expected_run_id uuid default null) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  if p_expected_run_id is null then delete from public.live_dungeon_account_slots where account_id=p_account_id;
  else delete from public.live_dungeon_account_slots where account_id=p_account_id and run_id=p_expected_run_id; end if;
  return found;
end $$;
revoke all on function public.release_live_dungeon_account_slot_server(uuid,uuid) from public,anon,authenticated;
grant execute on function public.release_live_dungeon_account_slot_server(uuid,uuid) to service_role;

create or replace function public.renew_live_dungeon_account_slot_server(
  p_account_id uuid,p_expected_slot_state text,p_expires_at timestamptz,p_expected_match_id uuid default null,p_expected_run_id uuid default null
) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  if p_expected_slot_state not in ('queue','ready_check','run') then raise exception 'invalid live slot state'; end if;
  if p_expires_at<=now() or p_expires_at>now()+interval '15 minutes' then raise exception 'invalid slot lease expiry'; end if;
  update public.live_dungeon_account_slots
     set expires_at=p_expires_at,updated_at=now()
   where account_id=p_account_id
     and slot_state=p_expected_slot_state
     and (p_expected_match_id is null or match_id=p_expected_match_id)
     and (p_expected_run_id is null or run_id=p_expected_run_id);
  return found;
end $$;
revoke all on function public.renew_live_dungeon_account_slot_server(uuid,text,timestamptz,uuid,uuid) from public,anon,authenticated;
grant execute on function public.renew_live_dungeon_account_slot_server(uuid,text,timestamptz,uuid,uuid) to service_role;

-- Recovery checkpoints. Existing expedition encounter receipts remain canonical for encounter outcomes;
-- these snapshots are only server recovery boundaries between committed nodes.
create table if not exists public.live_dungeon_checkpoints_v20(
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  sequence integer not null check(sequence>=1),
  node_index integer not null check(node_index>=0),
  route_state jsonb not null default '{}'::jsonb,
  party_state jsonb not null default '{}'::jsonb,
  server_version bigint not null,
  checksum text not null,
  created_at timestamptz not null default now(),
  primary key(run_id,sequence)
);

create table if not exists public.live_dungeon_reward_eligibility_v20(
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  account_id uuid not null references auth.users(id) on delete cascade,
  character_id uuid not null,
  eligible boolean not null,
  participation_score numeric(8,6) not null check(participation_score between 0 and 1),
  reason text,
  telemetry_snapshot jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  primary key(run_id,account_id)
);

create table if not exists public.live_dungeon_deserter_events_v20(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid references public.expedition_runs(id) on delete set null,
  classified_intentional boolean not null,
  reason text not null,
  cooldown_minutes integer not null default 0 check(cooldown_minutes between 0 and 60),
  created_at timestamptz not null default now()
);
create index if not exists live_dungeon_deserter_account_v20 on public.live_dungeon_deserter_events_v20(account_id,created_at desc);

alter table public.live_dungeon_checkpoints_v20 enable row level security;
alter table public.live_dungeon_reward_eligibility_v20 enable row level security;
alter table public.live_dungeon_deserter_events_v20 enable row level security;

create policy live_dungeon_checkpoint_read_member_v20 on public.live_dungeon_checkpoints_v20 for select using(public.is_live_dungeon_run_member_v20(run_id));
create policy live_dungeon_reward_eligibility_read_self_v20 on public.live_dungeon_reward_eligibility_v20 for select using(account_id=auth.uid());
create policy live_dungeon_deserter_read_self_v20 on public.live_dungeon_deserter_events_v20 for select using(account_id=auth.uid());

create or replace function public.append_live_dungeon_checkpoint_v20_server(
  p_run_id uuid,p_expected_previous_sequence integer,p_node_index integer,p_route_state jsonb,p_party_state jsonb,p_server_version bigint,p_checksum text
) returns integer
language plpgsql security definer set search_path=public as $$
declare v_latest integer; v_next integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_run_id::text));
  select coalesce(max(sequence),0) into v_latest from public.live_dungeon_checkpoints_v20 where run_id=p_run_id;
  if v_latest<>p_expected_previous_sequence then raise exception 'checkpoint sequence conflict'; end if;
  if not exists(select 1 from public.expedition_runs where id=p_run_id) then raise exception 'run not found'; end if;
  v_next:=v_latest+1;
  insert into public.live_dungeon_checkpoints_v20(run_id,sequence,node_index,route_state,party_state,server_version,checksum)
  values(p_run_id,v_next,p_node_index,coalesce(p_route_state,'{}'::jsonb),coalesce(p_party_state,'{}'::jsonb),p_server_version,p_checksum);
  return v_next;
end $$;
revoke all on function public.append_live_dungeon_checkpoint_v20_server(uuid,integer,integer,jsonb,jsonb,bigint,text) from public,anon,authenticated;
grant execute on function public.append_live_dungeon_checkpoint_v20_server(uuid,integer,integer,jsonb,jsonb,bigint,text) to service_role;

create or replace function public.upsert_live_dungeon_reward_eligibility_v20_server(
  p_run_id uuid,p_account_id uuid,p_character_id uuid,p_eligible boolean,p_participation_score numeric,p_reason text,p_telemetry_snapshot jsonb
) returns void
language plpgsql security definer set search_path=public as $$
begin
  if p_participation_score<0 or p_participation_score>1 then raise exception 'participation score invalid'; end if;
  if not exists(select 1 from public.expedition_run_members where run_id=p_run_id and account_id=p_account_id and character_id=p_character_id) then raise exception 'not run member'; end if;
  insert into public.live_dungeon_reward_eligibility_v20(run_id,account_id,character_id,eligible,participation_score,reason,telemetry_snapshot)
  values(p_run_id,p_account_id,p_character_id,p_eligible,p_participation_score,left(p_reason,160),coalesce(p_telemetry_snapshot,'{}'::jsonb))
  on conflict(run_id,account_id) do update set character_id=excluded.character_id,eligible=excluded.eligible,participation_score=excluded.participation_score,reason=excluded.reason,telemetry_snapshot=excluded.telemetry_snapshot,calculated_at=now();
end $$;
revoke all on function public.upsert_live_dungeon_reward_eligibility_v20_server(uuid,uuid,uuid,boolean,numeric,text,jsonb) from public,anon,authenticated;
grant execute on function public.upsert_live_dungeon_reward_eligibility_v20_server(uuid,uuid,uuid,boolean,numeric,text,jsonb) to service_role;

-- IMPORTANT MERGE NOTE: the current production reward claim path must reject Live Dungeon claims
-- unless the matching `live_dungeon_reward_eligibility_v20` row is eligible=true. The exact reward
-- RPC/domain function may have changed in the user's local repository, so Codex must integrate this
-- guard into the current authoritative reward service rather than blindly replacing an older RPC.
