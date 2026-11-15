# Class combat-skill passive audit — 15 November 2026

## Scope
All nine playable classes and both class-skill slots (18 slots total). The source of truth is `characterClassEffects` in `apps/mobile/src/core/class-skills.ts`, exposed through `classSkillBonuses` and `effectiveStats`. Percentages listed here are maximum at skill level 100. Attack, Defense and Max HP are **relative multipliers**. Accuracy and Evasion are **percentage-point increases**, not relative multipliers.

The named class *techniques* (e.g. Rune Bash, Sun Smite, Windshot) are separate combat mechanics. Their solo-hunt scaling currently uses the **first** class-skill level and must not be confused with passive effects of the two disciplines.

| Class | Primary skill | Current level-100 passive | Secondary skill | Current level-100 passive | Audit |
|---|---|---|---|---|---|
| Ironwarden | Guardcraft | +12% Max HP | Warding | +10% Defense | Partial: neither specifically grants physical/magical mitigation; they improve general survival |
| Bastion | Guardcraft | +12% Max HP | Warding | +10% Defense | Same generic survival specialization |
| Dreadguard | Might | +12% Max HP | Warding | +10% Defense | Mismatch: “weapon power” does not grant Attack |
| Dawnkeeper | Restoration | +10% Attack | Sanctity | +10% Max HP | Mismatch: Restoration passive gives no healing; Sanctity passive does not cleanse |
| Wayfinder | Marksmanship | +7% Attack | Tracking | +3% Attack, +6% Defense | Mismatch: Tracking does not increase Accuracy |
| Ravager | Might | +7% Attack | Breaking | +3% Attack, +6% Defense | Mismatch: Breaking does not directly grant armor penetration |
| Hexweaver | Spellcraft | +7% Attack | Hexcraft | +3% Attack, +6% Defense | Mismatch: Hexcraft does not grant Hex potency |
| Knife Dancer | Blade Rhythm | +7% Attack | Precision | +3pp Accuracy, +6pp Evasion | Precision corrected in PR #1161; Blade Rhythm's passive Attack does not directly increase Haste |
| Stonecaller | Resonance | +10% Attack | Geomancy | +10% Max HP | Mismatch: Resonance passive does not restore HP; Geomancy gives generic survivability |

## Finding
The passive system currently uses three broad formulas (tank/support/damage), with an exception introduced for Knife Dancer Precision in PR #1161. This explains why many flavor themes do not describe the actual numeric bonuses.

The class techniques for solo hunts and the Fallen Knight have their own damage/guard/healing logic, so their combat identities must be evaluated separately from passive bonuses. The existence of an appropriate class technique does **not** mean a passive effect grants the same attribute.

## Immediate safe UI correction
The skill popup's prominent subtitle now derives its stat names from `classSkillBonuses` rather than hand-authored `theme` text. The exact current and level-100 values already came from the same runtime bonus function. This removes contradictory headlines without silently changing all nine classes' live combat balance. A regression test audits all 18 class-skill slots and checks the UI binds to these runtime labels.

## Recommended gameplay follow-up
A separate explicitly balanced specialization pass should prioritize Dreadguard Might (weapon power versus HP), Dawnkeeper Restoration and Stonecaller Resonance (support/recovery versus Attack), Wayfinder Tracking (accuracy), Ravager Breaking (armor pressure), Hexweaver Hexcraft (hex effects), plus Guardcraft/Warding and Blade Rhythm specificity. That pass must verify real solo-hunt, story-boss and server-authoritative dungeon effects **and** repeat the nine-class regional survival/kill-rate matrix before any release. Do not increase all enemy difficulty or blanket-buff all classes without simulation.

## Release integration
The UI audit branch is based on `fix/knife-dancer-precision-accuracy-evasion-20261115`; merge PR #1161 before merging this dependent audit. The audit does not itself retune enemy stats, experience, loot, skill levels, cooldowns or class-technique damage.
