# Equipment 2.0 V10 — component throughput, profitability, hand parity and player economy

**24 November 2026. Hidden source review only.** Owner authorized the four review passes following EQ2-C14. No new prices, throughput coefficients, fees, salvage rules, drop rates, skill requirements, item grants, market access, UI or production behavior are approved or activated. D1–D10 and C12 remain closed. The V9 direct Gold reduction and material requirements are the baseline.

## Pass 1 — preparation throughput

All 928 V9 source routes expand the 16 pinned T1–T4 processing references using integer batch counts, whole yields, batch leftovers, per-skill work seconds and nominal XP. Nested T4 alloy → Sunstone Ingot → ore and timber expands without counting ingots twice. Combat, binders, raw finds and missing T5 processing remain unexpanded; no zero-time availability implication. Existing Sunstone Ingot is a source-pinned reference, not a second recipe. It uses 6 ore +4 wood →3 ingots /180s /520 XP in the reviewed snapshot; separate open #1693 changes that formula, so refresh exact source after reconciliation. Do not apply that 1.0.x proposal silently to the EQ2 snapshot.

| Tier | Median known processing before seconds | V9 after seconds | Increase | After candidate 1.2x processing speed (seconds) |
|---|---:|---:|---:|---:|
| T1 | 529 | 652 | 23.3% | 543.3 |
| T2 | 1119 | 1365 | 22.0% | 1137.5 |
| T3 | 2196 | 2646 | 20.5% | 2205 |
| T4 | 4906 | 5959 | 21.5% | 4965.8 |
| T5 | unknown | unknown | not estimable | not estimable |

Test 1.2x throughput (seconds /1.2, not -20% seconds); XP and materials per batch unchanged. It nearly offsets additional known preparation time, but also increases XP/hour, which needs separate skill-pacing review. Do not implement an XP/time change in live crafting. Training routes and independent profession access must remain useful. The T4 Ravager example has 12,624 →15,403 known processing seconds, then 12,835.8 at 1.2x speed. Raw Sunstone Ore 246→300; Dunewood 274→335; Dust 95→116; hide 48→60. V9 finished craft time stays 891s. Binders and combat sources are unexpanded. No T5 refining rates invented.

## Pass 2 — profitability and risk

Model economic cost as direct Gold + full input opportunity value, including self-gathered materials. Explicit hypothetical per-tier refined unit Gold 8/20/55/110/220, advanced 2x, binder 3x, common combat .75x, scarce combat 12x and raw finds 1x; stress prices .5x/1x/2x. These are scenario weights, NOT prices, drop probabilities or live measurements. Include 0/5/10% fee, 0/25/50% material-value salvage recovery. The latter is only a value sensitivity, never an actual salvage yield/recipe or Gold payout. One terminal outcome: successful sale net of fee OR unsold recovery; no sale + salvage. Use candidate V4 rarity distribution, not approved launch odds. Price asks as .65/1/1.8/4/10/30 times full cost, sell-through .35/.55/.75/.85/.9/.95 in rarity order Common→Mythic. No quality premium, listing expiry time or fee persistence modeled.

At baseline 5% fee, zero salvage, illustrative expected revenue is 41.4675% of full cost (−58.5325% margin on cost); all price asks would need 2.4115x uplift to break even holding these unverified sell-through assumptions constant. This is a warning against assuming high rarity subsidizes mass common output, NOT a forecast or a recommendation to set those market prices. Add price/volume observations, value of own-use gear, quality and affix distributions, actual salvage material tables and resale liquidity before selecting fees or price bounds. Do not increase rare rates to force profitability. Retain Gold sink and prevent salvage loops.

| Tier | Median full input cost before | V9 after |
|---|---:|---:|
| T1 | 578 | 533 |
| T2 | 2050 | 1925 |
| T3 | 8183.75 | 7566.25 |
| T4 | 19020 | 17750 |
| T5 | 30025 | 28885 |

928 routes ×27 market sensitivity combinations =25,056 candidate cases, computed in summary. Includes both routes as alternatives, NOT both consumed for one item.

## Pass 3 — combined weapon acquisition

Re-use 60 source matched same-role V8 comparisons, with V9 discount on all sides. In baseline hypothetical input values, combined weapon is 47.49–67.27% of pair full acquisition value. Do not raise direct combined Gold back to V8 targets. Calculate a component-only value gap and preparation-seconds gap per comparison; no invented material recipe, no copied cross-class source or double-consumed receipt. Example T4 Ravager foundation vs Hexweaver weapon+focus: 27,045 vs 46,732.5 hypothetical Gold-equivalent, gap 19,687.5. This is a cost-parity target, not a literal added Gold fee or ingredient quantity. Recommend independent retained primary and secondary material lane receipts, then one permanent combined weapon assembly. At proposed Mythic p=.001, two independent retained successes average 2000 total lane attempts; forced simultaneous joint success averages 1,000,000 attempts. No lane RNG, assembly costs, item mint or reroll authorized. Exact same-tier component quantities, source scarcity and XP/queue parity remain to author, with role/weapon identity protected.

## Pass 4 — player profile simulation

All routes evaluated for casual (1 active-equivalent h/day, buys 75% of refined/combat), profession specialist (4h/day, buys 50% processed supplies for cross-profession access and 100% combat) and combat-focused (4h/day, buys all processed, hunts combat supplies) at .5x/1x/2x illustrative input price scenarios: 8,352 candidate profile cases. Binders and unmodeled raw finds purchased in all profiles; specialist never requires combat or secondary profession levels. Own input throughput assumes 30 processed units/h inclusive of prep, 20 common and 2 scarce combat units/h; no live probability evidence. Profile-specific synthetic Gold income rates are in the module. Sequential effort = own-supply effort + Gold funding + Forge occupancy; no double-counted known prep, no assumed offline parallelism or guaranteed delivery. Gold and combat income may overlap in reality. Purchase requires future authorized supply; price stress is not liquidity proof.

| Tier | Casual before→after | Specialist before→after | Combat before→after |
|---|---:|---:|---:|
| T1 | 1.61→1.52 | .32→.31 | .24→.23 |
| T2 | 2.29→2.20 | .45→.45 | .33→.32 |
| T3 | 3.12→2.95 | .62→.60 | .47→.44 |
| T4 | 3.54→3.39 | .70→.72 | .63→.61 |
| T5 | 3.00→2.94 | .57→.58 | .65→.65 |

Median active-day equivalents, conditional on synthetic prices/incomes/throughput and available trade; not hours-to-gear promises or player behavior. Specialist slightly slower at T4/T5 in this scenario; prioritize throughput and commission access. T5 casual effort below T4 is a model/content gap requiring real refining and source supply, not proof that T5 should be easier. Compare actual eligible kill rates and gathering throughput; quantify drop-tail and supply before changing any rates.

## Evidence and next gates

- Independent connector-side calculation reproduced the 928 route preparation and cost medians, 60 hand comparisons and profile medians above from exact hidden source files. New Node test suite and CI import fence added; exact-head GitHub Actions confirmation pending. No claim of running the Node tests through the connector.
- All review outputs deny craft, mint, trade, equip and release. No production or staging database, live recipe, public routes, feature flag or main merge.
- Close T5 processing authoring and authoritative raw/rare source IDs; reconcile #1693; then collect real source rates, skill XP/hour and supply without assuming a market exists. Design independent retained lane bills and review fees/salvage only after proper item identity and Market custody authority. Keep source policy, runtime activation and coordinated launch distinct.
