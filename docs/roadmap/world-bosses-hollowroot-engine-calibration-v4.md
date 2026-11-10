# Veldryn World Bosses — Hollowroot Combat Engine Calibration (v4)

**Status:** test-only implementation, **not activated**. Source of truth: `apps/mobile/tests/world-boss-hollowroot-calibration.ts`. This is an engineering calibration pass following the v3 [design](world-bosses-hollowroot-v3.md); it **does not** add a World Boss endpoint, database table, feature flag, schedule or art asset.

## What is real in this pass

- Uses **nine current Veldryn class identities**, their actual game content and class combat abilities from `backend/src/server/combat/content/launch-combat.ts`.
- Uses **current equipped T1/T2/T3/T4 gear selections and game-derived HP / Attack / Defense / Crit / Accuracy / Evasion / Haste** from `regionalCombatFixture` and `effectiveStats`. This includes the active class-specific equipment identity.
- Executes real damage, mitigation, healing, HOTs, shields, DOTs, cooldowns, targeting and seeded replay events in `backend/src/server/combat/engine.ts`.
- Evaluates each initiator plus three **distinct** role-completing Echo-class loadouts: 1 Tank / 2 Damage / 1 Support. Every class can initiate its own legal formation.
- Models Armored / Exposed / Enraged **independently**, as if community phase had been selected at battle start; it never changes global phase during the fight.
- Creates **812 deterministic simulations:** 9 classes × 4 early tiers × 3 global phases × 3 fixed seeds = **324 baseline**; plus 18 × 3 variants × 3 fixed seeds = **162 counterfactual** runs; plus **324 identical-seed** pressure runs (T2/T4, all three phases, representative Tank/Damage/Support initiators, 1.5×/2×/2.5× boss attack with and without Support utility); plus 2 deterministic replay controls.
- Captures squad damage, initiating player damage, actual effective healing, applied and consumed shields, incoming damage, alive fighters, boss kills, spore ticks, cast interruptions and signature event counts. Outputs machine-readable `WB_HOLLOWROOT_SUMMARY`, `WB_HOLLOWROOT_COUNTERPLAY` and `WB_HOLLOWROOT_PRESSURE` JSON lines into GitHub CI logs for review.
- Asserts no fictitious hit events, replay determinism, real damage/event agreement, no regeneration of boss HP, legal Echo composition and reproducible fixture counts.

## Critical fidelity boundaries

This is **not yet a full World Boss** and must not be used for paid rewards, leaderboards, account-gated attacks or global HP decrement.

1. The existing engine is **time-driven**, whereas the planned design uses 14 authored turns. This test uses a **70-second proxy window**; the 42 authored Hollowroot phase/round cues are *not* automatically scheduled. It is not a true test of every scripted ability.
2. Current mobile `effectiveStats` and dungeon engine units differ. The adapter uses **actual real game stats relative to the class's equipped T2 reference** to scale its existing dungeon ability template; it does not feed raw mobile stat totals directly into the live PvE engine. Stat conversion requires formal production implementation later.
3. The **8% Regrowth local guard** is approximated by an ordinary *self shield* in the existing combat engine. It **never heals boss HP**, including global HP, which is absent from this test. Local boss HP is deliberately high (110× summed squad engine Attack Power), preventing a personal fight from incorrectly ending the server-wide World Boss. **Critical correction after first CI:** local guard must not be calculated from that huge, intentionally unkillable HP pool. The revised proxy uses a separate local guard budget = 25 × total squad Attack Power, with each Regrowth granting a shield of 8% of that *guard budget*. Both coefficients are test-only pending real guard mechanics.
4. Bark Mantle is a real damage-taken modifier; Amber exposure is a real vulnerability debuff. But the proposed **role-targeted side-cleave**, **two-round 3.5%-max-HP spores**, **next-action-only root**, and **true turn-specific telegraph** require new deterministic action scheduling or more expressive engine rules. The test's ordinary nature DOT and timed debuff are approximations, clearly labeled.
5. The boss HP and Attack used in this stress harness are **relative to the test squad** for comparing classes/tier loads, not live event-end global HP or a recommended production boss stat line. World Impact and Sigil payouts are out of scope.
6. Benchmarks are deterministic *test fixtures*, **not data from real players**. They must not be substituted for the prior v3 Monte Carlo participation model.

## How to use the results

1. GitHub CI `mobile-core-validation` runs this test as part of `tools/mobile-core-tests.json`.
2. Find the 36 `WB_HOLLOWROOT_SUMMARY=` lines: 4 gear tiers × 3 phase snapshots × 3 initiating roles. Rows include win/wipe, team/initiator damage, effective support, actual shield consumption and boss action counts.
3. Find the 18 `WB_HOLLOWROOT_COUNTERPLAY=` lines: compare an otherwise identical seeded squad with/without Support and Tank class utility. Meaningful difference is necessary before advertising roles as strategically distinct.
4. Check the 54 `WB_HOLLOWROOT_PRESSURE=` rows at 1.5×, 2× and 2.5× calibrated boss Attack and compare the same seeded squad with/without Support. These multipliers are test hypotheses, not live values.
5. Investigate disparities first; do **not** turn early proxy findings into real player stat nerfs. Move to a true 14-round server prototype once the current engine limitations are understood.

