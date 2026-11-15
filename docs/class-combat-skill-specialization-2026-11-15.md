# Class combat specialization pass — 15 November 2026

This is the gameplay follow-up to PR #1161 (Precision) and PR #1162 (all-class audit). It is based on both PR branches and must merge after them. Skill levels/XP remain untouched.

## Skill bonuses at level 100

Bonuses scale linearly from skill level 1 to level 100. Attack/Defense/Max HP/Class Healing are *relative* multipliers. Accuracy/Evasion, Haste, Warding, Armor Penetration and Hex Potency are percentage points / fractional bonuses of their corresponding base stat, not global item-stat conversion.

| Class | Primary discipline (Lv100) | Secondary discipline (Lv100) |
|---|---|---|
| Ironwarden | Guardcraft: +8% Defense | Warding: 5% incoming damage ward |
| Bastion | Guardcraft: +10% Defense | Warding: 6% incoming damage ward |
| Dreadguard | Might: +7% Attack | Warding: 5% incoming damage ward |
| Dawnkeeper | Restoration: +4% Attack, +10% class-technique healing | Sanctity: +6% Max HP, 4% incoming damage ward |
| Wayfinder | Marksmanship: +7% Attack | Tracking: +4pp Accuracy, +2% Haste |
| Ravager | Might: +7% Attack | Breaking: +2% Attack, reduces enemy armor by up to 5% in damage-based hunts and story bosses |
| Hexweaver | Spellcraft: +7% Attack | Hexcraft: +2% Attack, +5% hex-powered outgoing damage |
| Knife Dancer | Blade Rhythm: +3% Attack, +4% Haste | Precision: +3pp Accuracy, +6pp Evasion |
| Stonecaller | Resonance: +4% Attack, +8% class-technique healing | Geomancy: +8% Defense, 3% incoming damage ward |

## Behavior and constraints
- No character releveling or ability XP migration. The existing two-discipline training focus is unchanged.
- Core character stat projection is the source of truth for Attack, Defense, HP, Accuracy, Evasion, Haste, Ward, Armor Penetration, Hex Potency and Class Healing.
- Warding reduces all modeled incoming damage; the combat runtime does **not** currently differentiate magical and physical attacks. Accordingly the displayed theme says **Damage warding**, not Magical protection.
- Sanctity improves HP and damage wards, not cleanses. The passive theme no longer implies an unimplemented cleanse.
- Healing specialization increases only *real named class-technique healing*, not food, potions, ordinary passive regeneration or companion healing.
- In ordinary regional hunts, Breaking reduces the defense term in actual strike simulation. In legacy timer-mode hunts its benefit is bounded to a maximum 5% offensive pace increase.
- Hexcraft empowers outgoing Hexweaver strikes. The named Black Thread technique retains its existing deterministic timing; the passive is not a new on-demand cast.
- For narrative story boss combat, Breaking reduces the target-defense contribution and Hexcraft scales actual resolved outgoing damage. Support class-healing improvements are resolved on actual incoming-hit healing events.
- Equipment ward is combined with class ward multiplicatively. This prevents double counting equipment set damage reduction.
- The displayed class-skill popups are runtime-derived, with level 100 and current-level values from the same effect function.
- Do **not** claim the server-authoritative co-op dungeon pipeline inherits these effects until the authoritative loadout repository provides verified class training and the snapshot adapter applies it. No arbitrary client class skill values may be trusted there.

## Regression and release gates
- All 18 class skill slots have exact max-level stat assertions.
- Each skill has a positive real runtime effect for its class.
- Solo-hunt healing is checked with deterministic incoming-hit fixtures.
- Story-boss tests cover exact effects of armor penetration, hex potency and real class healing.
- Regional combat baseline, split claim parity, potion and HP bounds must pass in CI before release.
- The audit's previous PR hardcodes pre-specialization bonuses intentionally; merge that audit before this PR, then run the updated specialization matrix.
- Before a production release: inspect server-authoritative combat stat sourcing (especially dungeons), rebalance against all nine classes using regional matrices, and verify no change in player progression/unlocks.
