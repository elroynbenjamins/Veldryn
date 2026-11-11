# Veldryn Player Market — V15 Gold affordability & exceptional gear review

**Status: PRIVATE, DRAFT, NOT RELEASED.** A diagnostic only. No SQL migration or live item ranges are changed. No trade/price policy approvals or public UI/RPC permissions are granted. V10–V14 source pricing and all release guards stay unchanged.

## Objective

Identify when the V14 recipe-based floor on a **finished** item looks too expensive for an early-tier buyer, and whether the old enhancement multiplier gives a believable value to expensive upgraded gear.

**Do not equate purchasing a full set with crafting a full set.** Finished equipment costs include gathered and combat-found ingredients, processing Gold, crafting Gold and a seller's price. Players can also gather and trade materials and earn Gold from quests/other rewards. Combat-only Gold/hour is **a narrow reference proxy** and must never automatically become an equipment cap.

## Source-backed T1–T4 benchmark

The current UI source `combatBaselineProjection(monster)` calculates `goldPerHour = monster.gold * 3600 / (monster.secondsPerKill * COMBAT_TIME_SCALE)`. Monster seconds are already scaled in `MONSTERS`. `COMBAT_TIME_SCALE=1.16`.

| Market tier | Reference monster | Gold per authored kill | Authored-timed reference Gold/hour | Interpretation |
| --- | --- | ---: | ---: | --- |
| T1 | Moss Rat | 1 | 221.67 | Entry Asterfall |
| T2 | Ironwood Wolf | 3 | 387.93 | Ironwood |
| T3 | Sunscar Scorpion | 21 | 892.77 | Early Sunscar |
| T4 | Glassbound Sentinel | 35 | 1,155.54 | Later Sunscar |

These numbers are **not actual observed Gold/hour** and are **not verified player results**. November's ordinary-hunt redesign uses *damage-driven encounters and search time* in Asterfall/Sunscar, which can be faster or slower than the old authored timed benchmark. This projection omits player attack speed and damage, food, weather, buffs, events, combat losses, quests and other Gold sources. It is a common denominator for **illustrating** possible pressure, not for authorizing price changes.

The `previewTierAffordabilityV15` diagnostic totals all 10 Foundation-path Ironwarden pieces, obtains the exact Common/Q50/unenchanted V14 recipe-priced minimum for every piece, reports only complete sets, and divides the finished-item buyout minimum by the reference Gold/hour. No historical 7-slot equipment acquisition target is mistakenly treated as the current 10-piece market set.

## Verified V14/V15 read-only output (2026-11-11)

The dedicated hidden pricing workflow successfully compiled and ran the V10–V15 safeguards. The full **ten-slot Ironwarden Foundation** quote (Common, Q50, rank 0) had complete price coverage; the source-derived baseline is not real observed Gold income.

| Tier | Ten-slot min buyout Gold | Direct ten-item Forge Gold (within recipe cost) | Legacy authored Gold/hour | Gold-only min buyout hours |
| --- | ---: | ---: | ---: | ---: |
| T1 | 10,632 | 3,914 | 221.67 | 47.96 |
| T2 | 35,032 | 13,688 | 387.93 | 90.30 |
| T3 | 120,707 | 58,644 | 892.77 | 135.20 |
| T4 | 239,910 | 117,288 | 1,155.54 | 207.62 |

The direct Forge Gold component is especially useful: it is a **mandatory cost even when a player gathers every ingredient**, though players may fund it through quest, activity or merchant income instead of just ordinary hunts. Do not treat prior seven-slot acquisition targets as equivalent to these ten-slot economic totals.

**Example: verified sample ring price corridors (Gold per exact copy)**

| Tier | Common Q50 minimum–maximum | Rare Q50 minimum–maximum | Mythic Q90 minimum–maximum |
| --- | --- | --- | --- |
| T1 | 737–3,600 | 1,217–5,940 | 5,941–29,016 |
| T2 | 2,291–11,400 | 3,781–18,810 | 18,470–91,890 |
| T3 | 7,454–33,000 | 12,300–54,450 | 60,080–265,980 |
| T4 | 15,040–60,160 | 24,820–99,270 | 121,300–484,900 |

The market does not approve these prices, and the Q90+ Mythic entries always require manual review before any trade. Socket/enchant valuation still requires additional proof and economic review.

