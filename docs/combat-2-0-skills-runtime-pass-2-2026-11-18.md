# Skills 2.0 — combat integration pass 2 (18 Nov 2026)

**Status: draft only, server runtime disabled everywhere.** PR #1377, branch feature/combat-v2-foundation-contract-20261118.

## Integration approach
The authoritative server-owned adapter `compileServerSkillBuildV2(serverEnabled, input)` takes a trusted combat actor, authenticated class/level/owned item instance snapshot, selected ID-only build and server equipment catalogs. It validates the build and compiles abilities + computed stats, then `simulateCombatWithSkillsV2` runs the unchanged deterministic combat engine.

The caller MUST construct the actor, owned IDs and equipment catalogs from server-controlled state. Never accept them from a client request. The caller MUST control `serverEnabled`; no public routes currently call this adapter. Disabled mode returns the original actor and has a deterministic legacy replay parity assertion.

## Current effect support
- **Full identity coverage:** 9 classes, 18 specialization IDs, 54 skill IDs, 162 variant IDs, 81 talent IDs, 18 capstone IDs.
- **Executable first slice:** 18 existing named techniques (two per class) with three authored variants each = 54 variants. New variant combat effects include changed cooldowns and ability coefficients, taunts, shields, heals, HoTs, DoTs, defensive buffs and target-specific effects.
- **Specializations:** all 18 provide bounded server-calculated differentiation (including damage, protection, haste, healing and/or other stats/ability modifiers).
- **Passives:** 25 currently have numerical runtime effects defined. Remaining talents requiring resource stacks, reactive counters, conditional triggers and other bespoke mechanics fail closed.
- **Capstones:** validated for eligibility and stored as IDs, but no combat capstone is executable in this pass; selecting one when the runtime is enabled fails closed.
- Existing training skill XP, ordinary solo combat and dungeon behavior are not changed by any of these authored v2 files.

## Engine extension
`AbilityEffect.target` is an optional override to allow a compound skill to strike a foe while applying a ward to its caster. Unspecified targets retain the original skill target semantics. Dynamic evasion modifiers are applied only for actors explicitly tagged `combat-v2`, preserving old combat results.

## Verification / merge gate
A dedicated workflow `.github/workflows/combat-v2-skills-validation.yml` runs the normal backend compile and three v2 contract/set/skill regression scripts. The skill test checks the full catalogue counts, each class's first two skills and each of their variants, different specialization outputs, invalid builds, old mode parity, deterministic seeds, effects on self and enemy, and zero mutation of authoritative source actors.

**Do not merge or deploy until TypeScript build, v2 tests, and existing combat/dungeon/companion tests pass.** GitHub Actions is the validation authority; merely adding tests does not mean they have passed.

## Next pass
Implement the other 36 active skills and 108 variants as real authored combat definitions; implement actual Guard Marks, Barrier Layers, Dread, Focus, Fury, Threads, Rhythm, Radiance and Resonance resource/state mechanics. Implement remaining passives and capstone trigger rules. Connect server inventory/character snapshot adapter and hidden UI after appropriate data migrations. Run the combined Equipment + Classes + Enemies 2.0 tuning only when all three systems are integrated.
