# Veldryn 2.0 — Equipment resource demand + Guild upgrade sink (Pass 1)
**23 November 2026 · HIDDEN REVIEW ONLY · proposed cost mix, NOT an approved live economy.**

> No main merge, production/staging SQL, Edge/deploy, runtime feature flag, player inventory mutation, resource destruction, cosmetic/UI rollout or paid unlock from this pass. 2.0 remains a coordinated release with owner's actual UI and theme acceptance gate.

## Why this pass exists

The 23 Nov production inventory snapshot (367 populated game-state accounts, as a **cross-sectional held-quantity measurement**, not a seven-day flow) showed high basic material stocks:

| Material | Inventories + personal banks | Guild bank balance | Total observed |
| --- | ---: | ---: | ---: |
| Greenwood Logs | 71,540 | 2,411 | 73,951 |
| Ironwood Logs | 18,838 | 2,716 | 21,554 |
| Copper Ore | 37,050 | 679 | 37,729 |
| Aster Iron Ore | 12,141 | 600 | 12,741 |
| Moss Fiber | 36,086 | 10 | 36,096 |
| Dewleaf | 38,172 | 847 | 39,019 |

**Important measurement warning:** production `economy_rollups_hourly` had zero rows. Neither daily net accumulation nor all craft consumption can be inferred from held stocks. Some saved game states are stale; guild bank balances are a distinct ledger; never sum multiple saved revisions for one account. This is an initial sink design, not a demonstrated economic equilibrium.

## Equipment/Crafting 2.0: preserve and audit, do not multiply

- Current hidden **746 source-review routes** cover 373 potential equipment identities, all `reviewOnly`, `craftable:false`, `mayMint:false`. **472 routes already consume a wood/log/plank material** (do not count `IRONWOOD_FANG` as wood).
- Hidden processing review already prices Copper Bar/Iron Bar at **5 respective raw ore**, Greenwood/Ironwood Plank at **4 respective logs**, treated Dunewood at **5 wood**, and reinforced Dunewood at **6 wood + Glassbound Dust**. No second multiplier is proposed.
- The 2.0 `SUNSTONE_INGOT` cost of 8 ore per three ingots remains **proposed**, NOT implemented. Canonical source remains 6 Sunstone Ore + 4 Dunewood → 3 ingots until independently migrated and reconciled.
- Future concrete slot authoring should use *processed timber* naturally for bows, staves, shield structures, handles, fittings and selected support/cloth frames. Steel armor must use metal and appropriate straps; do not overcharge wood for every metal slot merely to remove stockpiles. Each finalized item still requires its own hard, verified monster-source material and profession-only craft gate.
- The 746 review routes and the old independent armament/expansion preview manifests are not interchangeable executable catalogues. Reconcile exact IDs and both routes before any authority promotion. Keep tier-sensitive XP, Gold, throughput and rare-material availability measurable; preserve the Player Market's strict exclusion of legacy gear.
- The `EQ2_...` planks/cloth/metal options in guild baskets are **blocked**, deliberately, until they have authoritative item and processing identity. Every basket has at least one currently existing material alternative.

## Guild Tree 2.0: six permanent unlock cost baskets

Use **only** `GUILD_TREE_DEVELOPMENT_GATES` in `backend/src/server/guild/progression.ts` as the numerical model for these six draft tier-unlock projects. That module already has dynamic Gold and weighted-resource requirements; it also contains an older `GUILD_TREE_TIER_REQUIREMENTS` catalogue. **Do not charge both.** The source's Gold, level requirements, resource totals and active-member scaling stay unchanged.

For snapshot active guild members `m = clamp(floor(activeMembers), 2, 20)`:

- Gold = `baseGold + m × goldPerMember`
- Weighted material target = `weightedBase + m × weightedPerMember`
- Each basket takes a percentage of the target. Round all baskets by **largest remainder** so the integer basket totals add to the exact target, never above it.
- Inside a basket, the guild can donate any mix of its listed materials. Donating one unit permanently consumes the item and credits the configured weighted units **only toward that basket**. Never use one donation twice.
- All resource categories are fulfilled by the **guild collectively**, not one player. Profession specialists may obtain ingredients by gathering, processing, trade or commissions without mandatory combat levels; combat-source materials remain tradable.

### At 10 active members (illustrative, not a price change in production)

