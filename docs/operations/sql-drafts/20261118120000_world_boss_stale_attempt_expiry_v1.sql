-- DRAFT / NOT DEPLOYABLE. The live World Boss release fence requires this
-- proposal to remain outside backend/supabase/migrations until approved.
-- World Boss v19 refinement: stale attempt reservations.
--
-- A reservation that is never settled (app closed mid-fight, lost connection, crashed combat worker)
-- stayed in state 'reserved' forever. Because reserve_shared_world_boss_attempt refuses to open a new
-- attempt while any 'reserved' row exists, and uq_shared_world_boss_open_attempt enforces the same,
-- the account was locked out of that boss for the rest of the event, and finalization had to wait
-- out the in-flight grace period for attempts that would never settle.
--
-- Expired reservations now move to 'expired'. An expired attempt still consumes its daily slot (and
-- its Echo use), so abandoning a fight can never be used to re-roll an attempt. Admin repair keeps
-- using 'cancelled' for an explicit refund.

begin;

create index if not exists idx_shared_world_boss_attempt_stale
  on public.shared_world_world_boss_attempts(expires_at)
  where state='reserved';

-- Worker sweep, run once per minute by runSharedWorldWorker (expireStaleBossAttempts).
create or replace function public.expire_stale_shared_world_boss_attempts(p_now timestamptz default now())
returns integer
language plpgsql security definer set search_path=public, pg_temp as $$
declare
  v_count integer;
begin
  update public.shared_world_world_boss_attempts as a
     set state='expired'
   where a.state='reserved' and a.expires_at < p_now;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.expire_stale_shared_world_boss_attempts(timestamptz) from public,anon,authenticated;
grant execute on function public.expire_stale_shared_world_boss_attempts(timestamptz) to service_role;

create or replace function public.reserve_shared_world_boss_attempt(
  p_boss_id uuid,
  p_source_request_id text,
  p_account_id uuid,
  p_character_id uuid,
  p_date_key date,
  p_echo_only boolean,
  p_phase_id text,
  p_expires_at timestamptz,
  p_effective_daily_cap integer,
  p_party_id uuid default null,
  p_party_name text default null,
  p_guild_id uuid default null,
  p_guild_name text default null
)
returns public.shared_world_world_boss_attempts
language plpgsql security definer set search_path=public, pg_temp as $$
declare
  v_boss public.shared_world_world_bosses%rowtype;
  v_existing public.shared_world_world_boss_attempts%rowtype;
  v_attempt public.shared_world_world_boss_attempts%rowtype;
  v_today integer;
  v_valid_total integer;
  v_echo_total integer;
  v_echo_hours integer;
begin
  if p_effective_daily_cap < 1 or p_effective_daily_cap > 12 then raise exception 'world_boss_daily_cap_invalid'; end if;
  perform pg_advisory_xact_lock(hashtext(p_boss_id::text),hashtext(p_account_id::text));
  select * into v_existing from public.shared_world_world_boss_attempts a where a.boss_id=p_boss_id and a.account_id=p_account_id and a.source_request_id=p_source_request_id;
  if found then return v_existing; end if;
  -- Release this account's abandoned reservation before checking for an open attempt.
  update public.shared_world_world_boss_attempts as a set state='expired'
   where a.boss_id=p_boss_id and a.account_id=p_account_id and a.state='reserved' and a.expires_at < now();
  if exists(select 1 from public.shared_world_world_boss_attempts a where a.boss_id=p_boss_id and a.account_id=p_account_id and a.state='reserved') then raise exception 'world_boss_attempt_already_open'; end if;
  select * into v_boss from public.shared_world_world_bosses b where b.id=p_boss_id;
  if not found then raise exception 'world_boss_not_found'; end if;
  if now() < v_boss.starts_at or now() >= v_boss.ends_at then raise exception 'world_boss_not_in_schedule'; end if;
  select count(*) filter(where not a.echo_only and a.state in('reserved','settled','expired')),
         count(*) filter(where a.echo_only and a.state in('reserved','settled','expired'))
    into v_valid_total,v_echo_total
    from public.shared_world_world_boss_attempts a where a.boss_id=p_boss_id and a.account_id=p_account_id;
  if p_echo_only then
    if v_boss.state <> 'defeated' or v_boss.defeated_at is null then raise exception 'world_boss_echo_not_available'; end if;
    v_echo_hours := greatest(0,least(coalesce((v_boss.definition_snapshot->>'postDefeatEchoWindowHours')::integer,12),24));
    if now() >= least(v_boss.ends_at,v_boss.defeated_at + make_interval(hours=>v_echo_hours)) then raise exception 'world_boss_echo_window_closed'; end if;
    if v_valid_total > 0 then raise exception 'world_boss_echo_already_participated'; end if;
    if v_echo_total > 0 then raise exception 'world_boss_echo_already_used'; end if;
  else
    if v_boss.state <> 'active' then raise exception 'world_boss_not_active'; end if;
    select count(*) into v_today from public.shared_world_world_boss_attempts a where a.boss_id=p_boss_id and a.account_id=p_account_id and a.date_key=p_date_key and not a.echo_only and a.state in('reserved','settled','expired');
    if v_today >= least(v_boss.daily_scored_attempts,p_effective_daily_cap) then raise exception 'world_boss_daily_attempt_limit'; end if;
  end if;
  insert into public.shared_world_world_boss_attempts(boss_id,source_request_id,account_id,character_id,date_key,echo_only,phase_id,expires_at,party_id_at_start,party_name_snapshot,guild_id_at_start,guild_name_snapshot)
  values(p_boss_id,p_source_request_id,p_account_id,p_character_id,p_date_key,p_echo_only,p_phase_id,p_expires_at,p_party_id,left(p_party_name,80),p_guild_id,left(p_guild_name,80))
  returning * into v_attempt;
  return v_attempt;
end $$;
revoke all on function public.reserve_shared_world_boss_attempt(uuid,text,uuid,uuid,date,boolean,text,timestamptz,integer,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_shared_world_boss_attempt(uuid,text,uuid,uuid,date,boolean,text,timestamptz,integer,uuid,text,uuid,text) to service_role;

commit;
