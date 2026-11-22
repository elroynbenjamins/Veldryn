# Veldryn 2.0 — tool XP affixes and innate percentage stats on rare equipment

Status: **staged tool and selected rare-piece gameplay implementation; not released**. The existing mobile tool catalog has T1–T4 gathering tools. T5–T9 profession tools remain unimplemented; the curated rare-piece innate stats are wired into mobile item definitions, combat modifiers, and existing inspection (no UI redesign). Backend/server parity and full automated CI approval remain release gates.

## Tool Skill XP affix (implemented on feature branch)

- A crafted tool has **one** immutable secondary bonus roll chosen from Gathering Speed, Gathering Rarity Chance, or **Skill XP**.
- A Skill XP bonus only rewards the tool's own gathering skill: Mining on pickaxes, Woodcutting on hatchets, Fishing on rods. No combat, exploration, crafting, or other skill receives that bonus.
- The currently supported tool tiers use the following inclusive affix values, in 0.1% increments:

| Tier | Skill XP bonus |
| --- | --- |
| T1 | +2–4% |
| T2 | +3–5% |
| T3 | +4–6% |
| T4 | +5–8% |

- Rarity and quality modestly bias the *new* Skill XP affix toward the upper part of its tier range. Existing speed and rare-find ranges do not change.
- The current loadout permits four simultaneously equipped tool tiers for the same skill. **XP rolls stack additively across distinct equipped tiers** (for that same skill only) up to a +60% total cap. At T1–T4, the highest possible stacked XP gain is +23%. Speed and rare-find continue to use their established stacking rules.
- Legacy physical tools remain untouched and without invented affixes. Valid legacy `speed` and `rarity` receipts still validate.
- Server authoritative settlement, persistent account-copy ownership and offline reward replay must continue to prevent fabricated roll payloads. The client-only feature branch must be reviewed for any server-side runtime equivalents before production deployment.

### Proposed future 2.0 tool tiers (not yet wired into runtime)

| Tier | Skill XP bonus |
| --- | --- |
| T5 | +6–9% |
| T6 | +7–10% |
| T7 | +8–11% |
| T8 | +9–12% |
| T9 | +10–14% |

When crafting implements/production tools are added, their XP bonus must target their corresponding crafting or refining skill **only**, using the same validated skill mapping. Do not grant Smithing XP from pickaxes merely because a Smithing recipe created the pickaxe.

## Innate percentage stats for selected rare combat gear (staged mobile implementation)

Veldryn already distinguishes flat equipment stats, fixed set-piece threshold bonuses and random percent affixes. This adds an **item-definition-level**, always-on **innate percent stat** to a curated minority of distinctive rare set pieces.

The initial curated set/slot definitions are: T3_001 (Chest +0.8% Armor, Cape +0.5% Max HP); T3_007 (Chest +0.7% Ward, Gloves +0.4% Haste); T3_013 (Gloves +0.5% Crit Rate, Boots +0.4% Evasion); T4_001 (Chest +1.1% Armor, Cape +0.7% Max HP); T4_007 (Chest +1.0% Ward, Gloves +0.6% Haste); T4_013 (Gloves +0.7% Crit Rate, Boots +0.6% Evasion). All other catalog pieces currently receive no innate stat.

Example, illustrative flat equipment values and random affixes:

- Chest: +58 Defense (flat), +120 Health (flat), **+1.2% Armor (innate, same on every copy of that item)**.
- Random forged copy A: +1.8% Ward.
- Random forged copy B: +2.1% Max HP.

The innate stat is separate from both random affixes and 2/4/6/8/10-piece set bonuses. Treat it as a guaranteed identity property of the named item, not another affix roll or a temporary buff.

Recommended safeguards:
1. Offer 1 innate percentage attribute on selected rare set pieces (e.g. 2–3 pieces per signature set), **not every item**. Keep uncommon training gear mostly flat.
2. Restrict innate stats to supported live combat-contract keys until individual mechanics are built and tested (e.g. Max HP, Armor, Ward, Crit Rate, Haste, Evasion); do not describe a hypothetical Block Chance as active if it has no runtime stat.
3. Design by item and combat role, not by independently rolling an innate stat on each copy. Existing random affixes remain independently generated, rarity- and tier-aware, with immutable receipts.
4. Distinct UI sections: **Base Stats**, **Innate Stat**, **Bonus Rolls**, **Set Bonuses**. Compare the full equipped outcome; identify innate vs rolled source.
5. Use conservative set-wide budgets and combat-stat caps. Prevent per-piece stacking from eclipsing the intentionally meaningful 2/4/6/8/10 piece incentives; review against viable counter-build diversity.
6. Keep established `equipmentBonusRollVersion` receipts valid. The eventual rollout must be versioned and validated server-side, with no retroactively invented random affixes.
7. Review and explicitly approve actual equipment screens/themes before any UI changes are merged to production.

### Implementation checklist
- [x] Curate set-piece identities by actual v33 set ID and equipment slot; exact innate values are deterministic and constant across copies.
- [x] Extend mobile equipment definitions and combat build calculations using only supported combat stat keys.
- [x] Expose innate stats separately in the existing item inspector; equipment preview uses the same effective combat stat calculation.
- [ ] Verify backend combat/item API parity, market listings, and dungeon snapshots before release.
- Enforce cap/rounding rules and test all old/new saves, equip swaps, set thresholds, and PvE simulations.
- Implement the full T1–T9 profession tool catalog separately, including crafting skill tool mapping.

