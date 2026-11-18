# World Boss V53–V54 — global-cycle DB proof, staging preflight and privacy fence

**18 November 2026 · Hidden review-only implementation; no live SQL, endpoint or game actions.**

## Evidence from connected Veldryn staging (metadata / aggregate reads only)

The staging PostgreSQL 17 project `Veldryn Staging 20260924` was queried without any DDL or player identifiers. The reproducible read-only query is `docs/roadmap/world-boss-staging-readonly-preflight-v54.sql`.

| Metric | Verified aggregate |
| --- | ---: |
| Private `world_boss_*` tables | 0 |
| Private `world_boss_*` functions | 0 |
| Public grants on World Boss private tables | 0 (no tables yet) |
| Auth FKs on World Boss private tables | 0 (no tables yet) |
| Existing account save rows | 9 |
| Relational character rows | 9 |
| Accounts with at least three relational characters | 0 |

**Readiness = BLOCKED_WORLD_BOSS_SCHEMA_NOT_INSTALLED**. Zero public grants and zero auth FKs are not security approval because the private World Boss schema is entirely absent. No staging migration or account/character fixture was created.

## V53 proposed global uniqueness guard, rollback-only PostgreSQL proof

`docs/roadmap/world-boss-global-cycle-guard-v53-smoke.sql` is wrapped in **BEGIN/ROLLBACK**, and is scheduled after the existing private World Boss disposable PostgreSQL checks. It temporarily enforces:
1. A global UNIQUE event start, independent of region, status or boss ID.
2. A GiST exclusion of intersecting **14×86400-second** UTC epoch ranges, including overlapping starts at different times. Adjacent cycles remain allowed.

In PostgreSQL 17 staging, read-only checks confirmed `int8range &&` detects a one-week overlap but does not reject an exactly adjacent two-week cycle. We additionally checked the PostgreSQL function volatility catalog: `extract(epoch from timestamptz)` is **STABLE**, unsuitable for an index expression; explicit `AT TIME ZONE 'UTC'` followed by `extract(epoch from timestamp without time zone)` is **IMMUTABLE**. The V53 draft was corrected accordingly.

The actual DDL, constraint creation, insert rejection and rollback test are **not yet verified as passing** until the dedicated disposable PostgreSQL CI run succeeds. **Do not apply the SQL file to staging or production.** A reviewed migration and unique canonical launch-epoch provisioning path are separately required.

## V54 private status reader erasure fence

`backend/online/world-boss-current-overview-v51.ts` now requires a **server-supplied** `accountPrivacy.allowRead(accountId)` check after verified Auth but before event selection or any private overview. If the trusted reader returns false, or the dependency is missing, read access is denied. Clients cannot select an account, a different boss, or an event ID. The injected function must ultimately check the real pending-deletion/suspension/erasure source (not `user_metadata` or an unverified claim).

The V51 hidden test checks denial **before** querying events, attempts, War Camp, replay references or wallet information. The unmounted V52 GET handler returns a generic unavailable response to prevent leaking the erasure status of private accounts. There is no real Auth/erasure backend dependency implementation yet, and these paths remain unmounted.

This is **not a deletion policy** and does not clear issue #1348.

## Erasure design decision still required

The private V17–V28 draft retains account-linked references in attempts, milestones, War Camp donations, replay proofs, wallet, reward ledger and claim receipts, plus retired consent records. A privacy/legal/product decision must specify:

- Which personally linked records are **deleted** immediately, which if any are de-identified for legally approved retention and how long that retention lasts.
- How to fence in-flight reservations, donations, replay uploads, settlements and claims while erasure is pending, including recovery after worker crash and repeated requests.
- How to remove external replay objects and proofs without reversing shared realm HP, War Camp tiers, leaderboards or other players' settled outcomes.
- How account erasure is audited without retaining new identifiers or gameplay payloads.
- How a transactional, idempotent cleanup resolves `REFERENCES auth.users(id) ON DELETE RESTRICT` **before** calling the Auth deletion operation.
- How to test two-account isolation, idempotent second deletion, retries, and concurrent attempts in disposable PostgreSQL and later **approved** staging.

No data deletion implementation, policy choice, or migration is authorized by this document.

## Remaining required checks

Current backend and mobile feature branches are both diverged from `main`. Exact-head GitHub Actions currently do not report completed success. Keep both PRs draft until the mainline reconciliation, V53 DDL smoke, existing V41/V51/V52 tests, privacy policy/erasure worker, actual secured Auth adapter, approved multi-character staging fixtures, accessibility QA, and economy/reward settlement approval pass.

**NO GAMEPLAY RELEASE / NO DATABASE WRITE / NO PRODUCTION ROUTE ENABLED.**
