# Veldryn Guild PvE — V8 shared run and replay-safe combat emulator

**Date:** 2026-11-15. **Status:** HIDDEN, DEVELOPMENT-ONLY, TEST-ONLY. Not live. Not a database-backed or production-safe implementation. Follows [V7 source-combat evidence](./guild-pve-real-engine-v7.md), [V6 effort study](./guild-pve-expedition-feasibility-v6.md), [V5 content](./guild-pve-broken-forge-content-v5.md), and [V4 campaign design](./guild-pve-expeditions-content-v4.md).

## 1. What is implemented in V8 source code

[`backend/src/server/combat/guild-pve-shared-v8.ts`](../../backend/src/server/combat/guild-pve-shared-v8.ts) is a **deliberately disabled, in-memory, single-process shared-guild expedition emulator**. It is never imported by a live route and cannot grant player rewards.

Unlike V7 (a single class's 18-second phase preview), V8 maintains one guild's **shared node HP, current phase, Pressure, immutable difficulty, 14-day calendar, account-wide attempt allowances, action receipt ledger, map unlocks, and node completion** while using V7's **real game-engine battle output** as the authoritative *test* attack delta. One player's attack changes the node HP seen by the following guildmates.

The current 18-node graph matches V4, including the independent optional branches and all seven required combat gates:

| Chapter | Mandatory combat | Optional actions in this emulator |
| --- | --- | --- |
| I — Outer Defenses | C1-04 Gate Patrol, C1-06 Gatekeeper | C1-02 scouting; C1-05 Watchtower |
| II — Molten Halls | C2-01 Corridor, C2-05 Overseers, C2-06 Seer | C2-02 Armoury; C2-03 rescue |
| III — Heart of Forge | C3-01 Lift, C3-06 Warden | C3-02 War Drums **Order path only**; C3-04 Stabilizer |

The map also includes the correct *metadata and dependencies* for **C1-03, C2-04, C3-03 and C3-05**, but the supply inventory donation tracks, Shrine boon ballot, the War Drums Seal method and Inner Wardens elite fight are **not yet operational**. These nodes must never appear usable in a live client until completed; V8 snapshots mark unsupported nodes as such. The Gate Patrol, Corridor, Overseers and Lift currently use placeholder thematic V7 guardian combat definitions—not final unique enemy art or kits. V8 also does not apply optional objective combat boons to actual fights.

## 2. Shared HP + phase transitions

A test-only run begins on a **Monday at 00:00 UTC**, is open for **14 days**, and closes to new commands at the exclusive end timestamp. The next 28-day downtime is a calendar design rule, **not implemented scheduling**. All guild members are frozen in the input roster, and the difficulty is immutable for that test run.

For all seven required combat nodes, V8 calculates a **synthetic reference-band HP budget** from its already-frozen V7 reference attack, an isolated node weight, `max(4, frozen guild size)` and a diagnostic difficulty coefficient. This budget is **unapproved**, unrelated to a real player wallet, and does not auto-adjust when stronger characters attack. Node weights from V6 sum to 100%; they are not production health values.

At each committed attack, V8:

1. Confirms a real server-side method was invoked with an *authenticated principal*, a supported node, a valid stance and currently unlocked target. The actual emulator relies on an injected trusted loader and **does not itself authenticate** a network user.
2. Checks the **account's** consumed Seal budget—**4** in the first seven days, **8 total** once Day 8 starts. Alts share this allowance. Failed but accepted fights still spend a Seal.
3. Loads the test-only frozen, game-derived V7 actor including class, gear, stats, skill ability definitions, optional gem effects and equipped eligible companions.
4. Resolves a deterministic V7 phase-local real-combat preview with a seed derived from **event, guild, account, character, request ID, node, verified source hash and revision**.
5. Subtracts no more than `min(old shared HP, measured HP damage)`. Overkill is **not** double credited; individual local preview HP is **not** the persistent shared HP.
6. Detects each crossed Gatekeeper/Seer/Warden threshold, records phase IDs exactly once and moves to the next phase for the *following* attack. If an attack passes through two thresholds, it records the transitions in the correct order.
7. Applies V4 **provisional** Pressure proposals: Assault **+11**, Guard **−16**, Rally **−12**, clamped to 0–100, including the existing decay; finishing the War Drums by exploration proposes −3 extra Pressure for future final-boss Assaults.
8. Atomically within **one JavaScript event loop** commits the Seal, HP, phase, Pressure, run revision and deterministic result receipt. The receipt contains the actual V7 preview and its measured healing/cleanses/shield consumption but has **rewardGranted=false** and **serverPersisted=false**.

**Important boundary:** The individual attack uses the starting phase's combat abilities for its entire simulated 18 seconds. Cross-phase transition records are correct as ledger events, but it does **not** yet play newly crossed phases' attack/cast mechanics *within the same attempt*, nor run all 36 V5 cues as a sequential combat phase machine. Do not present this as a fully accurate multi-phase server raid.

## 3. Retry, race and membership rules

- Every command has an account-scoped **idempotency request ID**. Exact retries, including after the event closes, return the previous immutable saved result in that emulator. Reusing the key with different content fails.
- If one accepted attack defeats the shared target, a concurrent second attack processed afterward returns a **stale target** receipt at **zero Seal cost**. A stale or locked node cannot grant HP, participation, or a completion reward.
- A single-process Promise queue serializes this guild's actions, including two concurrent client calls. The shared **in-memory** cycle binding registry rejects the same account trying another guild run in the same cycle, including alt-character attempts.
- Exploration Orders are also account-wide: **3** before Day 8 and **6 total** afterward. Supported exploration nodes complete once; repeats have no cost.
- The frozen roster counts distinct accounts. **Late-join 72-hour eligibility and alternate 2+2 allowances, leave-and-return, membership changes, and reward eligibility are not implemented** yet. New Guild account membership must not silently enter this prototype.
- Every `snapshot()` returned is cloned; external code cannot update its HP, Pressure or balances by mutating a returned object.

**These are NOT production guarantees:** A Promise mutex and JavaScript Map provide no durable transaction, no multi-server serialization, no server authentication, no game-state revision lock and no process-restart replay. Cross-process/guild binding also needs a DB unique constraint, not this registry.

## 4. Focused tests

[`apps/mobile/tests/guild-pve-shared-v8.ts`](../../apps/mobile/tests/guild-pve-shared-v8.ts) extends V7's real co-op source-derived fixture path. It verifies:

- Exact 18-node map, prerequisite graph, seven required combat nodes and no alternative-route soft locks.
- Closed event and locked target rejections, 4+4 attempt allowances and shared alt-character limits.
- 3+3 exploration Order rules and idempotent repeat/stale exploration.
- Same-key replay even after the event window closes, key collision rejection, and no extra currency/attempt use.
- Two concurrent attacks on near-defeated shared HP: one accepted, one stale and not charged.
- A shared process-local cycle registry prevents one account from claiming actions in different guilds.
- Real V7 deterministic combat output and frozen profile, with HP credited only until true zero and phases tracked once.
- **12 scenario campaigns**: guild sizes 4/8/12/20 × Scout/Veteran/Mythic using actual nine-class game-kit fixtures and alternate Assault/Guard/Rally. Their results are **synthetic observed completions** only within the emulator, not actual game completion predictions.
- All code remains reward-free and never persists state.

The focused read-only CI job is [`guild-pve-v8-validation.yml`](../../.github/workflows/guild-pve-v8-validation.yml). **Do not claim this suite passes until a completed successful Actions run exists.** When it passes, preserve its exact scenario metrics as an evidence CSV rather than inferring any success rates.

## 5. Before V9/production eligibility

1. Back the receipt, attempt balance, node HP, phase flags and Pressure state with owner-authorized PostgreSQL transactions under isolation/row locks; add idempotency and unique account/guild-cycle binding constraints. Handle retries *after process restart* and across multiple workers. No public direct table writes or unverified client-sent combat snapshots.
2. Make loading authenticated server-owned GameState real, validate forged equipment ownership, companion and source revision, freeze immutable attack source and server policy. This currently exists only as an **injected trusted reader contract** with fixtures.
3. Replace V8's synthetic 24× per-account effort envelope with HP curves derived from the passing V7 combat records across all nine classes, mixed roster quality and 14-day Seal utilization. Scout should accommodate 65–75% meaningful attendance; higher tiers should emphasize tactics.
4. Implement V5 36-cue ordered telegraph state machine, actual skirmisher/elite encounters, persistent cross-phase mechanics and finite boons (Armoury, War Drums, Watchtower, Rally charge, Core Stabilizer).
5. Add owner-bound **real inventory** donations, rare-material/gold cap enforcement, the Shrine one-choice ballot and V6 optional **25% small-guild utility** consideration without granting duplicate progress.
6. Store meaningful contribution ledgers for genuinely prevented damage/consumed shields/real heals/cleanses and the two-action eligibility rule; no fake Guard/Rally Impact when an ability has no effect.
7. Add release-safe Guild Tokens/Guild XP entitlement creation, inbox/outbox once-only payout, non-power cosmetic first-clear, receipt-protected claims and graceful closure and history.
8. Cross-process concurrency, 8-language localized phone UI, Android accessibility, event downtime cadence and explicit feature activation remain separate sign-offs.

**Nothing in this branch modifies Guild Hunt, World Bosses, Party Events, production data, account balances, guild membership or release flags.**
