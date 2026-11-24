# Equipment 2.0 V12 — unified T1–T5 economy catalogue

**Hidden review only, 24 November 2026.** Owner directed consolidation. EQ2-C12 and D1–D10 remain closed. No recipe, item, enemy, material source, market or feature flag registered or enabled. The V12 policy plus deterministic materialCatalogue()/processingRegistry()/fullBill()/accessAudit() are the single review index for this tranche, not production authority. V9/V11 historical recipes remain unchanged.

## Exact coverage

75 distinct material identities in preferred reuse candidate (including one dormant optional identity), 29 processing references, of which 21 new proposed recipes and eight existing recipe references. 928 equipment recipe routes, 469 item identities. All current consumed raw/processed material IDs have an inspected or proposed source reference; **zero missing reference rows is not zero unresolved grants**. Every new source remains unregistered; all source receipts and rates remain unverified. Per-tier material use counts include recursively required ingredients and therefore overlap: T1 14, T2 13, T3 13, T4 16, T5 22.

## Eliminate redundant processing

Prefer existing COPPER_INGOT and ASTER_IRON_INGOT rather than new EQ2_COPPER_BAR and EQ2_IRON_BAR. This is an explicit future recipe reauthoring candidate, never an alias or conversion of live inventories. Both historical baseline and candidate remain separately evaluable. Preserve V9 direct finished fees, XP/time and combat ingredients. Illustrative 1:1 quantity benchmark does NOT approve final reauthored quantities: existing batch yields, wood and XP differ. Example first T1 Fieldborn helm: V9 16 Copper Bars imply 48 ore under old draft; reuse candidate needs 4 five-ingot batches, 40 ore, 8 logs, 4 spare ingots; pending #1693 scenario needs 60 ore, 20 logs, 4 spare ingots. Exact material cost and progression must be recalibrated, not silently mapped.

Keep single existing SUNSTONE_INGOT and FROSTIRON_INGOT references. Keep four existing Alchemy binder standard recipes, explicitly expand them to raw bills (including combat and botanical requirements). Existing alternative/bulk binder recipes are not deleted or new authorizations; the review selects only one standard reference per output to avoid double counting. New T5 Froststeel is an additional processing stage, not an alternative smelting recipe for Frostiron. Existing source fees nominal before global modifiers; unknown fees remain incomplete. PR #1693 remains a separate pending variant, preserved as a second calculation scenario for Copper, Aster-Iron, Sunstone and Frostiron without changing either branch or production.

## Profession progression and access

Candidate baseline skill floors 1/8/20/34/42 for T1–T5, matching minimum finished craft source gates. Exact recipe gates and existing gathering/smelting unlocks remain distinct. T3 Sunstone gathering/smelting 26 versus craft 20; T4 Glassbound core source candidate 38 versus binder 34; T5 Frostiron/Whitepine 46, Wintermint 48 versus craft/binder 42. These are procurement gaps, NOT a requirement to level another profession or combat. Preserve own-profession gates, separate combat wear gates and enable skill-only regional access plus verified trade/commission paths before activation. Review source levels in actual Enemies 2.0; legacy-authored or rebased enemy levels cannot grant access. Report later processing/gathering gates per exact route; never invent unknown gates. Explicitly decide whether to align a self-production unlock or preserve earlier trade-enabled crafting.

## Source rationalization

- Reuse inspected Moss Rat Moss Fiber, Venom Weaver Thorn Sap, and Wintermint Patch Herbalism 48. Correct prior ambiguous Moss Fiber origin (legacy monster source actually inspected). All legacy material drops remain untouched.
- T1 Boar Tusk vs first wear level 2: starter supply bridge or trade still needed. Optional Verdant Essence has no current recipe consumer: keep dormant, no drop activation.
- T2 Thorn Fibre and Thornstone: proposed profession-accessible source candidates at 8; Riverstone proposed fishing find at 1. No verified payout rate.
- T3 Dune Fibre patch (Herbalism 26); Sunscar Hide requires actual animal source. Propose Dune Hare near region entry 26; no chitin or flower converted to leather, no new enemy actually created.
- T4 Soul Fibre patch and Glassbound Dust/Shard mining seams at 34, independent of combat-region gate after approved skill-only access. Keep scarce combat materials separate.
- T5 V11 Frostflax, Frostwolf Pelt and six combat material sources retained; exact existing Wintermint source now known. No new raw identity beyond prior V11 and named existing T1–T4 drafts; Dune Hare is a source concept only.
- All new resource grants must remain disabled until an exact registered consumer, reachable source and trade/commission access are established. Do not grant useless materials early; material source unlocks are not gear equip levels. Existing players' items, materials and drops remain untouched.

## Validation

Independent connector-side source calculation checked 928 routes, 75 distinct material IDs, 29 outputs, all consumed IDs covered by source references, exact min craft gates and no missing T5 craft-level records. New Node suite checks 1:1 candidate reference isolation, #1693 snapshot/pending arithmetic, all raw bills, source evidence, and deny flags. Latest exact-head GitHub Actions pending. No runtime, database, inventory or player economy work done. Future priority: reconcile #1693 and choose exact refining quantities, then verify actual source grants, skill-only travel and production/economy pacing in the private branch before Combat/Market depend on these contracts.
