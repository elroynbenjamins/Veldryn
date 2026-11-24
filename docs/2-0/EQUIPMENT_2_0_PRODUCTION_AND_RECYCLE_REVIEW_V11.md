# Equipment 2.0 V11 — production, hand assembly, recycling and Market supply

**Hidden review only — 24 November 2026.** Owner requested the five follow-on economy passes and permits new materials where needed. C12 and D1–D10 remain closed; C14's finished gear fee and scarcity baseline remain protected. New numerical proposals here are not release or economy approval.

## 1. T5 resource identity and source candidates

Pinned existing source blobs in eq2-t5-material-production-review-v11.json. Reuse FROSTIRON, WHITEPINE_LOG, RIMEGLASS, RIME_RESIN and WINTERMINT. The first four have inspected candidate source records in the current hidden branch's existing game content; Wintermint is a verified existing item but its gathering route needs inspection/authoring. No backend/Enemy V2 receipt verification implied. Do not duplicate current ore or log IDs.

Two proposed NEW raw stacks only: Frostflax Fibre (Herbalism 46 Frostmarch patch, base 65s, 1–2 yield, 180 XP; not an actual node), Frostwolf Pelt (candidate effective 18% on FROSTWOLF). Six already named T5 combat material candidates now have specific inspected enemy identities, not new duplicates. Rimebone Shard 16–18%; Icevein Sigil .8–1.2%; role-specific signatures .5–.8%. These are final-effective target probabilities, not legacy authored chance values; normalize exactly once and confirm actual eligible kill rates. Never change current loot tables or assume currently authored combat levels equal Enemies V2 gates. First regular T5 scarce source candidate ICEBOUND_RAIDER is near region entry; signature drops have later source candidates. No dungeon-only equipment, existing blueprint, signature or rare boss recipe is converted into a processing output.

Skill-only gathering access to the region, trading and commissions remain launch prerequisites. Existing resource node gates at 46 and some T5 crafting gates at 42 need supply bridges: a crafter at 42 can purchase components; self-produced Froststeel requires Smithing 46. Do not force combat or secondary profession skill leveling. Actual gathering, material registration, stack custody, art/localization, grant receipts and trade eligibility are unresolved.

## 2. Eight processing outputs and profession pacing

Eight draft T5 outputs, plus the single existing FROSTIRON_INGOT reference (3 from 6 ore and 4 logs, 420s/980 XP/720 nominal Gold on inspected snapshot). PR #1693 is open and proposes 11 Frostiron +7 logs, 1010 XP and 730 charged Gold; source refresh/reconciliation is mandatory before authorizing any costs. Same conflict applies to the V10 Sunstone reference. Candidate new Gold amounts are nominal and not an approved global surcharge or live fee. No second recipe for existing ingots.

The full bill is recursively expanded in dependency order for 182 T5 recipe routes, aggregating nested input needs before rounding batches. Example Oathplate Helm foundation: 27 Froststeel, 4 Frostwood Planks, 12 hardened leather, 8 Rimebone Shards, 2 Icevein Sigils, 4 binders after V9. Full candidate preparation: 54 Frostiron, 59 Whitepine Logs, 12 pelts, 8 Rime Resin, 6 Wintermint, 8 Shards and 2 Sigils. 5,540 seconds of modeled processing and 8,980 nominal processing Gold before the final Forge fee. Source availability and existing processing surcharge are unverified. Batch leftovers are preserved, never discarded as a hidden material loss.

| Tier | Previous known median processing s | V9 candidate s | Candidate 1.2x speed s |
|---|---:|---:|---:|
| 1 | 529 | 652 | 543.3 |
| 2 | 1119 | 1365 | 1137.5 |
| 3 | 2196 | 2646 | 2205 |
| 4 | 4906 | 5959 | 4965.8 |
| 5 | 3420 | 4325 | 3604.2 |

T5 now has a proposed production bill, not a verified source. T5 modeled processing fee median 5,360→6,520 nominal Gold; direct V9 Gold reduction does not establish total cash savings. V10 hypothetical unit prices and market profile medians must not be represented as updated V11 production-cost evidence; reconcile fees, raw opportunity values and scarcity with observed supply first. Test 1.2x speed with unchanged XP per batch: +20% XP/hour. If training pacing becomes too fast, review dedicated skill curve and processing XP separately rather than silently reducing earned XP. No speed or XP change activated.

