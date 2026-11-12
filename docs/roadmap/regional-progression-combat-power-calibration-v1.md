# Veldryn regional 25-level / two-tier Combat Power calibration — V1

**2026-11-12 · DRAFT ANALYSIS ONLY · NO GAMEPLAY CHANGES.** User proposed 25 character levels per chapter, two tiers of gear per region, with gear progression mattering near the halfway point. This note records the first source-grounded numeric proxy for discussion. It is **not observed user data**, **not an executable end-to-end simulation**, and **not** authorization to adjust live regions, enemy stats, gear levels, dungeon minimums, market policy or the equipment release ceiling.

## 1. Proposed chapter bands (current gameplay is NOT changed)

| Chapter | Region | Character levels | First gear band | Second gear band | Midpoint upgrade target | Chapter climax |
|---|---|---:|---|---|---|---|
| I | Asterfall | 1–25 | T1 1–12 | T2 13–25 | T2 helps from ~13, expected by ~17 | Fallen Knight Lv25 |
| II | Sunscar | 26–50 | T3 26–37 | T4 38–50 | T4 helps from ~38, expected by ~42 | Region boss ~Lv50 |
| III | Frostmarch | 51–75 | T5 51–62 | T6 63–75 | T6 helps from ~63, expected by ~67 | Region boss ~Lv75 |
| IV | Ashlands | 76–100 | T7 76–87 | T8 88–100 | T8 helps from ~88, expected by ~92 | **Future only, no gameplay activation** |

**Important current-level distinction:** The Fallen Knight monster definition still has authored level 25, but the actual player-facing `challengeFallenKnight` gate uses `rebasedCombatLevelFromLegacyLevel(25)` (currently character level **20**). Raising the Chapter I boss to actual character level 25 is therefore part of this proposal, not something already true in the rebased runtime. Likewise, current Sunscar travel begins at rebased level 20, and current Frostmarch travel at rebased level 34. Do not confuse authored enemy levels with active character unlocks.\n\nT9 requires a separate plan relative to the CURRENT level-100 cap. Do not assume a level 101+ is supported. **T6 is currently unreleased in `equipment-release.ts`** (MAX_RELEASED_EQUIPMENT_TIER=5); this chapter outline does not unlock it.

A single zone should not jump instantly from easy to inaccessible at a tier boundary. Introduce higher-tier enemies gradually over ~4 levels, keeping the prior tier viable with food, gems, enchants, tactics and optional companions. Stronger high-tier gear should shorten encounters and help survival; do not force a specific rarity or a full ten-piece set for ordinary mobs. Chapter bosses may reward a better kit but should not hard-require all Mythic/Epic rolls.

### Suggested four subareas per 25-level chapter (draft only)

| Region | Area | Proposed levels | Gear emphasis |
|---|---|---|---|
| Sunscar | Saffron Gate | 26–31 | T3 introduction |
| Sunscar | Scorchwind Flats | 32–37 | T3 mastery |
| Sunscar | Mirage Basin | 38–43 | T4 transition, T3 still playable with preparation |
| Sunscar | Tyrant's Crown | 44–50 | T4 expected for difficult hunts and finale |
| Frostmarch | Thawgate | 51–56 | T5 introduction |
| Frostmarch | Whitepine Reach | 57–62 | T5 mastery |
| Frostmarch | Shiverlake | 63–68 | T6 transition, T5 still playable with preparation |
| Frostmarch | Wyrmspine | 69–75 | T6 expected for difficult hunts and finale |

## 2. First Combat Power estimate — SOURCE-DERIVED PROXY, NOT FULL RUNTIME

The **character-sheet Combat Power** is the relevant score, *not* normalized `dungeonPowerIndex`. Its rating applies `statScore(effectiveStats, legacyCharacterLevelFromXp(xp))` plus the actual companion rating; the November companion display split caps the *attribution* at 18% without changing total CP.

Source-derived calculation method:
- Nine base classes, equal weight, using `classes.ts` HP/Attack/Defense and `class-stat-identity.ts` attack-share conversions.
- Ten V33 slot weights, exactly **21 Attack, 33 Defense, 76 HP per tier**, using `equipment-items-v33.ts` and `equipment-path-stats.ts`. Foundation/Alternate allocation and per-item catalog level variation are **not sampled**. All pieces assumed obtainable and at Common rarity, Q50 (=1.00×).
- **Four of ten pieces at +2**, the other six at +0, represented by a 1.032× aggregate gear multiplier (the model spreads the four selected upgrades evenly over gear budget rather than choosing specific slots). Exact game's +2 multiplier is +8% on an upgraded copy.
- Four **Grade 2 canonical Stat Gems**, exactly one each Might (+0.5% Power), Vitality (+0.8% HP), Iron (+0.65% Armor), Ward (+0.65% Ward), all 100%-roll, in four stat sockets. No Effect Gem throughput benefit is assumed. This choice illustrates modest realistic sockets, not proven player distribution.
- One legal standard starter companion, with proxy base equivalent to the current Hound/Sentry (570 rating source budget), advancing by stage from companion Lv5/10/12/15 and a Rare at Lv20/25; ascend/Bond approximations per CSV. For a given class, choose a companion of a different role.
- Levels at the suggested transition/exit milestones. Level XP is computed from current rebased `characterTotalXpAtLevel`; Combat Power intentionally uses `legacyCharacterLevelFromXp` to preserve pre-rebase rating.
- **EXCLUDED**: exact equipped set 2/4/8/10 piece static bonuses (large catalog not evaluated in this proxy), six-piece combat trigger, per-piece Foundation/Alternate split, mixed rarities, quality spread, class combat skill XP/passives, Faith, pet/passive bonuses, extra Effect Gems, consumables, player power distribution, event modifiers, real dungeon snapshot/encounter outcomes. Values are **lower-context scenario estimates, not exact lower bounds**, as the omitted effects can be positive or vary by build.
- **All T6 calculations are hypothetical**: gear exists in the full internal catalog but is not released.

