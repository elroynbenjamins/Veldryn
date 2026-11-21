# Equipment × Combat 2.0 — Pass 1: source-reconciled audit

**2026-11-22 · Hidden private review / no live activation or UI changes.**

Companions: [core vision](./CORE_EQUIPMENT_COMBAT_VISION_V1.md), [balance acceptance](./CORE_BALANCE_ACCEPTANCE_V1.md).

## What was inspected and committed

- Forge draft: backend/src/server/equipment/equipment-crafting-v2-rolls.ts in feature/equipment-crafting-2-hidden-foundation-20261118, reviewed blob 8a18ded7d3f3dfce2f557f55be836cccdac884c6.
- Combat 2.0's 13-channel source-owned resolver: backend/src/server/combat/v2/equipment-affixes.ts.
- The separate 17-affix / 28-trait proposal, draft PR #1555, which is not the current Forge roll table.
- The separate hidden engine trait receipt adapter (extra basic/ability/reflect channels) in Combat 2.0. Tenacity is not part of the 13-channel resolver.

Added unmounted code:
- backend/src/server/combat/v2/equipment-forge-crosswalk-review.ts
- backend/src/server/combat/v2/__tests__/equipment-forge-crosswalk-review.ts
- .github/workflows/combat-v2-forge-crosswalk-review.yml

This is a read-only **audit**, not a trusted combat affix adapter or a working DB reader. The audit deliberately returns activateInCombat:false even for the five structurally mappable names. It never touches live or staging.

## 1. Frozen Forge 12-name crosswalk to Combat

| Existing Forge roll | Combat 2.0 candidate | Disposition |
| --- | --- | --- |
| critRate | crit_rate_pp | Structural match; signed units, slot and frozen receipt still unverified |
| critDamage | crit_damage_pct | Structural match; signed units, slot and frozen receipt still unverified |
| haste | haste_pp | Structural match; signed units, slot and frozen receipt still unverified |
| penetration | penetration_pp | Structural match; signed units, slot and frozen receipt still unverified |
| accuracy | accuracy_pp | Structural match; signed units, slot and frozen receipt still unverified |
| armor | defense_pct? | **Blocked**: defense vs independent armor semantics unproven |
| maxHp | max_hp_pct? | **Blocked**: frozen primary vs bonus-percent semantics |
| ward | ward_pp? | **Blocked**: must prove elemental-only interpretation |
| healingPower | class_healing_pct? | **Blocked**: must confirm class-only heal, not leech or tonic |
| potency | no safe target | **Blocked**: generic heal/skill/DoT semantic ambiguity |
| tenacity | tenacity_pp | **Blocked**: full status-duration engine adapter not integrated |
| abilityDamage | ability_damage_pct | **Blocked** in old 13 compiler; separately authored engine channel needs one true source owner |

The 17-option review additionally proposes Attack%, Evasion%, Shield Strength%, Hex Potency%, Basic Attack Damage% and Reflect Damage%. These are not granted by renaming the Forge's 12 existing roll names. Attack% and Basic Attack Damage% are distinct; Reflect must respect the shared 5-second boss damage budget.

## 2. Forge role fallback may violate Combat slot eligibility

Forge's 70% preferred-slot selection plus 30% full-role fallback means an otherwise valid Forge roll can have an incompatible Combat slot:
- Damage Boots + Crit Rate: Forge possible, Combat disallows (Crit Rate weapon/gloves/amulet/ring only).
- Damage Offhand + Crit Damage: Forge possible, Combat disallows (weapon/amulet/ring only).
- Support Helmet + Haste: Forge possible, Combat disallows (weapon/gloves/boots/cape/ring only).

The audit enumerates the role × slot × stat conflict space and rejects incomplete or mismatched projections. **Required**: reconcile generator slot eligibility with Combat before issuing real items, or make a deliberate matching change to both systems. Do not erase, reroll or invalidate legitimately earned legacy copies.

## 3. Rarity × quality might amplify primary gear too strongly

Provisional private Forge primary-stat rarity ladder: Common 1.00; Uncommon 1.10; Rare 1.25; Epic 1.42; Legendary 1.65; Mythic 1.85. Quality Q0 0.75, Q50 1.00, Q100 1.25, applied to new primary equipment stats exactly once.

Examples are **multipliers of authored base item stats, not final combat damage or CP**:
- Common Q50 = 1.00×
- Rare Q100 = 1.5625×
- Epic Q50 = 1.42×
- Mythic Q50 = 1.85×
- Mythic Q100 = 2.3125×
- Mythic Q100 / Common Q0 = about 3.083× base primary stat

Rare high quality can overlap weaker Epic as intended, but the top-end spread could be very large after class/set/affix/gem effects. **Do not change rarity values in this pass**. Use paired real encounter simulations for a second versioned, less steep candidate and compare progression, solo performance and Market fairness.

## 4. Provisional T4 ranges differ from the reviewed T4 bands

The draft Forge generator reuses T3 ranges for T4 (e.g. abilityDamage 2–4.5%), while the separate 17-affix proposal defines a distinct T4 band (Ability Damage 2.5–5.0%). Frozen source-version semantics must win; never remap an old legal roll by text or apply another quality/rarity factor. Approved new issuance requires a versioned generator with a matching Combat compiler and preview.

## 5. Canonical item and set membership still unresolved

Historical hidden catalogue milestones were 118/236, 122/244 and a later review of 169 ordinary templates/338 alternate recipes. They are **not additive**. Reconcile an exact server-owned canonical manifest and actual set counts before approving 2/3/4/6 bonus thresholds. Never grant a threshold for more pieces than the set possesses. Keep 1.0.x's existing 2/4/6/8/10 effects unchanged.

## Next development sequence (private, behind disabled gates)

1. Reconcile real Forge generator slots, 17-channel affix definitions, tier/rarity counts and existing immutable receipts. Make every legitimate combination loadable.
2. Add a server-only exact-copy adapter with independently privileged owned inventory/bank/equipment/build and receipt-revision verification. A synthetic callback or read-only audit is **not** authorization.
3. Complete and source-tag Tenacity, Ability Damage, Basic Attack Damage and Reflect; ensure ability damage never double-applies through separate engine and affix paths.
4. Verify ten-slot maxima with gems, sets, skills and buffs; reject forged roll claims, not legitimately minted items.
5. Run genuine nine-class/two-spec/tier/eight-archetype/six-boss benchmarks, then tune gear/classes before scaling bosses, dungeons, party/world/guild encounters and item drop economy.

## Validation and release hold

New tests and a narrow GitHub Actions workflow are committed. The exact-head workflow has been **queued**, not confirmed green. There is **no real DB integration, approved coefficient change, live flag, SQL migration, item minting, public UI or theme implementation**.

**Status: HOLD — owner balance approval, actual visual mockup/theme approval and full staging+CI are still required.**
