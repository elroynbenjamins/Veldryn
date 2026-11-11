# Veldryn World Bosses — V10 Recoverable Battles & Settlement Contract

**Date:** 2026-11-11  
**Status:** Hidden/test-only feature branch. No public World Boss mode, active event, database migration, scheduler, Sigils, reward grants, leaderboard or API route.

Supersedes the v9 *in-memory transaction assumptions*; does **not** supersede its verified-roster bridge, three-boss scripts, War Camp design or v8 combat/role benchmarks. Earlier v1/v2/v3/v4/v5/v6/v7/v8/v9 files remain history. Code reference: `backend/src/server/combat/world-boss-reservation-v10.ts` and regression suite `apps/mobile/tests/world-boss-reservation-v10.ts`.

## 1. Player-facing rules to preserve

- **Cycle:** one server-wide boss every 14 days, open for 7 days, with a 7-day downtime; three bosses rotate Hollowroot → Sunscar → Frostmarch. Exact UTC launch anchor and unlock level remain proposed, not activated.
- **Attempts:** three per **account**, not per character; lending an Echo never consumes the lender's attempts. No reroll on a network retry.
- **Squad:** 1 Tank / 2 Damage / 1 Support. Use initiating player's verified character and three *different-account* Echo snapshots. NPC substitute only if the real catalogue cannot supply an eligible role/power match.
- **Server-owned battle:** freeze equipment/stat/ability/companion-derived combatants, War Order, event rules and boss phase before a run. All 14 rounds are deterministic from one server-generated, frozen seed. No client-submitted damage, outcomes, equipment, or power.
- **Global HP:** credit *actual simulated boss HP damage* up to the global HP remaining at settlement. If another squad killed the boss, all later legitimate pre-reserved attacks are **Residual Echoes** with zero global HP credit but a valid personal result. Only the first successful crossing of 70%, 30% and 0% is recorded.
- **Rewards:** no World Sigils minted yet. Draft participation and role-normalized milestone economy remain proposals. Borrowed Echo owners do not get passive currency from repeated selections.

## 2. Added v10 prototype — two short critical sections

| Stage | Server behavior | Failure / retry |
|---|---|---|
| Reserve | With event/account lock, verify authenticated v9 prepared roster, event window and account-wide 3-slot budget. Allocate an available ordinal and freeze **phase, seed, digest and full squad**. | Existing `(event, account, requestId)` is returned unchanged; a different seed/digest for same key is rejected. |
| Checkout | Read the immutable reservation for simulation. Worker receives a **generation** and a 2-minute lease. | If a lease has elapsed, a new worker can recover the **same seed, roster and phase** with generation +1. Old generations cannot settle. |
| Simulate | Run the existing 14-round server combat adapter **outside the lock**; do not hold an event lock during animation, combat, or disconnect. | Crashes do not update event HP or grant rewards. Retry the same frozen inputs during the recovery window. |
| Settle | Under short event/account transaction, verify generation, frozen inputs, complete result and unique receipt. Clip credited HP to current remaining HP, save immutable replay digest, increment event revision and record unique crossings. | Duplicate identical settlement returns original receipt, without a second HP debit. Conflicting/stale workers fail. |
| Expire / void | 15 minutes after reservation (bounded by event end + 15 minutes), mark uncommitted reservation void. Server-side unrecoverable failure may void early. | Voided request ID stays a tombstone; uncommitted ordinal becomes reusable by a **new** request ID. A committed attack is never voided. |
| Read | Client polls existing receipt by account + request ID and may replay locally after settlement. | Existing committed receipts remain readable after event close. |

**Important distinction:** The v10 `WorldBossReservationEmulatorV10` serializes writes in one Node process only. Its `reserve`, `checkout` and `settleJob` are developer/test methods, **not** RPCs. Production must implement the same invariants with PostgreSQL row locks, durable lease ownership, reservation uniqueness and audited server-side authorization across multiple Edge/server instances. A plain SHA256 digest detects changed content; **it is not a signature or proof that a client was authorized**.

### Strict production database revisions needed beyond v9 SQL proposal

1. Add `reserved / committed / voided` states; `lease_expires_at`, `hard_expires_at`, `lease_generation`, `lease_owner` (non-public), optional `failure_code`, immutable rules/engine version, and externally stored replay reference. Every date is computed by the database/server, never the caller.
2. Replace `UNIQUE(event_id, account_id, ordinal)` with a **partial unique index** for `status IN ('reserved','committed')`. Preserve the global unique `(event_id, account_id, request_id)` *including voided tombstones*. Otherwise a failed attempt blocks a slot forever, or old ID rerolls.
3. Lock the event row (or account-specific event lock) at reservation and finalization. Reserve and finalize must each be a single DB transaction. Never lock across the 14-round simulation.
4. **Read before resolving** the v9 server roster or generating a nonce on retries. A prior reservation's original seed/roster/phase must be fetched, not reconstructed with a new `randomSeed()`.
5. A lease takeover increments generation under lock; finalization must compare both generation and durable snapshot/engine binding. An old worker must be unable to settle after takeover.
6. Allow valid pre-close reservations to finish within the recovery grace, even after the 7-day event closes. Disallow fresh reservations after its exact `ends_at`. The event's final published HP should wait for the close grace to expire.
7. A finalization result must be built **inside trusted server code** from the frozen roster + engine version. Service role / SECURITY DEFINER privileges must never be exposed as client-selectable account, damage or seed arguments. Validate actor ownership, replay size, finite non-negative damage and result digest before committing.
8. Store both the squad digest and replay digest with immutable receipts. Protect any long-lived replay storage with retention/versioning policy and content-addressed integrity. Do not treat the replay digest as an authorization mechanism.
9. RLS on the private tables, no anonymous/authenticated grants, no public Edge handler, no event rows or scheduled start. SQL proposal must be independently reviewed and exercised under real concurrent PostgreSQL sessions before becoming a migration.

