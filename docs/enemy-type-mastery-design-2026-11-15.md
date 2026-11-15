# Enemy Type Mastery — design and implementation (15 November 2026)

## Goal
Add a second layer of character-bound mastery on top of individual Monster Mastery. Each **verified ordinary-monster kill** awards exactly **one species point** and **1–6 enemy-family points** depending on the monster’s authored level and region. Mastering Beasts improves hunts against every Beast, not every enemy in Veldryn. No unrelated families receive the buff.

## Progression and rewards
| Milestone | Species mastery | Enemy Type mastery |
|---|---:|---:|
| Points per rank | 25 kills | Increasing thresholds; first rank 250 points |
| Maximum rank | 30 (750 kills) | 30 (30,000 points) |
| Rank 5 | +1% damage | +1% damage vs family |
| Rank 10 | Full base species drop table | Base drop tables for discovered species in family |
| Rank 15 | +3% normal material yield | +3% normal materials vs family |
| Rank 20 | Advanced knowledge | Advanced family knowledge (informational milestone; no new combat access) |
| Rank 25 | Species mastery marker | Family mastery emblem (UI marker; not an account equipable badge) |
| Rank 30 | +2% damage, +5% normal materials | +2% damage, +5% normal materials |

The family curve is cumulative **P(r) = round(250r + 750r(r−1)/29)**, bounded to ranks 0–30. The milestones require 1,767 / 4,828 / 9,181 / 14,828 / 21,767 / 30,000 points at ranks 5 / 10 / 15 / 20 / 25 / 30. This keeps introductory milestones within reach and makes later ranks increasingly demanding.

**Points per verified ordinary kill** are selected from the monster’s actual zone and level (the higher eligible tier is used, not the sum):

| Enemy region | Typical points / kill |
|---|---:|
| Greenfields, Silverbrook, Ironwood Forest | 1 |
| Old Mines, King's Road | 2 |
| Sunscar | 3 |
| Frostmarch | 4 |
| Ashlands | 6 |

Monster level thresholds (20 / 35 / 55 / 75) provide 2 / 3 / 4 / 6 points respectively if the monster level warrants more than its region. Rank 30 therefore needs **30,000 low-zone kills** at 1 point each, or **5,000 top-zone kills** at 6 points each. Mixed hunting routes use the actual points earned for each kill. Reward calculations never depend on the player's current level or chosen region.

Rank 30 overrides earlier Rank 5/15 values **within the same track**; it does not add to them. Species and family damage bonuses multiply: maxed species + maxed family = 1.02 × 1.02 = **+4.04% total damage**. Material bonuses add to +10% and use a single fractional remainder to avoid lost amounts on low-quantity drops.

## Enemy families (41 ordinary enemies)
- **Undead**: oathfallen, drowned revenants, wraiths and specters
- **Humans**: mortal adventurers, raiders, soldiers and spellcasters
- **Orcs**: predefined, currently empty; no live enemy is claimed to be an Orc
- **Beasts**: common wildlife, wolves, aquatic fauna, bats and striders
- **Vermin**: arachnids, mites and scorpions
- **Natureborn**: treants, thornlings and plant creatures
- **Constructs**: animated sentinels and guardians
- **Elementals**: magical wisps and living flame
- **Spirits**: mirage-born noncorporeal entities
- **Giants**: forest trolls

All 41 ordinary enemies belong to exactly one of nine populated families, with Orcs ready for future content. The Fallen Knight story boss has no family mastery; boss victory cannot generate regular kill mastery. The assignments are authored in `src/content/enemy-families.ts` rather than inferred from the enemy's combat pressure profile. Lore review can update classifications without modifying combat algorithms.

## Legacy accounts and safeguards
Family mastery is **character-bound**, matching current individual Monster Mastery. It is not shared between different character slots. On the first upgraded save only, existing valid species kill counts (maximum 750 for each species) are multiplied by each monster's authored zone/level weight and summed into the corresponding family. The total may be incomplete for users who killed a species after its individual cap because those excess historical kills are not recorded. Later saves always retain the independent family total and never reapply the backfill. Progression continues normally after an individual species reaches its cap. No old species ranks are reset.

Family points are granted only through the same verified ordinary-combat settlement that grants species points. Claiming the same period twice yields no duplicate family points; forged family-rank commands are not accepted. Preview calculations are pure and cannot grant ranks.

## UI and knowledge
The Combat screen shows Monster Mastery and a second collapsible Enemy Type Mastery panel. Only the selected family expands; the compact rows show rank, points to next rank, actual known-enemy points per kill and stacked effects. Progress bars use the current rank's **variable** point interval, not a fixed number of kills. Type-specific drop knowledge reveals base drop tables for discovered family members only; the panel does not bypass region visibility or progression unlocks. Rank 25 shows a visual emblem only, not an equippable account badge (no such new badge entitlement is implemented).

## Deployment considerations
- The implementation adds `familyMasteryPoints` to each `CharacterState` and the save normalizer, including inactive character slots. No database table change is requested here, but live persistence of the character JSON needs confirmation.
- The new bonuses are applied in ordinary solo-hunt combat and material drop settlement. Dungeon and boss combat paths that do not use the ordinary monster mastery resolver **do not yet receive these buffs**, matching the existing species-mastery boundary. Do not advertise cross-mode bonuses without separately integrating server-authoritative combat snapshots.
- Existing skill, companion and progression records remain unaffected.
- Regression coverage checks all 41 mappings, the progressive 30,000-point curve, minimum one point per kill, higher-zone scaling, total damage/yield, no replay, weighted historical backfill, caps and compact UI discovery.

## Two refinement passes
1. **Progression and settlement:** single mastery-bonus resolution per hunt; progressive family-rank thresholds, weighted region/monster-level rewards, safe capped persistence, and level/zone-consistent backfill of already recorded kills.
2. **Presentation:** compact per-family accordion, point-based progress labels instead of inaccurate kill estimates, localized number formatting, explicit reward scaling and known-monster values, and a collapsed default to preserve combat-screen space.
