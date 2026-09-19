# v17.1 worker health wiring

The admin site reads `liveops_runtime_health` but the **game server worker** must write the heartbeat.

Wire the current once-per-minute v17 Live-Ops cron/worker through the supplied `runObservedLiveOpsWorkerTick` wrapper, adapted to the actual repository layout.

Repository semantics:

## markStarted

Upsert component `party_liveops_worker`:

- `last_started_at = to_timestamp(startedAtMs / 1000)`
- `updated_at = now()`

Do not clear the last successful timestamp when a new tick starts.

## markSucceeded

Upsert:

- `last_started_at`
- `last_completed_at`
- `last_ok_at = last_completed_at`
- `last_error = null`
- `last_result_json = result`
- `updated_at = now()`

## markFailed

Upsert:

- `last_started_at`
- `last_completed_at`
- `last_error_at = last_completed_at`
- `last_error = error`
- `updated_at = now()`

Preserve the previous `last_ok_at` so the admin UI can show how long ago the last successful tick occurred.

The admin site treats a last successful tick older than roughly five minutes as stale because the v17 worker is intended to run about once per minute.

## Dead-letter retries

The v17 outbox already has downstream idempotency receipts. v17.1 allows an **Owner** to manually reset a `dead_letter` outbox row to:

- `status = pending`
- `attempts = 0`
- `last_error = null`
- `available_at = now()`
- `locked_at = null`
- `processed_at = null`

The regular worker picks it up again. Do not process it directly inside the browser/admin request.