## Verified engine results (2026-11-10)

The corrected **812-run** deterministic calibration passed GitHub Mobile UX and Mobile Core tests. Evidence is archived from GitHub Actions job `129782277212` in three versioned CSVs:

- [36 class-role/phase/tier summary rows](spreadsheets/world-bosses-hollowroot-engine-summary-v4.csv)
- [18 baseline role-utility counterfactual rows](spreadsheets/world-bosses-hollowroot-engine-counterplay-v4.csv)
- [54 controlled pressure-sweep rows](spreadsheets/world-bosses-hollowroot-engine-pressure-v4.csv)

**Baseline (current proxy boss pressure ×1.0):** all sampled T1–T4 squads had at least one surviving member at 70 seconds, in every global phase. This is **too forgiving** to make Tank and Support survival contributions distinctive. All 324 samples ended with the personal *local* boss still alive, as intended: personal battles must not kill a server-wide multi-day boss.

| Equipped bracket | Armored squad damage | Exposed squad damage | Enraged squad damage | Exposed temporary guard applied |
| --- | ---: | ---: | ---: | ---: |
| T1 | 51,456 | 52,029 | 55,554 | 4,737 |
| T2 | 74,956 | 74,470 | 80,573 | 7,933 |
| T3 | 96,785 | 93,674 | 102,965 | 11,861 |
| T4 | 107,846 | 104,152 | 116,281 | 15,137 |

These are **per-squad engine damage** in a **70-second proxy fight**, not live account World Impact, global boss HP damage, a 14-round authored battle, or rewards. The local guard is now decoupled from the deliberately nonkillable boss HP; initial runs had accidentally made Regrowth's shield disproportionately large.

**T2 role illustration:** the initiating Tank dealt roughly 9,018 / 10,860 / 9,849 damage across Armored/Exposed/Enraged; Damage initiators dealt 27,203 / 27,131 / 28,979; Support initiators dealt 8,438 / 8,008 / 9,087, while personally providing ~2,607–3,408 effective healing. These figures **cannot** be used to award role-normalized Impact yet: prevented Tank damage and actually consumed player shields are not fully attributed to the responsible player by this prototype.

### Pressure stress result — not an approved tuning value

For T2 **Enraged** and a *test-only* **1.5× enemy Attack** modifier, sampled squads retained a surviving player **9/9 times** with Support abilities enabled, versus **3/9** with Support healing/shielding disabled under the same seed. All nine sampled tanks survived with Support; none survived without that utility. At T2 Enraged **2×**, all nine full squads retained a survivor while **0/9** muted-support squads did. For T4 Enraged **2×**, all nine fully equipped squads survived, while the muted-support counterparts retained a surviving player **6/9** times and none retained a living tank.

This demonstrates that meaningful **support dependence emerges under higher pressure**, not that 1.5× or 2× is safe to deploy. There are only **three RNG replicates per initiating class**, multiple classes have different kits, and the fight's timeline is an approximation. Survival from a small deterministic sample must not be presented as an 80%–100% population success probability.

**Recommended next balance pass:**

1. Implement a **test-only 14-round deterministic scheduler** and exact round-by-round telegraph semantics for Hollowroot; preserve the 70-second proxy for regression comparison.
2. Give **local guard** a formal cap and ledger, with shielding absorbed separately from boss HP damage. Keep community global HP exclusively in event/receipt logic.
3. Implement real two-tick 3.5%-max-HP Sporeburst, one-action Entangling root, correct side-cleave, and role-attributed healing/mitigation/shield consumption; test that interrupt and cleanse change outcomes.
4. Retest at mixed power brackets rather than only matched-tier Echoes, with **more seeds (≥100)** per class and stress profile. Then tune for an actual meaningful failure/danger gradient, not automatic success, and rerun the community HP and Sigil model using the measured effective squad damage.
5. Keep all proposed multipliers and role rewards **unapproved and disabled** until their authentic mechanics and replay are consistent.

## Pass/fail release gating (next engineering pass)

- Verify a server-owned **14-round scheduler** can trigger each scripted action at its exact authored round and show telegraph → impact one round apart.
- Add a **local guard ledger** with `guard_hp`, `guard_damage` and `regen` that cannot mutate `global_boss_hp`.
- Implement role-metric **actual mitigation and shield consumption attribution**, not fabricated blocker or overheal credits. Test Tank/Damage/Support Impact benchmark parity within five percentage points.
- Introduce stable versioned resolved player/Echo gear snapshots under server control, account-wide attempt receipts and idempotent result logs behind a **disabled** feature flag.
- Run population and reward models again using sampled **real per-bracket combat output**, not the current assumed 28,000 damage in the v3 model.

### Safety and rollout

No game balance or production server functions are altered. The calibration is manually reproducible from CI logs and never writes Supabase. **Do not enable World Bosses** as a side effect of merging these tests.
