# Veldryn Player Market — V16 character-level purchase restrictions

**Status:** HIDDEN, DESIGN DRAFT / MARKET T1–T4 EQUIPMENT LEVEL THRESHOLDS APPROVED BY OWNER (2026-11-12), NOT LIVE. Rarity premiums were also accepted. Later-tier market levels and per-SKU resource mapping remain provisional. No market rollout, public route, production migration, pricing approval, item tradability approval, or general equipment progression rebalance is authorized by this document.

## Why

Market purchases must not skip character progression. Existing V33 equipment items already expose `requiredLevel` calculated with `rebasedCombatLevelFromLegacyLevel`, and use `TIER_CHARACTER_LEVEL_FLOOR` before the XP rebase. **Reuse the actual per-item rebased `requiredLevel`; never compare a rebased character level to legacy raw tier floors.** Do not use account level, profession skill, highest roster character, or combat discipline levels.

## Equipment market purchase thresholds (rebased character levels)

| Tier | Existing in-game equipment floor | Market purchase minimum | Market approval | Equipment availability |
|---|---:|---:|---|---|
| T1 | 2 | **6** | **Owner approved** | released |
| T2 | 10 | **18** | **Owner approved** | released |
| T3 | 20 | **30** | **Owner approved** | released |
| T4 | 30 | **52** | **Owner approved** | released |
| T5 | 40 | **60** | Proposed follow-on minimum only; **not approved** | released in item catalog |
| T6 | 50 | **68** | Future placeholder; **not approved** | unreleased |
| T7 | 58 | **76** | Future placeholder; **not approved** | unreleased |
| T8 | 65 | **84** | Future placeholder; **not approved** | unreleased |
| T9 | 70 | **90** | Future placeholder; **not approved** | unreleased |

**Market and game progression are intentionally different.** Level 6/18/30/52 are **market purchase floors**, not changes to crafting, monster drops, quest loot, existing item `requiredLevel`, or ordinary equipment eligibility. The item's own `requiredLevel` can exceed its tier floor. Source: `apps/mobile/src/content/equipment-recipes-v33.ts`, `apps/mobile/src/content/equipment-items-v33.ts`, `apps/mobile/src/content/equipment-release.ts`, `apps/mobile/src/core/progression.ts`.

The T5 existing equipment floor of 40 must **not** accidentally become a market threshold of 40 below T4's approved 52. **Do not activate T5 market trading until a later-tier threshold is approved**; 60 is a coherent suggestion, not an owner decision. T6–T9 remain blocked while unreleased, even for eligible-level characters. Future floors should preserve a monotonic tier ladder while keeping attainable rarities within the maximum character level.

## Proposed additional market acquisition restriction by *actual crafted rarity*

| Rolled rarity | Additional character levels above exact equipment requirement |
|---|---:|
| Common | 0 |
| Uncommon | 0 |
| Rare | 2 |
| Epic | 4 |
| Legendary | 6 |
| Mythic | 8 |

**Approved T1–T4 gear purchase formula:** `max(exact item.requiredLevel, approved MARKET tier purchase floor) + rarity market premium`. Examples at the current market floor: T1 Common 6, T2 Rare 20, T3 Epic 34, T4 Legendary 58, T4 Mythic 60. An individual piece with a higher equipment level still uses that higher requirement before adding rarity premium. The rarity must be the persisted *rolled instance rarity*, not a default inferred from the tier, item ID, or asking-price multiplier. Quality, enchants, socket gems, attributes, set, or asking price do not reduce unlock levels. For T5 onward use the same formula **only after the market tier floors are individually approved**.

The rarity addition applies to buying a market listing, not a retroactive change to drop or self-crafting equipment eligibility. If market-owned gear can be routed via a shared bank or switched to a lower-level character, delivery/equip must also enforce the market-acquisition requirement or preserve the locked recipient/market provenance so the rule cannot be bypassed; do not impose a universal rarity equip change on existing crafted gear by accident.

## Resources, processed materials, gems, and tools

**Resource restrictions remain separately scoped to source/item policy**: the user's 6/18/30/52 change explicitly applies to *equipment market purchase tiers*, not automatically to materials. T1/2/3/4 resource floors provisionally remain 1/10/20/30, subject to per-SKU review. This lets lower-level gatherers sell useful materials without buying gear beyond their progression.

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

- Market T1 Common level 5 blocked / 6 eligible; T2 Common 17/18; T3 Common 29/30; T4 Common 51/52. A level-2 player may still craft or equip eligible T1 gear, but cannot buy it before level 6.
- The approved rarity offsets give T2 Rare 20, T3 Epic 34, T4 Legendary 58 and T4 Mythic 60 at their tier floors. T4 Mythic at level 59 is blocked and at level 60 eligible; higher individual item requirements are still respected.
- The released T5 tier must not be market-purchasable with its old level-40 floor once T4 requires level 52; pending explicit T5 approval, fail closed for T5 market acquisition. Future-tier placeholders never imply release.
- T3-gated Dunewood can be bought at 20 even when a T4 recipe also consumes it; T4-only material cannot be bought at 20.
- Character level must be derived from XP; an account with level-40 main and level-5 alt cannot buy T4 on the alt; profession level 99 cannot override this.
- A forged request replacing exact rarity/tier/item/character, stale state revision, rejected purchase, claimed delivery to low-level alt, malformed policy and unreleased T6+ all fail closed without Gold or receipt mutations.
- Legitimately self-crafted high-rarity gear is not silently nerfed by a market-only change; locked purchases must not leak or lose items.
- Existing V12/V15 hidden-market synthetic lifecycle, tax, pricing, cancellation, delivery and zero-activation assertions remain green.

**Next engineering task:** introduce a private, data-driven item acquisition-policy catalog and read-only eligibility preview, then wire it to both purchase RPCs plus claim and mobile locked-offer UI, under rollback-only integration tests. The owner-approved T1–T4 equipment floors and rarity offsets can now be used in hidden test-only policy; T5+ market floors and item-specific resource source-tier mapping still need review before trading is enabled.