| Unlock | Gold cost | Weighted total | Timber share | Timber weighted units |
| --- | ---: | ---: | ---: | ---: |
| Professions 2 | 150,000 | 9,000 | 30% | 2,700 |
| Professions 3 | 350,000 | 21,000 | 15% | 3,150 |
| Fellowship 2 | 170,000 | 8,000 | 40% | 3,200 |
| Fellowship 3 | 385,000 | 19,500 | 20% | 3,900 |
| Vanguard 2 | 190,000 | 9,000 | 25% | 2,250 |
| Vanguard 3 | 430,000 | 23,000 | 15% | 3,450 |

**This does not mean 2,700 logs for every player.** For example, a Professions-2 timber basket can be filled by 2,700 Greenwood Logs (1 credit each), 1,350 Ironwood Logs (2 credits each), or a mixed contribution. Proposed 2.0 Greenwood Planks would grant 3 credits when and only when the new item authority is registered. No donated raw log simultaneously earns a plank credit.

Basket composition is branch-flavored: Professions emphasizes metal, wood, textile and supplies; Fellowship emphasizes hall timber, textiles and food; Vanguard emphasizes metal, combat-derived items and infrastructure. Higher upgrades bias toward Ironwood/Dunewood/advanced materials, rather than allowing basic Greenwood to unlock all late branches.

## Guild recurring resource sinks — *candidate* optional supply objectives

These are **three potential themes within the existing one standard + one voted weekly project system**, not additional weekly projects, mandatory per-player taxes, or a hidden charge on every rank click. Their introduction requires a separate approved project lifecycle and visible UI review.

| Candidate | Min guild level | Weighted target at 10 active members | Timber share | Timber units |
| --- | ---: | ---: | ---: | ---: |
| Hall Maintenance (standard) | 3 | 2,400 | 55% | 1,320 |
| Workshop Supply Contract (enhanced) | 5 | 3,600 | 35% | 1,260 |
| War Readiness (prestige) | 7 | 4,800 | 20% | 960 |

For 10 active members, selecting Hall Maintenance + Workshop Supply Contract would consume up to **2,580 timber weighted units per week**, alongside metal/textile/hide baskets. This is a design example rather than confirmed weekly player behavior. Tiers and ingredient weights must be tuned on observed material throughput before release.

No donation alone grants combat/skilling project points or bypasses existing meaningful contributor thresholds. Project selection, one-shot costs, completion idempotency, weekly reset, personal rewards and active-member snapshots must all be preserved. A player must never be debited when a project is overfilled or expires during a transaction.

## Transaction and lifecycle gates for future implementation

1. **Versioned source registry:** Server checks exact inventory identity, registered availability and verified current season/content, not client item names or preview recipes. Future EQ2 output IDs have no donation eligibility until registered.
2. **Atomic, idempotent debit:** Lock authoritative account/character Inventory and shared Bank, guild project instance/progress, donor receipts and membership in one transaction; fail closed for insufficient balances, stale project version, duplicate receipt, oversubscription, negative/float values, forged item IDs and multi-character replay. Use one inventory/debit owner across guild, crafting and commissions.
3. **No Gold double-bill:** Pick one versioned guild development catalogue; persist an immutable snapshot of active-member count, requirements, market identity and Gold amount when each project becomes active. Midproject member changes never reprice it.
4. **Guild reward integrity:** Keep meaningful donor threshold / contributor limits and reward claims. A completion is not solely bought by a single account and must not mint tradeable 2.0 equipment.
5. **Market and economy:** Materials may be traded and commissioned; only verified freshly minted Equipment 2.0 instances may enter the equipment Market. Never reclassify old gear through conversion, resale or account switching.
6. **Balance telemetry:** Instrument resources generated, truly consumed, banked, listed and traded per **item ID, source, tier, day and active account**; watch weekly stock growth, price floor, new-player supply and specialist crafting throughput. Only adjust after 7–14 days of representative staging/simulation data and release approval.
7. **Review/launch:** Complete recipe/source registration, 746-route provenance reconciliation, the nine-class/18-specialization combat and set scope, test 2, 10 and 20-member guilds, Edge + SQL races, Android/theme review, staged rollback and owner approval before coordinated launch.

## Implemented by this isolated source pass

- `resource-sinks-equipment-guild-v1.json` — six gate weighted baskets, member-scaling source model, three optional weekly candidates and blocked unregistered processed inputs.
- `tools/test-eq2-guild-resource-sinks-v1.mjs` — source-contract, nonissuance and cost-share checks. Run with `node tools/test-eq2-guild-resource-sinks-v1.mjs`.

Neither file is imported into server gameplay, Guild writes, the mobile app or live Ops. The test is a reviewer guard, not proof of authenticated database settlement. Next steps are formal cost approval, precise per-slot recipe adjustments if the source audit shows a shortage, and authenticated transaction adapter design only **after** the main Equipment 2.0 source authority is consolidated.
