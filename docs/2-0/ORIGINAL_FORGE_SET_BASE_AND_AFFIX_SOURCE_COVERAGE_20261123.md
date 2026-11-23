# Veldryn 2.0 — Original Forge set-piece base stats and affix coverage
**23 November 2026 · Hidden only · Review pending · No new item minting**

## Why this pass
The original hidden EQ2 Forge catalogue contains **169 pinned item identities**, including **42 items belonging to 15 canonical original Forge set families**. The actual frozen-Forge-to-Combat compiler previously rejected every set piece, even a single source-proven item, because no approved set bonuses exist. It also rejected rolls that the original role-weighted Forge generator can emit but the Combat 2.0 affix executor cannot apply (wrong slot or ambiguous `potency` semantics).

## New server behavior — base stats for a SINGLE real set member
- In the hidden compiler `compileRealFrozenForgeActorV2`, single pinned, genuinely minted/claimed/custodied original Forge set items can now contribute **only their individually rolled frozen base stats and legally mapped individual affixes**.
- The set catalogue is derived **only** from `auditRealForgeSetIdentityV2().forgeSetEvidence`; the caller-provided `setsById` cannot make new identities or bonuses executable. The equipped item must have a canonical family, member, role, tier and slot; the owned item record must match its source `setFamilyId`.
- The account ledger, immutable original claim, current custody and revision verification are still required. The item's rarity/quality are not multiplied twice. One-piece item stats remain meaningful without activating any set coefficient.
- Wearing **two or more of the same family still rejects combat setup**, rather than silently withholding an earned 2-piece/4-piece bonus. The diagnostic evidence explicitly reports `verifiedBaseOnlySetPieces` and `setBonuses: 'BLOCKED_PENDING_EXACT_EQ2_SET_RECONCILIATION'`.
- The unissued 48 expanded Combat sets (204 planned pieces) remain blocked, as do every authored-but-unapproved set effect, 2/4 thresholds and unsupported skill traits. This is not approval of a new complete set bonus system.

## Exact original roll compatibility audit
The new `reviewOriginalForgeAffixCoverageV2()` reads the **actual original** pinned server generator role weights, slot preferences, 169-piece manifest, rarity counts, existing approved-in-code source map, and executable Combat 2.0 slots. It reports for each item:
- Original role-weighted roll choices and which are executable in its equipped slot.
- Ambiguous `potency` rolls (unmapped) vs other valid-name rolls that violate the current Combat 2.0 per-slot policy.
- How many distinct *safe* channels remain and whether that supports the original mythic/legendary 1–3 affix budget.
- Aggregate exposed pieces, slot failures, and tier×rarity budget deficits. The 169 × 6 = 1,014 tier/rarity compatibility cases are audited as a review of capability, not empirical roll rates.

**Important:** The Forge generator chooses a preferred-slot pool 70% of the time if possible and draws from the full source role pool otherwise. Since that fallback can emit combat-ineligible rolls, tightening only 30% fallback without verifying *every* original slot/role is insufficient. Some item slots have too few valid distinct roll identities to satisfy higher-tier/high-rarity affix counts even after filtering.

No source RNG, original roll percentages, rarity distributions, item templates, permanent inventory copies or live rules were changed in this pass. **Do not discard, auto-convert or re-roll old Forge items.** A future authorized *new-mint version* must reconcile the item-by-item slot restrictions and formal stat semantics so no crafted rare item is unusable; changing roll probabilities and effects will need explicit design/balance approval and source versioning.

## Remaining coordinated 2.0 release gates
The signed Enemy+Forge bridge in the parent draft PR still requires a privileged atomic revision verification implementation against actual database state, not QA callbacks. Set thresholds and counterplay percentages require owner review, final Combat Power composition is unapproved, authentic companion/party progression is still pending, and the broader Skills 2.0 TypeScript pipeline has separate module/dependency blockers. No UI/theme change or public release before approval.
