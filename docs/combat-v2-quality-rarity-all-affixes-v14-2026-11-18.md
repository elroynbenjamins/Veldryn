# VELDRYN Equipment 2.0 — Quality/Rarity + All Affix Combat Effects (v1.4)

**18 November 2026 · Draft PR #1377 · NOT MERGED / NOT DEPLOYED**

## Exact quality policy
`equipmentQualityMultiplierV2(q)` is deterministic for integer quality 0–100 and follows the agreed scaling:
- Q0: 0.75× (−25% item primary stats)
- Q25: 0.875×
- Q50: 1.00×
- Q75: 1.125×
- Q80: 1.15×
- Q100: 1.25× (+25%)

No added item tier stats, gear rerolls, or loot changes are made. Multipliers are applied only to **new Equipment 2.0 authored primary stats**. Existing equipment remains untouched.

Rarity multipliers are still explicit, versioned **server policy**. `auditEquipmentScalingV2` checks a complete approved rarity order, strictly increasing multipliers, full 101-point quality-curve parity, and deterministic repeated results. The strict unified encounter invokes the audit before resolving equipped items. The synthetic test rarity values are examples, **not** final game rarities or reward/drop-rate changes.

## Six advanced affixes now have first-pass authoritative combat effects

| Affix | Runtime behavior | Scope |
|---|---|---|
| Accuracy (+pp) | Increases hit probability by the approved amount | Outgoing attacks |
| Evasion (+pp) | Reduces attackers' hit probability by the approved amount | Incoming attacks |
| Penetration (+pp) | Reduces target's effective armor/Defense mitigation | Direct and existing hit calculation |
| Elemental Ward (+pp) | Reduces incoming fire, ice, arcane, nature and shadow damage | Physical and true damage exempt |
| Shield Strength (+%) | Multiplies shield strength at application | Self and ally shield abilities |
| Hex Potency (+%) | Increases the base coefficient/flat value of shadow, arcane and nature DoT effects | Physical DoTs, direct hit and HoT excluded |

The original seven affix channels remain: Attack, Defense, Max HP, Haste, Critical Rate, Critical Damage and Healing. All **13 named types now have initial server-authored combat paths**. This does **not** mean the affix roll table, rarity counts, item classes or combat balance are final.

- All six effects derive from source-verified item rolls. `ServerAffixPolicyV2.maxAdvancedEffects` must define numeric caps for all six when any advanced roll is present.
- If any rolled total exceeds its approved cap, the compiler **rejects the build** rather than silently lowering the value. No client-side rolling, conversion, or item edits.
- Metadata is injected after validating item ownership, slot, tier, rarity, quality and server policies; legacy actors never receive it.
- Existing combat formulas are reused, and the new changes apply only when the encounter has opt-in Combat 2.0 actors. Ward is applied **after** DoT rupture so the full nonphysical direct hit is mitigated.
- The exact final per-affix ranges/caps and elemental class interactions still require balancing and approval before any release.

## Source/runtime tests
- `equipment-scaling-policy.ts` tests exact 101 quality points, monotonicity, invalid quality, server rarity mismatch, invalid caps and nondeterministic functions.
- `equipment-affixes.ts` tests all six advanced roll channels, exact stored roll values, cap requirements and multi-item cap rejection.
- `advanced-affix-combat.ts` tests deterministic hit/penetration, evasion, magical Ward vs physical damage, shield amplification, shadow DoT amplification vs physical DoTs, and legacy parity.
- `unified-equipment-encounter.ts` and `full-equipment-role-matrix.ts` updated to use audited quality/rarity policies.
- Dedicated GitHub Actions workflow invokes the new tests.

**GitHub CI has not been confirmed passing.** Authored tests are not a green compile or complete numerical balance proof; keep the PR draft.

## Next release gates
1. Verify full backend and mobile compile plus test suite (GitHub Actions runners have remained queued).
2. Approve final rarity multiplier table, final 13-affix per-tier roll ranges and counts, six advanced caps, actual item tier base stats, all set effect definitions and real nine-class level curves.
3. Run deterministic nine-class/two-specialization/boss simulations at every tier, recording survival, healing, damage, proc counts and role composition; tune based on measured benchmarks.
4. Integrate existing gems/tonics and encounter state with versioned adapters before enabling dungeon, world boss or party event compatibility.
5. Staging migration, authenticated persistence, rollback tests, localization and one coordinated public Equipment + Classes + Enemies 2.0 release.

[Draft PR](https://github.com/elroynbenjamins/Veldryn/pull/1377)
