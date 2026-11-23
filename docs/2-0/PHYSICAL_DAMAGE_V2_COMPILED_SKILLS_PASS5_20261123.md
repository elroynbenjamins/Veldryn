# Veldryn Combat 2.0 — Actual Authored Skill Variant / Physical Matchup Pass 5

**23 Nov 2026 | Hidden implementation / synthetic, no live release | Inherits #1688, #1684, #1676, #1674**

## Source-compiled skills, not just label-only specializations

The previous 432 neutral-vs-typed comparisons deliberately used an equal-stat BASIC-only fixture, so they verified the physical type math, but *did not execute* actual Skills 2.0 specialization abilities.

This pass drives a second, complementary **216-encounter test matrix** through the actual authoritative `compileServerSkillBuildV2` class compiler and `simulateCombat` engine: 9 classes × 2 actual specialization IDs × 2 source-selected three-skill loadouts × 6 pinned regional boss IDs. The full 54 source-named skills are selected (each appears in at least one compiled loadout per spec), and the compiler produces their versioned variants, class resource, specialization modifier and capstone effects. Both loadouts use different authored variant indexes rather than fabricated ability IDs.

Each encountered actor uses one source-pinned T4 class weapon ID via an intentionally synthetic QA-only frozen Forge evidence witness, and one Enemy V2 boss profile token via QA-only persisted-signature callback. The signed enemy type resistance matches the prior first-pass candidate six boss profiles. Untyped and typed runs execute with the same compiled actor and seed. Tests fail if skill or actor source snapshots mutate, new physical subtypes appear on magic/spells/periodics, or same-seed results diverge.

**Trust caveat:** The QA signatures and Forge receipts here are fixtures, **not** actual database-locked persistence proofs. Do not use them outside tests. Real gameplay entrypoints remain gated on immutable Forge claims/custody and authenticated persisted Enemy V2 snapshots. Neither the 2.0 encounter runtime nor the equipment mint/market are activated.

## What is and isn't proven

- Actual server-compiled, unlocked level-50 class Skills 2.0 variants and both specializations are now exercised with physical typed hits and source-pinned weapon profiles. This is a valuable compiler-to-engine compatibility and counterplay regression, not only abstract multiplier math.
- The 54 skills are grouped into two three-skill loadouts per specialization, with variant 0 in the first loadout and variant 1 in the second. The third variant is covered in other existing Skills 2.0 compilation tests, but is **not yet** in this 216-match gameplay matrix.
- Every typed-vs-neutral paired encounter has identical verified build selection within the pair, class stat fixture, weapon ID, enemy stats and RNG seed. Same hit/miss RNG is required. Magic wand and caster staff restrictions remain untouched.
- **No final CP weights exist**. A fully balanced equal-CP claim requires authoritative `ApprovedPowerCompositionPolicyV2` weights, final rolled item stats/gear sets, companion contribution model, class baseline curves and boss encounter balancing. The existing `power-composition.ts` correctly refuses to guess these values. This pass must not invent them.
- Separate role effectiveness and raw DPS comparisons are not release decisions: Tank and Support utility, debuffs, healing, shields and interrupt response are valuable even when output damage is lower.
- Companions remain a separate battle engine boundary. Source-vetted companion attacks must not borrow the player's weapon subtype just because an owner has a physical weapon.
- Physical candidate affixes continue to be nonissuable roll replacements, never extra free rolls; rare T5 authored innate percentages and Player Market legacy restrictions remain unchanged.

## CI / release gate

```sh
pnpm --dir backend exec tsc -p tsconfig.equipment-combat-v2-launch.json
node backend/dist-equipment-combat-v2-launch/server/combat/v2/__tests__/physical-authored-skills-matchup-matrix.js
```

The broader Skills 2.0 suite has independently documented missing cross-project modules `apps/mobile/src/core/equipment-crafting-v2-economy` / `equipment-crafting-v2-authoritative-readiness`, backend rootDir imports and missing React Native node definitions. These must be corrected in the owning modules, separately reviewed; do not silence errors or implement mobile UI without approved theme/layout.

No production or staging DB writes, no live build or UI/theme modification, no engine release activation, and no coordinated 2.0 merge/deploy.