| Tier | Example combat level | Class mean CP | Nine-class range | Mean personal CP | Mean companion CP | Interpretation |
|---|---:|---:|---|---:|---:|---|
| T1 | 12 | 3,020 | 2,838–3,144 | 2,284 | 736 | Asterfall first-half end |
| T2 | 25 | 4,682 | 4,445–4,880 | 3,776 | 906 | Asterfall boss |
| T3 | 26 | 6,018 | 5,724–6,285 | 4,943 | 1,075 | Sunscar entry |
| T3 | 37 | 6,389 | 6,095–6,657 | 5,295 | 1,094 | Sunscar midpoint |
| T4 | 38 | 7,668 | 7,319–8,011 | 6,435 | 1,233 | Sunscar T4 switch |
| T4 | 50 | 8,089 | 7,738–8,434 | 6,832 | 1,257 | Sunscar boss |
| T5 | 51 | 9,545 | 9,137–9,960 | 7,998 | 1,547 | Frostmarch entry |
| T5 | 62 | 9,920 | 9,513–10,335 | 8,350 | 1,570 | Frostmarch midpoint |
| T6 | 63 | 11,366 | 10,900–11,863 | 9,514 | 1,852 | Frostmarch T6 switch, **unreleased** |
| T6 | 75 | 11,651 | 11,183–12,147 | 9,779 | 1,872 | Frostmarch finale, **unreleased** |

The CP estimates **must not yet be used as exact dungeon admission thresholds**. At the current Sunscar dungeon gate T1/T2/T3 = 6,000/7,250/8,500, the T3-entry proxy is close to 6,000 and T4 near Lv50 is close to 8,100 *before* actual set/passive bonuses. This suggests the current threshold magnitude is not wildly disconnected, but does not prove tuned win rates or real-player readiness.

## 3. Existing enemy/tier mechanics to preserve and recalibrate

The ordinary hunt engine already computes the **average missing equipment tier across all ten slots** in `regionalEquippedTierGap`. It currently uses an expected-tier jump per authored monster level. The gap leads to:
- attack/kill speed penalty: `max(0.50, 1 - 0.24 * gap)`
- incoming damage pressure: `1 + 0.20 * gap`
- additional gear attrition: `1 + 0.62 * gap`

The existing Sunscar thresholds use old authored enemy levels 40+ for T4; Frostmarch uses 55+ for T5, 70+ for T6. A full regional rebalance must reconcile monster authored levels with the character XP rebase and new 26–50 / 51–75 chapters; do **not** simply raise a displayed level label while retaining the old hidden tier thresholds, and do not accidentally double-apply difficulty multipliers.

Suggested more gradual ramp near midpoint:
- At region entry, expect mostly the first tier; at levels 38–41 in Sunscar or 63–66 in Frostmarch, introduce second-tier elite pressure.
- By level 42 (Sunscar) / 67 (Frostmarch), second-tier gear becomes a meaningful recommended upgrade for harder hunts, while mixed sets remain viable.
- Boss near 50/75 tests survivability and mechanics, not a hidden minimum-CP check for every ordinary enemy.
- Do not require 10/10 upper-tier pieces just because a single new region opens. Keep the existing average-slot readiness intent; test partially upgraded loadouts.

Current code: `apps/mobile/src/core/game.ts` (combatRuntimeDetails, regionalEquippedTierGap), `apps/mobile/src/content/monsters.ts` (regional 1.20 multiplier + general 1.07), `backend/src/server/coop/dungeon-entry-policy.ts` (current Asterfall 2,500/3,750/5,000; Sunscar 6,000/7,250/8,500), `backend/src/server/coop/regional-power-balance.ts` (extra CP bounded contribution), `apps/mobile/src/content/regional-areas.ts` (current rebased 20–34 Sunscar, 34–50 Frostmarch), and `apps/mobile/src/content/equipment-release.ts` (released max T5).

## 4. Required next verification (before changing level and market gates)

1. **Full 9-class × T1–T6 runtime Combat Power benchmark**, building exact Forge instances and legally equipped gear, with actual set bonuses and accurate socket/enchancement behavior. Include six loadouts: bare/early mixed; 7-piece Common Q40; 10-piece Common Q50; 10-piece Uncommon Q60; Rare Q70 +2; optimized high-rarity Q85 +3/+4 as stress ceiling. Run multiple gems and companion investments, but do not treat Mythic as typical.
2. Verify per-tier *actual* item required levels, availability and resources; T6 remains preview-only. Compare class min/median/max CP and role-specific survival/output; include 8/10 and mixed-tier gear transition tests.
3. Feed authoritative loadouts to ordinary hunts and the **real dungeon/boss simulator**, measuring kill time, damage taken, food consumption, clear rate and resource consumption. Distinguish regular encounters, elite, boss and Q-Mode; tune desired performance by role.
4. Check whether enough Smithing/Tailoring/Alchemy/Enchanting materials and experience are available by each proposed midpoint. Avoid soft-locks or recipes that only drop after the upgrade is needed.
5. Review XP/hour/time-to-level for the new 25-level chapter scale; simply renumbering monsters without XP rebalance could make chapters too short or too long.
6. Only after these results decide the final level requirements for gear, materials, market purchases, dungeons and world travel. The owner-approved Market T1–T4 purchase floors **6/18/30/52** and rarity premiums are **not changed** here; they will need an explicit reconciliation with the new regional ladder.

**No server or production changes have been made.** The data are a deterministic hand-derived proxy from verified source formulas and documented assumptions, not observed production analytics or a passing integrated simulation.
