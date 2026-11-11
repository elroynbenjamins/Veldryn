# Veldryn — Player Market V14 recipe-aware pricing (draft, hidden)

**Status:** Code model committed for design review only. **No market release or database price approvals.** Live SQL V10/V11 corridors, the unapproved pricing and minimum-lot policies, Gold transfers, trade grants, player UI and release flags are unchanged. This is not a deployment request.

## Why revise V10/V11

The existing 35 static resource corridors and T1–T9 base gear corridors were excellent first guards, but they do not fully cover the *current* resource-to-Alchemy-to-Smithing/Tailoring chains. Several processed materials can be priced below their input-plus-Gold cost at the current minimum resource prices. An item selling at its floor must still cover the 5% completed-sale fee if we want refining and Alchemy to be economically useful.

The V14 preview uses **actual current RECIPES**, their exact output quantities, and the 20% Gold-cost surcharge already applied by the crafting catalog. It does not infer prices from NPC vendor resale values, unsupported items, unverified client bids, or asking prices.

## Proposed pricing rules

### Raw resources

Keep the existing V10 hand-curated raw anchor intervals (minimum and maximum per unit, generally sixfold range). Add the following **unapproved, advisory** input anchors to price entire crafting chains:

| Raw item | Min Gold | Max Gold | Draft min lot |
| --- | ---: | ---: | ---: |
| Dewleaf | 5 | 30 | 10 |
| Asterfall Botanical Essence | 55 | 330 | 1 |
| Sunscale Bloom | 50 | 300 | 5 |
| Whitepine Log | 75 | 450 | 5 |
| Scorpion Venom | 90 | 540 | 1 |
| Wintermint | 90 | 540 | 5 |
| Rime Resin | 110 | 660 | 1 |
| Frostbell Flower | 120 | 720 | 5 |
| Ashen Myrrh | 180 | 1,080 | 1 |
| Oathstone Ore | 25 | 150 | 5 |
| Crownwood Log | 24 | 144 | 5 |

These are **balance hypotheses**, not approvals or current market data; verify actual regional farming output and equipment demand before rollout. Restricted/guild/event/quest/currency items stay unpriced by default.

### Craftable materials (ingots, binders, fixatives)

For each possible recipe, recursively price its complete input chain at item minimums. Calculate:

- **Cost per output** = (sum of ingredient minimum costs + recipe crafting Gold) ÷ recipe output quantity.
- **Market floor** = round **up** (cost per output × **1.15 crafter premium** ÷ **0.95 sale-tax retention**).
- **Market ceiling** = maximum of four times the new floor and the existing V10 ceiling (if one exists).
- Price ticks: 1 Gold under 10,000; 10 Gold from 10,000; 100 Gold from 100,000.

Use the least-cost **complete** recipe among valid alternatives, not a recipe with missing or zero-valued inputs. If *no* complete chain is known, return **unpriced**, do not invent a profitable cost or authorize a listing.

| Craftable material | V10 minimum | V14 draft minimum | V14 draft maximum |
| --- | ---: | ---: | ---: |
| Copper Ingot | 18 | 20 | 108 |
| Aster-Iron Ingot | 45 | 58 | 270 |
| Sunstone Ingot | 180 | 298 | 1,192 |
| Frostiron Ingot | 320 | 676 | 2,704 |
| Blackglass Ingot | 420 | 1,389 | 5,556 |
| Verdant Binding Resin | Not priced | 193 | 772 |
| Ironwood Binding Resin | Not priced | 328 | 1,312 |
| Dune Binding Resin | Not priced | 548 | 2,192 |
| Glassbound Binding Resin | Not priced | 974 | 3,896 |

Gold examples are **deterministic draft model outputs** using current catalog inputs and the advisory raw anchors, not observed player transactions. The recipe selection should be independently validated in game for each craft and later rechecked in the server's exact escrow transaction.

### Equipment: exact piece cost before rarity

The T1–T9 baseline bands from V10 remain the *starting minimum* (e.g., T1 600 and T2 1,900 Gold). New V14 pricing additionally considers each **specific recipe** and its slot/input quantities. A chest and a ring at the same tier should not receive the same floor if the chest consumes more materials and Gold.

1. Calculate the real minimum recipe cost, including recursively priced ingots/binders and Gold.
2. **Common Q50, enhancement 0 base floor** = max(previous tier floor, cost × 1.15 ÷ 0.95).
3. Base cap = max(previous tier cap, new floor × 4).
4. Apply the existing rarity × quality × permanent-enchant multipliers to both endpoints and round up to permitted price ticks.

| Rarity | Existing V10 multiplier | V14 |
| --- | ---: | --- |
| Common | 1.00× | Retain |
| Uncommon | 1.25× | Retain |
| Rare | 1.65× | Retain |
| Epic | 2.50× | Retain |
| Legendary | 4.00× | Retain |
| Mythic | 6.50× | Retain |

Quality Q0–Q100 remains ×0.70–1.30. Enhancement rank 0–4 remains ×1.00–1.48. **Sockets, stat/effect gems, exceptional rolls and very rare enchant materials require a later source-verified review**; no automatic premium or tradability approval is inferred from sockets. Every eventual equipment listing must prove the complete immutable Forge receipt and preserve its entire state across ownership changes.

A rare or mythic item's price is **not simply its rarity's probability inverted**: that would produce unreasonably large maximums, especially for already expensive tiers. We retain multipliers for familiarity and smooth progression, but exact scarcity and class/slot demand can be reviewed with real completed-sale data.

## Market protections retained

- V11 **minimum lots** remain unchanged for the original 35 resource seeds: 10 for starter bulk goods, 5 for specified midtier materials, otherwise 1; equipment quantity always 1. New V14 raw inputs have draft minimum lots above.
- The **5% tax applies only on completed sales**, rounded up to a whole Gold; no cancellation/expiry fee. The seller must still receive Gold.
- A seller may list at any allowed tick inside an *approved* range once a future release authorizes it; not at an automatically calculated market price. **20 active offers** remains the listing ceiling.
- No market flag, policy approval, public RPC, price band or tax SQL is changed in V14. The new helper always reports `approved:false`, `canListNow:false`.
- After launch, proposed ±10% weekly repricing would still require >=30 genuine settled offers, >=10 distinct buyers and sellers, a 6-day evidence span and concentration controls, then human review. Zero-sales previews must never auto-adjust ranges.

## Next gates before any V14 SQL proposal

1. Audit production recipe resource identities, source/drop rates and gathering time for the **11 new raw anchors**; avoid farmed items becoming too expensive relative to the gameplay they unlock.
2. Compare a full set's output cost against typical player Gold earning and combat progress (T1–T4 first). Separate affordability for entry-level common gear from value of exceptional rolls.
3. Manually approve each item/category and its exact band only after the existing V12 launch readiness checklist is complete. Prevent both below-floor offers and stale-price purchases.
4. Add exact socket/enchant valuation or explicitly disallow socketed listings at launch; preserve original stat/effect gem rolls.
5. Run the pricing tests and full private PostgreSQL stack tests in CI; keep release disabled.

**Source code:** `backend/online/market-recipe-aware-price-v14.ts`; tests `backend/online/tests/market-recipe-aware-price-v14.ts`. Existing V10 and V11 docs and staging policies remain authoritative for their **unapproved** earlier drafts.
