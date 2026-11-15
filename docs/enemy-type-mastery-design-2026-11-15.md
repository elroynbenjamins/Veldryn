# Veldryn Mastery Rebalance — species 1,500 kills / family 50,000 points
**Design & implementation:** 15 November 2026 · GitHub PR #1170 · Three refinement passes

## Goal and non-negotiable boundaries
- **Individual Monster Mastery:** one point per verified kill **of that species**, capped at **1,500 kills / Rank 30**.
- **Enemy Type Mastery:** an additional **1–6 points per verified ordinary kill**, awarded to that monster's single authored enemy family, capped at **50,000 points / Rank 30**.
- Species bonuses affect that exact monster; family bonuses affect only ordinary members of its enemy family. Bonuses stack with each other.
- Neither system awards points from unrelated monsters or the current story boss. No client-submitted command may create mastery points or ranks.
- Character-bound counters for both systems; no change to existing class/companion XP or season progression.

## Pass 1 — Progressive curves and reward pacing
### New cumulative thresholds
| Rank | Individual kills | Enemy family points |
|---:|---:|---:|
| 1 | 20 | 300 |
| 5 | 121 | 2,443 |
| 10 | 293 | 7,241 |
| 15 | 517 | 14,397 |
| 20 | 793 | 23,908 |
| 25 | 1,121 | 35,776 |
| 29 | 1,420 | 46,967 |
| 30 | **1,500** | **50,000** |

The exact monotone curves are:
- Individual species `K(r) = round(20r + 900r(r-1)/870)`.
- Enemy family `P(r) = round(300r + 41000r(r-1)/870)`.
- `r` is capped to the integer 0–30. The first individual rank costs 20 kills, the final rank costs 80 kills; family rank 1 costs 300 points, final rank costs 3,033 points.
- Rank 5/10/15/20/25/30 remain **the canonical milestone ranks**, but every milestone's kill/point threshold is recalculated from these functions. UI, anticipation hints and companion requirements use the same functions, avoiding separate hardcoded reward curves.

### Rewards: meaningful progress between milestone ranks
Both mastery tracks use the same **capped rank-to-bonus function**, scaled by their own independently earned rank:
- Before rank 5: no damage bonus. At rank 5: **+1.00% damage** against eligible monsters. Each additional rank gradually increases it to **+2.00% at rank 30**.
- Before rank 15: no normal-material yield bonus. At rank 15: **+3.00% normal materials** from eligible monsters. Each additional rank gradually increases it to **+5.00% at rank 30**.
- Rank 10 unlocks base drop knowledge. Species knowledge applies to that monster; family knowledge applies to already discovered members of that family only.
- Rank 20 reveals advanced knowledge. It does not fabricate an extra combat bonus or grant dungeon access.
- Rank 25 displays a mastery emblem/marker; family emblems are not equippable account badges.
- Rank 30 finishes both gradually increasing passive curves.

This replaces long unrewarded periods between milestones with incremental rank-by-rank growth while retaining the existing maximum multipliers.

**Stacking at maximum ranks**: Damage = `1.02 × 1.02 = 1.0404`, **+4.04%** against a monster with both tracks mastered. Normal-material bonus = `5% + 5% = +10%`, and both use one fractional-material remainder for fair small yields.

### Type points by monster difficulty
| Enemy region | Base family points per verified kill |
|---|---:|
| Greenfields, Silverbrook, Ironwood Forest | 1 |
| Old Mines, King's Road | 2 |
| Sunscar | 3 |
| Frostmarch | 4 |
| Ashlands | 6 |

Monster level raises the point award when relevant: level 20+ at least 2, level 35+ at least 3, level 55+ at least 4, level 75+ at least 6. Region and level are **not added**; the higher valid value wins. Player level and selected region never change awards. The rate remains between 1 and 6. Rank 30 requires 50,000 low-zone kills (1 point each) or approximately 8,334 kills of top-region 6-point enemies, excluding other accumulated family credits.

## Pass 2 — Compatibility, settlement and data integrity
- Increase species normalization and recording caps to 1,500. Previously earned valid kills remain as their recorded kill totals. **Historical kills beyond the old 750-counter cap cannot be recreated.**
- Enemy family normalization and cap increase to 50,000. On migration of a save **without a family counter**, backfill that family once from valid recorded species kills, weighted by their monster's level/region. Includes inactive character slots. Existing family counters are not overwritten or credited twice on subsequent loads.
- A previous 750-kill species counter is **not treated as 1,500 kills**. Under the revised rank curve, its displayed rank can therefore change until new kills are earned. We deliberately do not manufacture kill progress.
- Important exception: previously attained **account-wide companion unlock qualifications** are monotonic. Never overwrite old companion mastery-unlock counters with a lower recalculated rank; previously unlocked companions remain owned. New players use the revised Rank 20 requirement (793 kills of the corresponding species).
- Species and family points are recorded only through the verified ordinary hunt settlement with a valid positive integer kill count. Reclaims, zero kills, boss rewards and fabricated enemy IDs cannot grant points.
- Species kill counts cap at 1,500, but family point accumulation continues normally until 50,000.
- Combined damage is calculated once per hunt, and material bonuses share the same fractional remainder.

## Pass 3 — Presentation and regression
- Both mastery panels are collapsed by default and use one-expanded-entry-at-a-time layouts rather than showing long drop-table walls.
- Individual monster rows show species Rank, current / 1,500 kills, exact **variable-rank progress**, kills to next rank and current +X.XX% damage/materials. Expanded details show family bonuses, next milestone and source drops where knowledge is unlocked.
- Enemy type rows show family Rank, current / 50,000 points, exact variable-rank progress, points to next rank, known contributing enemies and actual +1–6 points per kill.
- UI formats numbers per selected language and uses current bonuses to **two decimal places**. Generic translation fallback is used for newly authored copy; comprehensive translations can be added separately.
- Family Rank 10 knowledge also unlocks the matching discovered species drop table in the species panel. Undiscovered species remain hidden.
- The 41 current ordinary enemies are explicitly mapped into Undead, Humans, Beasts, Vermin, Natureborn, Constructs, Elementals, Spirits and Giants. Orcs are reserved as an empty future family, not fabricated enemies.
- Tests exercise both rank curves, **every adjacent rank boundary**, bonus monotonicity and caps, region/level point awards, no duplication, companion unlock stability, inactive-save normalization, cross-family boundaries, reward stacking, material fractional remainders and UI source-of-truth bindings.

## Release gates and out-of-scope
1. Mobile/core TypeScript checks and combat/regional tests must pass. If they fail, distinguish feature regressions from the pre-existing Activity Overview ScrollView typing issue and Edge-bundle source/hash mismatch previously observed in CI.
2. Verify online persistence of `familyMasteryPoints` on active/inactive characters. This PR does not perform a production SQL migration or forcibly reset mastery progress.
3. Bonuses currently apply to **ordinary hunts**. The Fallen Knight and server-authoritative dungeons have separate combat paths; species/type mastery does not automatically apply to them. Extend server-trusted snapshots separately before claiming parity across modes.
4. No account badge entitlement or collectible art is created by the family marker alone.

These boundaries preserve progression integrity while delivering the requested longer, smoother mastery objectives.
