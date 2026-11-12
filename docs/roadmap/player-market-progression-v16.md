# Veldryn Player Market — V16 character-level purchase restrictions

**Status:** HIDDEN, DESIGN DRAFT / PROPOSED THRESHOLDS, NOT LIVE. 2026-11-12. No market rollout, public route, production migration, pricing approval, item tradability approval, or equipment progression rebalance is authorized by this document.

## Why

Market purchases must not skip character progression. Existing V33 equipment items already expose `requiredLevel` calculated with `rebasedCombatLevelFromLegacyLevel`, and use `TIER_CHARACTER_LEVEL_FLOOR` before the XP rebase. **Reuse the actual per-item rebased `requiredLevel`; never compare a rebased character level to legacy raw tier floors.** Do not use account level, profession skill, highest roster character, or combat discipline levels.

## Proposed purchase baseline (rebased character levels)

| Tier | Existing legacy floor | Existing rebased equipment floor | Proposed resource market minimum | Release |
|---|---:|---:|---:|---|
| T1 | 2 | 2 | 1 | released |
| T2 | 12 | 10 | 10 | released |
| T3 | 26 | 20 | 20 | released |
| T4 | 40 | 30 | 30 | released |
| T5 | 55 | 40 | 40 | released |
| T6 | 70 | 50 | 50 | unreleased |
| T7 | 82 | 58 | 58 | unreleased |
| T8 | 92 | 65 | 65 | unreleased |
| T9 | 100 | 70 | 70 | unreleased |

These are the floors; the individual item's `requiredLevel` may be higher. T6–T9 should remain untradeable while they are not released, regardless of a player's level. Source: `apps/mobile/src/content/equipment-recipes-v33.ts`, `apps/mobile/src/content/equipment-items-v33.ts`, `apps/mobile/src/content/equipment-release.ts`, `apps/mobile/src/core/progression.ts`.

## Proposed additional market acquisition restriction by *actual crafted rarity*

| Rolled rarity | Additional character levels above exact equipment requirement |
|---|---:|
| Common | 0 |
| Uncommon | 0 |
| Rare | 2 |
| Epic | 4 |
| Legendary | 6 |
| Mythic | 8 |

**Proposed gear buy minimum:** `max(exact item.requiredLevel, rebased tier floor) + rarity market premium`. Example at floor: T2 Rare 12, T3 Epic 24, T4 Legendary 36, T4 Mythic 38. An actual T4 piece requiring level 34 would need level 42 when Mythic. The rarity is the persisted *rolled instance rarity*, not the catalog's tier-themed default rarity; never derive from item ID or price multiplier. Quality, enchants, socket gems, attributes, set, or asking price do not reduce unlock levels.

The rarity addition applies to buying a market listing, not a retroactive change to drop or self-crafting equipment eligibility. If market-owned gear can be routed via a shared bank or switched to a lower-level character, delivery/equip must also enforce the market-acquisition requirement or preserve the locked recipient/market provenance so the rule cannot be bypassed; do not impose a universal rarity equip change on existing crafted gear by accident.

## Resources, processed materials, gems, and tools

- Every tradeable stack SKU should get a **reviewed canonical source tier / required character level** in the server-side item policy, not a tier guessed from its sale price, name, or the *highest* recipe that consumes it.
- A material shared between T3 and T4 recipes remains T3-gated if its ordinary source is T3. Example proposal: Dunewood and Sunstone Ore are T3 (20); Frostiron from Frostmarch is T5 (40). A genuinely T4-only component is T4 (30). Early universal materials remain level 1.
- Raw, refined, and recipe output materials should use their own reviewed item requirement, not the buyer's Mining/Woodcutting/Smithing level. Buying a resource never bypasses skill requirements for *using* it.
- Tradable tools, tool blueprints and combat-effect gems should use their actual required level or source-tier policy; a standalone rare gem is not treated as 'Mythic gear' without a verified rarity rule of its own.
- Bound/quest/event-currency/guild currency, unverified or unreleased items remain blocked independent of level. Time-limited event materials need deliberate item-specific policy; no blanket event bypass.
- Listing can remain visible with a lock and `Requires Character Lv. N`; server grants no purchased item before eligibility. Browse may filter to `Can Buy Now`.

## Server-side enforcement contract (future hidden implementation)

1. Resolve authenticated account and the **currently active, account-owned character** from authoritative online state and the exact XP-derived rebased level, under the same account/revision lock as the purchase. Never trust an account level, level, tier, rarity, item payload, character ID, or level claims from the client.
2. Resolve an active offer's exact escrow-held SKU/Forge instance and its authenticated policy. Check tradeability, release status, class compatibility (for equipment), item identity, tier, source level, and *persisted crafted rarity*. Unknown/missing policy or malformed tier/rarity fails closed.
3. Check `buyer_level >= requirement` **inside both resource-stack and exact-equipment purchase transactions**, after locking/reloading the offer and before Gold movement, tax, delivery, sale receipt, or offer closure. Return a stable `market_level_required` code with safe requirement details from the server; the seller's offer remains active.
4. Perform the same check when selecting a delivery recipient or transferring market-acquired equipment to a lower-level character; remain pending rather than losing the purchased item. Future family/account-shared stores must not defeat this rule.
5. Preserve atomic Gold conservation, 5% seller completed-sale fee, existing V14/V15 draft min/max price decisions, 20 active listing policy, unique instance identity, immutable rolls/sockets, idempotency, cancel/expiry, and inbox settlement.
6. For better UX, show `Requires Lv. N`, class conflict, `Unreleased`, or `Not tradeable` as separate states. Disable purchase but keep relevant item detail readable. Requirements must be calculated using the same authoritative policy, not duplicated UI math.
7. Do not activate `PLAYER_MARKET_RELEASED`, `MARKET_EDGE_TRANSPORT_RELEASED`, `trading_enabled`, or ungranted private RPCs. All preparation remains inaccessible to players.

## Minimum acceptance tests

- At level 1, T1 common gear requiring 2 is locked; at 2, it is eligible. T2 level 9 blocked / 10 eligible. T3 19/20 and T4 29/30 follow similarly for pieces at the floor.
- T4 Mythic at the tier floor is blocked at 37 and allowed at 38; a piece with its own higher required level uses the higher value.
- T3-gated Dunewood can be bought at 20 even when a T4 recipe also consumes it; T4-only material cannot be bought at 20.
- Character level must be derived from XP; an account with level-40 main and level-5 alt cannot buy T4 on the alt; profession level 99 cannot override this.
- A forged request replacing exact rarity/tier/item/character, stale state revision, rejected purchase, claimed delivery to low-level alt, malformed policy and unreleased T6+ all fail closed without Gold or receipt mutations.
- Legitimately self-crafted high-rarity gear is not silently nerfed by a market-only change; locked purchases must not leak or lose items.
- Existing V12/V15 hidden-market synthetic lifecycle, tax, pricing, cancellation, delivery and zero-activation assertions remain green.

**Next engineering task:** introduce a private, data-driven item acquisition-policy catalog and read-only eligibility preview, then wire it to both purchase RPCs plus claim and mobile locked-offer UI, under rollback-only integration tests. Human approval of rarity offsets and item-specific source-tier mapping is needed before a real implementation or launch.
