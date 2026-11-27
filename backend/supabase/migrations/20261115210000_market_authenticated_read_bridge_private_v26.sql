-- Veldryn hidden Market V26: authenticated V24 reads through a narrow,
-- session-bound, rate-limited SQL bridge. NO trading launch, seller payout,
-- delivery claim, client-side custody or private V24 grants.
begin;

-- This schema is NOT exposed through PostgREST. Granting USAGE here does
-- not grant access to the existing, separately protected private schema.
create schema if not exists market_api_internal;
revoke all on schema market_api_internal from public, anon, authenticated, service_role;
grant usage on schema market_api_internal to authenticated;

create table market_api_internal.market_read_buckets_v26 (
  account_id uuid not null,
  action text not null check (action in ('browse','inbox')),
  window_start timestamptz not null,
  hit_count integer not null check (hit_count between 1 and 30),
  primary key (account_id, action, window_start)
);
alter table market_api_internal.market_read_buckets_v26 enable row level security;
revoke all on table market_api_internal.market_read_buckets_v26
 from public, anon, authenticated, service_role;
-- No policies. Only the trusted definer may change these rows; do not add
-- a scheduled cleanup until an audited, bounded retention worker exists.

create function market_api_internal.market_read_authenticated_v26(
  p_action text,
  p_history boolean default false,
  p_offset integer default 0,
  p_kind text default 'all',
  p_item_id text default null,
  p_search text default null,
  p_sort text default 'price_asc',
  p_min_total_gold bigint default null,
  p_max_total_gold bigint default null,
  p_limit integer default 25
) returns jsonb
language plpgsql volatile security definer set search_path = ''
as $market_authenticated_read$
declare
  v_actor uuid;
  v_window timestamptz;
  v_max integer;
  v_hit integer;
begin
  -- Calling this from a service-role RPC or from a forged account parameter
  -- is intentionally impossible: verified PostgREST authenticated JWT context
  -- is the ONLY account selector. There is NO p_account_id input.
  if coalesce(
       nullif(pg_catalog.current_setting('request.jwt.claims', true),'')::jsonb->>'role',
       nullif(pg_catalog.current_setting('request.jwt.claim.role', true),'')
     ) is distinct from 'authenticated'
     or (select auth.uid()) is null
  then raise exception 'market_auth_required' using errcode='28000'; end if;
  v_actor := (select auth.uid());

  if p_action is null or p_action not in ('browse','inbox')
     or p_history is null or p_offset is null
  then raise exception 'market_invalid_read' using errcode='22023'; end if;

  if p_action = 'browse' then
    if p_history or p_kind is null or p_kind not in ('all','resource','equipment')
       or p_sort is null or p_sort not in ('price_asc','price_desc','newest')
       or p_offset not between 0 and 1000 or p_limit is null
       or p_limit not between 1 and 50
       or (p_item_id is not null and (length(p_item_id) not between 1 and 180
           or p_item_id !~ '^[A-Za-z0-9_:-]+$'))
       or (p_search is not null and (length(p_search) not between 1 and 60
           or p_search !~ '^[A-Za-z0-9_ :-]+$'))
       or (p_min_total_gold is not null and
           p_min_total_gold not between 1 and 1000000000000000)
       or (p_max_total_gold is not null and
           p_max_total_gold not between 1 and 1000000000000000)
       or (p_min_total_gold is not null and p_max_total_gold is not null
           and p_min_total_gold > p_max_total_gold)
    then raise exception 'market_invalid_read' using errcode='22023'; end if;
  else
    if p_offset not between 0 and 10000 or p_kind is distinct from 'all'
       or p_item_id is not null or p_search is not null
       or p_sort is distinct from 'price_asc'
       or p_min_total_gold is not null or p_max_total_gold is not null
       or p_limit is distinct from 25
    then raise exception 'market_invalid_read' using errcode='22023'; end if;
  end if;

  -- Keep BOTH hard-false launch gates active until an independent audited
  -- release. A disabled Market must not create rate records.
  if not exists (
    select 1 from private.market_runtime_guard_v1
    where singleton and trading_enabled and snapshot_bridge_ready
  ) then raise exception 'market_disabled' using errcode='P0001'; end if;

  -- One atomic, durable rate bucket per verified account, action and minute.
  -- Concurrent workers cannot overrun the per-minute cap through a SELECT
  -- then UPDATE race. The 30/20 limits are independent of Edge processes.
  v_max := case when p_action = 'browse' then 30 else 20 end;
  v_window := pg_catalog.date_trunc('minute', pg_catalog.transaction_timestamp());
  insert into market_api_internal.market_read_buckets_v26 as bucket
    (account_id,action,window_start,hit_count)
    values (v_actor,p_action,v_window,1)
  on conflict (account_id,action,window_start) do update
    set hit_count=bucket.hit_count+1
    where bucket.hit_count < v_max
  returning hit_count into v_hit;
  if v_hit is null then
    raise exception 'market_rate_limited' using errcode='P0001';
  end if;

  if p_action = 'browse' then
    return private.market_browse_combined_v24(
      p_kind,p_item_id,p_search,p_sort,p_min_total_gold,p_max_total_gold,
      p_limit,p_offset
    );
  end if;
  return private.market_inbox_unified_v24(v_actor,p_history,p_offset);
end;
$market_authenticated_read$;

revoke all on function market_api_internal.market_read_authenticated_v26(
  text,boolean,integer,text,text,text,text,bigint,bigint,integer)
  from public,anon,authenticated,service_role;
grant execute on function market_api_internal.market_read_authenticated_v26(
  text,boolean,integer,text,text,text,text,bigint,bigint,integer)
  to authenticated;

-- Public PostgREST facade has NO elevated privileges; its restricted
-- private target performs the actor/role validation and account-scoped
-- rate limiting. It has no accountId argument or arbitrary RPC names.
create function public.market_read_gateway_v26(
  p_action text,
  p_history boolean default false,
  p_offset integer default 0,
  p_kind text default 'all',
  p_item_id text default null,
  p_search text default null,
  p_sort text default 'price_asc',
  p_min_total_gold bigint default null,
  p_max_total_gold bigint default null,
  p_limit integer default 25
) returns jsonb
language sql volatile security invoker set search_path = ''
as $market_read_facade$
  select market_api_internal.market_read_authenticated_v26(
    p_action,p_history,p_offset,p_kind,p_item_id,p_search,p_sort,
    p_min_total_gold,p_max_total_gold,p_limit);
$market_read_facade$;
revoke all on function public.market_read_gateway_v26(
  text,boolean,integer,text,text,text,text,bigint,bigint,integer)
  from public,anon,authenticated,service_role;
grant execute on function public.market_read_gateway_v26(
  text,boolean,integer,text,text,text,text,bigint,bigint,integer)
  to authenticated;

-- Intentionally DO NOT alter the V24 private functions' revoked permissions,
-- DB launch gates, any Market write RPC, or deployed Edge routes.
commit;
