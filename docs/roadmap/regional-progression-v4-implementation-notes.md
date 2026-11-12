# Veldryn — 25-level regional progression / Frostmarch XP / boss-healing implementation

**Draft implementation branch:** `balance/25-level-regions-frostmarch-potions`  
**Date:** 2026-11-12  
**Release:** NOT DEPLOYED. T6 remains unreleased (art/rewards not complete). The hidden Market policy is unchanged.

This pass implements the approved *structure* of two equipment tiers per ~25-character-level chapter and the requested Frostmarch ~25 continuous-combat hours per level. It builds on [V2 synthetic real-engine CP](./regional-progression-combat-power-calibration-v2.md) and [V3 live-combat projections](./regional-progression-combat-simulation-v3.md). It does not claim final world boss/dungeon balance or observed high-level player data.

## 1. Regional levels and gear

| Chapter | Region | Active range on staging branch | Tier I | Tier II | Upper tier strongly recommended from |
|---|---|---:|---|---|---:|
| I | Asterfall | 1–25 | T1 | T2 from ~13 | ~17 |
| II | Sunscar | 26–50 | T3 from 26 | T4 from 38 | ~42 |
| III | Frostmarch | 51–75 | T5 from 51 | T6 from 63 | ~67 |

Staged changes: `region-level-plan.ts` is the source of regional schedule and expected-tier logic; World tab zone ranges, Sunscar/Frostmarch subareas, scouting routes, monster authoring/unlock levels, Fallen Knight access and Sunscar dungeon minimum have been adjusted. **No extra HP/Attack/Defense multiplier** has been applied on top of existing **1.07x global × 1.20x advanced-region** multipliers; battle consistency requires further testing before adding one. Enemy EXP and loot catalog identities remain stable.

Tier-readiness penalties continue to average missing tiers across **ten slots**. Frostmarch never applies a missing-T6 penalty while T6 remains locked behind `MAX_RELEASED_EQUIPMENT_TIER=5`. V33 equipment set IDs and item IDs are not renamed.

T3/T4 are interpreted as Sunscar gear, T5/T6 as Frostmarch gear at runtime without rewriting the 1.5 MB historical V33 catalog. Equipment character-level floors are normalized at the runtime layer; the original catalog stays readable by older builds. This still requires a **release compatibility test** for items crafted under earlier requirements, plus an intentional long-term catalog migration.

## 2. Frostmarch ~25 continuous-combat hours per level

`regionalCharacterCombatXpScale(zone,enemyLevel,characterLevel)` adjusts **character XP only** for Frostmarch. All other zones keep their existing curve. The additional multiplier rises smoothly from **1.40× at level 51 to ~2.00× at 62 and 2.30× at 75**, applied on top of existing monster XP factors. Class combat skills, Smithing, Tailoring, Alchemy, Faith, loot, gold, and events are untouched.

The branch's real mobile hunt simulation tested the representative full-Common-Q50 loadout (four +2 enchantments, four G2 Stat Gems, legal trained companion) across all **nine classes, both set paths, and each Frostmarch level 51–75**, choosing the highest XP/hour encounter available at that level from the current monster list. Results from run [43209281022](https://github.com/elroynbenjamins/Veldryn/actions/runs/43209281022):

