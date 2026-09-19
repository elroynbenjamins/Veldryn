# VELDRYN v20 — Partial Equipment Set Bonus Framework

## Decision

Yes: equipment can unlock **partial set bonuses**, and the threshold structure is data-driven rather than hard-coded to only 2pc/4pc.

Typical future set patterns may be:

- 2 / 3 / 5 pieces
- 2 / 3 / 4 / 5 pieces
- 2 / 4 pieces for compact/special sets

## Recommended power curve

The default philosophy:

- **2pc** — modest broadly useful stat/utility bonus.
- **3pc** — visible build-stat breakpoint. Example: +2% Crit Chance, +Max HP, +Accuracy, +Ward, +Haste.
- **4pc or 5pc** — specialization/mechanical effect rather than just a giant unconditional stat multiplier.

Example only, not a Sunscar set:

### Damage set
- 2pc: +3% Max HP
- 3pc: +2% Crit Chance
- 5pc: class/rotation-specific effect

### Tank set
- 2pc: +Armor
- 3pc: +4% Max HP
- 5pc: timed Guard/mitigation effect

### Support set
- 2pc: +Ward
- 3pc: +2% Haste
- 5pc: conditional healing/shield/resource interaction

## Mixed sets are intentional

A player wearing **3 pieces of Set A + 2 pieces of Set B** should be a real build choice.

The full 5-piece path must therefore not receive so much universal raw power that 3+2 becomes mathematically pointless.

## Power-budget rule

Set bonuses are part of the equipment power budget; they are not free extra power stacked on top of equal-stat individual items.

This is important after the expanded stat model because +2% Crit Rate can be worth much more for one build than a small flat Armor/HP bonus is for another. The later equipment pass should value each set threshold using the same stat-budget model as affixes and base item stats.

## Stat support

The v20 framework already supports direct/derived modifiers for:

- Max HP
- Power
- Accuracy
- Armor
- Ward
- Evasion
- Crit Chance
- Crit Damage
- Haste
- Tenacity
- Healing Power
- Shielding Power
- cooldown recovery
- resource regeneration
- damage/healing modifiers
- triggered effects with ICDs/stacks/tags

## Important boundary

No final Sunscar sets are authored in v20. The engine exists now; set names, pieces, exact bonuses and stat budgets wait for the later full equipment rework.
