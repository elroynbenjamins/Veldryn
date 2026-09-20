# Companion Overhaul — Passes 1–4

Implemented on `companion-overhaul-pass1-4`.

## Pass 1 — progression and economy correctness

- Paid companion training now purchases the **remaining XP to the next level**. Earned combat/expedition XP is no longer discarded by a manual Level Up.
- Bond milestone rewards now use the authored ladder:
  - Bond 2: Essence cache.
  - Bond 4: Essence + companion profile-icon entitlement.
  - Bond 6: automatic passive combat-budget improvement.
  - Bond 8: Essence + companion title/profile entitlement.
  - Bond 10: existing Bond Trait.
- Bond 6 was implemented by redistributing the existing Bond contribution budget, not by raising the final max-investment power ceiling.
- Fallen Knight rematches still allow one attempt per UTC day, but only the first **winning** rematch in a UTC week grants the rematch Bondstone. Wins always retain the 40 Companion Essence reward.
- Added `EVENT_BONDBLOOM`.
  - First acquisition of an event companion grants 4 Bondbloom.
  - Trusted Ally and Mixed Company Proving Ground rewards can supply additional Bondbloom.
  - Event companion Ascension uses Bondbloom so event progression remains separate from regional monster materials.

## Pass 2 — acquisition

- Silverbrook Sprite now requires Fishing 15 plus Silverbrook node discovery, giving Asterfall players an earlier practical Support route for their first Tank / Damage / Support Trial trio.
- Later-region non-Prestige companions use concrete progression paths:
  - Regional monster Mastery 20.
  - Regional Echo completion.
  - Completion of the authored regional co-op dungeon set.
- Prestige companions are deterministic challenge rewards rather than rare RNG:
  - Asterfall: Oathglass Knightling — Oathglass Reflection Trial.
  - Sunscar: Tyrant's Heir — Crown of the Buried Tyrant.
  - Frostmarch: Wyrm Echo — Echo of the Wyrmspine.
  - Ashlands: Regent Shade — The Empty Throne.
- Later Prestige challenges require completed regional story progression, Trial progression, the region's three prerequisite companions, and meaningful regional Bond investment.

## Pass 3 — companion identity

The Asterfall roster remains hand-authored. Sunscar, Frostmarch, Ashlands and event companions now have explicit active names, descriptions, passives and Bond Traits rather than relying on generic role copy.

Examples:
- Dune Stalker — Venom Ambush / Virulent Pursuit.
- Oasis Djinnling — Oasis Pulse / Deep Oasis.
- Solar Scarab — Solar Carapace / Radiant Reprisal.
- Rime Wolf Pup — Rimefang / Shatterfang.
- Bell Sprite — Resonant Chime / Grand Resonance.
- Primal Spark — Primal Arc / Forked Spark.
- Frostbell Herald — Frostbell Chorus / Grand Chorus.
- Hollow Knightling — Hollow Last Stand / Last Lantern.

Server combat definitions use the same active identity names as mobile content.

## Pass 4 — companion-specific Techniques

Every current Combat Companion has exactly two individually named Technique choices while preserving the existing stable Technique IDs for save compatibility.

- Unlock rule remains Ascension II **and** Bond 7.
- First choice remains free.
- Switching remains 2,500 Gold + 80 Companion Essence.
- Technique power remains inside the existing progression budget.
- Haste and Defense Technique effects now affect the actual server combat adapter instead of existing only as metadata.

## Balance principles preserved

- Character-assist companions remain bounded contributors rather than replacing player-character power.
- Rarity remains a total power budget; no second full rarity multiplier was added.
- Standard and Rare companions remain useful through restricted content, Proving Grounds, Expeditions and Trial composition challenges.
- Prestige acquisition is difficult but deterministic.
- No new general companion currency was introduced.

## Follow-up passes

5. Ascension/material-source pass: expand tier-specific source guidance, add direct navigation to missing-material activities, and review event Bondbloom cadence after telemetry.
6. Trial encounter-variety pass: multiple normal formations and six authored boss archetypes without increasing the 30-floor cap.
7. Sanctuary Expedition pass: expand the rotating mission pool and make Supplies part of the wider gathering/crafting economy.
8. Bond/Codex/Mastery presentation pass: dedicated screens, lore discovery, mastery cosmetics and profile showcase integration.
9. Event-return pass: veteran duplicate conversion, returning-event catch-up and event-companion availability UX.
10. Telemetry/balance pass: Trial outcomes, Technique pick rates, rarity usage, Essence/Bondstone economy, acquisition time and Expedition grade distribution.