- **25.37 hours/level** unweighted mean across the 25 levels, confirmed by the staged CI run [43210183324](https://github.com/elroynbenjamins/Veldryn/actions/runs/43210183324).
- Per-level class/path mean between **24.23 and 27.64 hours**.
- Differences among roles/classes remain; 10th–90th percentile ranges are broadly ~21–32 hours, depending on level.
- With **T5 gear only** during levels 63–75 (because T6 remains locked), the independent release-ready-gear scenario averages **26.31 hours/level**, with individual checkpoint means **24.61–28.02 hours**. This verifies the target does not rely on prematurely releasing T6.
- No quests, season/party XP, dungeon XP, boosters, offline cap calendar effects or world boss XP are incorporated.
- Frostmarch still uses the current authored-timer hunt mode; if it is later migrated to the damage-driven combat system, repeat this calibration. The harness is reusable via `node tools/regional-combat-sim.mjs`.

Avoid treating this number as hours of play required; it is continuous combat XP at a specific optimistic equipment/equipment-source assumption. The source model is authoritative for current game math, not an observed player mean.

## 3. Boss healing vs tonics

**Policy selected for the next release:** **up to three healing draughts per Fallen Knight story/rematch fight**, automatically consumed only when damaged below the selected healing threshold, no regular food. **One attack/defense preparation tonic per dungeon run or boss attempt** is a separate consumable rule and is unchanged. Dungeon healing charges still follow the existing dungeon difficulty policy, not the story-boss cap.

Simply changing from five to three draughts without recalibration lowered full Common T2 synthetic win rate to ~52%. The staged story-boss source therefore reduces incoming Fallen Knight damage to **75% of the previous coefficient**. Validated 9-class/2-path × 12-seed projections at that coefficient (staged run [43210183324](https://github.com/elroynbenjamins/Veldryn/actions/runs/43210183324)) show:
- Plain full Common T2 with three draughts: **98.61% wins**, lowest class/path **83.33%**.
- Representative Common T2 with three draughts: **99.54% wins**.
- Mixed 7-piece T2/3-piece T1: **~53.24% wins**.
These are synthetic tests, not live win rates. The modified story-boss runtime, the nine-class dedicated story-boss regression, regional sustain tests and mobile core TypeScript checks **passed** in CI.

**Do not** apply the 3-draught cap to server-authoritative dungeon potion charges without a separate server/SQL design and corresponding tests; dungeon policy is different from a story boss. Nor should one-use offensive tonics be confused with healing charges.

## 4. Craft economy and release gate

- Smithing/Tailoring T5/T6 recipes now consume **Frostmarch** materials (Frostiron Ingots, Rimeglass, Frostbloom, Choir Bloom) and **Rimeward Distillate**, instead of late Sunscar supplies.
- Rimeward Distillate Alchemy level lowered from 76 to **46** so it can be prepared before T5 progression, with its material inputs still originating in Frostmarch. The entire material sourcing chain must be checked against real profession rates.
- Gear tier unlock floor runtime: T3 26, T4 38, T5 51, T6 63. Smithing/Tailoring requirement floors adjust with the chapter cadence.
- Full ten-piece assembly base gold by tier (current code, before processing or refining): **T3 58,644**, **T4 117,288**, **T5 146,610**, **T6 293,220** (one Foundation-class calibration). These values restore monotonicity between T4 and T5; cross-class/alternate paths can differ.
- **T6, T7, T8 and T9 remain unreleased** (max released T5). A future dedicated QA pass must validate completed artwork, source drops, forge previews, market/bank authorization and live migration before releasing T6.
- Hidden Market purchase policy `T1=6/T2=18/T3=30/T4=52` plus rarity premiums **has not been modified**. This is intentionally separate from equip floors and will be reconciled before Market launch.

## 5. Validation and blockers

Run `node tools/regional-gear-cp-benchmark.mjs` and `node tools/regional-combat-sim.mjs` after installing the mobile/backend dependencies. GitHub Actions `regional-combat-simulation.yml` reruns both plus mobile TypeScript and focused Fallen Knight/regional sustain regressions. No cloud production DB state is written by this workflow.

Pre-release QA still required:
1. End-to-end **old saves and owned gear** under raised T3+ equip requirements; avoid trapping previously equipped gear on swap or load.
2. Server-authoritative dungeon and Q-Mode composition/CP requirement tests at the new level-26 Sunscar entry; Asterfall dungeon remains Level 10.
3. Level-50 Sunscar finale / level-75 Frostmarch finale are **regional target milestones, not newly implemented story bosses**. Design and test actual bosses separately before claiming final chapter completion features are shipped.
4. Verify T5/T6 profession/material source time and price distributions using real community/telemetry data before enabling T6.
5. Fully test all actual Frostmarch levels and food consumption after changes to the hunt engine, particularly if the region moves away from authored timers.

**Merge/deploy status: draft PR only.** No schema migration, release flag flip, production SQL, player XP rewrite, or player-data modification was performed.

## 6. Additional regression and migration safeguards — November 12 continuation

The draft branch now has a dedicated `apps/mobile/tests/regional-gear-save-compatibility.ts` test for all nine classes: preserve already-equipped T3/T4/T5 item IDs and stats in a pre-transition level state, prevent *new* equipping before character Lv26/38/51, and confirm unlocked requirements are respected once attained. The test also asserts T6 is still not released. **This is not a full migration dry-run against production data** and does not guarantee safe item swaps in every historical save variant.

All Sunscar/Frostmarch chapter areas, exploration surveys and region monsters have matching new character-level bands. The prior advanced-Sunscar survey test was corrected to simulate the new **Lv38** Mirage entry rather than the old rebased Lv45. Existing Area IDs and legacy navigation aliases are unchanged; the new target band does not revoke exploration IDs. Unreleased Ashlands monsters are clamped to its future Lv76 entrance so authoring does not indicate a lower level than the visible region preview.

**Locked future items** T7/T8/T9 have provisional display/equip floors **76/88/100**. This does *not* constitute approval or release of Tier 9; the user's chapter plan puts T7/T8 in future Ashlands and reserves the T9 design for a later pass.

The approved tool-blueprint lower drop odds remain in effect; the regression now checks the reduced, rounded **3.5%** T2 baseline instead of the superseded 4.75%. A mild optional **Alchemy Lv76** double Rimeward Distillate batch uses 6 Wintermint / 3 Rimeglass / 5 Rime Resin for 2 outputs, 340 sec, 400 base Gold, 2,800 XP. The Lv46 recipe remains the standard T5 path; T6 remains locked.

### Sunscar dungeon new-run balance

Current server-authoritative Sunscar dungeon tiers remain at published **6,000 / 7,250 / 8,500 CP**, but minimum entry is now Lv26. The transition to a higher character level made the prior Tier II and Tier III test profile slightly too strong. The branch now stamps new sessions with `regional-tier-power-v2`, while saved `regional-tier-power-v1` Sunscar runs preserve their prior enemy level and multipliers. Dedicated tests verify the v1/v2 distinction. The new v2 Tier II attack/HP multipliers are 1.225/2.78 and Tier III 1.275/2.85; **these are provisional until the 40-seed two-boss regression passes**. Do not weaken the published target bands merely to make the test pass.

### Generated Edge bundle parity

The source changes affect the server-side shared gameplay and co-op engines, so the committed generated Edge bundles must be rebuilt before any merge. `.github/workflows/rebuild-region-balance-edge-branch.yml` is a *branch-only* one-shot rebuild that installs locked packages, runs `pnpm --dir backend build:online`, verifies both generated bundles, and may commit only those two generated files back to the **draft branch**. It has no production DB access, no deployment step, and cannot push to `main`. The workflow is queued as GitHub Actions [run 43220359459](https://github.com/elroynbenjamins/Veldryn/actions/runs/43220359459).

The expanded [regional combat regression](https://github.com/elroynbenjamins/Veldryn/actions/workflows/regional-combat-simulation.yml) now asserts level-band consistency, 25 Frostmarch checkpoints, XP timing target, three-healing-potion fairness, crafting recipes, old-equipped-gear preservation and basic source checks. Previous dedicated 25-hour/Fallen Knight simulation [43210183324](https://github.com/elroynbenjamins/Veldryn/actions/runs/43210183324) passed, but **newest branch checks are queued** and are not yet accepted as passing.

### Explicit remaining release requirements

- **Implemented with regression, awaiting latest CI**: Grandfather previously visited Sunscar/Frostmarch regional access based on persisted visit state, completed region scouting, or already unlocked local enemies **at a prior valid old level**. Chapter I and scouting requirements still apply, and only previously unlocked enemies can be hunted below the new region gate. Existing character XP/gear is not rewritten. Tests in `apps/mobile/tests/regional-legacy-access.ts` also reject fresh underleveled entry. Recheck production snapshots before release.
- **High priority**: Pass updated Sunscar Tier I/II/III dungeon Q-Mode tests for both final bosses at 105% minimum CP; leave all existing v1 run snapshots untouched.
- **High priority**: Regenerate/verify both Edge bundles in branch, then pass backend authoritative tests.
- **Release quality**: Full mobile validation currently has unrelated pre-existing Expo package drift and UI-contract failures in Guild/Profile/scroll indicators. Do not mark the release fully green until those are addressed or independently baselined.
- **Content**: Lv50/75 regional bosses are not designed/implemented here, and T6 artwork/source QA remains pending.

**No merge or deployment occurred.** This document must not be read as production rollout approval.

**Latest draft-branch QA update:** `regional-gear-save-compatibility.ts` tests the old equipped gear and `regional-legacy-access.ts` tests historic region entry; final GitHub Actions evidence has not returned yet. The branch-only Edge rebuild checkout now reads the latest branch HEAD rather than its stale triggering commit. No deployment or merge has been authorized.
