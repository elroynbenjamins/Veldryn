-- Hidden Market V27: bounded per-account and global read-bucket retention.
-- Transaction-scoped tests; never leave synthetic accounts or cron jobs.
begin;
set local statement_timeout='30s';
do $acl$
begin
 if not exists (select 1 from pg_indexes
    where schemaname='market_api_internal'
      and indexname='market_read_bucket_expiry_v27')
    or not exists(select 1 from pg_trigger
    where tgname='market_read_prune_actor_v27'
      and tgrelid='market_api_internal.market_read_buckets_v26'::regclass
      and not tgisinternal)
 then raise exception 'market_v27_retention_objects_missing';end if;

 if has_function_privilege('anon',
      'market_api_internal.market_prune_old_read_buckets_v27(integer)','EXECUTE')
    or has_function_privilege('authenticated',
      'market_api_internal.market_prune_old_read_buckets_v27(integer)','EXECUTE')
    or has_function_privilege('service_role',
      'market_api_internal.market_prune_old_read_buckets_v27(integer)','EXECUTE')
    or has_function_privilege('authenticated',
      'market_api_internal.market_read_prune_actor_v27()','EXECUTE')
    or has_table_privilege('authenticated',
      'market_api_internal.market_read_buckets_v26','INSERT')
 then raise exception 'market_v27_retention_exposed';end if;
end;
$acl$;

do $retention$
declare
 a uuid='10000000-0000-4000-8000-000000000001';
 b uuid='10000000-0000-4000-8000-000000000002';
 window_now timestamptz=pg_catalog.date_trunc('minute',pg_catalog.transaction_timestamp());
 removed integer;
begin
 if exists(select 1 from market_api_internal.market_read_buckets_v26)
 then raise exception 'market_v27_bucket_fixture_not_empty';end if;

 -- The old accounts have stale and young records; a current upsert for
 -- account A must only prune old records belonging to A.
 insert into market_api_internal.market_read_buckets_v26
 (account_id,action,window_start,hit_count) values
 (a,'browse',window_now-interval '72 hours',2),
 (a,'inbox',window_now-interval '49 hours',4),
 (a,'browse',window_now-interval '47 hours',3),
 (b,'browse',window_now-interval '72 hours',6),
 (b,'inbox',window_now-interval '47 hours',7);

 insert into market_api_internal.market_read_buckets_v26
 (account_id,action,window_start,hit_count)
 values(a,'browse',window_now,1)
 on conflict(account_id,action,window_start) do update
 set hit_count=market_api_internal.market_read_buckets_v26.hit_count+1
 where market_api_internal.market_read_buckets_v26.hit_count<30;

 if exists(select 1 from market_api_internal.market_read_buckets_v26
   where account_id=a and window_start<window_now-interval '48 hours')
   or not exists(select 1 from market_api_internal.market_read_buckets_v26
   where account_id=b and window_start=window_now-interval '72 hours')
   or not exists(select 1 from market_api_internal.market_read_buckets_v26
   where account_id=a and window_start=window_now-interval '47 hours')
 then raise exception 'market_v27_actor_cleanup_wrong_scope';end if;

 removed:=market_api_internal.market_prune_old_read_buckets_v27(1);
 if removed<>1
  or exists(select 1 from market_api_internal.market_read_buckets_v26
   where account_id=b and window_start=window_now-interval '72 hours')
  or (select count(*) from market_api_internal.market_read_buckets_v26)<>4
 then raise exception 'market_v27_global_cleanup_bad_count';end if;
 if market_api_internal.market_prune_old_read_buckets_v27(50)<>0
 then raise exception 'market_v27_cleanup_not_idempotent';end if;

 begin
   perform market_api_internal.market_prune_old_read_buckets_v27(1001);
   raise exception 'market_v27_invalid_limit_accepted';
 exception when invalid_parameter_value then
   if sqlerrm<>'market_invalid_maintenance' then raise;end if;
 end;
end;
$retention$;
rollback;
