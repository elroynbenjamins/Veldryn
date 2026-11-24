# Veldryn 2.0: Skills/Abilities × all ten equipment slots × Boss opportunity QA
**HIDDEN WORK; 23 Nov 2026. Child of PR #1655 (which is based on hidden #1638 → #1377). DO NOT MERGE INTO main, activate 2.0, change UI, run migrations, grant rewards, or deploy.**

## Pass 3 — Boss mechanics really appear during the review
Previous 324 seeded encounters used a 7-second fight window while some boss skills have long cooldowns, making "targeted mechanic absent" findings ambiguous. Increase the synthetic encounter window to **35 seconds**; retain same signed equipment state, class/spec/boss/seed within each three-loadout comparison.
- Count observed boss **cast_start**, **status_apply** and **phase** events grouped by boss ID, plus comparisons with no opportunity events.
- These diagnostics distinguish player-counter weaknesses from an encounter that never exposed its authored boss mechanics.
- 35-second replay still **does not** certify a timed interrupt window, cleanse application accuracy, actual boss difficulty or approved relative Combat Power. Preserve mandatory follow-up reviews for targeted/alternative routes.
- Combat values, boss ability definitions and live gameplay are unchanged.

## Pass 4 — Real ten-slot signed full pipeline
Exercise 18 specializations × six existing Boss 2.0 identities × two fixed source-owned rarity/quality test profiles = **216 actual combat-engine encounters** using:
- All ten equipment slots and ten distinct owned item instances; the same character class, skill setup and boss per quality pair.
- One of the real six-slot role-specific set families (Citadel / Breakerforge / Rootshield), with all 2/4/6 threshold effects represented by **synthetic, QA-only** stat coefficients. These are not approved item-set coefficients.
- All 13 existing random affix definitions rotated through their eligible slots, PLUS the versioned, signed copy receipt for one currently implemented reactive equipment trait. Total count on each receipt remains within the draft rarity cap.
- Actual Enemy 2.0 authored server kit, deterministic matching equipment quality/rarity scaling, set compilation, affix resolution and trait activation.
- Fail-closed examples for banked/other-character gear, tampered/corrupt/missing signed receipts, an extra unselected receipt, an out-of-bounds affix, a pre-scaled crafted base and a rejected persisted ledger.
- Verify 108 better-rarity/quality stat-direction comparisons without imposing unapproved cross-class DPS targets or selling a completed player balance claim.

## Release dependencies
1. Exact-head CI must pass on this child PR; never confuse staged test count with a verified run.
2. Current mobile-core scroll-indicator rule fails only on `SkillsV2PreviewScreen.tsx:315`; user design approval is required before altering its appearance.
3. Replace synthetic ten-slot source definitions with current authoritative Equipment 2.0 item receipts, approved T1–T9 (rather than just T2–T4) effects, innate percentage traits, all final random roll limits, validated combat CP and companion source. Pre-scaled crafting item copies must **not** be re-multiplied.
4. Confirm final boss telegraph accuracy, interrupt timing, cleanses and diverse alternate solutions, then enemies/bosses, multiplayer/Party/World Boss and market custody. Legacy item copies must never become Player Market 2.0 tradeable.
5. No UI/theme changes or production/live routes until explicitly reviewed and approved for a coordinated 2.0 launch.
