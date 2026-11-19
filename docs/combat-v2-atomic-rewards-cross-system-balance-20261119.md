# VELDRYN Classes/Skills 2.0 — atomic rewards and cross-system balance QA
19 November 2026 — **PRIVATE DRAFT, no live gameplay, no stage/production migration**

## Pass 1: Pinned PostgreSQL reward transaction integration

Added `backend/src/server/combat/v2/solo-reward-transactional-store.ts` to implement the previously defined `SoloRewardSettlementStoreV2` contract. It is **not mounted**, has no default grant writers or reward policy, and references a future private ledger schema that has NOT been migrated.

The sequence for a *future trusted server-side service* is:

1. `BEGIN` on **one** privileged pinned SQL connection.
2. Lock and read the already-reserved `private.combat_v2_solo_snapshots_v1` encounter row with `FOR UPDATE`. Verify account, character, persisted snapshot digest, and authenticated scope; never trust a client-supplied victory.
3. Under the encounter lock, read any immutable reward receipt `FOR UPDATE`; return original receipt if the snapshot and outcome match (even when policy versions change).
4. Otherwise require the exact explicitly approved reward policy ID and the validated content-owned resource plan; allocate stable unique `grantSourceId` values.
5. Apply **gold**, **combat skill XP**, **companion essence**, **material** via injected *transaction-local* writer, then write Inbox through the **same SQL connection**. For full release every writer must be backed by a unique durable grant-source ledger; no separate RPCs, async grants or independent DB connections.
6. Insert immutable reward receipt including policy ID, replay outcome digest, item/resource grant digest, encounter and account identity into `private.combat_v2_solo_reward_receipts_v1`.
7. `COMMIT`; on any error `ROLLBACK`. A lost commit ACK is recovered through a new read of the committed receipt; no reroll, no double award.

The existing review-only SQL ledger draft already contains the columns used by this adapter. No approved real wallet/XP/material/Inbox transaction-local implementation exists yet. The adapter fails closed when that schema or a writer is unavailable. **It does not grant real items or currency.**

Deterministic fault-injection suite `solo-reward-transactional-store.ts` covers transactional writer errors, Inbox errors, receipt insert errors, lost ACK after actual mock commit, 16 duplicates/one grant, policy rotation, tampered receipts and identity mismatch. It exercises all four grant types with a synthetic transaction; this is NOT a PostgreSQL account ledger test.

## Pass 2: Full Equipment + Classes + Enemies 2.0 synthetic calibration

Added `full-cross-tier-balance-matrix.ts` (540 private simulations):

- 9 classes × 2 specializations × 5 equipment tiers × 2 quality/rarity profiles (Q0 common / Q100 rare) × 3 enemy roles (normal / elite / solo regional boss).
- Synthetic levels 10,20,30,40,50. Respect server build skill gates: specializations at 10, variants at 20, capstones at 50. Both first skills use default variants; any skill above level is excluded.
- Verify original authoring is unchanged after simulations, deterministic replays, all nine stat channels finite, no exploding proc/event logs, no invalid resource stack values, source-owned equipment base proof and no unexpected set/affix grants.
- Compare each class/spec/tier primary equipment stat at Q0 common vs Q100 rare and require the higher profile to increase the stat. This is a synthetic property check, **not an approved rarity ladder**.
- Capture per-scenario DPS, HPS, damage taken, result, encounter duration, resource events, enemy mechanics and source-owned gear contributions in CI logs for future calibration.
- T2–T5: trusted *test-only* persisted-kit callback for Enemy 2.0 normal, elite and permitted regional boss identities. T1: existing generic Enemy bridge only because `prepareSoloEnemyKitsV2` rejects tier 1; **108 synthetic scenarios are explicitly marked as unvalidated for authored-kit parity.**
- Does not assert arbitrary class DPS/win rates before approved class curves, final gear rolls/rarities, tier enemy stats, support targets and CP weights exist. This avoids accidentally blessing broken balance as production-ready.

## Refinement, verification and release hold

- One private CI job tests the pinned-SQL transactional adapter and another runs the 540-case matrix. **At time of authoring, exact-head GitHub CI is not confirmed green.**
- No real PostgreSQL wallet/Inbox ledger writers, account/character XP policy, equipment issuance, production route, inventory, entitlement or staged migration is implemented or activated by this work.
- Before release: approvals for 2.0 reward policy/resources; transactional source-unique writer implementation and a staging two-connection commit/rollback validation; durable account/material Inbox state read-back; telemetry-driven nine-class balance thresholds, T1 authored-kit decision, gems/tonics, group and dungeon boss testing; signed Android QA.
- Existing Live Dungeon/Q-Mode/World Boss code and economy stay untouched. Do not merge this into `main`, deploy Supabase SQL or toggle Combat 2.0 on until the coordinated Equipment/Skills/Enemies release gate clears.

### QA checks
```sh
pnpm --dir backend install --frozen-lockfile
pnpm --dir backend build
node backend/dist/server/combat/v2/__tests__/solo-reward-transactional-store.js
node backend/dist/server/combat/v2/__tests__/full-cross-tier-balance-matrix.js
node backend/dist/server/combat/v2/__tests__/solo-reward-settlement.js
```

## Additional polish from real predecessor CI diagnostics

PR #1414's 19 November CI run exposed **three reproducible blockers**:
- `Live Edge isolation` test: its initial import guard rejected ordinary `./calculation` imports. The guard now ignores non-V2 imports and rejects unexpected paths only inside the V2 namespace.
- `Server skills` TypeScript build: implicit `any` on a source enemy archetype tag. Added explicit `(t:string)` annotation, without changing enemy mechanics.
- `PG17 disposable` job: test script changed directory one level above the checkout, so it failed to locate the hidden SQL migrations. The script now changes to the repository root.

These fixes are on the **new private integration branch**, not yet consolidated into prior draft PRs. CI must rerun on this exact new head before counting any path green.

### Reward-writer hardening
Grant and Inbox adapters now receive a **query-only transaction facade** with manual BEGIN/COMMIT/ROLLBACK and pinned-connection release denied. Each transaction-local writer must return exact account/source/amount readback proof; forged or missing proofs abort the transaction. The mock tests exercise all four proposed resource categories and rollback if any proof is incorrect.
