-- Veldryn Supabase usage/logging optimization v1.
-- Environment-specific cron schedules are changed after staging validation.

create schema if not exists private;

create or replace function private.is_current_user_guild_member(p_guild_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.guild_members gm
       where gm.guild_id = p_guild_id
         and gm.account_id = auth.uid()
     );
$$;

revoke all on function private.is_current_user_guild_member(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_current_user_guild_member(uuid) to authenticated;

drop policy if exists "guild members readable" on public.guild_members;
drop policy if exists "guild_members_visible" on public.guild_members;

create policy "guild_members_visible"
on public.guild_members
for select
to authenticated
using (
  account_id = auth.uid()
  or private.is_current_user_guild_member(guild_id)
);

create index if not exists guild_members_account_id_idx
  on public.guild_members(account_id);

create index if not exists coop_run_access_active_seen_idx
  on public.coop_run_access_memberships(last_seen_at, run_id)
  where active;

create index if not exists matchmaking_tickets_reservation_status_idx
  on public.matchmaking_tickets(reservation_id, content_version, status, account_id)
  where reservation_id is not null;

create index if not exists coop_ready_checks_open_closes_idx
  on public.coop_ready_checks(closes_at, id)
  where status='open';

create index if not exists coop_ready_checks_refilling_started_idx
  on public.coop_ready_checks(refill_started_at, id)
  where status='refilling';

create index if not exists coop_due_jobs_online_due_idx
  on public.coop_due_jobs(resource_id, job_kind, due_at, id)
  where status in ('pending','leased');

create index if not exists guild_applications_pending_expiry_idx
  on public.guild_applications(expires_at)
  where status='pending';

create index if not exists guild_invites_pending_expiry_idx
  on public.guild_invites(expires_at)
  where status='pending';

create or replace function public.process_online_tick_server_v1(p_limit integer default 16)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_total integer := 0;
  v_result integer := 0;
begin
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'invalid_worker_limit';
  end if;

  begin
    select public.process_online_qmode_jobs_server_v1(p_limit) into v_result;
    v_total := v_total + coalesce(v_result,0);
  exception when others then
    raise warning 'online tick qmode failed [%]: %', sqlstate, sqlerrm;
  end;

  begin
    select public.expire_online_live_ready_server_v1(p_limit) into v_result;
    v_total := v_total + coalesce(v_result,0);
  exception when others then
    raise warning 'online tick ready-check failed [%]: %', sqlstate, sqlerrm;
  end;

  begin
    select public.process_online_live_jobs_server_v1(p_limit) into v_result;
    v_total := v_total + coalesce(v_result,0);
  exception when others then
    raise warning 'online tick live-worker failed [%]: %', sqlstate, sqlerrm;
  end;

  begin
    select public.reconcile_online_live_presence_server_v1(p_limit) into v_result;
    v_total := v_total + coalesce(v_result,0);
  exception when others then
    raise warning 'online tick presence failed [%]: %', sqlstate, sqlerrm;
  end;

  return v_total;
end
$$;

revoke all on function public.process_online_tick_server_v1(integer) from public, anon, authenticated;
grant execute on function public.process_online_tick_server_v1(integer) to service_role;

create or replace function public.maintain_minute_tick_v18()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_total integer := 0;
  v_result integer := 0;
  v_deleted integer := 0;
begin
  begin
    select public.maintain_party_social_v17() into v_result;
    v_total := v_total + coalesce(v_result,0);
  exception when others then
    raise warning 'minute maintenance social-v17 failed [%]: %', sqlstate, sqlerrm;
  end;

  begin
    delete from public.online_coop_lfg_posts
    where expires_at <= clock_timestamp()
       or closed_at is not null;
    get diagnostics v_deleted = row_count;
    v_total := v_total + v_deleted;
  exception when others then
    raise warning 'minute maintenance lfg cleanup failed [%]: %', sqlstate, sqlerrm;
  end;

  return v_total;
end
$$;

revoke all on function public.maintain_minute_tick_v18() from public, anon, authenticated;
grant execute on function public.maintain_minute_tick_v18() to service_role;

create or replace function private.cleanup_cron_job_run_details_v1(
  p_keep interval,
  p_batch_size integer default 100000
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, cron, private
as $$
declare
  v_deleted integer := 0;
begin
  if p_keep is null or p_keep < interval '1 hour' or p_keep > interval '365 days' then
    raise exception 'invalid_cron_history_retention';
  end if;
  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 250000 then
    raise exception 'invalid_cron_history_batch_size';
  end if;

  with doomed as (
    select ctid
    from cron.job_run_details
    where end_time is not null
      and status <> 'running'
      and start_time < clock_timestamp() - p_keep
    order by start_time
    limit p_batch_size
  )
  delete from cron.job_run_details d
  using doomed
  where d.ctid = doomed.ctid;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end
$$;

revoke all on function private.cleanup_cron_job_run_details_v1(interval,integer) from public, anon, authenticated;


-- Production-safe scheduler default. Staging overrides online cadence/retention after deployment.
do $$
declare
  v_name text;
begin
  if exists(select 1 from pg_available_extensions where name='pg_cron') then
    create extension if not exists pg_cron;

    foreach v_name in array array[
      'veldryn-online-qmode',
      'veldryn-online-live-ready',
      'veldryn-online-live',
      'veldryn-online-live-presence',
      'veldryn-liveops-v17',
      'veldryn-online-coop-lfg-cleanup'
    ]
    loop
      if exists(select 1 from cron.job where jobname=v_name) then
        perform cron.unschedule(v_name);
      end if;
    end loop;

    perform cron.schedule(
      'veldryn-online-tick',
      '10 seconds',
      'select public.process_online_tick_server_v1(16);'
    );
    perform cron.schedule(
      'veldryn-minute-maintenance-v18',
      '* * * * *',
      'select public.maintain_minute_tick_v18();'
    );
    perform cron.schedule(
      'veldryn-cron-history-retention',
      '23 3 * * *',
      $cron$select private.cleanup_cron_job_run_details_v1(interval '7 days',100000);$cron$
    );
  end if;
end
$$;