**Production decision pending:** exactly how to treat a simulation that runs longer than the lease while its original worker is healthy. Recommended: a server-only lease heartbeat (short transaction) extends the 2-minute lease up to the hard deadline; it must be generation-bound. The v10 emulator instead demonstrates restart/recovery after expiry and rejects a late worker. The 2- and 15-minute values are **engineering prototypes**, not approved player cooldowns.

## 3. Combat & strategy refinements (design, not balance changes)

Current [v8 equipped T1–T4 evidence](spreadsheets/world-boss-equipped-calibration-v8-test-only.csv) found every sampled squad surviving. It is **not enough** to conclude the bosses are properly balanced.

- **Hollowroot:** tank mitigates Root Slam; Support cleanse matters for vines/spores; DPS must exploit Heart Expose without removing meaningful survival risk.
- **Sunscar:** Tank counters Sandbreaker/burst; Support counters Scorch Mark/burn; DPS takes advantage of Solar Plate windows. Telegraphs are a full round before their resolving special.
- **Frostmarch:** Damage breaks Icebound Aegis; Support cleanses freeze; Tank absorbs Shardstorm/Glacial Reprisal. Shield ownership and real HP prevention must stay consistent with replay.
- **War Orders:** Break Armor promotes guard-break opportunities, Hold Line preserves squad HP, Steady Assault offers reliable damage. All War Orders must affect *actual* combat, not cosmetic numbers or free off-ledger damage. Boss phase is frozen at reservation even if global HP changes mid-simulation.
- **No role farming:** World Impact should credit *verified effective* HP healing, shield consumption, saved HP, guard break, and actual boss damage, never overheal or fantasy prevention. Use boss+phase+class+power-bracket benchmark sets with ≥100 samples; withhold rewards until Tank/Damage/Support parity is empirically within ±5 percentage points.
- **Calibrate on real loadouts:** nine classes, equipped T1–T4, mixed Echo power, companions/gems/skill unlocks, potions excluded initially; determine actual win rates and boss HP target from production-like synthetic cohorts and observed eligible participation. Lock the HP target at event start, not stealth-adjusted midway.
- **No false progress:** a 14-round server result powers the playback; animation speed and skipped playback never alter credit, result or consumables.

## 4. Next engineering passes, in order

1. Confirm v10 TypeScript/core CI; verify no regressions versus v9 and that no public import or live endpoint exists.
2. Turn the v9 **review-only** private SQL into a hardened **v10 proposal** with server-only lease heartbeat, partial unique account slot index, void tombstones, authenticated ownership and immutable seeded replay; perform independent SQL/security review before any migration.
3. Integrate a real, owner-bound equipment/gems/companion server loadout source, compare snapshot derivation against current live regional PvE, and freeze availability at event start.
4. Run **real multi-process staging** tests (last 1 HP, 3 simultaneous account characters, expired lease takeover, crash before/after commit, event close, failed simulation, malicious payloads, RLS).
5. Only after this: tune encounters with meaningful Tank/Support survival impact, War Camp inventory debit, frozen global HP economy, role-normalized World Impact, exactly-once Sigil entitlements, compact UI, art and release gate.

## 5. v10 regression evidence (not CI-certified until workflow passes)

The newly registered `world-boss-reservation-v10.ts` suite tests:
- A valid v9 trusted roster and its SHA256 digest; mutated actors and cross-event swaps rejected.
- Same request/seed replay and attempts to reuse a request with different seed rejected.
- **24 simultaneous** different-account reservations and settlements at **1 HP**: exactly one global HP credit, 23 Residual Echoes, threshold crossings [70,30,0].
- **12 simultaneous** requests across characters on one account: only 3 reservations.
- Worker lease recovery on generation 2 with identical frozen inputs, stale generation rejected.
- **18 concurrent** finalizations of one job: exactly one new receipt and 17 unchanged duplicates.
- Abandoned reservation hard-expiry and explicit failure returning an ordinal; voided request remains a tombstone.
- Accepted pre-close reservation settling after close, no new post-close reservation.
- No actual database transactions, reward minting, currency changes, scheduler or public World Boss activation.

As with v9, passing an in-memory model does **not** prove real PostgreSQL exactly-once semantics or genuine combat difficulty.