## 3. Combined weapon assembly

50 exact tier/class/route candidate bills derived from 60 V10 same-role comparison pairs. Target mean comparison pair opportunity cost at V10 hypothetical input values. Preserve V9 direct Gold once at final assembly, exact existing Forge duration and XP, combat and binder quantities; scale only already-authored manufactured inputs. Ceil quantity per line. Split full input bill across two account-bound material lane receipts, no item or material counted twice; extra lane processing-time budget models pair gap without changing final Forge duration. Lane XP is unset to avoid double rewards. No re-rolling or disassembly; independent grade/quality outcomes and secure receipt mint/consumption must be finalized with provenance, custody, legal slot count, storage, Market and combat. Price-weight equivalence is not real acquisition parity, and combat scarcity parity across class pairs still needs validation. No new lane component item ID or second physical weapon is registered. Candidate costs must be revised for real raw values and T5 recipes.

## 4. Recycling proposal

Test 10%, 20%, 25% whole-unit recovery, recommended baseline 20%, calculated on original paid refined base components (not raw recursive inputs), floor per line. Never return Gold, rare signatures, common combat drops, binders, advanced rare components, blueprints or lane receipts. No extra rarity or quality return multiplier. A final owned exact-copy item is destroyed atomically once and immutable consumed-bill provenance must be checked by the server. Old, synthetic, unverified, boss-only and preview items do not gain any salvage authority through this model. Actual salvage for boss-only items and combined-weapon receipts requires an explicit source policy; neither is implicitly registered. 928 baseline candidate routes ×3 rates tested by the new suite; no real payout. Market buy→salvage loops and price floors require further test under actual sale prices.

## 5. Player Market supply design

96 unique T5 craft identities, one foundation or inherited route each (no double counting alternate paths). Equal-weight hypothetical basket scaled to 100 finished items, not market demand forecast. Target stock 2 baskets; replenishment 1.25 baskets per 100 craft demand. Supply tests stress 150/300/900 eligible kills/hour and independent geometric time to 90% chance of at least one drop. For scarce .5% at 300/h that is approximately 1.53h; higher speeds are stress cases, not verified behavior. Do not sum independent kill hours as if all drops use distinct kills, nor assume all players can access an enemy.

| Material | Rounded units per 100 T5 crafts |
|---|---:|
| Whitepine Logs | 4930 |
| Frostiron | 3900 |
| Frostflax Fibre | 2094 |
| Frostwolf Pelt | 1156 |
| Rime Resin | 833 |
| Rimebone Shard | 818 |
| Wintermint | 559 |
| Rimeglass | 316 |
| Icevein Sigil | 179 |
| Dawnspire Core | 14 |
| Fortress Core | 15 |
| Shardheart | 8 |
| Tempered Heart | 8 |

Supply is unverified; separate conditional targets from market price controls. Highest sensitivity: ordinary leather pelt demand, wood, ore, and Icevein Sigil supply; at 300 kills/h and best 1.2% effective candidate chance, 179 Sigils require about 50 dedicated eligible kill-hours across the community. Preserve rare signature demand and profession access; observe listing depth, fulfilled commissions, trade volume, median days to sale, inventory accumulation and actual drop normalization before setting prices/fees. Do not force drop rates to these targets. The 79 dungeon-exclusive pieces and six unresolved blueprint craft recipes remain outside this basket. Combined weapon additional component bills are separate scenarios, not consumed twice in the baseline.

## Evidence and release

Independent connector-side calculation confirmed 182 T5 routes, 96 distinct crafted items, 13 raw demand categories, whole-batch example and T5 median processing work/nominal fees. New Node tests cover production, all 50 hand bills, 2,784 recycling cases, 45 source stress cases and market basket. Exact-head CI pending; no claim of executed Node suite or live supply. New files are under docs/tools only, with explicit no-public-import fence. No production/staging database writes, no registration, no active drops, no live XP/Gold or item changes, no main merge. All 2.0 equipment remains hidden.
