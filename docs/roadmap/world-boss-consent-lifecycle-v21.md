# World Boss V21 — Private Echo consent lifecycle (review-only)

**15 November 2026.** Stacked on hidden V20, itself stacked on V19 and earlier prototypes. **Not merged into the Android release, not mounted in any Edge route, not a migration, not deployed and not playable.** This pass preserves the approved World Boss rules: 14-day cycle, 7 active days, three account-wide attacks, 1 Tank / 2 Damage / 1 Support asynchronous squads, three rotating bosses, community War Supplies, server-owned snapshots, and the 100 World Sigils **design-only** maximum.

## What V21 adds

- The new private TypeScript bridge under backend/online/world-boss-consent-command-v21.ts checks Auth for the owner before publishing or withdrawing that owner's Echo. The inbound command has event, character, enable/disable, expected revision and an idempotency request key; it has **no account ID**, GameState, Echo stats or grant payload. Owner identity is derived exclusively from the verified Auth token. The private PG adapter calls a single parameterized function.
- The draft world-boss-consent-lifecycle-v21.sql uses the V20 event-specific grant table and introduces an append-only receipt ledger, one grant per owner/event and monotonically increasing consent revisions. The event row is locked first, matching V18 reservation/V20 Echo lock order. Publish requires an active event and a server-recorded owned character. A revoke is allowed even after event closure and fences new reservations; it cannot retroactively reroll an already frozen attack.
- Same-key repeats return the original receipt without repeating a state mutation, even if the event has since ended or consent has since changed. Reusing a key with different intent is rejected. A stale expected revision is rejected. Publications expire no later than event end and seven days after publication.
- No anonymous/authenticated database access is granted; V21 function and ledger remain private service-only, with RLS. This is NOT itself proof of account authentication: the server **must** verify the bearer token and inject the resulting account ID. SQL owner ID is **never** accepted from the mobile caller.
- The v21 smoke file checks publish, wrong character owner, stale revision, duplicate key, revoked new borrowing, frozen old battle retry, closed-event revoke and SQL role grants with fixture writes rolled back. A synthetic TypeScript test verifies the owner-only command and parameter binds.

## Next blockers before any activation

1. Implement an audited server handler with Supabase Auth verification, capability checks and transaction-scoped private database access; audit live schema names and RLS grants. No HTTP route or player-facing consent UI is added in V21.
2. Add a private, event-scoped candidate reader from persisted grants plus current authoritative owner GameState; enforce bounded reads and revision consistency at the V20 reservation lock. Add staged real-owner update/revocation tests.
3. Run a two-connection contention test of publish/revoke vs. reserve and verify event-close recovery. Current smoke uses disposable PostgreSQL with sequential operations.
4. Approve CP band calibration, role survival/Guard effectiveness, War Camp inventory donations, durable replay storage, reward entitlement and exactly-once shared 100-Sigil wallet cap. These are unchanged and **not** activated.

**Rollout gate:** Keep World Boss hidden and feature flags false, SQL in docs only, all CI review-only. Do not merge into Veldryn 1.0.10 or apply to staging/production without explicit release review and completed combat/economy validation.
