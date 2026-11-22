# Party Events V93 — full-source, 9-class / 18-spec balance evidence pass

**22 November 2026. UNRELEASED AND DISABLED. No deploy, main merge or UI change.**

## Verified V92 result at exact prior head

On V92 head `4ae8af358447b093f1cb7166ffbd501cf472f2a2`, [the hidden Combat 2.0 trait-engine workflow #44993935804](https://github.com/elroynbenjamins/Veldryn/actions/runs/44993935804) **passed**.

The V92 144-case synthetic 90s matrix reported **48 victories, 26 wipes, 70 timeouts**, **4,175 executed EQ2 trait events**, **3,386 actual reflected-damage events**, 72 instances reaching the 70% boss phase, and 59 reaching the 35% phase. Four families were represented by the existing V90 authored kit. The narrow two-member actual full-source build compiler also passed, and Combat's separate 108 class/spec/regional-boss cases passed. These are reproducible fixture outcomes, **not** live data or an approved event win rate. The 70 timeouts may reflect intentionally high boss tiers versus undergeared fixed level-25 fixtures and should not trigger blind HP nerfs.

Concurrent broader workflows were **not fully green**, independently of the V92 hidden test: Edge generated gameplay/co-op bundles diverged; the Live Edge V2 isolation bundler rejected hidden trait module imports; mobile core 4/403 checks failed (Gold recipe, tool blueprint odds, balance projection, scroll indicators), plus an independent mobile job failed. These are unresolved cross-branch release blockers; do not quietly weaken guards or regenerate/deploy public Edge bundles from this development branch.

## First passing V93 class/spec run — diagnostics, not approved balance

At development code head `375647fe65b29e89877b01fcbeb4ce6ddabe0477`, the hidden Combat/Equipment 2.0 engine job [run #45006983509](https://github.com/elroynbenjamins/Veldryn/actions/runs/45006983509) passed strict TS, V92 144 boss cases, V92 two-actor complete EQ2 source build, V93 648-case class/spec matrix, legacy parity and release-off guards.

V93 emitted: **9 classes / 18 specializations, 648 encounters and deterministic replays, 1,944 completely compiled QA equipment member snapshots and 15,136 real V2 trait triggers.** Synthetic outcomes were **197 wins, 130 wipes and 321 timeouts**. This is still level-25 QA equipment with hand-authored tier policy and a fake independent persistence verifier. It does not certify that almost half of real players will time out.

Across comparable sampled 54-scenario per-family/difficulty buckets: Broken Caravan had 24/16/13 wins (standard/veteran/heroic), Nightfall Hunt 21/17/15, Broken Wards 18/17/10, Lost Reliquary 20/16/10. This pattern suggests examining recurring ward and mirror shields plus late-tier throughput; no numeric buff/nerf is justified yet without stratifying by tier and actual equipment levels. **Do not change HP curves from pooled success percentages.**

## V93 next diagnostic and source-seal refinement

A subsequent branch refinement adds per-tier, tier+difficulty, party-size and primary-role diagnostic buckets, including P50/P95 successful-clear durations, all-outcome durations, effective healing, shields, interrupts, damage taken and phase exposure. The refinement also seals the result of the real per-member EQ2 class/item compiler in a private in-process WeakMap and rejects unsealed or post-compilation mutated actor sources before strict Party encounter QA. This is **defense in depth in a test-only runtime**, NOT a privileged persisted database witness. **The new exact-head CI result must be checked independently**; do not transfer the earlier green result to this later commit.

The wider Edge/mobile failures match those already visible on hidden Combat parent head `c1f5882`; they are independent release blockers, not a reason to weaken the hidden trait-provenance gate.

## V93 implemented for review

`backend/src/server/party/__tests__/weekly-party-event-eq2-class-spec-matrix-v93.ts` now uses the actual Equip/Skills 2.0 compilers for every member and runs:

- **9 classes × 2 specializations × 4 Party boss families × 3 difficulties × 3 party sizes = 648** deterministic new-run encounters (each with a 90s limit).
- Every class/spec as the primary slot, filling remaining positions with a consistent sampled flexible composition. Per scenario, all members are QA-equipped at T1 or T4 according to a rotating tier plan; **boss tiers 1,4,8,12** are distributed across scenario axes, NOT exhaustively crossed. This samples full-source classes at all four boss tiers but does not estimate competitive win rates.
- Own-equipment simulated item receipts, verified class-only baselines, selected skills, quality/rarity, base stats, set/13-affix compiler, exact-copy new hit/reflect channel, server-chosen signature trait, then the actual V2 trait engine. No client-provided stat multipliers.
- One replay of every identical frozen encounter, stats/phase/trait output validation, win/wipe/timeout diagnostics by class/spec/family/difficulty. Aggregated results are emitted for tuning review. It also checks 9 class and 18 spec coverage.
- QA-only synthetic versioned authoring policies and a deliberately fake private verifier; **not** proof of actual account equipment or V87 victory/tier settlement. All T4 item slots are QA, so they do not certify real level requirements or drops.

V93 is registered in the hidden CI workflow on draft PR #1593. **Exact-head results were queued when authored.** No numerical boss stat multipliers or player item/tier curves were adjusted.

## How to use results responsibly

1. Review V93 exact-head strict TypeScript and run output. If red, fix this branch's compiler/runtime regressions before interpreting samples.
2. Compare per-boss phase exposure and contribution under **like-for-like** party size, tier, difficulty and source-authoring policy. Stratify by tier; do not use a pooled synthetic 648-run victory percentage as a production KPI.
3. Extend to approved all 17 affix channels, 28 proposed traits as they are actually implemented, verified 2-signature builds, companions/gems, preparation and 1/4/8/12 *full cross-product*, with all classes and specs under real tier/level restrictions.
4. Freeze a complete server-owned party encounter (trusted roster, all equipment copy revisions/receipts, seed, stage-3 orders, event version) and independently certify a V87 settled victory/tier; route to existing V70 exactly-once settlement with real item custody.
5. CI parity, staged PostgreSQL 17.6 independent sessions, recovery/race/erasure, Android QA, owner review of all UI/themes and coordinated 2.0 major launch remain mandatory.

**Release: HOLD. Keep all flags FALSE and PRs #1416 and #1593 hidden/unmerged.**
