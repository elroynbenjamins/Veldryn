# VELDRYN v20 — Sunscar Desert Implementation Foundation

Sunscar is promoted from roadmap content into an implementation-ready **Region II**, following the Fallen Knight / Asterfall capstone.

## Progression range

- Region: `REG_002`
- Recommended combat range: **25–45**
- Regional boss: **The Sand Tyrant**, Lv45
- Regional completion unlock: Frostmarch + next progression cap

## Five zones

### Saffron Gate — Lv25–29
The arrival hub and caravan road. Early Sunscar teaches pack pressure, smoke/repositioning and desert resource loops without immediately adding the full heat hazard.

### Scorchwind Flats — Lv30–35
Open desert and glasswind lanes. Adds fire/poison pressure, heat preparation and the first Sunscar Live Dungeon.

### Mirage Basin — Lv32–38
Oasis and illusion region. Accuracy, target identification and support disruption matter more than simply stacking damage.

### Buried Observatory — Lv37–43
Ancient astral machinery, rotating lenses, ordered interrupts and mixed Armor/Ward target profiles.

### Tyrant's Crown — Lv42–45
Royal ruins and the progression capstone. High Tenacity/defense enemies prepare the player for the Sand Tyrant's three phases.

## Enemy roster

The existing 16-species roster is preserved but upgraded to the v20 combat-stat contract:

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

Boss mechanics use the same model but telegraphed pass/fail attacks do **not** randomly crit by default. Basic attacks and appropriate non-mechanic attacks may still crit.

## Co-op content

The old spreadsheet row called **Glasswind Crossing** is reinterpreted as the boss/crossing encounter inside the complete first dungeon **Caravan of Glass**.

The Region II co-op line is now:

1. `COP_004` **Caravan of Glass** — Lv30 — Shardback Colossus
2. `COP_005` **Mirage Well** — Lv36 — The Thirsting Reflection
3. `COP_006` **Buried Observatory** — Lv40 — The Starwheel Custodian

All Live versions require 1 Tank / 2 Damage / 1 Support and have 3+ branch choices with 4–7 route nodes. Q-Mode uses the same content with its existing asynchronous decision model.

## Resources

Sunstone Ore, Amberglass, Saffron Reed, Mirage Bloom, Dunewood, Charbark, Oasis Carp, Glassfin, Scorpion Venom, Royal Chitin, Astral Script and Tyrant Seal are retained.

References that previously said resources were primarily for a player Market are obsolete. Resources now feed crafting, consumables, upgrades, collections, Guild Projects, relic fallbacks and later equipment recipes.

## Story cleanup

`SUNQ_002 Price of Water` no longer unlocks "Sunscar market contracts". It unlocks **regional contracts**.


## Echo conditions

Four Sunscar-specific rotating Echo conditions are now part of the versioned region content:

- **White Sun** — Scorchwind: +8% enemy damage, +6% material yield.
- **False Oasis** — Mirage Basin: illusion-copy pressure, +8% Mastery XP.
- **Falling Stars** — Buried Observatory: periodic telegraphed impacts, +5% relative rare-drop chance.
- **Royal Heat** — Tyrant's Crown: +5 percentage points Elite chance and minor enemy Haste.

These remain server/world-state modifiers. Their telegraphed hazards follow the same deterministic-mechanic rule as bosses rather than randomly critting.

## Relics and regional collectible unlocks

The existing Sunscar relic sources are retained as versioned content hooks: Mirage Compass, Sun-Eaten Prayerbead, Astral Splinter and Tyrant's Broken Signet. Their source/pity/mechanic identity is retained, but final numeric tuning remains subject to the richer-stat balance pass.

Sunscar also registers the existing five Pet unlock sources plus four Companion/Combat-Unit sources. Their **unlock source and identity** are authoritative in v20; their final passive/active bonuses, companion rarity power and role tuning stay owned by the current Pet/Companion systems rather than being frozen inside the region bundle.

## Equipment boundary

**Do not implement the existing spreadsheet's Sunscar regional weapons/armor/set rows as final equipment.** They were authored against the older stat budget.

v20 deliberately uses:

- material rewards
- relic chances
- cosmetics
- `generic_equipment_reward_hook`

The later equipment-rework pass will author actual Sunscar pieces using the expanded hero/boss stat model and the new set-bonus framework.
