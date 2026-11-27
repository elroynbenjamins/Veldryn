#!/usr/bin/env bash
# Disposable localhost PG17 CI ONLY. Simulates four authenticated workers
# competing for one Market read-rate bucket. NEVER run on staging/production.
set -euo pipefail
: "${PGDATABASE:?}" "${PGHOST:?}"
if [[ "$PGDATABASE" != "veldryn_market_ci" || "$PGHOST" != "localhost" ]]; then
  echo "Refusing Market V27 rate race outside disposable localhost CI" >&2
  exit 2
fi
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
actor="10000000-0000-4000-8000-000000000009"

# Guard against straddling two separate UTC minute windows. All workers use
# one transaction_timestamp per connection, so their bucket key is stable.
second="$(date -u +%S)"
if (( 10#$second >= 45 )); then
  sleep "$((60-10#$second))"
fi

# The disposable database is destroyed with the workflow. To call the real
# V24 projection, temporarily relax the V1 false gate CHECK constraints and
# enable the two runtime flags (we reset both flags at the end).
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
do $ci_only$
declare c record;
begin
 for c in select conname from pg_catalog.pg_constraint
  where conrelid='private.market_runtime_guard_v1'::regclass and contype='c'
  and (pg_catalog.pg_get_constraintdef(oid) like '%trading_enabled%'
   or pg_catalog.pg_get_constraintdef(oid) like '%snapshot_bridge_ready%')
 loop
  execute pg_catalog.format(
   'alter table private.market_runtime_guard_v1 drop constraint %I',c.conname);
 end loop;
 update private.market_runtime_guard_v1
 set trading_enabled=true,snapshot_bridge_ready=true
 where singleton;
end;
$ci_only$;
delete from market_api_internal.market_read_buckets_v26
 where account_id='10000000-0000-4000-8000-000000000009'::uuid;
SQL

cat > "$tmp/worker.sql" <<'SQL'
begin;
set local role authenticated;
select pg_catalog.set_config(
 'request.jwt.claims',
 '{"role":"authenticated","sub":"10000000-0000-4000-8000-000000000009"}',
 true);
do $race$
begin
 for i in 1..10 loop
  begin
   perform public.market_read_gateway_v26('browse');
   raise notice 'MARKET_ALLOWED';
  exception when raise_exception then
   if sqlerrm='market_rate_limited' then
    raise notice 'MARKET_THROTTLED';
   else
    raise;
   end if;
  end;
 end loop;
end;
$race$;
commit;
SQL

pids=()
for worker in 1 2 3 4; do
 psql -X -v ON_ERROR_STOP=1 -q -f "$tmp/worker.sql" \
   > "$tmp/worker-$worker.log" 2>&1 &
 pids+=("$!")
done
failed=0
for pid in "${pids[@]}"; do
 wait "$pid" || failed=1
done
if [[ "$failed" -ne 0 ]]; then
 echo "A V27 concurrent Market read session failed unexpectedly" >&2
 cat "$tmp"/worker-*.log >&2
 exit 1
fi

allowed="$(grep -h -c 'MARKET_ALLOWED' "$tmp"/worker-*.log | awk '{s+=$1} END {print s+0}')"
throttled="$(grep -h -c 'MARKET_THROTTLED' "$tmp"/worker-*.log | awk '{s+=$1} END {print s+0}')"
hits="$(psql -X -v ON_ERROR_STOP=1 -At -c "
 select coalesce(sum(hit_count),0)
 from market_api_internal.market_read_buckets_v26
 where account_id='$actor'::uuid and action='browse'
 and window_start > pg_catalog.now()-interval '2 minutes';
")"
if [[ "$allowed" -ne 30 || "$throttled" -ne 10 || "$hits" -ne 30 ]]; then
 echo "V27 read quota race failed: allowed=$allowed throttled=$throttled hits=$hits" >&2
 cat "$tmp"/worker-*.log >&2
 exit 1
fi

# Restore hard-false constraints. This is still disposable CI only.
psql -X -v ON_ERROR_STOP=1 -q <<'SQL'
begin;
update private.market_runtime_guard_v1
set trading_enabled=false,snapshot_bridge_ready=false where singleton;
alter table private.market_runtime_guard_v1
 add constraint market_runtime_guard_v1_trading_enabled_check
 check (trading_enabled=false);
alter table private.market_runtime_guard_v1
 add constraint market_runtime_guard_v1_snapshot_bridge_ready_check
 check (snapshot_bridge_ready=false);
commit;
SQL
echo "PASS: four concurrent authenticated PG17 readers admitted exactly 30 reads; 10 throttled, same-account minute bucket remains 30"
