# Equipment + Crafting 2.0 — T1–T4 unified recipe reconciliation (22 Nov 2026)

**HIDDEN REVIEW ONLY / NONISSUABLE / NO MAIN MERGE / NO GAMEPLAY ACTIVATION.** This is a concrete material-and-cost *draft for review*, not a claim that 204 set items or their materials already exist, nor that drop rates are deployed. The user's existing actual UI/theme approval gate remains intact.

## Source-grounded deliverable

The machine-readable `t1-t4-48-set-unified-recipe-review-v2.json` now lists **746 explicit, source-referenced, two-route recipe reviews** covering **373 distinct draft IDs**:
- **169 existing pinned Forge items / 338 existing 2.0 economy recipe proposals** retained with their existing hidden draft Gold, XP, time, profession and old-tier provenance.
- **204 proposed expanded set members / 408 new material-route proposals**, exactly 51 pieces and 102 recipe routes each for T1, T2, T3 and T4.
- **48 structural sets** (12 families × 4 tiers); their 204 proposed member IDs are different from the original 169 pinned items. The source match audit finds **74 unapproved candidate linkages** and **130 unmatched unique identities** (T1 33, T2 30, T3 31, T4 36). The 74 must not be silently converted or double-issued.
- **16 processing method reviews**, including the explicitly blocked duplicate SUNSTONE_INGOT route. All methods and finished-item recipes are review-only, noncraftable, nonissuable and have no runtime imports.

The existing 338 cost proposals were authored in economy review #1527; this branch keeps their material recipes and revises only the **design-level crafting combat gate to zero**. Their original combat-level value remains recorded as a *candidate equipment wear gate*, not a production change. It is NOT legitimate to report that original costs or the new launch item sources have already shipped.

## Material and market model

1. **Independent professions.** A character with Smithing/Tailoring progression can craft up to the relevant tier without levelling combat or any other profession, provided ingredients have been acquired. Woodcutting, Mining, Alchemy and other professions supply tradeable inputs; their levels are not hidden dependencies. Missing combat drops can be bought through a future Player Market or filled by player commissions. Equipping combat gear may still require a combat-level/eligibility check. T1–T4 reviewed profession gates are 1 / 8 / 20 / 34, **not final 2.0 level-curve certification**.
2. **Repeatable training loops.** Ore→bars, wood→planks, hides→leather and fibres→cloth generate primary profession XP without requiring repeat rare gear crafts. Source `xpSkill` remains Smithing for smelting, Woodcutting for plank processing, Tailoring for tanning/weaving; this is a proposed routing contract, not a new compulsory standalone Smelting skill. Earlier 55–65% processing-XP journey target is a tuning ambition, not an enforced cap.
3. **Hard final gear.** Each route retains ordinary combat materials; T2 chests/legs (plus applicable weapons), T3 heavy/core slots and every T4 piece also consume scarce combat materials. Existing four canonical Alchemy binder identities are reused, never shadowed by new IDs. Standard old-catalog items keep previously proposed material quantities.
4. **Expanded-set cost premium** over the corresponding tier/role/slot existing Forge cost benchmark: refined resources +8% / +12% / +15% / +18% by tier; ordinary combat material quantities use the same tier multipliers. Missing-template Gold/XP/time use a source-derived tier/role/slot comparator (or nearest same-tier fallback), then +8% XP, +10% working time and Gold × tier multiplier rounded to the nearest 100. These are *draft balance assumptions* subject to economy/player telemetry and final approval; they are not automatically sanctioned gameplay coefficients.
5. **Two routes, no rarity bypass.** Foundation and alternate adjust primary vs secondary refined-material needs (alternate primary ×0.80, secondary ×1.35). Both consume exactly the same ordinary combat drops, scarce drops when applicable, Gold, XP, queue seconds and binder quantities. Rare blueprints, source-exclusive Dungeon / Party / World Boss items and special signatures are NOT authorized by these ordinary recipes.
6. **No cross-skill hard gate.** A Smithing recipe may require leather/cloth but never demands a player's Tailoring skill; buying those ingredients suffices. Conversely, a Tailoring recipe may need bars. Ingredient market/escrow and commission authorization must be implemented before asserting that all professions can truly progress solo.

