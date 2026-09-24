# Class skill affinities

Accepted implementation: +5% profession XP per action and +3% action speed.

Ironwarden/Bastion: Smithing; Dreadguard: Alchemy; Wayfinder: Fishing; Ravager: Woodcutting; Hexweaver: Enchanting; Knife Dancer: Tailoring; Dawnkeeper: Herbalism; Stonecaller: Mining.

One character-bound affinity, no account stacking, combat XP, combat haste, extra materials, quality chances, exclusive recipes, or non-affinity penalties. Duration is divided by 1.03; forge retains its existing whole-second rounding. Instant actions have no timer to shorten.

New gathering actions snapshot the affinity. Already-running activities without that snapshot keep their old rates. Processing and alchemy snapshot final cycle length and XP. Forge jobs snapshot XP and final duration at reservation, including queued work; another selected character cannot alter the crafting owner or reward. Legacy forge jobs retain legacy XP calculation and receive no retroactive affinity. Fractional XP uses owner-scoped keys; maximum skill level remains 100.

Potential gathering rates, active rates, recipe cards and gem refinement previews use the same affinity/timing helpers as settlement. The creation carousel adds one compact line; the matching skill detail explains the benefit. No new tutorial popup.

Online gameplay imports the same executeGameCommand engine. Rebuild its generated Edge Function with tools/build-online.mjs; a code merge alone does not deploy it. No database migration is required.

Tests: pnpm --dir apps/mobile test:class-affinities.
