# Party Events V87 — canonical source SQL and independent settlement gate

**21 November 2026 — hidden, review-only, NOT deployed or enabled.**

## Why V87 is necessary

The current V11 week `status='settled'`, V19 boss candidate, and even the V23 trusted-worker replay attestation **do not independently authorize a victory payout**. V23 intentionally reports `rewardEligible=false` and `combatIndependentlyVerifiedBySql=false`; simply projecting `tiers_cleared>0` as `serverVerifiedVictory=true` would be a payout escalation. V11 does not contain the `settledAtUtcMs` field expected by the V61 proof, and no audit-approved server-level T1–T9 reward tier receipt is installed.

V87 introduces **two strictly private, review-only, immutable certificate contracts** (no publisher/creator grants or live writer):

- `private.party_event_settlement_certificates_v87`: unique party/week bound to the same V23 reservation, source digest and tiers cleared, with a separate `independently_verified_victory` decision and settlement time at least one hour after Day 8 opens.
- `private.party_event_member_tier_certificates_v87`: immutable account/party/week frozen character, level, V18 saved loadout hash and an explicitly server-authored `server_level_snapshot_v2` tier between T1 and T9. This is **not** an invented tier formula. A separately audited level-to-tier authority must be built before these rows can ever be written.

The review SQL enforces V11/V18/V23 row parity, timing, two to four member constraints via the V61 reader, account references and erasure cascades. All direct public and `service_role` writes are revoked; only read-only service access is declared. **No producer or payout entitlement is installed.** A certificate's mere existence does not bypass the existing released=false guards.

## One-connection trusted reader

`backend/src/server/party/weekly-party-event-canonical-pg-v87.ts` implements an unmounted V70 `readCanonicalSource` port. It accepts only the server-authenticated account ID and canonical Monday UTC source key, then executes **one joined SQL projection through the exact V70 transaction connection**.

The source packet is grounded in:

1. The actual V11 party/week and immutable frozen character/roster (2–4 members).
2. V14 server-committed activity points (not client progress or estimates).
3. V16 recorded stage-three personal donation, stage-three optional orders completely donated, and V17 frozen supply seal. A partial or unsealed optional goal cannot grant Preparation Chest.
4. V23 attestation aligned with independent V87 settlement certificate. Finale Chest is earned **only** when the independent server verification records victory; V23 alone grants nothing.
5. V18 server-frozen loadout identity/level/hash and V87 tier certificate (not a guessed tier from current character level).

The packet is checked by existing `deriveVerifiedPartyChestEvidenceV61` and `resolveTrustedPartyChestSourceV77`, which enforce account/party/week/eligibility, V51 reward definitions, and correct V68 chest table. A missing, ambiguous or corrupt join fails closed. The query uses row locks on nonnullable canonical sources and never fetches proof from a client request, in-memory mobile state, or an RPC on another connection.

**The canonical reader is not yet wired to the V86 payment mock**; it is a testable, isolated authority port. Combining it with V70 and V86 will still require an authenticated source worker, approved schema and producer before any live route exists. The older V60/V63 and shared V69/V70 reward gateways must not both be activated for a given Party Event source key.

## Tests

- Strict TypeScript V87 test verifies the three V51 source entitlements and refuses invalid week/account/character/tier/activity/preparation/finale proofs, disabled and production gates, ambiguous joins, and absence of client-derived proofs.
- Disposable PostgreSQL fixture executes **the actual V87 SQL**: V23 alone => no chest; settlement certificate without member tier => no chest; mismatched frozen level => rejected; both certificates => three accurate chest definitions; low EP => no participation, incomplete optional order => no preparation, explicit nonvictory => no finale; immutable-certificate updates rejected.
- Both are wired into the hidden chest CI. Tests were authored, but **no exact-head passing CI result has been observed**. Disposable PGlite tests are not equivalent to multi-connection PostgreSQL 17.6 or a verified combat producer.

## Remaining hard blockers

1. Independent, auditable combat replay victory authority and server-level tier certificate writers, reconciled against V23 and V18. Never mark V23 alone as winning.
2. Staging/production Postgres 17.6 schema parity, specifically missing staging `private.reward_inbox_v1`; V11–V87 schemas are not installed.
3. V87 canonical SQL plus V86 real-resource payout tested **together** under a real same-session transaction, then independent-connection concurrency, crash, cancellation and account-erasure tests.
4. Party Equipment 2.0 `PE_` set generation, physical custody, roster character switching and T5–T9 authoritative numeric policies.
5. Exact-head CI, Android device QA, transparent future UI preview and explicit review/approval before any UI/theme implementation. Do not enable, merge, migrate or deploy.

**Status: HOLD. Draft PR #1416 only. No main merge, staging/production write, live payouts, player progress edit or UI redesign.**