## Expanded 204-item draft material bill

Counts are sums of the **51 foundation recipes per tier**, assuming every one is crafted once; not a realistic player loadout, inventory demand, or live drop forecast.

| Tier | New set pieces | Ordinary combat ingredients | Scarce combat ingredients | Foundation Gold range | Smithing / Tailoring |
| --- | ---: | ---: | ---: | ---: | ---: |
| T1 | 51 | 247 | 0 | 200–400 | 24 / 27 |
| T2 | 51 | 324 | 12 | 800–1,700 | 25 / 26 |
| T3 | 51 | 479 | 20 | 3,200–6,900 | 23 / 28 |
| T4 | 51 | 658 | 63 | 6,500–14,200 | 25 / 26 |

**These costs may still be too easy or too demanding.** Old review probability anchors (14%/10%/7%/5% common and 4%/1.5%/0.6%/0.25% scarce per eligible normal enemy before source normalization) are *not verified production probabilities*. In particular, legacy monster multipliers can materially reduce T4's effective 0.25% rate. Benchmark against actual kills/hour, source eligibilities, queue throughput and sales before accepting economy values.

## Hard identity / acquisition blockers to resolve before release

| Priority | Problem | Required source-safe resolution |
| --- | --- | --- |
| P0 | 130 planned set items have no eligible template; 74 source pairings are unapproved | Author exact item templates, stat profiles, class/role/slot, owner-approved set membership and distinct minted identities; never silently recycle protected old sets |
| P0 | T3 SUNSTONE_INGOT has an existing 6 ore + 4 wood → 3 ingot / 520 XP / 180s recipe; 2.0 review proposed 3 ore → 1 ingot / 32 XP / 38s | Preserve the single existing canonical ingot output route until explicit versioned migration/progression choice; no duplicate output authority |
| P0 | `SUNSCALE` is a botanical gatherable, not an animal hide | Give the T3/T4 leather chain a genuine owned hide/material source, then update both the 169 legacy preview proposals and new 204 member proposals coherently |
| P0 | T1 `EQ2_BOAR_TUSK`, T2 `WOLF_FANG` vs `IRONWOOD_FANG`, missing T3/T4 common/scarce IDs | Approve precise material IDs, item catalog registration, eligible enemy drop contracts, normalized probabilities and logged actual payouts; don't alias similar IDs |
| P0 | Glassbound Dust needed throughout T4 processing but has no proven source | Implement and meter a canonical source before any T4 craft is authorized |
| P1 | Level 2 T1 common boar candidate unlocks level 3; level 26 T3 rare source candidate appears at level 38; T4 level 40 vs Sentinel level 41 | Provide early eligible sources or ensure genuinely accessible trade/commission supply; do not imply source accessibility |
| P1 | Rare materials, trade rules, per-character wallet and recipe grants not end-to-end verified | Trusted server inventory/bank/market order receipts, idempotent crafting, concurrent reservations, safe rollback, anti-duplication and staging PostgreSQL/Edge integration |
| P1 | Item art and actual UI/themes pending review | Present actual themed screens to owner before client/UI implementation; validate all sizes and source accuracy |

## Release gate

Run the non-runtime `node tools/test-eq2-48-set-crafting-review-v2.mjs` audit and exact-head expanded-set workflow, then author/approve missing item and material source records; resolve T3 ingot and hide conflicts; physically implement review-approved recipes server-side with rollback and source proofs; balance nine classes/18 specializations against bosses, dungeons and world/party events; validate Android/edge/staging and get the required UI/theme acceptance. Do **not** merge this review draft into `main`, publish recipe tables, add drops, change production data, enable flags or claim equipment launch readiness.
