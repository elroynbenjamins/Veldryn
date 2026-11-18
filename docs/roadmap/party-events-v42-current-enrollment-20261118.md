# Party Events V42 — current enrollment overlap hardening (hidden)

**18 Nov 2026.** No event activation, database deployment or paid claims.

## Problem

The private V33 status query originally used `ORDER BY event_starts_at DESC LIMIT 1` for an authenticated account. This could select a future/historical enrollment instead of the currently running event; V11's `UNIQUE(event_starts_at, account_id)` prevents duplicate enrollment **within the same start date** but does not rule out overlapping event weeks with different starts.

V40's server-side response validation already prevents old/future status from reaching players. V42 moves the current-week selection and overlap guard into the **same single-statement PostgreSQL MVCC snapshot**, before the V40 transport guard runs.

## Implemented

- The V33 private SQL now restricts results to events with `event_starts_at <= now()` and `event_ends_at + interval '1 day' > now()`.
- A correlated count checks other current seven-day/Day 8 enrollments for the authenticated account, across the existing `private.party_event_roster_v11` / `private.party_event_weeks_v11` tables. **Exactly one** is permitted; zero/multiple returns no event.
- There is still exactly one SQL statement with only the remotely verified account UUID as parameter; no client party/week selector, cache, writes, new grants, schema objects, or gameplay claims.
- The V40 phase/timestamp guard is deliberately retained as defense in depth. V39 still never mounts as a live endpoint.
- The disposable PGlite V33 test now uses dates relative to the test clock and covers current enrollment, future enrollment that cannot mask current, overlapping second enrollment that fails closed, and unaffected other-account reads.
- The TypeScript V33 SQL contract asserts both filters. Tests are included in the existing hidden Party Events CI.

## Remaining safety condition

A deliberately malformed overlapping roster currently yields `null` rather than a distinct public error, preventing cross-account event disclosure. Before launch, trusted monitoring should separately alert on this integrity condition without exposing private party IDs to a client.

This is a private developer-only safeguard, **not** evidence that runtime writes are ready. Persistent staging migrations, canonical gameplay source producers, account-locked Day 8 settlement, complete CI and native Android QA remain blockers.
