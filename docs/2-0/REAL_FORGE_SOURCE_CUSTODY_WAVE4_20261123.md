# Veldryn 2.0 — Wave 4: physical slot eligibility and real Forge draft-claim replay

**Date:** 23 Nov 2026. **HIDDEN, SOURCE-ONLY, NO MAIN MERGE / NO DEPLOY / NO PUBLIC UI / NO MIGRATION.**
Stacked on Wave 3 #1679 → Wave 2 #1675 → Wave 1 #1673.

## Why the previous 360-slot audit needed reconciliation

The pinned T1–T4 Forge source has **exactly one class-specific weapon per class/tier**. For Dreadguard, Wayfinder, Ravager, Knife Dancer and Stonecaller, its source `hands` is `two` or `dual`. There is deliberately no separate offhand for these five classes × four tiers = **20 reserved offhand cells**. Their genuine server-owned weapon base-stat formula already sums the weapon **plus offhand budget once**; a paired weapon is a **single physical item and one set-member count**, not two independently minted items.

The earlier report's `cellsMissingTemplates=20` was accurate as a raw missing-cell count, but **not 20 required source defects**. Added the source-derived `reservedByTwoHandOrPairedWeapon`, `requiredPhysicalCopy`, `sourceCoverage`, and read-only `compatibilityAction` fields. The audit now separately reports **20 intentionally reserved offhands, 0 unexpectedly missing required templates**, and 340 required physical class/tier/slot cells. Every class/tier has **nine or ten** physically worn item copies, depending on its authored weapon grip. Never add made-up shields for 2H/paired classes.

This is an original-source structural policy: final 2.0 weapon art/weapon gameplay still requires review, and the live V33 item representation is not implicitly converted.

## New nine-class complete T1 Forge QA

`backend/src/server/equipment/__tests__/equipment-crafting-v2-ten-slot-original-forge-ledger.ts` executes the real hidden **`resolveEquipmentV2DraftCommand`** command resolver, not handcrafted fake claim documents:

- Reads each class's genuine T1 Forge canonical recipe for all physically required slots, using source-owned `V2_SERVER_PIECES` and `V2_SERVER_RECIPES`.
- Starts and claims each item using one isolated, fully stocked **QA account** per class, with deterministic `randomInt`, unique job IDs, request IDs and item IDs. This creates **85 genuinely authored Forge-source draft outcomes** across nine complete loadouts (four 10-copy + five 9-copy) and **170 distinct start/claim receipts**. No production mint or database commit occurs.
- Uses original `verifyEquipmentV2HiddenLedger`, `verifyEquipmentV2ReceiptNamespace`, `v2ServerExactTemplateConsistent` and `readEquipmentV2VirtualCustody` to reconstruct every original item, claim, award, storage placement and subsequent equip receipt. Slot uniqueness, exact copied stats, anti-replay claims, duplicate reservations, foreign ownership and class/weapon rules are exercised.
- Checks that dual/two-hand weapons retain the **weapon + offhand source stat budget** without a second offhand physical copy or a phantom extra set member.
- The test **does not** assert Combat 2.0 success for all pieces: the original Forge T1 catalogue includes unresolved original set identities, and its current weighted affix RNG may produce rolls that Combat 2.0 correctly rejects. This is deliberate: authentic source receipt/ownership replay and executable Combat eligibility are different milestones.

### Important limitations

The real isolated Forge resolver is a pure command simulator that expects an authoritative snapshot provided by a future authenticated service. Its test snapshot is **not** a signed PostgreSQL row, real player account lock, Gold debit, market item mint or physical delivery. Its `physicallyDelivered:false` virtual custody receipts are not live inventory events. No new item, reward, currency, achievement, profession XP or player market listing is authorized by these tests.

## Outstanding affix generation risks (unchanged until approved)

The previous source scan found 100 / 360 class/tier/slot cells without a Combat-compatible mapped affix, 336 with potential unsupported or off-slot original Forge candidates, and 180 where maximal rarity roll count exceeds the currently Combat-compatible candidate pool. These totals include intentionally empty offhands and overlap. The Wave 4 audit also reports **only physically present slots**, to identify actual fixes.

- Original Forge role-affix RNG can fall outside its preferred slot pool, including an explicit 30% fallback. A Combat 2.0 resolver must never drop an unsupported rolled affix, rewrite original Potency into Hex/DoT, or claim a successful equip after rejecting a roll.
- **No numerical roll weights, rarity bands, per-affix values, player-owned copies or stat caps have been changed.** The `compatibilityAction` classification is review guidance, not an executable new RNG policy.
- After owner signs off on role/slot affix eligibility and physical-vs-paired weapon interpretation, build a **versioned** safe new-mint pool with identical immutable receipt provenance. Previously minted Forge/legacy items must keep their original roll history.
- A full production ten-item Combat proof requires server-owned account readback, accepted actual affixes for all ten slots, approved real set bonuses, authenticated CAS lock and signed commit. The 85-copy test does **not** qualify as that proof.

## Validation

Strict private source workflow `.github/workflows/equipment-combat-v2-expanded-sets-integration.yml` now compiles and executes the new full-loadout draft ledger regression, alongside 360-cell source audit, Forge/Combat four-player simulation, Source V6/V7 reconciliation and negative release-fence checks.

**Only exact-head GitHub checks are evidence of passing.** Upstream mobile typecheck, native app themes and generated Edge parity remain independent release gates, as do authenticated PostgreSQL race/rollback/legacy Player Market tests. Keep the 2.0 coordinated launch gate closed.
