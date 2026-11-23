# Veldryn 2.0 — Wave 7: exact affix probability and class-role weighting sensitivity

**Date:** 23 Nov 2026 · **HIDDEN, READ-ONLY REVIEW/QA, NOT A LOOT TABLE**.
Stacked on Wave 6 PR #1689 → Wave 5 #1687 → Wave 4 #1682 → Wave 3 #1679 → Wave 2 #1675 → Wave 1 #1673.
No `main` merge, player currency/copy changes, authenticated transaction, feature flag, production/staging SQL, deployed Edge code, UI or theme edits.

## Goal

Wave 6 proved that a fully specified **30-row role × slot** source-candidate policy can be mechanically validated as a **not-issued shadow** across 169 original Forge templates and six existing rarities, without altering the original source generator. Wave 7 tackles the next unanswered question: *what do different statistical weights actually mean for item diversity and role identity, particularly when rarity gives two or three distinct rolls?*

A first-draw weighted chance alone does **not** tell us the probability of an item actually receiving an affix if it has multiple rolls. The second/third draws remove earlier selected stat IDs. To compare scenarios correctly, enumerate every ordered path and sum path probabilities into unordered combinations.

## Implemented source-grounded methods

- `v2ServerOriginalRoleAffixWeightsForReview(role)` reads the existing private Forge **role-specific legacy RNG weights**, returning detached copies. It does not change original `ROLE_WEIGHTS`, the 70% preferred-slot selection, the 30% off-slot fallback or `draftEquipmentV2Outcome`.
- `inspectForgeShadowPolicyRowsV2` returns copied, fully validated 30-row review fixtures from the existing Wave 6 strict validator. An arbitrary incomplete or altered policy cannot be silently analyzed as if approved.
- `reviewExactWeightedAffixDrawV2` enumerates distinct stat identities without replacement, applying exact conditional probabilities. Reports first-draw share, unordered subset probabilities, per-stat **marginal inclusion** and expected number of selected affixes. Strong reject-on-invalid tests cover duplicated/unknown stats, ambiguous Potency, bad counts and nonpositive, fractional or nonfinite weights.
- `makeForgeAffixSensitivityFixtureV2` creates **two unapproved reference scenarios** only:
  1. **Equal candidate weights:** 100 for each eligible stat in its role/slot policy (neutral math comparison, not an approved table).
  2. **Original-role continuity:** preserve each stat's old Forge role weight *if it was in the old role pool*; for any newly proposed eligible stat, assign the **minimum** old role-source weight solely as a sensitivity assumption. The minimum-weight assumption is not a recommendation or approval.
- `reviewForgeAffixSensitivityV2` calculates both scenarios over **169 physical source templates × six original rarity bands × two scenarios = 2,028 exact source-rarity-scenario distributions**. Current rarities and T1/T2 vs T3/T4 roll counts remain unchanged. Summary fields use a **uniform weighting over Forge template identities** and original rarity probabilities within each template; they are **NOT representative of real player crafting demand, actual loot distribution, item drop rates or combat balance**.
- The standalone adversarial regression checks the mathematically exact example weights 3:1:1 over two rolls: unordered subset probabilities **45% / 45% / 10%**, not a naive doubled first-pick probability. It then repeats 2,028 actual-source analytic cases, checks exact 100% normalization, per-stat inclusion and three-roll max, independently passes the same shadow fixture to Wave 6's source selector, and verifies unchanged original Forge outcomes.

## How to use this as a design review

Inspect Tank gloves, Damage helmet, Support cape, and signature weapons separately. The inputs and output clearly identify the role and slot, and provide observable selection concentration from candidate weights. A meaningful final design must consider **player perception**, combat counter-build choices and equipment market viability. Because original Forge `potency` remains intentionally unmapped, no result can grant its effect.

Before selecting final numerical weights:
- Review **which new stat identities** should be allowed on each class-role/slot. An exact formula cannot resolve whether a Tank glove should roll Haste, Accuracy or damage by default; that is an authored combat decision.
- Decide whether weights should be same across tiers or gradually bias particular stats by tier, and how high-rarity multiple-roll variety should change item value. Do not equate this reference scenario with the final tier-specific distribution.
- Respect the original rarity quality/budget, the frozen Forge stat scaling rule, and % affix caps. Selected rare-set **innate percentage stats** and full set thresholds need their **own signed source** before any balancing claims.
- Validate aggregate offensive, defensive and support throughput with real Skills / Combat / Enemy counterplay on QA-only original Forge copies, not by assuming equal Combat Power means identical builds.

## Non-goals and hard safeguards

**Original mint RNG and receipt versions stay unchanged.** These analyses do not sample production randomness, grant an item, create source custody, sign a policy, change any numeric roll ranges, set CP multipliers, authorize in-game stat selection, change Gold/material consumption, weaken legacy-item market segregation, or bypass a feature/UI/theming gate.

The two illustrative scenarios are explicitly **unapproved sensitivity inputs**, never default weights or a list of approved 2.0 balancing values. The private workflow rejects importing any of these review functions into mobile/public online/deployed Edge entrypoints.

## Wave 8 follow-up

Only after human review: choose which stat identities are appropriate for every class role/slot and determine signed numerical weights, restrictions, tier policies and rules version. Then implement a **server-authoritative new-mint** pipeline with secure RNG, signed/pinned policy version, immutable source-custody claims and separate 1.x/legacy exclusion. Next exercise real-source 9/10-slot combat, effects, gems, innate percent, CP and cross-account market constraints.

**Stop ship:** no approved 30-role-slot loot table, no validated runtime signed mint, no authenticated live account locks, unresolved original set effects and innate % rules, and broad Mobile/Edge/Economy/Dungeon/Skills checks remain independent release blockers. This Wave 7 remains review-only regardless of isolated CI success.
