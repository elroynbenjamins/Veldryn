-- Hidden Player Market V27: bounded retention for authenticated read-rate
-- buckets. No scheduler, launch toggle, Market write RPC or client grants.
begin;

-- The primary key is account/action/time for active-minute quotas; a
-- chronological index makes global expired-bucket maintenance bounded.
create index market_read_bucket_expiry_v27
 on market_api_internal.market_read_buckets_v26(window_start, account_id, action);

-- On every successful read-rate upsert, prune at most 64 of THIS actor's
-- old buckets. The table has no client INSERT/UPDATE/DELETE privileges, and
-- a PostgreSQL trigger cannot be directly invoked via PostgREST.
create function market_api_internal.market_read_prune_actor_v27()
returns trigger
language plpgsql security definer set search_path=''
as $actor_prune$
begin
  with expired as (
    select bucket_row.ctid
      from market_api_internal.market_read_buckets_v26 bucket_row
     where bucket_row.account_id = new.account_id
       and bucket_row.window_start < new.window_start - interval '48 hours'
     order by bucket_row.window_start asc
     limit 64
     for update skip locked
  )
  delete from market_api_internal.market_read_buckets_v26 stale
  using expired
  where stale.ctid = expired.ctid;
  return new;
end;
$actor_prune$;
revoke all on function market_api_internal.market_read_prune_actor_v27()
  from public, anon, authenticated, service_role;

create trigger market_read_prune_actor_v27
after insert or update on market_api_internal.market_read_buckets_v26
for each row execute function market_api_internal.market_read_prune_actor_v27();

-- Inactive accounts do not make new reads, so they need an eventual trusted
-- scheduled cleanup. Expose only to DB owner/postgres; NEVER grant it to
-- anon/authenticated/service_role or install a cron job before launch review.
-- A single call deletes at most p_limit expired records (48-hour retention).
create function market_api_internal.market_prune_old_read_buckets_v27(
  p_limit integer default 250
) returns integer
language plpgsql security invoker set search_path=''
as $global_prune$
declare v_removed integer;
begin
  if p_limit is null or p_limit not between 1 and 1000
  then raise exception 'market_invalid_maintenance' using errcode='22023';
  end if;

  with expired as (
    select bucket_row.ctid
      from market_api_internal.market_read_buckets_v26 bucket_row
     where bucket_row.window_start < pg_catalog.transaction_timestamp() - interval '48 hours'
     order by bucket_row.window_start asc
     limit p_limit
     for update skip locked
  )
  delete from market_api_internal.market_read_buckets_v26 stale
  using expired
  where stale.ctid=expired.ctid;
  get diagnostics v_removed = row_count;
  return v_removed;
end;
$global_prune$;
revoke all on function market_api_internal.market_prune_old_read_buckets_v27(integer)
  from public, anon, authenticated, service_role;

commit;
