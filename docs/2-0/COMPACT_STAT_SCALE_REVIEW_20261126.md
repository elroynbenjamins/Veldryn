# Compact stat scale — coordinated hidden 2.0 balance pass (2026-11-26)

Owner accepted compact numerical stats, natural class-specific level growth, equipment-led progression and separate CP rating. Keep the existing 1.0.x scale familiar; do not make a UI-only division of combat numbers or treat the historical large synthetic launch combat fixtures as final. This branch is stacked on private gem isolation #1912, pinned at 4719c32fa322b3dd4b8c54bb89e92591f4038109. All existing gem and combat evidence remains unchanged.

## Candidate core class anchors (HP / ATK / DEF)

|Class|Level 1 (provisional)|Level 25 (accepted proposal)|
|---|---|---|
|Bastion|136 / 12 / 16|210 / 18 / 32|
|Ironwarden|130 / 13 / 15|200 / 20 / 29|
|Dreadguard|126 / 15 / 14|190 / 25 / 25|
|Ravager|108 / 19 / 8|160 / 34 / 17|
|Knife Dancer|90 / 19 / 8|130 / 33 / 12|
|Hexweaver|92 / 18 / 9|135 / 32 / 13|
|Wayfinder|94 / 18 / 9|140 / 31 / 14|
|Dawnkeeper|100 / 12 / 11|155 / 19 / 19|
|Stonecaller|102 / 17 / 12|170 / 23 / 22|

The level-1 anchors, exact interpolation and post-25 growth are review choices, not final balance sign-off. Retain fractional internal stat growth; present readable values without modifying saved source precision. Level-25 anchors exact; level 50/75/100 Bastion DEF 48/64/80 and Ravager DEF 26/35/44. Every level 1–100 maintains all tanks above all non-tanks in natural HP and defense and all damage classes above other roles in natural attack. Do not prohibit hybrid equipment builds. The standalone review script is deliberately not imported into combat, UI, database or item code.

Run: `node --test docs/2-0/compact-class-stat-review.test.mjs`. Independent arithmetic check of the committed candidate: 900 level/class rows, 5,600 cross-role comparisons; no actual combat tests executed by this check.

## Coordinated implementation gates

1. Finalize complete versioned nine-class profile, including compact healingPower (support advantage), accuracy/evasion ratings, crit chance/multiplier and haste; do not invent conversion between percentages and ratings. Class-only profile must be level-derived from verified XP, with no legacy gear or passive duplication. Include class skill/spec effects in separate stages.
2. Audit actual canonical Forge T1–T5 unscaled base stats, rarity and quality, authored innate effects, set thresholds and exact-copy affixes. Scale absolute stat magnitudes only under an explicit per-stat policy; do not reapply rarity/quality or scale percentage affixes. Review common versus high rarity and all quality bands. Keep T6–T9 provisional. Target equipment as dominant progression: illustrative 30% class/level, 50% gear, 10% skills/spec, 10% gems/other; these are build-level diagnostic targets, not per-stat quotas, caps or CP weights.
3. Recalibrate actual engine defense mitigation constant (defense/(defense+constant)), minimum damage and hit floors, healing/shield coefficients and enemy health/attack/defense in the same units. Preserve role offense conversion intent and check relative attack caps. Keep accuracyScale, probability lanes, continuous gem diminishing returns and cooldowns distinct; no blanket common divisor. Ensure fractional damage rounding does not flatten early upgrades. Review enemy phase/shield thresholds, fixed HP quantities, solo hunts and dungeon level sync.
4. Build a parallel versioned review matrix across all nine classes/18 specs, full legal ten-slot or legitimate missing-offhand builds, T1–T5 and quality/rarity bands, solo and four-player encounters, ordinary enemies, elites and six regional bosses; fixed seeds and matched comparisons against archived large-scale references. Audit HP loss, mitigation, damage, effective healing/shields, threat, deaths, time-to-kill, solo viability and counterplay. Do not insist on identical DPS for distinct roles.
5. Explicit migration plan for 1.0.x characters and legacy items; never overwrite existing saved stat sources, silently convert exact-copy receipts or rescale legacy item stats by inference. Calibrate CP independently after combat evidence, then separately approve mobile presentation and production rollout.

No production data, release flags, live stats, engine, equipment values, item receipts, or deployment changed by this pass. Existing large-scale hidden test profiles remain intact until the coordinated parallel review is ready.
