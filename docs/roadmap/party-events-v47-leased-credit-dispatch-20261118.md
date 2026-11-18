# Party Events V47 — leased canonical source dispatcher (18 November 2026)

**State:** UNRELEASED source + SQL draft in PR #1388. No scheduler, route, source producer integration, migration promotion, staging/production installation, account EP, Gold, XP, item payout, Party Renown, or player-visible feature activation.

## Release blocker addressed: post-commit crash recovery

The V45 canonical source writer and V46 same-transaction outbox draft ensure that an online-game commit and its source IDs cannot diverge. V47 adds the next step needed to eventually convert those durable source IDs into V14 verified Party Event points.

- `docs/roadmap/party-events/hidden-migrations/20261118183000_party_event_source_leases_v47.sql` is a **nonexecutable draft migration** after V46.
- `private.lease_party_event_sources_v47` leases at most 25 eligible pending/expired rows with `FOR UPDATE SKIP LOCKED`, a 30–300-second bounded lease and a **fresh database-generated token on every lease**.
- `private.complete_party_event_source_v47` acknowledges only the currently owned, still-valid token **after** verified V43/V14 credit. Old workers cannot acknowledge a row taken over by a newer worker.
- `private.retry_party_event_source_v47` releases only the current token to a pending state with bounded exponential backoff and an allowlisted internal error category. No source is silently dropped after a fixed retry count; stalled/expired rows remain visible to operators.
- `backend/online/party-event-source-outbox-worker-v47.ts` is an **unmounted server-only factory**. It maps the canonical `craft` and `idle` IDs to V43. It handles credited, already-replayed and not-enrolled results; a credit error is retried. An ACK connection failure attempts retry, otherwise lease expiry is the recovery path.
- `backend/online/tests/party-event-source-outbox-worker-v47.ts` tests missing enrollment, successful first credit, replay, transient errors, ACK outage, stale lease token and malformed/duplicate lease batches.
- `backend/tests/party-event-source-outbox-v46.mjs` additionally runs both hidden V46 and V47 SQL drafts on disposable PGlite with V45. It tests that a crashed lease is replaced with a different token, old ACK/retry operations fail, and pending retries eventually finish.
- Hidden Party Events CI compiles and executes the V47 TypeScript worker test and V46/V47 PGlite test.

## Important invariants

1. Outbox messages contain **no client-provided** Party ID, event week, account ID, amount or points. The source row and roster are looked up inside V43/V14.
2. An online action rollback also rolls back V45 receipt rows and V46 outbox messages. A repeated command cannot create duplicate canonical sources.
3. A V14 credit that commits but whose queue ACK is lost may be reprocessed, but canonical source/replay protections prevent duplicate EP.
4. A late/crashed worker cannot falsely mark a source as completed after another worker has taken over.
5. SQL functions are private, `SECURITY DEFINER SET search_path=''`, with service-role-only EXECUTE. No client routes or services call them until separately approved.
6. V14 still checks source occurrence, idle interval *start*, frozen account/character membership, stage opening, caps and idempotency. V47 does not override those safeguards.

## Required before staging and launch

- Await exact-head CI and a reviewed PGlite run. Workflows being queued is **not** a passing result.
- Review V46/V47 SQL against the deployed table definitions, service-role/schema privileges, transactional online commit and production migration ordering.
- Only after approval, stage V11–V47 private schema in explicit order, stage hidden V45 canonical producer integration, then run real load/replay/crash/reconnect and overlap tests behind backend flags.
- Extend trusted outbox provenance to successful human co-op nodes (currently not covered by the new V46 triggers) using the separately reviewed dungeon commit pipeline.
- Finish V12–V17 objective/donation/ballot sources, one-time Day 8 account-locked payout/Inbox and canonical Party Renown, full nine-class/role/difficulty balance, mobile translations and Android lifecycle QA, then pilot.
- Add monitored queue lag/attempts/stuck rows and an audited terminal policy for objectively uncreditable sources, without automatically losing still-creditable events.

**Do not merge or release on red/unfinished CI; no player-visible Party Events until the end-to-end pilot is verified.**
