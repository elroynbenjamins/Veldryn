# Veldryn World Bosses — Hollowroot Combat Engine Calibration (v4)

**Status:** test-only implementation, **not activated**. Source of truth: `apps/mobile/tests/world-boss-hollowroot-calibration.ts`. This is an engineering calibration pass following the v3 [design](world-bosses-hollowroot-v3.md); it **does not** add a World Boss endpoint, database table, feature flag, schedule or art asset.

## What is real in this pass

- Uses **nine current Veldryn class identities**, their actual game content and class combat abilities from `backend/src/server/combat/content/launch-combat.ts`.
- Uses **current equipped T1/T2/T3/T4 gear selections and game-derived HP / Attack / Defense / Crit / Accuracy / Evasion / Haste** from `regionalCombatFixture` and `effectiveStats`. This includes the active class-specific equipment identity.
- Executes real damage, mitigation, healing, HOTs, shields, DOTs, cooldowns, targeting and seeded replay events in `backend/src/server/combat/engine.ts`.
- Evaluates each initiator plus three **distinct** role-completing Echo-class loadouts: 1 Tank / 2 Damage / 1 Support. Every class can initiate its own legal formation.
- Models Armored / Exposed / Enraged **independently**, as if community phase had been selected at battle start; it never changes global phase during the fight.
- Creates **488 deterministic simulations:** 9 classes × 4 early tiers × 3 global phases × 3 fixed seeds = **324 baseline**; plus 18 × 3 variants × 3 fixed seeds = **162 counterfactual** runs with Support/Tank utility disabled; plus 2 deterministic replay controls.
- Captures squad damage, initiating player damage, actual effective healing, applied and consumed shields, incoming damage, alive fighters, boss kills, spore ticks, cast interruptions and signature event counts. Outputs machine-readable `WB_HOLLOWROOT_SUMMARY` and `WB_HOLLOWROOT_COUNTERPLAY` JSON lines into GitHub CI logs for review.
- Asserts no fictitious hit events, replay determinism, real damage/event agreement, no regeneration of boss HP, legal Echo composition and reproducible fixture counts.

## Critical fidelity boundaries

This is **not yet a full World Boss** and must not be used for paid rewards, leaderboards, account-gated attacks or global HP decrement.

1. The existing engine is **time-driven**, whereas the planned design uses 14 authored turns. This test uses a **70-second proxy window**; the 42 authored Hollowroot phase/round cues are *not* automatically scheduled. It is not a true test of every scripted ability.
2. Current mobile `effectiveStats` and dungeon engine units differ. The adapter uses **actual real game stats relative to the class's equipped T2 reference** to scale its existing dungeon ability template; it does not feed raw mobile stat totals directly into the live PvE engine. Stat conversion requires formal production implementation later.
3. The **8% Regrowth local guard** is approximated by an ordinary *self shield* in the existing combat engine. It **never heals boss HP**, including global HP, which is absent from this test.
4. Bark Mantle is a real damage-taken modifier; Amber exposure is a real vulnerability debuff. But the proposed **role-targeted side-cleave**, **two-round 3.5%-max-HP spores**, **next-action-only root**, and **true turn-specific telegraph** require new deterministic action scheduling or more expressive engine rules. The test's ordinary nature DOT and timed debuff are approximations, clearly labeled.
5. The boss HP and Attack used in this stress harness are **relative to the test squad** for comparing classes/tier loads, not live event-end global HP or a recommended production boss stat line. World Impact and Sigil payouts are out of scope.
6. Benchmarks are deterministic *test fixtures*, **not data from real players**. They must not be substituted for the prior v3 Monte Carlo participation model.

## How to use the results

1. GitHub CI `mobile-core-validation` runs this test as part of `tools/mobile-core-tests.json`.
2. Find the 36 `WB_HOLLOWROOT_SUMMARY=` lines: 4 gear tiers × 3 phase snapshots × 3 initiating roles. Rows include win/wipe, team/initiator damage, effective support, actual shield consumption and boss action counts.
3. Find the 18 `WB_HOLLOWROOT_COUNTERPLAY=` lines: compare an otherwise identical seeded squad with/without Support and Tank class utility. Meaningful difference is necessary before advertising roles as strategically distinct.
4. Investigate disparities first; do **not** turn early proxy findings into real player stat nerfs. Move to a true 14-round server prototype once the current engine limitations are understood.

## Pass/fail release gating (next engineering pass)

- Verify a server-owned **14-round scheduler** can trigger each scripted action at its exact authored round and show telegraph → impact one round apart.
- Add a **local guard ledger** with `guard_hp`, `guard_damage` and `regen` that cannot mutate `global_boss_hp`.
- Implement role-metric **actual mitigation and shield consumption attribution**, not fabricated blocker or overheal credits. Test Tank/Damage/Support Impact benchmark parity within five percentage points.
- Introduce stable versioned resolved player/Echo gear snapshots under server control, account-wide attempt receipts and idempotent result logs behind a **disabled** feature flag.
- Run population and reward models again using sampled **real per-bracket combat output**, not the current assumed 28,000 damage in the v3 model.

### Safety and rollout

No game balance or production server functions are altered. The calibration is manually reproducible from CI logs and never writes Supabase. **Do not enable World Bosses** as a side effect of merging these tests.
