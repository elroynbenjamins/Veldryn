# Veldryn World Bosses — v8 Combat Integrity, Role Balance & Replay Polish

**Date:** 2026-11-10 · **State:** TEST-ONLY / hidden; NOT LIVE. **No game-mode release, Supabase schema or Edge functions, no event schedule, no real currency and no new player assets.** This document records implemented test code plus explicit fidelity gaps, not approved boss balance.

## 1. Baseline / why this pass was necessary

The previous **1,620-run** v7 test sweep passed (3 bosses × 3 phases × 4 pressure coefficients × 9 initiating classes × 5 seeds) using level-25 \`launchPlayer\` test kits. **All sampled squads had four survivors even at ×2.5 test boss pressure.** This is a finding about the incomplete prototype, **not** a real production win-rate estimate. It suggested too few meaningful normal attacks, overstated utility, and incomplete role feedback; blindly pushing production boss Attack multipliers was not justified.

Other prior verified runs:
- v6 14-round authored scripts with 126 cue positions (Hollowroot, Sunscar, Frostmarch).
- v7 pure in-memory account/event receipt reference model and 1/2/1 role Echo matching (no actual DB or player data).
- Existing time-driven Hollowroot v4 812-run calibration remains a *separate* historical proxy for cross-checking.

## 2. v8 code refinements (disabled prototype only)

The following changes were made to \`backend/src/server/combat/world-boss-round-prototype.ts\`:

1. **Real basic strikes alongside telegraph rounds:** the special remains **one round after** its warning, but the boss may perform its normal attack during the warning and non-spike exposure rounds. The ordinary hit is an independent \`BASIC\` replay event; there is never a silent or early special. This increases meaningful combat pressure without globally raising coefficients.
2. **Hollowroot Sporeburst is now multi-target** as previously specified for the time-driven v4 engine. Burn/spore ticks still originate from actual status effects and respect max HP, expiry and real cleanse conditions.
3. **Support-first reaction order:** Support characters resolve their one normal action before Tank/Damage on a turn, allowing a real prepared cleanse to remove a next-action root or freeze. No extra turns, free heals, or test-only abilities were granted to the nine production classes.
4. **Meaningful cleansing targets:** a healer's real cleanse skill targets an affected living ally first, rather than wasting it on an uninjured ally while poison/freeze remains.
5. **Prevented HP, not imagined shielding:** Tank mitigation credits only real HP saved after considering existing shield coverage. A Tank receives no phantom utility for damage a Support shield would have fully absorbed.
6. **Shield owner attribution:** each consumed shield portion now emits \`SHIELD_ABSORB\` with the original caster's ID; the ledger reconciles directly to those replay events. It is a *mitigation* event, not extra boss damage.
7. **Hold the Line attribution:** only actually avoided post-shield HP is emitted as \`WAR_ORDER_HOLD_LINE\`; **excluded from World Impact** until the initiator/role attribution design is approved.
8. **No zero-strength fake hits:** damage effects with nonpositive coefficients cannot accidentally yield the engine's one-point minimum direct strike.
9. **Dedicated interrupt test isolation:** with Support-first and Tank protection, the live Tank kit can interrupt a cast before a test Hexweaver. The test now removes competing interrupt abilities so it validates the intended actor without falsely treating valid priority changes as a bug.

These are **development-only simulation rules**. Before shipping, reconcile ordinary attack cadence, support timing, damage types, hit/evasion, cooldowns, abilities, gems, companions and equipment stats with the true time-driven PvE engine and actual game loadouts.

## 3. v8 role-normalized World Impact prototype

\`backend/src/server/combat/world-boss-impact-prototype.ts\` is a **pure, read-only reference calculator** with no wallet interface or reward grant.

- Require a reference keyed to **boss, global phase, actual class, power bracket and benchmark version**, with **at least 100 samples** per reference. A client-supplied "power" number is not a valid reference.
- Normalize only verified HP damage, actual guard damage, effective healing, consumed support shields, real HP protection, observed crowd-control utility and survival.
- Proposed weighting: Tank emphasizes actual HP protection, Damage emphasizes real boss damage and guard break, Support emphasizes actual healing/shield consumption. Absent benchmark channels are redistributed rather than counted as fake actions.
- Clamp all previews to **0–1.4 Impact per attack**. Draft 0.8 / 1.8 / 3.0 cumulative thresholds remain 5 / 10 / 15 **hypothetical** Sigils, not minting instructions.
- \`rewardEligible\` is **always false** for both individual scores and cumulative milestone previews, irrespective of the score.
- The current simulation **does not yet measure production-calibrated benchmarks or prove the target within-five-percentage-point Tank/Damage/Support milestone parity**. The v8 calculator remains a scaffolding pass only.

### Important fairness caveat

The initial damage/utility ratio model can compare **like-for-like reference channels**, but production needs class-specific actual equipped stat distributions and combat telemetry. Directly weighting raw heal volume against mitigated HP would encourage intentional damage soaking; a benchmark and anti-farming model must be validated before real rewards. Cleanse-prevention values and interrupt counts are provisional until the event engine can prove exact avoided-damage opportunity.

## 4. Extra counterfactual matrix

\`apps/mobile/tests/world-boss-role-counterfactual-v8.ts\` defines **1,620 additional test fights**: 3 bosses × 3 phases × 2 pressure levels (1.5 / 2.5) × 3 initiator roles × 10 seeds × 3 variants.

Variants:
- **Baseline:** all current class abilities and the test-only 10% Tank ally interception.
- **No Support recovery:** remove only real healing/HoT/shield/cleanse abilities from the Support actor; does not ban basic attacks.
- **No Tank interception:** skip the unconditional test-only Tank protective passive; other Tank class actions remain.

Report squad damage, actors alive, real Support recovery, and Tank HP prevented for each variant. This is a **role sensitivity diagnostic, not an automatic nerf recommendation**. The existing \`CombatRng\` is cursor-based; changing an ability can shift later RNG consumption even with the same initial seed, so pairwise results are descriptive, not a controlled common-random-number experiment. That must be upgraded before using effect sizes to finalize combat balance.

## 4A. Archived verified combat evidence (CI run 42822128536)

The completed 2026-11-10 Mobile Core CI run archived:

- [36-row v8 pressure summary](spreadsheets/world-boss-pressure-v8-test-only.csv) — 1,620 level-25 class-kit fights across boss/phase/pressure and all nine initiator classes
- [54-row v8 role counterfactual summary](spreadsheets/world-boss-role-counterfactual-v8-test-only.csv) — 1,620 additional normal / muted Support recovery / disabled Tank interception fights

**Observed warning:** These synthetic level-25 fixtures still had **all four actors surviving** even at pressure ×2.5. Turning off Support recovery or Tank interception removed real healing/protection credits, but **did not lead to deaths** in these samples. Thus current encounter pressure is still insufficient to demonstrate strategic survival stakes. **Do not copy the ×2.5 coefficient into live combat.** Next calibration must use real equipped T1–T4 brackets and mixed-power Echo squads.

An additional test-only `apps/mobile/tests/world-boss-equipped-brackets-v8.ts` now prepares **1,296 matched-tier and 432 mixed-tier fights**, using the real current class/equipment `regionalCombatFixture` stats through the existing v4 relative unit adapter. It is a step toward realistic balancing, but **not** a complete secure server loadout resolver; its CI status must be verified before claiming pass.

## 5. CI and QA truthfulness

Earlier v8 commit after test order correction: GitHub Actions **Mobile Core run 42821606979** passed **all 339 then-registered core checks**, including 81 role Impact smoke cases. The *overall workflow* still failed in a separate Companion stamina validation step (\`companion_stamina_required\`), unrelated to World Boss code. The subsequent **Mobile Core run 42822128536** passed **all 340 then-registered core checks**, including v8 replay attribution, 1,620-run counterfactuals and the Impact preview. The **overall workflow still failed later** on the pre-existing Companion stamina step. The newly added equipped-bracket suite must still pass in its own newer CI run.

**Release blockers remain:** current player stat snapshots and actual equipped T1–T4 classes; production-compatible ability pacing and combat; role parity using observed power brackets; actual event combat victory criteria; atomic PostgreSQL event/receipt transactions; server authentication; replay integrity/versioning; real donated War Camp resources; approved and capped Sigil rewards; load/performance tests; original matching pixel art and compact mobile UI; explicit launch approval. No Public World Boss events or shops until these pass.

## 6. Recommended next development passes

1. Verify the current 340-check test suite and the role counterfactual matrix in CI; repair any failing World Boss-only test first.
2. Archive the new 36-cell pressure table and 54-cell role counterfactual table in \`docs/roadmap/spreadsheets/\` once observed.
3. Integrate current actual equipped T1–T4 skill/gem/companion snapshots into a **server-side only** World Boss adapter. Compare real PvE combat events and round events side-by-side.
4. Create a staging-only **transactional** account/event/HP settlement implementation and prove simultaneous attempts cannot double debit or double reward. Keep feature flag **OFF**.
5. Only then tune boss pressure, HP/community completion and Sigil fairness using data. Produce original art and guided UI after combat/reward architecture is stable.

**Version ownership:** [v6 round scheduler](world-boss-round-scheduler-v6.md), [v7 receipts/Echo matching](world-boss-transaction-prototype-v7.md), [v5 encounter spec](world-bosses-three-boss-contract-v5.md) and [historical v4 engine calibration](world-bosses-hollowroot-engine-calibration-v4.md).
