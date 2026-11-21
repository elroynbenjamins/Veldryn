# Skills & Abilities 2.0 — secondary-effect parity pass
Date: 2026-11-21. **Hidden branch only. No production/mobile navigation/flag/reward/migration changes.**

## Correctness issue
The authenticated `applyRecipe` pipeline applied class specialization and numeric
passive multipliers to primary/replaced effects, but appended `recipe.adds`
effects verbatim. A variant-added heal-over-time, shield, damage or taunt
therefore ignored the same class modifiers as its parent technique.

## Focused correction
- Apply server-authored class/passive effect bonuses to all primary, replacement and variant-added effects of the relevant type.
- Keep authored variant-specific multipliers on primary/replaced effects **only**. An added effect's coefficient is already an independent author-defined value; in particular, `Oathwall / Reflective Oath` uses `shield:0` for its main shield but must retain its independently authored reflective shield.
- Keep conditional low-HP heal thresholds on the primary/replacement heal only; do not accidentally attach them to bonus effects.
- Taunt bonus scaling now also covers taunts introduced by a variant. Never accept a client-provided coefficient.

## Regression tests
- Ironwarden Sentinel `Oathwall / Reflective Oath`: reflective shield 1.25 × 1.06 = **1.325** even though primary shield is zeroed.
- Dawnkeeper Lightbringer `Dawn Mend / Steady Dawn` with one Gentle Hands + Healing Flow rank: secondary HoT .10 × (1 + .06 + .02) = **.108**, independent of the variant's primary heal scale.
- Ironwarden `Rune Challenge / Provocation` with Firm Challenge rank 1: added 900 threat taunt gains 5% = **945**.

## Release gate
This corrects hidden mechanical parity, not class-tuning approval.
Run exact-head Combat 2.0 skills validation and preserve legacy replay parity.
The complete coordinated 2.0 launch remains blocked on main reconciliation,
Equipment 2.0 source contracts, Enemies/Bosses 2.0 integration, Android/Edge
checks, live-economy measurements and approved UI/theme review.
