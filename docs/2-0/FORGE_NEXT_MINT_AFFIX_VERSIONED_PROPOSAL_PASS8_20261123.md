# Veldryn Equipment 2.0 — Versioned Next-Mint Affix Policy, Pass 8
**23 November 2026 — hidden authoring / source QA only — no deployment, original RNG changes, or real item modification.**

## Problem verified by source-backed pass 7
The original Equipment 2.0 hidden Forge contains 169 pinned T1–T4 pieces (42 members of 15 source sets), six source rarity bands, and the original 70% slot preference / 30% weighted role fallback. The Combat 2.0 executor applies affixes only in its current slot allowlist. The verified audit reported:
- 158 / 169 original templates have at least one possible original-roll channel that Combat cannot currently execute.
- 77 / 169 templates cannot support *their maximum* original rarity roll count with only presently legal Combat channels.
- 37 / 169 templates have **zero** currently safe executable roll channels.
- These are template-level compatibility issues, NOT empirical probabilities of an unusable drop. No old item may be silently re-rolled, converted, replaced, traded, or granted stats.

## What this pass authors
New *review-only* source version `eq2-hidden-next-mint-slot-safe-candidate-v1`, implemented in `backend/src/server/combat/v2/equipment-forge-next-mint-roll-policy-review.ts`. It is deliberately NOT the original Forge rulesVersion and is not accepted by the generator, craft ledger, drop/market service or Combat stat authorizer.

For each actual server-pinned T1–T4 piece and each of the six original rarity bands, the pure read-only reviewer:

1. Uses only the **actual original role-weighted stat list**, exact source slot preference, rarity count and affix %-range, with strict validation of the original 100 weight points.
2. Excludes ambiguous `potency` rather than treating it as attack, healing or caster power. Every other chosen stat must have the exact source-to-Combat mapping already implemented in the frozen Forge bridge.
3. Retains **every already-executable original source stat** for that role/slot. If the number of distinct choices falls short of that tier/rarity's existing affix count, it proposes the **minimum number** of additional role-authored slot permissions, prioritizing the original slot preference and original weights. These extra permissions are explicitly `PENDING_COMBAT_SLOT_APPROVAL`. No global Combat slot allowlist is widened in code.
4. Proves the resulting **proposal** can theoretically fill all original 1/2/3-affix rarity counts with distinct existing source stats after the proposed slot permissions are reviewed and approved. It never adds bonus rolls or invents a new numerical stat magnitude.
5. Returns immutable provenance and proposed-permission decisions; `permittedToMint:false`, `canIssueItems:false`, `canEditExistingItems:false`.

### What the proposal does NOT automatically solve
- Existing Combat 2.0 slot rules intentionally prohibit some combinations. The suggested permissions are **not currently executable**, and may be rejected for game balance or class identity reasons. For example, a tank weapon need not automatically get every defensive affix simply because they come from the original Tank role pool.
- Renormalizing role weights after excluding `potency` would change exact roll probabilities; the proposed reviewer does **not** choose new weights, roll randomness, draw affixes, guarantee player outcomes, issue item templates or update the original 70% preference. These are **pending approval** and a versioned dedicated new-mint implementation.
- Original `V2_SERVER_AFFIX_RANGES` percentages are reused as design source bounds, **not** approved final Combat 2.0 per-stat caps, multi-item CP budgets or final cross-class balancing.
- A Combat type bonus (Blunt/Piercing/Slashing affix) would need to consume **one original random roll**; no free fourth roll is permitted.
- Existing frozen pieces with `potency` or forbidden-slot rolls stay recorded and owned; no silent stat loss, item deletion or migration. They remain blocked from Combat 2.0 equip until their exact stat meaning and legitimate legacy conversion policy are agreed. Pre-2.0 equipment remains permanently nontradeable on Player Market 2.0.
- The 48 new T1–T4 Combat sets and their 204 conceptual identities are **not** original pinned Forge items; this review does not authorize their crafting, rarity ranges or any 2/4/6/8/10 bonuses.