**Exact same-tier slot distinction, Common Q50:** T1 chest 1,335–5,340 vs ring 737–3,600; T2 chest 4,513–18,052 vs ring 2,291–11,400; T3 chest 15,810–63,240 vs ring 7,454–33,000; T4 chest 31,570–126,280 vs ring 15,040–60,160. This arises from each slot's actual recipe cost; no artificial common slot multiplier is applied on top.

## Sensitivity: hypothetical sale of combat drops at draft resource floors

For the same representative monster, `previewMarketTradeIncomeScenarioV15` reads the **already adjusted current drop chances** and only material IDs with V14 draft quotes. It applies a selected hypothetical percentage sold at their **draft minimum unit price**, with a 5% *continuous approximation* for the seller tax. This is **not market revenue, not an earnings forecast, and not a simulation of actual supply/demand**; buyer currency, competition, listing minimum lots and exact fee rounding can prevent sales.

| Tier | All Gold from combat alone: hours | If 25% of dropped resource value sells: hours | If all dropped resource value sells: hours |
| --- | ---: | ---: | ---: |
| T1 | 47.96 | 37.49 | 22.66 |
| T2 | 90.30 | 64.10 | 34.27 |
| T3 | 135.20 | 95.19 | 50.42 |
| T4 | 207.62 | 123.66 | 55.87 |

These scenarios isolate *possible trade-value effects* and intentionally have no input into range approval. A valid economy needs buyers with enough actually earned Gold. Do not use this optimistic table to justify inflating all resource/gear prices.



## Decisions from this pass

1. **Keep source ingredients and exact crafting costs visible.** Per-item market floors still come from current production recipes and V14's 5% sale-tax/15% labour assumptions. Do not force all common items to sell at a profit; Q0 can already quote less than Q50 because low-quality copies have lower utility.
2. **Do not auto-cap prices using combat-only Gold/hour.** If full-set buying needs far more play than self-crafting, investigate quest/merchant Gold flow, materials offered for sale, true player Gold/hour, lack of competing listings, and optional item acquisition. A raw Gold/hour cap could let players buy gear cheaper than its real Gold+ingredient recipe cost and kill the crafting market.
3. **Review rather than automatically reprice rarity.** New timed Forge roll probabilities are Common 89.1%, Uncommon 7%, Rare 3%, Epic 0.6%, Legendary 0.2%, Mythic 0.1%. V14 multipliers (×1 / 1.25 / 1.65 / 2.5 / 4 / 6.5) remain draft. An actual high-rarity roll and high quality are very rare; the model reports their probabilities separately and does not infer a 1/chance asking price.
4. **Upgraded gear needs real-cost scrutiny.** Current equipment enhancement: +1 Gold surcharge 200; target ranks 1–4 have increasing Gold, material, Tempering Dust/Core costs and can fail. `previewEnhancementInvestmentV15` sums the actual **mandatory Gold for one successful attempt per rank** and the V14 minimum prices of authored recipe-required materials. It then compares that with V14's additive floor from enhancement rank. The diagnostic marks costs of Tempering Dust, Tempering Cores and failed attempts as **excluded**, not free. It flags possible underpricing. This is a cost audit only, not a replacement price floor.
5. **Manual high-value exceptions:** Legendary/Mythic, Q90+, enhanced copies and all equipped gems/rolls need item-specific review. Existing receipt and escrow proof still must preserve sockets, exact rolls, permanent stats, quality and upgrade rank. No separate value is inferred for sockets with unknown trade/provenance.
6. **Liquidity and price evidence:** Keep seller fees at 5% completed-only. Launch items remain disabled until verified custody/auth/rate limiting, settlement, Gold audit and deliberate approvals. Real price review uses settled transactions, not unsold listings; V11 evidence thresholds are unchanged.

## Release and implementation

- Hidden diagnostics: `backend/online/market-affordability-v15.ts`
- Executable tests: `backend/online/tests/market-affordability-v15.ts`, included in `backend/package.json` `test:market-readiness`.
- The test prints `V15_SOURCE_REFERENCE_MATRIX` with per-tier full-set cost and benchmark hours. Do **not** call this a full live-economy simulation.
- No player-facing market screen was mounted. No production Supabase migration was created or applied.
- Next analysis: compare Gold from actual ordinary hunt receipts and vendor/quest channels to first-buyer purchasing power, examine socketed gear and enchant success-cost budgets, then propose launch price bands for manual approval only.
