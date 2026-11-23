# Veldryn 2.0 — Wave 5: source-compatible affix pool proposal (23 Nov 2026)

**HIDDEN DESIGN + STRICT QA ONLY. NO OWNER APPROVAL OF NEW STAT ELIGIBILITY, NUMERICAL WEIGHTS, AFFIX POOLS OR LIVE IMPLEMENTATION. NO MAIN MERGE OR DEPLOY.**

This stacked wave is based on Wave 4 PR #1682, after Wave 3 #1679, Wave 2 #1675 and Wave 1 #1673. The isolated Equipment/Combat 2.0 private CI passed at the Wave 4 head, while mobile/Skills/economy/Dungeon/Edge broad checks were red. Keep all release gates closed.

## Source truth and the exact blocker

The canonical Forge T1–T4 source currently has **169 equipment templates, 338 real hidden recipe routes, 9 classes and 340 physically required class/tier/slot cells**. Twenty nominal offhand cells are deliberately occupied by the budget of a two-handed or paired weapon: they must not receive separate shields, affixes, set-piece counts or item copies.

The unchanged original Forge role-weighted RNG has a 30% role-pool fallback outside its preferred slot list. The original Combat 2.0 percent-affix slot table forbids many of those rolls, and generic Forge Potency has no approved conversion. As measured by Wave 4, among the 340 *physically occupied* cells:

- 88 have no compatible originally weighted Forge role affix
- 316 can roll at least one unsupported/off-slot/ambiguous original affix
- 168 have fewer compatible stat identities than the highest rarity's maximum original roll count

These counts **overlap**, and they are not numbers of affected minted items. Weakening the Combat verifier, silently discarding affixes, automatically changing a legacy roll or secretly reducing high-rarity affix counts is not an acceptable solution.

## Implementation in this PR: proposed *future* new-mint whitelist, zero executable weights

The new read-only `equipment-forge-affix-pool-reconciliation-review.ts`:

1. Imports the actual Forge roll-range identities and six rarity-band counts, source item manifest, **original** per-role weighted candidates, the real frozen Forge → Combat map, the current Combat stat-slot/effect table and canonical Skills class roles.
2. Creates **30 separate role × slot candidate pools** (Tank/Damage/Support × ten equipment slots). Existing compatible Forge role candidates have priority, followed by role-themed **proposals** drawn exclusively from existing Forge stat identities whose mapped Combat effect is already supported on the destination slot.
3. Builds a maximum of four distinct source candidates per role/slot, or three where Combat's current slot table allows only three. This accommodates the existing **three maximum distinct Mythic affixes** at higher tiers without altering rarity rates, affix-value ranges, quality curves, grade rules or item roll counts. It gives no RNG weights: a new weight table must be separately designed, tested and **explicitly approved**.
4. Excludes original ambiguous `potency` from every proposal. It does not create a fake `potency` → Hex/Healing bridge, add unsupported Combat mechanics, or authorize non-Forged synthetic stats.
5. Reports which role/slot policies and source templates *would require new-mint authoring*. All responses carry explicit `ownerApprovalRequired:true`, `newRulesVersionRequired:true`, `weightsApproved:false`, `eligibleForActualMint:false`, `executableNewMintPolicy:false`, `authorizedProductionRolls:0` and `actualPersistedItemsRewritten:0`.
6. Refuses unknown roles, slots, source drift, unsupported effect mappings, insufficient candidate pools and any unrealizable physical slot.

The full test `__tests__/equipment-forge-affix-pool-reconciliation-review.ts` checks **every one of the 30 proposals and 340 physical cells**, all six original rarity bands, unique stat identities, original-range existence, exact Combat-compatible slot/effect mappings, adversarial unknown roles/slots and source template IDs. It compares **169 deterministic original Forge generated outcomes before and after reviewing**, verifying the old `EQUIPMENT_V2_SERVER_RULES_VERSION` and RNG outputs remain byte-identical. Neither the original generator nor a public/Edge handler imports or invokes the proposed pool.

### Owner review is important for class identity and balance

Suggested additions are *candidates*, not default final tuning. For example:

- Tank Gloves currently have zero Combat-mapped original Tank role choices: candidates need a consciously authored role/slot identity, not a silent conversion to armor.
- Damage Helmets currently have zero original Damage affixes permitted by the Combat helmet table: defensive stat candidates may be acceptable, or a separately approved Combat helmet-slot rule might be more class-appropriate.
- Support gear must not gain a generic Potency alias; healing and survivability stat choices need a measured role-specific approval.

A safe eventual **newly minted Equipment 2.0** implementation must have a separately versioned, source-authoritative signed weight+slot+rarity policy, ensure canonical per-item claims/custody/anti-replay, and preserve original `rulesVersion`, item identity, affixes, rarity and quality for *all* previously minted equipment. If a signature or eligibility policy is missing, the server must fail closed, not fall back to a fabricated roll.

## What this wave deliberately does not do

- No actual new RNG pool registration, `draftEquipmentV2Outcome` change, weights, roll probabilities, caps, set bonus, effects, equipment price, Gold or inventory changes
- No legacy equipment market admission, copy migration, re-rolling or retroactive % affixes
- No new class-specific item art, boss balance, Combat Power formula, socket/enhancement activation, UI or themes
- No authenticated database transaction, approved full 10-item Combat simulation, production route, Edge bundle write or feature flag
- No T5–T9 source roll policy or claim that original set concepts are issuable

**Stop-ship:** approve 30 role/slot distributions and final weight policy; create separate new-mint rulesVersion and signed source item provenance; prove real Forge-origin complete combat loadout with appropriate original-set policy; verify offline and market custody; resolve broad CI failures and owner-approved UI/themes; release 2.0 only as a coordinated launch.
