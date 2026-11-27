# Compact stat scale — passes 2 and 3 source review (2026-11-26)

Continues PR #1913 without changing live gameplay or the agreed nine level-25 HP/ATK/DEF anchors. Parent #1912 large-scale tests remain immutable. All new numerical choices below are candidates, not final balance.

## Pass 2 — full class baseline

All nine existing CombatStats fields now have explicit review values. At level 25:

|Class|Healing Power|Accuracy rating|Evasion rating|Crit chance|Haste|
|---|---:|---:|---:|---:|---:|
|Bastion|8|680|180|5%|3%|
|Ironwarden|10|680|180|5%|3%|
|Dreadguard|13|680|180|5%|3%|
|Ravager|3|700|160|12%|5%|
|Knife Dancer|3|800|330|18%|14%|
|Hexweaver|5|790|250|13%|9%|
|Wayfinder|4|810|270|15%|10%|
|Dawnkeeper|32|720|230|7%|8%|
|Stonecaller|25|690|190|6%|4%|

Crit multiplier stays 1.5. Accuracy and evasion are existing internal engine rating units, NOT compact percentages; leave them and accuracyScale=1400 untouched until a dedicated rating review. Healing grows naturally across levels 1–100 with all supports above other roles. Healing and shield coefficients are still shared through engine healingPower and must be calibrated for the compact units. No runtime import.

## Pass 3 — existing Forge flat budget is already compact

Read the exact three hidden server manifests from the branch. 169 canonical draft pieces, T1/T2/T3/T4 = 37/43/43/46. The original Forge type only supports T1–T4. T5 expanded structural records are not original mints; no false T5 claim.

The canonical draft projection uses 73 combined full-slot points, tier x 1.08, HP worth four units per point, rarity x quality once. At T2 common Q50 the reference gear budget is 157.68 points, or approximately 61–67% of original three-core-stat class+equipment weighted budget at L25, before skills, gems, sets, healing, companions, etc. This is a source diagnostic, not Combat Power, not the promised share of actual combat strength. No need to shrink existing base budgets reflexively.

### Support flat Healing Power review alternative

Current six profiles allow only ATK/DEF/HP; Healing Power affixes multiply output but do not grant a flat healing base. In the proposed alternative, the support weapon uses 60% Attack / 40% Healing Power, and its one-handed offhand uses 60% Defense / 40% Healing Power. A two/dual-handed weapon occupies the combined hand budget, so it receives exactly the same total 40% healing share at matched tier/rarity/quality (within 0.02 rounding). One budget point equals one candidate flat healing unit. This replaces an existing secondary stat allocation, never adds a third stat or invents free points. Both support weapon types retain their previous 60% Attack allocation. Other classes and all existing affix percentages are untouched. Actual authoring, mint version, eligibility and engine shield/heal calibration remain unapproved.

### T2 common Q50 reference builds at L25 (no set, affix, gem, passive or companion bonuses)

One alphabetically stable eligible piece per non-weapon slot, class weapon, omit offhand for two/dual-handed weapons. Not exhaustive legal build coverage or a claim that one class must always outperform hybrid builds.

|Class|HP|ATK|DEF|Healing|
|---|---:|---:|---:|---:|
|Bastion|395.76|36.79|124.45|8|
|Ironwarden|385.76|38.79|121.45|10|
|Dreadguard|412.62|56.75|95.27|13|
|Ravager|304|117.81|54.87|3|
|Knife Dancer|274|116.81|49.87|3|
|Hexweaver|310.10|99.39|59.51|5|
|Wayfinder|284|114.81|51.87|4|
|Dawnkeeper|400.38|45.57|72.35|48.42|
|Stonecaller|415.38|62.53|62.39|41.42|

All representative tanks have more defense, damage classes more attack and supports more healing than the other roles. HP can overlap with HP-focused support equipment; do not make a rigid role cap. Effective survivability must be verified via actual engine simulations.

### Validation

Independent JS harness executed the committed test bodies at f4954b321c49de47efe0d89cc3c766eefd18fcb7, substituting only test/assert and file IO adapters for Node's APIs, using the exact branch source. All 11 checks passed: 900 full stat rows; 1,400 support-vs-non-support healing comparisons; 3,042 piece profiles (169 x 6 x 3); 36 reference loadouts (20 nine-slot, 16 ten-slot), 648 loadout rarity/quality profiles; 72 hand-budget comparisons. The first weapon-only review exposed the Stonecaller hand advantage; the offhand revision fixes this. Actual Node CI is separate; no combat execution or backend build has been certified. Dedicated workflow runs the standalone Node tests only.

Next: actual versioned Forge generator/receipt review for a new support healing profile (do not reinterpret saved receipts), T5 source reconciliation, and parallel compact enemy/mitigation/damage/healing simulation. Review existing default mitigation constant 1200 before running any compact-stat encounter; retaining it would collapse armor effectiveness. Accuracy rating scale remains separate. No live imports, release flags, migrations, deployment or main merge.
