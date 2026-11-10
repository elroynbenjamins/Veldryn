# Veldryn World Bosses — V9 Secure Foundation & Combat Fidelity

**November 10, 2026 · Hidden / development only · Neither server feature nor event active**

This pass continues [v8 combat integrity](world-boss-combat-polish-v8.md), [v7 attempt design](world-boss-transaction-prototype-v7.md), and [v5 boss scripts](world-bosses-three-boss-contract-v5.md). It is an implementation *prototype*, not a live World Boss service.

## V8 equipment-balance evidence confirmed

[Archived 36-row real-equipped fixture results](spreadsheets/world-boss-equipped-calibration-v8-test-only.csv): the completed GitHub **Mobile Core run 42822807286** executed **1,296 matched-tier + 432 mixed Echo-tier** samples using current T1–T4 mobile game equipment fixtures adapted through the existing Hollowroot v4 **relative PvE engine stat mapping**. Its **341 core checks passed** before an unrelated Companion stamina validation failure.

The 36 boss/phase/tier cohorts showed damage differences across equipment brackets but **every cohort averaged all 4 actors alive**, including mixed-power examples. This cannot prove actual World Boss win rates because the combat is still a separate 14-round adapter, and game stat values need a verified server conversion. **No live combat buff/nerf or boss pressure multiplier was approved.**

## V9 code delivered

### Authoritative server-to-World-Boss combat snapshot bridge

- Source: [\`world-boss-verified-roster-v9.ts\`](../../backend/src/server/combat/world-boss-verified-roster-v9.ts)
- Integration test: [\`world-boss-verified-roster-v9.ts\`](../../apps/mobile/tests/world-boss-verified-roster-v9.ts)

The new **internal-only** preparation function accepts a client-facing *shape* limited to \`eventId\`, \`characterId\`, \`requestId\`, and one of three War Orders. A trusted, authenticated **server loader** must supply the principal account, fresh character snapshot, eligible Echo candidates and unpredictable server entropy. It uses the existing \`combatantFromVerifiedSnapshot\` converter also used by regional PvE to retain real engine units, verified ability definitions and available companion/gem data, rather than accepting client-submitted attack/defense/abilities.

Server-verification checks: snapshot ownership/character ID, role, numeric bounds, fresh initiating snapshot (≤1 minute), Echo snapshot freshness (≤7 days), duplicate player Echo owners/actor IDs, unsupported role formations, server ability shape, candidate count, and five matchmaking power brackets. Valid real Echoes are matched first, with explicitly identified NPC fallback for missing slots. Invalid/stale *borrowed* Echoes are quarantined; an invalid *initiating* character fails closed.

The snapshot/roster digest is portable SHA256 using Veldryn's existing Noble hashing library; resolved actor objects are detached from loader aliases. The generated **server nonce and snapshot digest are included in the v7 test-only attempt receipt**, so a request replay with different resolved contents or seed fails instead of silently rerolling.

**Still missing:** actual production-owned loadout queries and item/gem/companion inventory validation; current tests inject a trusted loader made from real engine class fixtures. A real consumer must use a durable reservation to retain exactly the *original* server nonce and roster on network retries. No public API is exposed here.

### Concurrent event HP receipt emulator

- Source: [\`world-boss-atomic-emulator-v9.ts\`](../../backend/src/server/combat/world-boss-atomic-emulator-v9.ts)
- Test: [\`world-boss-atomic-emulator-v9.ts\`](../../apps/mobile/tests/world-boss-atomic-emulator-v9.ts)

The repository-emulator serializes pure in-memory state changes using a Promise mutex. Its test stresses 24 simultaneous accounts against the last **1 HP**, 12 simultaneous character requests on one account (maximum **3 successful**), 18 simultaneous duplicates of the same request, immutable snapshots, bad-roster failure, and two accounts sharing a request string. The checked emulator run showed zero double-debits, one unique killing credit and exactly-once duplicate receipts.

**Critical limitation:** an in-memory mutex is effective only inside one process. It is **not** the cross-instance database transaction required for production and simulates the fight inside the lock for test simplicity. A real server must freeze phase/snapshots at reservation, calculate combat outside the lock, and settle HP in a short database row-locked transaction.

### Private PostgreSQL schema proposal — NOT EXECUTED

- Read-only draft: [\`world-boss-private-schema-proposal-v9.sql\`](world-boss-private-schema-proposal-v9.sql)

The proposed schema follows Veldryn's current \`private\` schema conventions and keeps event instances, per-account three-attempt receipts and community milestone crossings **service-role-only**, with RLS enabled and no client grants. Two **private server-only** procedures model:
1. **Reserve:** lock event, replay a prior request unchanged, validate account ownership and active window, allocate one of 3 slots, freeze phase, server seed and roster hash.
2. **Finalize:** lock the short event transaction, verify matching reservation/replay, cap credited world damage to remaining HP, write an immutable receipt and insert unique threshold crossings.

The draft creates no event rows, scheduler, user-visible functions, rewards, or currency. **It is under \`docs/roadmap/\`, not \`backend/supabase/migrations/\`, and has NOT been applied to staging or production.** It requires dedicated service principal security review, schema verification, staging concurrent-race tests, RLS allow/deny tests, rollback, load testing, schema migration creation through Supabase CLI and explicit launch approval.

## Additional engineering security concerns

- \`WorldBossAttemptPrototype\` still permits legacy deterministic test seeds for older v7 fixtures. Do **not** expose that reducer as an API. The v9 trusted roster adapter supplies entropy, and a real service must prohibit fallback seeds.
- Prevent predictable seed rerolls, account spoofing and snapshot swaps using an authenticated caller context **plus durable account/receipt reservation**, never a \`client.accountId\` field or user-controlled power score.
- A replay SHA256 digest is integrity metadata; a plain hash **is not a cryptographic signature** and must not be used for authorization.
- Exactly-once account attempts, limited War Supply deposits, 14-day event cadence and 7-day active windows still require real server storage and operational gates.
- Support, Tank and Damage Impact weights, Sigil rewards and boss combat pressure remain **proposals, not approved economy changes**.
- World Bosses are **hidden**: no public UI, no live rewards, no events running, no database migration and no deployed Edge route in this pass.

## Next milestones

1. **Verify V9 CI**: TypeScript/mobile-core compatibility, server roster tests and concurrency emulator; fix failures in the V9 code, not unrelated Companion tests.
2. Build a *server-only* production-game equipment resolver that returns \`VerifiedCombatSnapshot\` from real account ownership and item/gem/companion validation; measure actual T1–T4 combat stats with it.
3. Reconcile the 14-round World Boss scheduler with existing PvE hit/evasion, cast timing, cooldowns and companion/gem effects; introduce meaningful Tank/Support failure pressure **only from measured data**.
4. Create a real migration in the approved Supabase workflow, **deploy to staging only after security review**, then run concurrent reservations/finalizations from separate server processes with crash/retry cases. Keep the server feature flag **OFF**.
5. Add idempotent War Camp and Sigil entitlements only after combat/impact rewards are fair. No leaderboard or public World Boss activation before later explicit approval.

### Status note

All new GitHub files are committed. **CI status must be verified from an observed run**. Success of the in-memory emulator is not evidence of a production PostgreSQL transaction.
