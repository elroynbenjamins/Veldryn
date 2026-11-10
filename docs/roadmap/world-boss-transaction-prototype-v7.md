# Veldryn World Bosses — Hidden Transaction Prototype v7

**10 November 2026** · **Status: code drafted / test registration; production DISABLED.** No Supabase migration or deployed Edge function. No real attack, event schedule, resources, rewards, leaderboard, World tab entry, or Sigil wallet.

## Implemented as pure TypeScript (not a server endpoint)

- `backend/src/server/combat/world-boss-event-prototype.ts`: deterministic, immutable-input **serial command reducer**; creates an isolated event with `maxHp`, UTC start/end, boss ID, and a revision counter.
- `apps/mobile/tests/world-boss-event-prototype.ts`: account-wide 3-attack limit, request idempotency, snapshot uniqueness, per-account initiator ownership, active UTC window, phase threshold boundaries, atomic-like HP clipping, residual fights and no-silent-mutation tests.
- `tools/mobile-core-tests.json`: v7 regression added after the existing v6 round combat test.
- `backend/src/server/combat/world-boss-echo-prototype.ts`: deterministic test-only Echo matcher by role, five relative power brackets, stale-snapshot filtering, selection rotation, same-owner exclusion, and marked NPC fallback.
- `apps/mobile/tests/world-boss-echo-prototype.ts`: reproducible selection, duplicate-account prevention, stale/off-bracket filtering, low-population NPCs and event receipt integration; registered in core CI.

- `apps/mobile/tests/world-boss-round-pressure-v7.ts`: 1,620 test-only fights (3 bosses × 3 phases × 4 enemy pressures × 9 class initiators × 5 seeds). Log survival, combat damage and rounds reached. These runs use `launchPlayer` fixtures, not actual equipped accounts, and **do not approve** new live difficulty values.

The v7 reducer calls the existing disabled v6 14-round simulator **itself**, rather than accepting damage or an outcome sent from the mobile client. Same-seed, same-request duplicate submissions get the previous combat/replay receipt without spending another attempt. A reused request key with different parameters is rejected. One character cannot grant its account more than three attacks by switching to a second character.

### Fixed-phase and community HP rules

At attempt start, snapshot the phase based on `remainingHp / maxHp`: above 70% = Armored; 70%–30% inclusive on upper boundary = Exposed; 30% or lower = Enraged. Do not change the scripted phase midway through that 14-round replay.

On finalization in a **serialized** event state, use `creditedWorldHp = min(remainingHp, floor(realBossHpDamage))`. Receipt captures `hpBefore`, `hpAfter`, actual personal combat damage, local guard damage, phase, immutable snapshot IDs, account/character IDs, ordinal, seed and replay. Once community HP is zero, additional valid attempts are **Residual Echoes** with 0 new world HP credit, but original real personal combat events remain unchanged.

Milestone crossings 70% / 30% / 0% are recorded once. **No payout occurs.** `hypotheticalBaseSigils` (5 for a wiped/incomplete match, 10 for a full survived match) is only a non-authoritative design ledger projection, not a minted currency.

### What this does NOT prove

The reducer is a **functional mock**, not a truly atomic transaction:
1. It holds no DB row locks, unique indexes, idempotency reservations or authenticated account context. Two requests must be serialized by the caller; applying both to a stale event state could double debit HP. **Do not expose as a live API.**
2. The `squad` input is marked server-resolved but currently receives test-only `launchPlayer` fixtures, not actual, validated, class-specific equipped inventory from account storage. A **test-only** Echo matcher and NPC fallback now exist, but there is **no** connected account snapshot store, calibrated NPC builds or production matchmaking.
3. The v6 engine remains a distinct 14-round **prototype**, not the complete time-driven `simulateCombat` engine with all gems, summons, loadout modifiers, cooldown semantics and accurate class metric attribution.
4. Attempt receipts are held only in memory and do not persist across replicas/process restarts. Replay event logs have no verified cryptographic hash or versioned compression/retention policy.
5. The shared War Camp has no real inventory debit. Role-normalized World Impact and Sigil rewards do not exist as safe server-backed currency systems.
6. New v7 source may be committed before CI completes. Record **CI results** separately, rather than claiming an unobserved pass.

## Future PostgreSQL / server route contract — gated OFF

Proposed DB boundaries, for later review only:

- `world_boss_events`: one event ID, server-defined max/current HP, start/end, phase definition/version, revision.
- `world_boss_attempts`: unique (`event_id`, `account_id`, `request_id`) and unique (`event_id`, `account_id`, `ordinal`) with `ordinal BETWEEN 1 AND 3`; immutable snapshot hash, server RNG seed, replay content reference, receipt status, per-player metrics.
- `world_boss_echo_snapshots`: server-derived account role/power bracket/sanitized equip-state snapshot; independent of mutable inventory after being committed.
- `world_boss_supply_receipts`: unique (`event_id`, `account_id`, `slot`) with two slots and authoritative inventory consumption in one transaction.
- `world_boss_reward_receipts`: exactly-once per award key; milestone/participation rules; grant to existing secure currency ledger only after explicit reward balance approval.

Production flow should reserve a slot under an account/event lock, resolve and persist an immutable loadout and phase, run server-authoritative battle once, then apply a finalized attempt in a **transaction that locks event HP** and inserts a unique reward receipt. Reconnect or duplicate mobile requests must reuse the originally committed state. If the simulation crashes before durable settlement, release or safely resume a reservation without burning attempts. Do not lock the global event row for the whole 14-round simulation.

**Concurrency validation needed:** simultaneous attacks in separate app sessions, different characters on same account, last 1 HP race, network retry after commit, crash before result commit, clock expiry, concurrent supply buffs, phase transition between reservation and commit and replay version migration.

## Next safe implementation pass

1. Confirm TypeScript build and the v7 test result in GitHub Actions.
2. Calibrate the existing test-only Echo allocator against actual server-resolved gear snapshots, role metrics, measured power brackets and borrowing frequency; never trust incoming client power or allow one owner to fill two Echo slots.
3. Compare v6 rounds and effects against the live PvE engine for cooldowns, cast/interrupt timing and current class/equipment stat conversion. Calibrate with real seeded fixtures, not current illustrative numbers.
4. Author secure migration/Edge function patch behind a disabled flag, review it in staging, test multi-process concurrency and reward receipts, then decide whether to deploy. Do **not** enable public UI.
