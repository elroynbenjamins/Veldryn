-- VELDRYN v0.3 combat-engine persistence.
-- Store compact authoritative summaries by default. Full event traces are debug-only
-- and should be sampled/retained briefly outside the hot gameplay tables.

create table if not exists public.expedition_combat_summaries (
  run_id uuid not null references public.expedition_runs(id) on delete cascade,
  node_index integer not null,
  encounter_id text not null,
  engine_version text not null,
  duration_ms integer not null check (duration_ms >= 0),
  victory boolean not null,
  reason text not null check (reason in ('victory','wipe','timeout')),
  event_count integer not null check (event_count >= 0),
  event_digest text not null,
  downs jsonb not null default '[]'::jsonb,
  player_hp jsonb not null default '{}'::jsonb,
  enemy_hp jsonb not null default '{}'::jsonb,
  damage_json jsonb not null default '{}'::jsonb,
  healing_json jsonb not null default '{}'::jsonb,
  interrupts_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key(run_id,node_index,encounter_id)
);
alter table public.expedition_combat_summaries enable row level security;
create policy expedition_combat_summaries_read_member on public.expedition_combat_summaries
for select using (exists(select 1 from public.expedition_run_members m where m.run_id=expedition_combat_summaries.run_id and m.account_id=auth.uid()));

create or replace function public.commit_expedition_combat_server(
  p_run_id uuid,
  p_node_index integer,
  p_encounter_id text,
  p_engine_version text,
  p_result jsonb,
  p_expected_state_version bigint
) returns bigint
language plpgsql security definer set search_path=public as $$
declare v_next bigint;
begin
  insert into public.expedition_combat_summaries(run_id,node_index,encounter_id,engine_version,duration_ms,victory,reason,event_count,event_digest,downs,player_hp,enemy_hp,damage_json,healing_json,interrupts_json)
  values(p_run_id,p_node_index,p_encounter_id,p_engine_version,(p_result->>'durationMs')::int,(p_result->>'success')::boolean,p_result->>'reason',(p_result->>'eventCount')::int,p_result->>'eventDigest',coalesce(p_result->'downs','[]'),coalesce(p_result->'playerHp','{}'),coalesce(p_result->'enemyHp','{}'),coalesce(p_result->'damage','{}'),coalesce(p_result->'healing','{}'),coalesce(p_result->'interrupts','{}'));

  select public.commit_expedition_encounter_server(p_run_id,p_node_index,p_encounter_id,'live',(p_result->>'success')::boolean,p_result,p_expected_state_version) into v_next;
  return v_next;
end $$;
revoke all on function public.commit_expedition_combat_server(uuid,integer,text,text,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.commit_expedition_combat_server(uuid,integer,text,text,jsonb,bigint) to service_role;
