# World Boss V59 — durable erasure lease, replay manifest and recovery gate

**18 November 2026 · Hidden, disposable PostgreSQL prototype. This is NOT a Supabase migration, approved deletion worker, retention decision or live API.**

## What V59 adds

The V56 coordinator already describes a paused/retryable sequence, but it cannot safely resume after a process crashes until the job state, lease and storage deletion confirmations are durable. V59 adds **private-only prototype tables and functions** in `docs/roadmap/world-boss-erasure-lease-v59.sql`:

| Object | Purpose |
| --- | --- |
| `private.world_boss_erasure_jobs_v59` | Per-account stage, ticket digest, explicit policy-approval gate, sealed replay-manifest state, lease owner/generation/expiry and revision |
| `private.world_boss_erasure_objects_v59` | Exact private replay object keys and their acknowledged external deletion timestamps |
| `world_boss_v59_acquire` | Single-account 90-second lease, with strictly increasing generation; stale workers may be replaced only after lease expiry |
| `world_boss_v59_assert_lease` and `world_boss_v59_heartbeat` | Require current lease owner, generation, unexpired lease, expected stage, confirmed policy approval and V57 deletion fence |
| `world_boss_v59_mark_object_deleted` | Idempotent receipt of **already confirmed** external object deletion; never calls Storage |
| `world_boss_v59_advance` | Enforce the ordered `fenced → replays_purged → rows_purged → auth_deleted → complete` state machine |
| `world_boss_v59_release` | Release a worker lease but **never** clear the account's V57 write fence |

All tables have private-schema RLS and **no grants to `PUBLIC`, `anon`, `authenticated` or the gameplay `service_role`**. The functions remain `SECURITY INVOKER`, with no exposed public RPC. A separately approved privileged privacy worker would need its own narrowly scoped security role, Auth/session revocation, Storage delete adapter, owner verification and operator authorization.

### Non-bypassable stage checks in the draft

- An erasure job must already exist under an independently authorized privacy ticket **and** the account must already be fenced under V57. Calling `acquire` cannot create jobs or initiate deletion.
- A second worker receives `busy` while a lease is valid. Following expiry, the new worker receives a larger generation. The stale worker cannot acknowledge objects, heartbeat, advance a stage or release the new worker's lease.
- No replay ACK or stage change is allowed while `policy_review_approved=false` (the default). **No approved policy or credential is configured.**
- Every manifest key must first match an **already committed immutable V17 replay locator owned by that exact account**. This prevents a forged extra manifest entry from scheduling an unrelated Storage object for deletion. No new replay keys can enter a sealed manifest. Changing a key's owner/path, reversing a previous ACK or deleting the manifest before approved finalization is rejected.
- Advancement to `replays_purged` requires a **sealed manifest**, every recorded object confirmed deleted, and coverage for **every non-null immutable V17 attempt replay locator** of the account. This avoids losing untracked external objects.
- Advancement to `rows_purged` requires V36 to report no remaining account-bound **gameplay receipts**. V59 recovery records are acknowledged as a separate lifecycle and are not counted as cleared gameplay rows.
- Advancement to `auth_deleted` requires the Auth user to be absent. An actual user deletion must still be performed via approved Supabase Admin Auth and handled as an idempotent lost-ACK operation.
- `complete` in this prototype is **only an internal stage marker**; it does not authorize retention, delete privacy tombstones, clear the V57 account fence, purge Storage, or assert that any real user's deletion is complete.

### Critical boundaries

1. **No deployment and no deletion:** SQL is a draft intended for the disposable CI Postgres service. It does not execute against Supabase staging or production. Its tests insert/delete only synthetic `auth.users` rows inside `BEGIN/ROLLBACK`.
2. **No actual replay purge:** `mark_object_deleted` is only a private database acknowledgement. The actual worker must first securely delete the relevant object in private Storage, then confirm the exact key and generation in an authorized transaction. A missing-object response is acceptable as success only after verifying it was a previously authorized idempotent retry.
3. **No uncontrolled stage transition:** A private operator must approve the retention/legal policy, ticket owner and provisioned manifest; this prototype has no way for mobile users or the gameplay service role to do so.
4. **No reverse lock ordering:** V57 account-fence INSERT must finish its short transaction before V59 acquires or the deletion cleanup takes any World Boss event locks. Never hold the account advisory lock while trying to acquire an event lock.
5. **Sensitive references:** V59 rows contain an account UUID, ticket digest and replay paths. How long they survive after the Auth user is deleted remains an explicit unresolved issue under [#1348](https://github.com/elroynbenjamins/Veldryn/issues/1348). They must not appear in public telemetry, client JSON, chat, RPC responses or logs.
6. **Coverage and drift:** V36's schema review explicitly recognizes the two new reviewed identity columns only when V59 tables exist. Adding any other World Boss identity column still fails closed.
7. **Runtime unchanged:** `WORLD_BOSS_V56_ERASURE_LIVE=false` and the World Boss read/attack/reward activation flags remain disabled. V59 defines no routes or UI.

## Synthetic verification

`docs/roadmap/world-boss-erasure-lease-v59-smoke.sql` is registered in the existing hidden World Boss GitHub Actions PostgreSQL job. It exercises:

- no privileged functions/tables exposed to gameplay/anonymous roles;
- correct V36 identity-column review;
- forged ticket denial, single lease holder and crashed-worker generation takeover;
- refusal to advance with unapproved policy, unsealed manifest or unconfirmed replay objects;
- no late/renamed/deleted manifest entries or stale-worker acknowledgements;
- **both directions** of replay ownership validation: foreign-account keys cannot be inserted, and a missing immutable V17 replay key is detected even when other owned keys were acknowledged (with the second account's probe rolled back);
- orderly stage transitions, a synthetic removed Auth identity, completion retry and unchanged V57 fence;
- untouched second-account job, Auth identity and replay manifest; new unreviewed identity table still rejected.

A second CI script, `docs/roadmap/world-boss-erasure-lease-v59-race-ci.sh`, uses **two independent PostgreSQL sessions** against the disposable `127.0.0.1/postgres` service. It checks that only one same-account lease wins, a crashed lease can be reclaimed at a higher generation, the original worker cannot release the new worker's lease, a separate account can still progress and the V57 account fences remain. The script rejects any non-local host or database/user and cleans up synthetic rows.

**Neither SQL suite is considered passing until a completed exact-head CI run proves it.**

## Next implementation gates

A future privileged service may implement the V56 dependencies through reviewed, transactional PG adapters and an idempotent Storage/Auth workflow, but only after policy review and CI. The next review should also model multi-session lease expiry during a slow Storage delete, Auth Admin lost-ACK retries, retention cleanup, three-character account fixture isolation and off-host backup/restoration behavior.

No migration or production rollout is authorized by this document.
