-- V26 read-only gateway regression. Run ONLY on disposable Market CI PG17.
-- Synthetic JWT claims and temporary trading-gate relaxation are ROLLED BACK.
begin;
set local statement_timeout='45s';

do $permissions$
begin
 if to_regprocedure(
   'public.market_read_gateway_v26(text,boolean,integer,text,text,text,text,bigint,bigint,integer)'
 ) is null or to_regprocedure(
   'market_api_internal.market_read_authenticated_v26(text,boolean,integer,text,text,text,text,bigint,bigint,integer)'
 ) is null
 then raise exception 'market_v26_missing_read_bridge';end if;

 if has_function_privilege('anon',
      'public.market_read_gateway_v26(text,boolean,integer,text,text,text,text,bigint,bigint,integer)',
      'EXECUTE')
   or has_function_privilege('service_role',
      'public.market_read_gateway_v26(text,boolean,integer,text,text,text,text,bigint,bigint,integer)',
      'EXECUTE')
   or has_function_privilege('anon',
      'market_api_internal.market_read_authenticated_v26(text,boolean,integer,text,text,text,text,bigint,bigint,integer)',
      'EXECUTE')
   or has_function_privilege('service_role',
      'market_api_internal.market_read_authenticated_v26(text,boolean,integer,text,text,text,text,bigint,bigint,integer)',
      'EXECUTE')
   or not has_function_privilege('authenticated',
      'public.market_read_gateway_v26(text,boolean,integer,text,text,text,text,bigint,bigint,integer)',
      'EXECUTE')
   or has_table_privilege('authenticated',
      'market_api_internal.market_read_buckets_v26','SELECT')
   or has_table_privilege('service_role',
      'market_api_internal.market_read_buckets_v26','INSERT')
   or has_schema_privilege('authenticated','private','USAGE')
 then raise exception 'market_v26_acl_fail';end if;

 if not exists(select 1 from pg_catalog.pg_class c
   where c.oid='market_api_internal.market_read_buckets_v26'::regclass
     and c.relrowsecurity)
   or (select p.prosecdef from pg_catalog.pg_proc p
     where p.oid='public.market_read_gateway_v26(text,boolean,integer,text,text,text,text,bigint,bigint,integer)'::regprocedure)
   or not (select p.prosecdef from pg_catalog.pg_proc p
     where p.oid='market_api_internal.market_read_authenticated_v26(text,boolean,integer,text,text,text,text,bigint,bigint,integer)'::regprocedure)
 then raise exception 'market_v26_security_mode_fail';end if;
end;
$permissions$;

-- Without an authenticated JWT, even direct definer invocation fails.
do $anonymous$
begin
 begin
  perform market_api_internal.market_read_authenticated_v26('inbox');
  raise exception 'unexpected_market_v26_unauth_success';
 exception when sqlstate '28000' then
  if sqlerrm<>'market_auth_required' then raise;end if;
 end;
end;
$anonymous$;

-- Authenticated SQL should fail CLOSED on the actual Market launch guard,
-- without touching balances, holds, offers, or rate tables.
select pg_catalog.set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000001"}',true);
set local role authenticated;
do $disabled$
begin
 begin
  perform public.market_read_gateway_v26('browse');
  raise exception 'unexpected_market_v26_browse_success';
 exception when raise_exception then
  if sqlerrm<>'market_disabled' then raise;end if;
 end;
 begin
  perform public.market_read_gateway_v26('inbox');
  raise exception 'unexpected_market_v26_inbox_success';
 exception when raise_exception then
  if sqlerrm<>'market_disabled' then raise;end if;
 end;
 begin
  perform public.market_read_gateway_v26('write');
  raise exception 'unexpected_market_v26_write_success';
 exception when invalid_parameter_value then
  if sqlerrm<>'market_invalid_read' then raise;end if;
 end;
 begin
  perform public.market_read_gateway_v26('browse',p_limit=>51);
  raise exception 'unexpected_market_v26_limit_success';
 exception when invalid_parameter_value then
  if sqlerrm<>'market_invalid_read' then raise;end if;
 end;
end;
$disabled$;
reset role;

do $no_mutation$
begin
 if exists (select 1 from market_api_internal.market_read_buckets_v26)
 then raise exception 'market_v26_disabled_recorded_rate_hit';end if;
end;
$no_mutation$;

-- Disposable CI only: temporarily relax BOTH explicit false guard
-- constraints, then test the real V24 read projections and V26 rate buckets.
-- No price approvals, tradable items or payment fixtures are inserted.
do $open_gate_test_only$
declare c record;
begin
 for c in select conname from pg_catalog.pg_constraint
  where conrelid='private.market_runtime_guard_v1'::regclass
    and contype='c' and
    (pg_catalog.pg_get_constraintdef(oid) like '%trading_enabled%'
      or pg_catalog.pg_get_constraintdef(oid) like '%snapshot_bridge_ready%')
 loop
  execute pg_catalog.format('alter table private.market_runtime_guard_v1 drop constraint %I',c.conname);
 end loop;
 update private.market_runtime_guard_v1
   set trading_enabled=true,snapshot_bridge_ready=true where singleton;
 if not exists(select 1 from private.market_runtime_guard_v1
      where singleton and trading_enabled and snapshot_bridge_ready)
 then raise exception 'market_v26_test_gate_not_enabled';end if;
end;
$open_gate_test_only$;

select pg_catalog.set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000001"}',true);
set local role authenticated;
do $rate_test$
declare v jsonb;
begin
 v:=public.market_read_gateway_v26('browse',p_limit=>8);
 if v->'entries'<>'[]'::jsonb or v->>'limit'<>'8'
 then raise exception 'market_v26_browse_projection_invalid';end if;

 for i in 2..30 loop
  perform public.market_read_gateway_v26('browse');
 end loop;
 begin
  perform public.market_read_gateway_v26('browse');
  raise exception 'unexpected_market_v26_browse_31_success';
 exception when raise_exception then
  if sqlerrm<>'market_rate_limited' then raise;end if;
 end;

 for i in 1..20 loop
  v:=public.market_read_gateway_v26('inbox',p_history=>true);
  if v->'entries'<>'[]'::jsonb or v->>'pendingCount'<>'0'
  then raise exception 'market_v26_inbox_projection_invalid';end if;
 end loop;
 begin
  perform public.market_read_gateway_v26('inbox');
  raise exception 'unexpected_market_v26_inbox_21_success';
 exception when raise_exception then
  if sqlerrm<>'market_rate_limited' then raise;end if;
 end;
end;
$rate_test$;

-- A different authenticated actor has a separate durable bucket and must
-- not inherit another account's throttle or Inbox contents.
select pg_catalog.set_config('request.jwt.claims',
  '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000002"}',true);
do $isolation$
begin
 perform public.market_read_gateway_v26('browse');
 perform public.market_read_gateway_v26('inbox');
end;
$isolation$;
reset role;

do $verify$
begin
 if (select count(*) from market_api_internal.market_read_buckets_v26)<>4
    or (select hit_count from market_api_internal.market_read_buckets_v26
      where account_id='10000000-0000-4000-8000-000000000001'::uuid
        and action='browse')<>30
    or (select hit_count from market_api_internal.market_read_buckets_v26
      where account_id='10000000-0000-4000-8000-000000000001'::uuid
        and action='inbox')<>20
    or (select hit_count from market_api_internal.market_read_buckets_v26
      where account_id='10000000-0000-4000-8000-000000000002'::uuid
        and action='browse')<>1
 then raise exception 'market_v26_account_rate_bucket_fail';end if;
end;
$verify$;
rollback;
