# Party Events V46 — atomic canonical source outbox (18 November 2026)

**State: HIDDEN AUTHORING DRAFT ONLY.** This pass extends draft PR #1388. It neither activates Party Events nor executes any migration on staging/production. There is no worker, scheduler, RPC route or reward grant.

## Why V46 is required

V43 already defines a server-only credit worker with deterministic canonical-source idempotency. V44 prepares verified receipt packets from authoritative online game commands. V45 drafts atomic creation of the ordinary online game receipt and source receipts. But a *post-commit synchronous callback* to V43 would lose progress if the game commit succeeds and the service crashes before the callback. Calling V43 before the game transaction commits would be worse: it could grant EP for an action which subsequently rolls back.

V46 therefore drafts a tiny durable outbox, created **in the same PostgreSQL transaction** as each canonical receipt, and *not* alongside any EP, reward or client action.

## Draft changes

- `docs/roadmap/party-events/hidden-migrations/20261118173000_party_event_source_outbox_v46.sql`: unpromoted private table keyed by `(source_type, source_ref)`. There are only `craft` and `idle` identities. No user-selectable Party, account, week, points, actor or amount is stored.
- Two `AFTER INSERT` database triggers on existing canonical `public.craft_receipts` and `public.idle_claim_receipts` enqueue source IDs and DB-recorded timestamps. Trigger failure rolls back the source insert and ordinary online action; exact replay does not issue new inserts or outbox rows.
- The private queue exposes pending/retry/lease/terminal accounting for a future approved worker. Public/anon/authenticated roles have no access and service_role has only read/update permissions, not direct INSERT. The internal trigger function is not callable as a public routine.
- `backend/tests/party-event-source-outbox-v46.mjs`: disposable PGlite regression instantiates the *real draft* V45 and V46 definitions with an inert online-game stub. It asserts atomic source insertion, canonical ID/time provenance, no duplicate outbox messages on exact replay, and complete rollback under a forced failure **after** the ordinary online action has been written.
- `.github/workflows/party-events-v6-v31-hidden-integration.yml` now includes the V46 regression alongside V43–V45. GitHub Actions must finish successfully before considering the draft ready for review.

## Authorization and trust boundaries

1. Only the trusted server may prepare V44 packets. V45 is a private service-role RPC draft and must not be exposed to a player client.
2. V46 may be deployed only together with reviewed source-producer writes; the outbox itself never authorizes a grant.
3. A future leased worker must load source identities exclusively from the private outbox, invoke the existing authoritative V43/V14 verification, and acknowledge work **after** V14 commits. A crash/retry is safe only through V14 source-level idempotency.
4. Worker retries, terminal failures and queue lag must be instrumented, with staging fault-injection proving that no event points are lost or paid twice.
5. V14 remains the source of truth for whether elapsed idle time began **after** event enrollment and stage opening, and whether the week is still creditable.

## Next staging gate

- Complete and review exact-commit CI, including the new disposable V46 test. Network-isolated local checks cannot substitute for a green PGlite run.
- Independent SQL review: confirm existing canonical receipt table columns, trigger semantics, service-role privileges, and DB migration ordering on staging.
- Design and test V47 lease/ack/retry worker with expired-lease and post-credit-crash recovery, then wire to the authoritative committed online-game path behind a backend gate.
- After all hidden SQL is staged and end-to-end verified, finish V12–V17 objectives and a one-time Day 8 account-locked reward writer, Android lifecycle and localization QA, flexible-party balance, and a controlled pilot. No public launch before those gates.

**Production changes: none. Event Points or payouts: none.**
