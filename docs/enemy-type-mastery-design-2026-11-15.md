# Enemy Type Mastery — design and implementation (15 November 2026)

## Goal
Add a second layer of character-bound mastery on top of individual Monster Mastery. Each **verified ordinary-monster kill** awards exactly **one species point** and **one enemy-family point**. Mastering Beasts improves hunts against every Beast, not every enemy in Veldryn. No unrelated families receive the buff.

## Progression and rewards
| Milestone | Species mastery | Enemy Type mastery |
|---|---:|---:|
| Points per rank | 25 kills | 100 kills |
| Maximum rank | 30 (750 kills) | 30 (3,000 kills) |
| Rank 5 | +1% damage | +1% damage vs family |
| Rank 10 | Full base species drop table | Base drop tables for discovered species in family |
| Rank 15 | +3% normal material yield | +3% normal materials vs family |
| Rank 20 | Advanced knowledge | Advanced family knowledge (informational milestone; no new combat access) |
| Rank 25 | Species mastery marker | Family mastery emblem (UI marker; not an account equipable badge) |
| Rank 30 | +2% damage, +5% normal materials | +2% damage, +5% normal materials |

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
Family mastery is **character-bound**, matching current individual Monster Mastery. It is not shared between different character slots. On the first upgraded save only, existing valid species kill points (maximum 750 for each species) are summed into the corresponding family. The total may be incomplete for users who killed a species after its individual cap because those excess historical kills are not recorded. Later saves always retain the independent family total and never reapply the backfill. Progression continues normally after an individual species reaches its cap. No old species ranks are reset.

Family points are granted only through the same verified ordinary-combat settlement that grants species points. Claiming the same period twice yields no duplicate family points; forged family-rank commands are not accepted. Preview calculations are pure and cannot grant ranks.

## UI and knowledge
The Combat screen shows Monster Mastery and a second compact Enemy Type Mastery panel. Type-specific drop knowledge reveals base drop tables for discovered family members only; the panel does not bypass region visibility or progression unlocks. Rank 25 shows a visual emblem only, not an equippable account badge (no such new badge entitlement is implemented).

## Deployment considerations
- The implementation adds `familyMasteryPoints` to each `CharacterState` and the save normalizer, including inactive character slots. No database table change is requested here, but live persistence of the character JSON needs confirmation.
- The new bonuses are applied in ordinary solo-hunt combat and material drop settlement. Dungeon and boss combat paths that do not use the ordinary monster mastery resolver **do not yet receive these buffs**, matching the existing species-mastery boundary. Do not advertise cross-mode bonuses without separately integrating server-authoritative combat snapshots.
- Existing skill, companion and progression records remain unaffected.
- Regression coverage checks all 41 mappings, fourfold rank pacing, total damage/yield, no replay, historical backfill, caps and UI discovery.
