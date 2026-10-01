# Class combat skill icons

Fourteen distinct discipline icons cover all nine classes. Shared disciplines keep
the same symbol across classes. These replace duplicated class crests on Skills
cards and appear in skill details and the combat XP split selector.

Built-in image_gen, transparent backgrounds, 2026-09-27. Exact prompts and original
output paths are in `generation.json`. Full-resolution source PNGs are beside this
document; transparent 192px runtime PNGs are in `../../assets/class-skill-icons-v1/`.
The artwork was resized only, without recoloring or replacing generated transparency.

| Class | First skill | Second skill |
| --- | --- | --- |
| Ironwarden | Guardcraft | Warding |
| Bastion | Guardcraft | Warding |
| Dreadguard | Might | Warding |
| Dawnkeeper | Restoration | Sanctity |
| Wayfinder | Marksmanship | Tracking |
| Ravager | Might | Breaking |
| Hexweaver | Spellcraft | Hexcraft |
| Knife Dancer | Blade Rhythm | Precision |
| Stonecaller | Resonance | Geomancy |

Skill detail bonuses are derived from `characterClassEffects`, with the other
discipline held at level 1. No combat formulas or XP rates were changed.
At level 100, tank first/second skills grant 12% HP / 10% Defense; support skills
grant 10% Attack / 10% HP; damage-class skills grant 7% Attack / (3% Attack + 6% Defense).
Names and theme descriptions are flavor, not extra independent mechanics.

Regression coverage: `apps/mobile/tests/class-skill-presentation.ts` checks all nine
classes at levels 1, 2, 50 and 100, validates icon coverage, and compares the displayed
bonuses to the existing combat multipliers.