## Verified CI results and exact slot-approval matrix

GitHub Actions scoped Equipment + Combat CI passed with original source manifest and strictly compiled test. The proposal produces **0 theoretical affix-count shortfalls after pending approvals** across 169 original templates × 6 rarities = **1,014 source scenarios**. Of those, **295** tier/rarity scenarios across **77** source items require a proposed slot expansion. **719** scenarios need no new slot permission. These are scenario counts, NOT observed rolls, expected drop rates or approvals. CI identified **36 distinct role × slot × stat permission changes**, all still inactive.

| Role | Equipment slot | Additional *proposed* Combat channel(s) |
|---|---|---|
| Damage | Boots | Accuracy, Critical Damage |
| Damage | Cape | Critical Damage |
| Damage | Chest | Ability Damage, Critical Damage, Critical Rate |
| Damage | Helmet | Accuracy, Critical Damage, Critical Rate |
| Damage | Legs | Ability Damage, Critical Damage, Critical Rate |
| Damage | Offhand | Ability Damage, Critical Damage, Critical Rate |
| Support | Amulet | Haste, Maximum HP |
| Support | Boots | Maximum HP |
| Support | Gloves | Forge Healing Power, Ward |
| Support | Legs | Ward |
| Support | Ring | Forge Healing Power |
| Support | Weapon | Ward |
| Tank | Amulet | Defense, Maximum HP, Tenacity |
| Tank | Boots | Maximum HP |
| Tank | Cape | Defense |
| Tank | Gloves | Defense, Maximum HP, Tenacity |
| Tank | Ring | Defense, Tenacity |
| Tank | Weapon | Defense, Maximum HP, Tenacity |

**Design-review considerations before approval:**
- Crit Rate / Critical Damage on Damage armor can create powerful full-build stacking even if each individual roll fits its source range. Review class/build-wide crit caps and role-specific item identity; do not authorize automatically.
- Ability Damage on Chest/Legs and Tenacity/HP on Tank weapons shift each equipment slot's intended specialization. If rejected, introduce a separately authored source stat/slot policy with strict replacement and the same 1–3 roll budget; do not make the item unrollable.
- Support Ward/Healing distribution should remain useful in real class healing, barrier, support and boss-counterplay simulations, not simply inflate a synthetic DPS metric.
- These 36 are **minimum coverage proposals chosen by existing source weights and preferences**, not finalized item design, exact new-mint RNG probabilities or approved mechanical effects.
- Preserve original source class restrictions and one-, two- and dual-handed identities on every weapon; exhaustive CI checks now verify these metadata fields.
- For approval, additionally validate summed multi-slot affix totals, outcome scarcity, original PvE counters, actual Skill/Companion 2.0 mechanics and the authoritative Combat Power formula. Slot widening must be versioned and never applied retroactively to existing items.

## What must be approved before implementing a new-mint generator
- Every proposed *role × slot × stat* extension after gameplay/economy review; especially sources with no currently legal channels.
- Whether to assign distinct `potency` semantics by class/role, replace it in future roll pools with an already-approved stat, or introduce a separately versioned effect.
- Rarity probability, quality distribution, 70/30 preference and future renormalized weights, including equipment volume, skill XP and market scarcity impacts.
- True final Combat Power formula, cumulative affix caps, class/companion balance and source-complete set effects.
- New immutable generation identity, server-side mint/claim/market custody enforcement (legacy excluded), hidden integration CI, and the coordinated 2.0 launch gate, with UI/theme owner review.

## CI and scope
Strict Equipment + Combat TypeScript compilation and an exhaustive **169 × 6 = 1,014** source-backed scenario test. Every selected candidate must match its source role pool, original percentage range, original count, class/slot source, unique stat type and current/pending Combat permission. Unknown/counterfeit pieces and client-invented rarity are rejected. Source generator and combat allowlists are not changed. Broader Skills CI failures from app import paths and TS rootDir are separate launch blockers.

**This is a candidate design for approval, NOT an authorized roll table or promised release.**
