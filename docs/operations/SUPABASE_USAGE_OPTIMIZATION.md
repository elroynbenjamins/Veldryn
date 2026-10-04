# Supabase usage optimization

Last reviewed: 2026-10-04

## Why this exists

Veldryn previously ran four independent online `pg_cron` jobs every 10 seconds. With
`cron.log_statement` and `cron.log_run` enabled, normal successful polling generated most
of the project's Postgres logs and hundreds of thousands of rows in
`cron.job_run_details`.

Baseline measured on 2026-10-04:

- production: about 75k Postgres log events/24h, about 73k cron-related
- staging: about 75k Postgres log events/24h, about 75k cron-related
- production cron history: about 364k rows / 67 MB
- staging cron history: about 315k rows / 58 MB
- production `guild_members` recursion: about 1,020 database errors/24h and about
  1,025 REST 500 responses

The database migration `20261040000000_supabase_usage_optimization_v1.sql` consolidates
the online workers, fixes recursive guild-member RLS, adds targeted worker indexes, and adds
bounded cron-history cleanup.

## Scheduler layout

Production target:

- `veldryn-online-tick`: every 10 seconds
- `veldryn-minute-maintenance-v18`: every minute
- `veldryn-party-social-v16`: every 30 minutes; keep this because it performs different
  v16 maintenance
- `veldryn_refresh_admin_qa_echoes`: every 12 hours
- `veldryn-cron-history-retention`: daily, retaining 7 days

Staging target:

- same jobs, except `veldryn-online-tick` defaults to every 30 seconds
- cron run history retains 2 days
- temporarily change the online tick to 10 seconds only while testing timing-sensitive
  matchmaking/live-coop behavior

After applying migrations to staging, override the production-safe defaults with:

```sql
select cron.unschedule('veldryn-online-tick');
select cron.schedule(
  'veldryn-online-tick',
  '30 seconds',
  'select public.process_online_tick_server_v1(16);'
);

select cron.unschedule('veldryn-cron-history-retention');
select cron.schedule(
  'veldryn-cron-history-retention',
  '17 3 * * *',
  $select private.cleanup_cron_job_run_details_v1(interval '2 days',100000);$
);
```

For a timing-sensitive staging test, reschedule only `veldryn-online-tick` back to
`10 seconds`, then restore `30 seconds` afterwards.

Do not add a separate 5/10-second cron job for a new subsystem by default. Prefer adding a
small, fault-isolated worker call to the existing online tick.

## Logging configuration

Keep warnings and errors observable. Normal successful high-frequency work must not log
`NOTICE`, `INFO`, request payloads, tokens, or other verbose diagnostic output.

The hosted project currently needs `cron.log_statement` disabled through a supported
Supabase Postgres configuration path rather than an ordinary SQL migration.

Staging:

```sh
supabase --experimental postgres-config update \
  --config cron.log_statement=false \
  --project-ref iqfmmpvwanvvmxcftfxw
```

Production:

```sh
supabase --experimental postgres-config update \
  --config cron.log_statement=false \
  --project-ref nyjwigipamnvpdvpauuv
```

Verify:

```sql
show cron.log_statement;
show cron.log_run;
show log_min_messages;
```

If the postmaster-level configuration does not become active immediately, use Supabase's
supported fast reboot procedure. Do not weaken `log_min_messages=warning`.

Keep `cron.log_run` enabled for useful failure history. Control its size with retention
instead of disabling all run observability.

## Cron history retention

The cleanup function is:

```sql
select private.cleanup_cron_job_run_details_v1(interval '7 days', 100000);
```

Production uses 7 days; staging uses 2 days. The cleanup removes only completed historical
rows and never a row still marked running. Large initial cleanups should be executed in
bounded batches. Do not run `VACUUM FULL` in production merely to reclaim the file
immediately; deleted space can be reused by PostgreSQL and ordinary maintenance.

Inspect history:

```sql
select
  count(*) as rows,
  pg_size_pretty(pg_total_relation_size('cron.job_run_details')) as size,
  min(start_time) as oldest,
  max(start_time) as newest
from cron.job_run_details;
```

Inspect failures:

```sql
select jobid, status, return_message, start_time, end_time
from cron.job_run_details
where status not in ('succeeded','running')
order by start_time desc
limit 50;
```

## Client request policy

For background/status data:

- prefer event-driven invalidation and refresh on screen/app focus
- use a reasonable fallback interval, not a permanent short timer
- stop nonessential polling while the app is backgrounded
- deduplicate overlapping refreshes
- do not repeatedly call `auth.getUser()` just to read a locally cached signed-in identity;
  use the persisted session for UI lookups and let RLS/RPC authorization remain
  server-authoritative
- do not rapidly retry permanent 4xx responses
- use bounded exponential backoff for transient network/5xx failures
- reset backoff after a successful request
- fetch full lists when their screen opens; notification surfaces should prefer lightweight
  counters/status

The social notification poll is intentionally lower-frequency and foreground-only. Keep
chat/gameplay systems that require real responsiveness separate from static badge polling.

## Future feature cost checklist

Before adding a backend feature, answer all of these:

1. Does it need a new cron job?
2. Can it be folded into the existing online/minute tick?
3. What is the minimum necessary cadence?
4. Does every success generate a log record?
5. Does it create permanent history rows?
6. How are history rows pruned?
7. Does the client poll it while the screen is not visible?
8. Does polling stop when the app backgrounds?
9. Are concurrent identical requests deduplicated?
10. What happens after a 4xx or repeated 5xx response?
11. Does the hot query have the right index?
12. Could several lightweight status calls be combined without creating an oversized RPC?
13. Does staging really need production cadence all day?

## Verification queries

Current cron jobs:

```sql
select jobid, jobname, schedule, active, command
from cron.job
order by jobid;
```

Largest relations:

```sql
select
  n.nspname as schema_name,
  c.relname,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where c.relkind in ('r','m')
  and n.nspname not in ('pg_catalog','information_schema')
order by pg_total_relation_size(c.oid) desc
limit 20;
```

The expected steady state is one high-frequency online cron invocation rather than four,
zero recursive `guild_members` policy errors, and bounded cron history.

## Scheduler rollback

If the consolidated online tick shows a functional regression, first disable it and restore
the original workers:

```sql
select cron.unschedule('veldryn-online-tick');

select cron.schedule(
  'veldryn-online-qmode',
  '10 seconds',
  'select public.process_online_qmode_jobs_server_v1(16);'
);
select cron.schedule(
  'veldryn-online-live-ready',
  '10 seconds',
  'select public.expire_online_live_ready_server_v1(16)'
);
select cron.schedule(
  'veldryn-online-live',
  '10 seconds',
  'select public.process_online_live_jobs_server_v1(16);'
);
select cron.schedule(
  'veldryn-online-live-presence',
  '10 seconds',
  'select public.reconcile_online_live_presence_server_v1(16);'
);
```

If minute maintenance must be rolled back:

```sql
select cron.unschedule('veldryn-minute-maintenance-v18');

select cron.schedule(
  'veldryn-liveops-v17',
  '* * * * *',
  'select public.maintain_party_social_v17()'
);
select cron.schedule(
  'veldryn-online-coop-lfg-cleanup',
  '* * * * *',
  'delete from public.online_coop_lfg_posts where expires_at<=clock_timestamp() or closed_at is not null'
);
```

Do not remove `veldryn-party-social-v16` as part of this rollback or optimization pass.
