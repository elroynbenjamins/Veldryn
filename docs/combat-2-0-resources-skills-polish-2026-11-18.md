# VELDRYN Combat 2.0 — Resources + skills + two polish passes (18 November 2026)

**Status:** development-only, draft PR #1377. **Not merged or deployed.** There is no production caller or enabled server flag.

## Development pass A — nine class resources
- Ironwarden: Guard Marks (3)
- Bastion: Barrier Layers (3)
- Dreadguard: Dread (5)
- Wayfinder: Focus (3)
- Ravager: Fury (5)
- Hexweaver: Threads (5)
- Knife Dancer: Rhythm (5)
- Dawnkeeper: Radiance (5)
- Stonecaller: Resonance (5)

The authoritative engine earns resources from real combat events (direct/periodic hits, effective direct healing, shield grants/absorption, taunts, interrupts, defensive hits and evades). Award rules are class-specific and deduplicated by trigger/source/tick. Stacks are bounded and start at zero each encounter. Bonuses apply only when a server-compiled CombatV2 actor is present. Resource gains and spends emit replay events.

## Development pass B — complete active ability authoring
- All **54** class skills are known to the server and have authored base abilities, including 36 newly defined abilities beyond the original 18 named techniques.
- All **162** selected variants have real authored effects/cooldowns/targets that compile into the existing deterministic combat engine.
- **18** specializations have independent stat and class-role profiles. All 18 named capstones have bounded, server-only runtime trigger paths, with some advanced details still provisional.
- **25 of 81** passive nodes have a direct numeric implementation. The 56 advanced/conditional passives remain explicitly blocked rather than silently converted to generic stats.
- Any unowned item, wrong class/role item, invalid variant, nonexistent passive, invalid prerequisites or mismatched authoritative actor snapshot is rejected before combat compilation.

### Important distinction: authored first-pass semantics versus final parity
This is not yet a final faithful implementation of every description. Some variants requiring special counters, redirects, lifesteal based on *actual* damage, applied affix rolls, threat retargeting, or persistent totem entities currently use simpler bounded effects. E.g. Black Thread's Rupture still needs its exact DoT-consumption resolution; several multi-hit/on-evade combo interactions require their explicit proc rules; cleanse currently primarily handles harmful periodic effects. Do not claim full design parity or enable these skills for players yet.

## Refinement pass 1 — correctness and resilience
- Covered all 9 classes, 54 skills, 162 named variant selections, and all 18 registered capstone IDs with new deterministic test fixtures.
- Added one stack maximum per (trigger, source, tick); no resource gains from Gem, Companion or capstone-derived effects.
- Made timed Haste and Defense buffs work only in opted-in Combat 2.0 encounters, preserving legacy calculation paths.
- Added one-shot queued damage/crit/heal capstone modifiers with bounded magnitudes and cooldowns; no client-supplied coefficients.
- Ensured all resource states and cooldown/proc counters reset at encounter boundaries; existing persistent HP and ordinary cooldown serialization remain unchanged.

## Refinement pass 2 — targeted balance / UX semantics
- Repeating capstone auras now refresh instead of accumulating identical buffs indefinitely.
- Shared Sunthread selects the two most-injured allies, not the entire party.
- Dawn Mend / River Stone emergency-healing variants apply additional healing **only** below authored HP thresholds.
- Heartseeker / Overpower execution variants scale extra damage **only** against low-HP targets.
- Sheltering Wall's extra shield is limited to party-wide shield casts; it distributes a 15% supplement to each recipient in the same cast without emitting repeated capstone proc events or bypassing its 20s cooldown.
- Exposed resource and capstone trigger events in combat replays while preserving exact legacy replay behavior under the disabled path.

## Build and release gates
- Dedicated GitHub Actions workflow: `.github/workflows/combat-v2-skills-validation.yml`.
- Contract tests: build / set, nine resources, capstone matrix, full skill-variant matrix and deterministic engine parity.
- CI status at authoring: **queued, not passed**. No claim of successful compile, full simulation or merged readiness.
- Release requires server-authoritative inventory snapshot integration, client-side hidden UI, exact 81-passive semantics, complete Equipment 2.0 rolls and set effects, enemy/boss mechanics, full class/role/level combat simulations, staging migration and rollback verification.
- **No migrations, rerolls, character XP changes, live routes, production feature flags or deployment in this PR.**

## Future steps
1. Finish conditional passive runtime hooks and remaining detailed variant semantics; then measure 2.0 skill uptime and caps against real combat fixtures.
2. Connect Equipment 2.0 rarity/quality/affix/set bonuses to trusted combat snapshots, and Enemies/Bosses 2.0 to the shared timeline.
3. Run the combined nine-class, multi-tier tests **after** Equipment + Classes + Enemies are integrated, then release the new major version together.
