# Veldryn 2.0 — T1–T4 scarcity, processing and repeat-crafting stress review

**21 November 2026 · REVIEW ONLY · NOT a live balance change**

This continues T1_T4_ECONOMY_REBALANCE_V1.md and draft PR #1527. The 169 ordinary equipment items / 338 two-route recipes and their original Gold, XP, level gates and Forge durations remain unchanged. No new crafting source is earnable, no UI or theme has been approved, and no live SQL, feature-flag or main branch changes are included.

## Reproduce the offline analysis

- Run **node tools/evaluate-eq2-drop-risk-v2.mjs** for each tier's representative tank chest and illustrative 10-slot tank loadout, for 1/3/5/10 crafting attempts.
- Run **node --test tools/tests/eq2-drop-risk-v2.test.mjs** for deterministic mathematical and nested-refinement regression checks.
- Each scenario draws 4,096 seeded samples of exact geometric waiting times for each common/scarce material. Nearest-rank P50/P90/P95 are in **eligible normal kills**, converted to 150/300/900 eligible kills per hour. Independent common/scarce streams on shared eligible enemy kills require the maximum waiting time; separate enemy pools require the sum.
- This is **not gameplay telemetry**. Elite spawn rate, effective eligible kill rate, exact enemy/source overlap, travel and actual market supply are not known. The two models are hypothetical drop-pool scenarios, not guaranteed bounds on real travel or item access.

## Preliminary risk findings

The following are directional results from an earlier 2,048-trial exploratory sample, so the reproducible 4,096-trial script may differ slightly. Hours here are **only normal-enemy combat drops, disjoint eligible pools, 300 eligible kills/hour**.

| Tier | Ten-slot common + scarce | P50 first loadout | P90 first loadout | P90, five full craft attempts |
| --- | --- | ---: | ---: | ---: |
| T1 Fieldborn | 45 + 0 | ~1.07 h | ~1.27 h | ~5.77 h |
| T2 Ironwood | 61 + 3 | ~2.68 h | ~3.31 h | ~14.87 h |
| T3 Sunscar | 87 + 5 | ~6.74 h | ~8.56 h | ~38.38 h |
| T4 Glassbound | 116 + 13 | ~24.48 h | ~31.51 h | ~139.69 h |

For T4, the same exploratory model gives a first-loadout P90 of ~23.68 hours with shared eligibility versus ~31.51 hours with disjoint pools at 300 eligible kills/h. At 900 eligible kills/h, disjoint-pool P90 is ~10.50 hours. Ten full T4 crafting attempts approach ~269 hours P90 at 300 eligible kills/h if the pools are disjoint.

**Interpretation:** The proposed 0.25% T4 scarce normal-kill chance and mandatory scarce ingredients for every T4 item are serious repeat-crafting sinks, potentially supporting the Player Market but also making self-crafting or perfect rolls discouraging. Hold all drop values provisional until low/median/high-CP player throughput and elite/source overlap are measured.

## Hidden recipe chain bills

Amounts below recursively expand the **review-only foundation route** for one illustrative ten-slot tank loadout. They are not proof that the gathering nodes, enemy drops or item IDs exist in live 1.0.x.

| Raw materials for ten items | T1 | T2 | T3 | T4 |
| --- | ---: | ---: | ---: | ---: |
| Tier ore (Copper / Iron / Sunstone / Sunstone) | 357 | 552 | 480 | **1,830** |
| Tier wood (Greenwood / Ironwood / Dunewood / Dunewood) | 162 | 201 | 292 | **445** |
| Tier hides/scales (Boar / Wolf / Sunscale / Sunscale) | 117 | 159 | 402 | **408** |
| Common combat drops | 45 | 61 | 87 | 116 |
| Scarce combat drops | 0 | 3 | 5 | **13** |
| Glassbound Dust | — | — | — | **506** |

A **single T4 chest** already demands 288 Sunstone Ore and 74 Glassbound Dust after expanding 48 Alloy Bars. The T4 ten-slot example involves **305 Alloy Bars and 610 Sunstone Ingots**, plus 506 Glassbound Dust. Proposed gem, fibre, binder and other raw input needs are also present in the generator output, but require an authoritative acquisition-source audit.

## Processing experience needs a progression pass

The 16 review-only processing methods award Smithing XP for smelting, Tailoring XP for tanning/weaving, Woodcutting XP for planks. Assuming the illustrative ten pieces are made entirely from newly processed materials:

| Tier | Processing Smithing XP | Equipment Smithing XP | Smithing XP share from processing |
| --- | ---: | ---: | ---: |
| T1 | 952 | 1,511 | ~39% |
| T2 | 3,312 | 4,002 | ~45% |
| T3 | 5,120 | 4,410 | ~54% |
| T4 | **36,295** | **10,016** | **~78%** |

The target was approximately 55–65% processing contribution across a normal player's skill journey, **not** a per-recipe cap. T4's jump comes from making T3 Sunstone Ingots again inside T4 Alloy Bars. T3 Tailoring has another asymmetry: 6,039 processing XP versus 2,022 Tailoring equipment XP for this sample.

For the T4 ten-slot bill, the proposed processes total **51,272 nominal processing seconds (~14.2 h)** and the original equipment Forge jobs another **5,973 seconds (~1.7 h)**. Neither is actual wall-clock completion time until concurrent queues, stored material stocks and tool speed effects are evaluated.

**Recommendation:** avoid modifying live XP or resource costs based on these isolated examples. First define independent processing queue capacity, how owned ingots are accounted for, server-authoritative one-time XP/material receipts, and actual level/XP-hour trajectories. An arithmetic target should not force a rigid processing XP cap.

## Work still blocking implementation

1. **Sources and eligibility:** pin each new material definition, region, gathering node, eligible monster/elite families, zone/level gates and anti-abuse restrictions. Existing-looking IDs are not proof of available loot.
2. **Drop and reroll economics:** compare real eligible kill throughput and enemy source overlap with P50/P90/P95 at 1/3/5/10 craft attempts, the tradeable supply, desired rarity/quality rolls and scarce blueprint exclusions.
3. **Raw-resource throughput:** investigate T4's 1,830 Ore and 506 Glassbound Dust bottleneck at expected gathering/hour. Avoid an accidental second T3 skill-leveling bypass during T4 refining.
4. **Profession pacing:** check cumulative Smithing/Tailoring/Woodcutting curves and expected processing XP/hour rather than one ten-slot example.
5. **Market and Gold sinks:** simulate input price volatility, Gold/Forge costs, escrow, limited salvage returns without scarce-material refunds and earned-only event/dungeon/boss gear.
6. **Coordinated 2.0 gate:** integrate only behind OFF flags after design sign-off; cover exact-copy equipment custody, Gem 2.0, Classes/Skills/Combat 2.0, Enemies/Bosses 2.0, authenticated atomic commit, CI, staging CAS/rollback, localization and Android UX.

## Safety

**This work adds only read-only analysis, pure tests and documentation.** It changes no equipment manifest, live crafting queue, combat drops, server commands, database, release flag, art/theme or player state; it does not merge or deploy. Any future UI design needs explicit visual approval before build implementation, and the 2.0 system must launch as a coordinated release.
