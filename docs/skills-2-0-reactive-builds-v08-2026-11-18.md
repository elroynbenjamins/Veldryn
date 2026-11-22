# VELDRYN 2.0 — Reactive Passives + Versioned Builds (v0.8)

**Date:** 18 November 2026. **Status:** draft feature branch only; NOT merged, deployed, or enabled.

## This pass — complete first-pass passive catalogue
All 81 registered passive nodes now have server-authored implementation paths:
- 25 existing server-side numeric modifiers.
- 25 conditional per-skill transformations in `passive-ability-rules.ts`.
- 31 newly authored event-driven/threshold rules in `reactive-passive-runtime.ts`.

Reactive event sources cover: successful hits, critical hits, evades, taunts, interrupts, damage received, resource gains/spends, cleanses, and enemy kills. Bounded conditions include stack thresholds, health thresholds, once-per-window heals, nonstacking buffs, per-node internal cooldowns, talent ranks 1–3, and one-shot bonuses.

### Per-class coverage of the 31 reactive passives
- **Ironwarden:** Steady Guard; Last Bastion; Stand Together; Vengeful Rhythm.
- **Bastion:** Immovability; Last Refuge; Seismic Guard; Unbroken Line.
- **Dreadguard:** Pain Dividend; Scar Pact; Oppressive Gaze; Predator; Unbroken Will.
- **Wayfinder:** Relentless Arrows; Trail Sense; Second Wind.
- **Ravager:** Adrenaline; Relentless; Unchained; Kill Sustain.
- **Hexweaver:** Thread Focus; Void Memory; Calm Mind.
- **Knife Dancer:** Endless Dance; Critical Tempo; Countercraft; Exit Wound.
- **Dawnkeeper:** Last Light; Grace.
- **Stonecaller:** Echo Flow; Harmonic Circle.

Every node is looked up by its validated canonical ID and rank in `CombatV2LoadoutMeta.passiveRanks`. Client-requested stat/rank payloads are never accepted as combat source of truth. The legacy path carries no v2 metadata and therefore has zero reactive bonus or passive state.

## Correctness refinements
- Source IDs beginning with `V2_PASSIVE`, `V2_CAPSTONE`, `GEM_`, or `COMPANION_` cannot generate class-resource stacks.
- Reactions are bounded and use the deterministic combat tick; no time-based timers, RNG draws, persistence or client value overrides.
- Critical Tempo and other new buff reactions refresh their own modifier instead of stacking indefinitely.
- Relentless Arrows applies to the **fifth** successful damage-dealing hit, rather than accidentally the sixth.
- Last Bastion does not activate on a fully downed player; Second Wind cannot resurrect a fallen player.
- Passive-triggered healing cannot trigger an additional capstone-heal proc chain.
- Replay events expose resource, capstone and passive activations, gated to v2 combat only.

### First-pass fidelity caveats
This pass authors usable provisional mechanics but **does not establish full fidelity to every original design description**:
- 'Attack' buffs are currently represented by bounded outgoing-damage modifiers rather than dynamic raw Attack stats.
- Dreadguard's Oppressive Gaze uses its own Dread stack threshold and enemy attack context; assigning persistent per-enemy Dread debuffs needs the future enemy-state model.
- 'Counter' means the server's identified counter action or a bounded evade proc, not a separate generalized attack-counter subsystem.
- DoT rupture / true lifesteal, targeted damage redirection, per-effect threat steering, and totem entities are still planned for the shared Equipment + Enemies combat timeline.
- Full server-side numerical balance has not been run and skill variants remain **first-pass** authored effects.

## Second pass — server-side build save/switch planning
New `build-mutations.ts` defines an immutable state transition for **two character-specific v2 skill presets**:
- Save / Activate / Delete with a schema version and monotonically increasing revision.
- Client submissions can propose only IDs and names; `validateBuildV2` rechecks current verified character level, owned equipment instances, class/role restrictions and talent requirements.
- Activation revalidates ownership *after* bank moves, sales or transfers, preventing stale build reuse.
- Busy-state locks include combat, dungeon, world boss, party event, guild PvE and equipment transfer.
- Stale revisions, invalid slot/name, another character ID and unknown build IDs fail closed with explicit error codes.
- **No DB transaction, route, item equip, state persistence or player data mutation is performed.** A future authenticated repository adapter must commit the planned state transactionally with row locks/compare-and-swap and read-after-write verification.

## UI/UX progress
- The unlinked React Native `SkillsV2PreviewScreen.tsx` still has Overview / Skills / Talents / Builds, 44px touch controls, all nine classes, six skills each, actual variant descriptions and rank-based talents.
- Overview now also describes each class's **current weapon identity** and proposed Equipment 2.0 role-based set families; stat hints are nonbinding suggestions. It explicitly says actual eligibility is server-checked.
- Farming / Dungeon presets remain local-state-only, not misleadingly connected to player saves.
- Interactive browser preview v0.8 includes those gear notes, safer build-switch copy and all nine classes. Its embedded JS passed a syntax check. Neither HTML preview nor native screen is imported into the live app navigation.
- Required before exposure: language localization, server-derived numeric display, persistent build API, loading/errors, respec confirmation and lifecycle screen tests.

## Verification gates
- Dedicated workflow `.github/workflows/combat-v2-skills-validation.yml`: backend build and tests for build contract, tiered sets, nine resources, 18 capstones, 25 per-skill passives, 31 reactive passives, versioned build transitions, 162 variants; mobile TypeScript build and hidden-screen isolation.
- **At the time of writing, GitHub Actions are queued.** Tests are authored and committed but have NOT been confirmed passing. Do not merge or deploy until green plus human review.
- After CI, next stage: authenticated item/preset persistence adapter (including transaction isolation), exact special-case skill mechanics, then combined Equipment/Classes/Enemies 2.0 verification and staging rollout.

See draft PR: https://github.com/elroynbenjamins/Veldryn/pull/1377
