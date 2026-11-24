# Veldryn 2.0 — independent bonus rolls and original Forge set boss opportunities

**24 November 2026 • PRIVATE review branch • no live release, migration, grants or new equipment minting**

## Pass 15 — Versioned class-independent BONUS stat proposal

Original Equipment 2.0 Forge uses role-weighted affix pools: the random roll stat is currently indirectly class/role restricted, while slot preference is only 70%. User-approved 2.0 design should instead make **random bonuses independent of class and role**, allowing a rare, unexpectedly excellent item to matter and the Player Market to develop demand. Authored **innate** equipment percentages, class-restricted weapons and role-specific base item definitions are **not** randomized or opened to incompatible wearers.

Added `equipment-crafting-v2-universal-affix-preview.ts` as an explicitly **non-mintable new proposal version**:
- One identical candidate pool for all roles, all classes, all slots. It contains exactly 11 existing source-to-Combat mapped Forge affixes: armor, Max HP, ward, tenacity, crit rate, crit damage, haste, penetration, accuracy, ability damage, healing power.
- Ambiguous original Forge **Potency is excluded** until there is one explicitly approved meaning in the Combat engine. This is not silent replacement by arbitrary extra damage or healing.
- Keep **existing pinned rarity band probabilities**, high-tier per-rarity roll counts, Q0–Q100 curve and tier-based **original Forge** affix magnitudes. Do not create a new rarity inflation or high-XP stat.
- No repeats of the same bonus identity within one item. The same RNG sequence gives identical bonus outcomes for tank, support and damage roles at the same tier regardless of weapon/armor slot. Class-specific intrinsic requirements still appear unchanged in the returned preview.
- The preview refuses mismatched original recipes, invalid RNG, unsupported source identities and flags `canMint:false`, `canEquip:false`, `canAuthorizeCombat:false`, `canListOnMarket:false`, `grantsRewards:false`, `releaseApproved:false`.
- This cannot be passed as an existing minted original Forge receipt. A real versioned craft/claim/provenance schema, migration strategy, Market 2.0 version gate and verified server-only RNG are still required before future issuance.
- Current original Forge minted 2.0 items and legacy pre-2.0 items are not rewritten or rerolled.

## Pass 16 — Genuine regional boss opportunity analysis for original Forge sets

There are **15 actually pinned Forge set families (42 original pieces)**; the 48 expanded families and 204 draft identities remain nonissuable. Existing authored review-only set directions have 2/3/4 piece proposed milestone coefficients, but **none of their mechanics have been programmed or approved**.

Added `equipment-forge-set-boss-opportunity-review.ts` as a pure, source-linked inspector:
- It independently verifies the exact persisted Enemy V2 boss kit structure against the original base enemy, using the existing source-authored boss compiler, with no additional generic pressure phase.
- It compares actual authored ability/phase effects against the proposed 15-counterplay-channel taxonomy, and separately counts matching **observed combat-engine events** from the existing original Forge + 9 classes × 2 specs × six authored regional-boss suite.
- Exactly 108 authentic targeted-boss class/spec traces × 15 set directions = **1,620 review rows**; each is classified `mechanic_not_authored`, `authored_not_observed` or `opportunity_observed_effect_unimplemented`.
- In particular a boss's ordinary Defense stat is not automatically proof of armor break, and a generic debuff is not proof that a future cleanse set is executable or guaranteed to remove it.
- Every row is explicitly `appliesInCombat:false`, `effectImplementationVerified:false`, `approvedForBalance:false`. Aggregate results have `actualSetEffectsApplied:0`, `canAuthorizeCombat:false`, `canGrantRewards:false`, `releaseApproved:false`.
- An observed mechanic only indicates **candidate counterplay relevance**. It is not a numerical benchmark, actual event-caused set proc, PvE win-rate improvement or class-balance approval.

## Remaining integration gates
1. Design and approve fully **class-independent roll sources** as a new versioned, authenticated Forge mint + claim policy, enforce server-only RNG, no copy/receipt rewriting, and maintain the one-true market provenance.
2. Approve authored original Forge set 2/3/4 bonus effects only after targeted-versus-generic boss encounter measurement at equal CP, nonmandatory alternative class counters and server-authoritative set custody. Current proposed percentages remain non-executable.
3. Actual signed transaction/locked readbacks from production account ownership, atomic battle/loot and market trade CAS, real multi-character Bank custody, and long-form boss replay state conversion.
4. Finalize original 15 set family membership, draft 48 expanded set family source gaps, T5–T9, equipment innate percentages, correct stat potency, gem/trait boundaries and CP weights.
5. No release to main, no player-facing UI, no production DB, no entitlement, loot, gold, XP, class, boss or economy write was made.

## CI
Private strict TypeScript and source-authentic Equipment+Combat integration workflow compiles both modules, validates thousands of preview samples across original pieces and the six real authored boss kits, and fails if a draft review path appears in public Edge/mobile/online files. Only exact-head successful CI may be described as passing.
