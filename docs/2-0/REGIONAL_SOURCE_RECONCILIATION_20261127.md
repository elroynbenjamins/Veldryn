# Regional source and preparation reconciliation — 27 November 2026

Hidden review only. Parent #1928 contains mechanics-vs-stats four-arm simulations; exact-head integration was still running when this pass started. Do not select difficulty coefficients until traces are available.

## Real authored source mapping
Source-declaration audit reads the pinned original Forge recipes, current monster declarations and 25-level overrides, gathering and herb nodes, rare botanical source table, and component/Alchemy recipes. Distinguishes authoring from server grant proof, legacy Asterfall unlocks from rebased Sunscar/Frostmarch levels, raw drop chance from adjusted live drop chance, and gathering skill level from combat travel gates. All 22 direct ingredients across 338 pinned recipes have authored source or processing candidates. Recursive audit checks an acyclic declared nonboss route. THORN_SAP has Venom Weaver/Thornling etc.; ASTRAL_SCRIPT has Dune Oracle (current authored unlock 32) and later Sunscar sources; Glassbound Binder has existing Alchemy routes. AMBERGLASS is a monster drop candidate, not an invented smelting recipe. SUNSCALE has herb and monster sources. MOSS_FIBER is monster-sourced in parsed declarations. T4 currently uses earlier Sunscar ingredients; preserve source IDs and assess new Frostmarch components separately, no automatic substitutions.
T1 mandatory Verdant Binding Resin uses rare Asterfall Botanical Essence; base Greenfields chance .02, illustrative expectation 50 actions per single essence assuming one per success, before bonuses/trade. Not an observed player time or finalized rate. Candidate next: retain accessible baseline equipment by offering a verified common-component alternative or balancing rare essence demand; preserve rare material value in premium equipment. T1 level 2 wear timing and herb travel access require review. No supply changes.

## Monster authoring
46 ordinary monster declarations in released-region source, mapped to existing authored family and candidate skill archetype. Identity preserved; not a new species or live skill list. Use family-specific mechanics rather than applying a regional poison or frost skill to every monster. Counter routes: interruptible burst vs interrupt or mitigation; periodic damage vs cleanse or sustain; barriers vs sustained damage or pressure. Existing class counter bonuses remain separate, not stacked automatically. Need engine tests for genuine counter loadouts and idle viability once parent CI completes. No claim that all classes have passed.

## Regional completion gate identities
Asterfall: FALLEN_KNIGHT (Fallen Knight; source level 25 legacy/rebased unlock needs verification), target 25.
Sunscar: BOSS_002 (The Sand Tyrant; source 45), target 50.
Frostmarch: BOSS_003 (Frost Wyrm; source 70), target 75.
The latter two are exact authored server regional bosses, not the dungeon BOSS_EXP pool. Current world chapter identity for region IV is Ashlands; stay disabled, T5 throughout 76–100 candidate. Completion gate must be server-owned, existing victories considered in migration, no auto grants or new travel rules in this pass.

## T5 readiness
Existing larger hidden review catalogue includes 125 T5 entries: 86 with two draft crafting routes, 10 with one, 29 boss-only. These are not canonical Forge items; all mint/equip/drop/trade flags false. Existing T5 material production review has nine processing definitions, raw sources include Frostiron, Whitepine, Rimeglass, Rime Resin and Wintermint. Actual Wintermint node declared in herb catalogue; grant/access still unverified. Keep T5 prep in Frostmarch before the eventual level 76 wear gate; no activation in 2.0. No T6–T9 work.

## Validation and limits
Independent source script and dedicated workflow, exact-head CI pending. No production grant verification, travel/skill gate proof, actual source rates, finalized difficulty, migration, new item issuance, or main merge. Source parsing is intentionally pinned to current declaration formats and explicit counts, not a runtime compiler. Existing red mobile/Edge/synchronization checks remain open.
