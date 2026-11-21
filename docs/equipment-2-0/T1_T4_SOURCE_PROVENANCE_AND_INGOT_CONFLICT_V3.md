# Veldryn 2.0 T1–T4 — source provenance, duplicate processing IDs and drop-rate gates

**21 November 2026 · SOURCE-CODE REVIEW ONLY · NO RUNTIME CHANGE**

Companion to T1_T4_ECONOMY_REBALANCE_V1.md, T1_T4_SCARCITY_AND_PROCESSING_STRESS_V2.md and draft #1549. Based on direct inspection of the hidden EQ2 generated 169 items / 338 methods, plus the same branch's mobile item, gathering, monster, Alchemy and Smithing definitions. **Inspected mobile code is not production-state verification**; authenticated backend payout paths, SQL source tables and deployed Edge bundles are NOT audited here.

Reproduce the read-only files:
- Run **node tools/audit-eq2-material-sources-v1.mjs** for tier material coverage, exact IDs, gather/monster source matches, existing Alchemy and Smelting sources, and the normal-monster drop factor.
- Run **node tools/compare-eq2-refining-sources-v1.mjs** for a one-attempt, ten-slot T4 tank material/XP sensitivity comparison with binder inputs expanded.
- Run **node --test tools/tests/eq2-source-introspection-v1.test.mjs** to protect explicit source identity and no silent aliasing.

## 1. Source audit: precise findings

The audit inspected 49 tier/material references (not 49 unique IDs), found 17 registrations in directly included static item catalogs, 7 references with existing gathering nodes, 11 references with current monster drops, 2 references with existing Smithing outputs, **four Alchemy binder outputs** and 16 review-only EQ2 processing outputs. Those are counts of *references* within the per-tier matrix; a single material can count in multiple categories.

The four original binder IDs are registered and have real authored Alchemy recipes already:
- T1 **VERDANT_BINDING_RESIN**: standard brew plus five-binder bulk route.
- T2 **IRONWOOD_BINDING_RESIN**: standard brew needs Ironwood Logs, Thorn Sap and Ironwood Fang.
- T3 **SUNSCAR_DUNE_BINDER**: Sunscar source-only brew plus optional Oathglass Solvent upgrade.
- T4 **GLASSBOUND_BINDER**: standard brew requires Sunstone Ore ×4, Astral Script ×1 and Glassbound Core ×1, with separate Oathglass Solvent alternative.

**Do not introduce replacement binder IDs, duplicate their recipes or forget the Alchemy input bill.** The existing code-path's actual paid Gold and queue concurrency still require server reconciliation. The source audit does not rewrite Alchemy.

### IDs that cannot currently be assumed obtainable

The inspected mobile definitions have no registration/source declaration for these material input IDs or planned drop IDs: EQ2_BOAR_TUSK, EQ2_COPPER_ORE, EQ2_DUNE_FIBRE, EQ2_GLASSBOUND_DUST, EQ2_GLASSBOUND_PLATE, EQ2_GLASSBOUND_SHARD, EQ2_GLASSHEART_FRAGMENT, EQ2_IRON_ORE, EQ2_MIRAGEFANG_CORE, EQ2_RIVERSTONE, EQ2_SOUL_FIBRE, EQ2_SUNSCAR_SCALE, EQ2_THORNSTONE, EQ2_THORN_FIBRE, EQ2_TROLL_SINEW, EQ2_VERDANT_ESSENCE and WOLF_FANG.

These are expected *review-only placeholders*, not a claim that the current live app is broken or that players should be granted them. Before any real recipe is released, each needs its own registered material definition, owned source, exchange/legacy policy as applicable, region/profession gate, and server-authoritative grant test.

Also distinguish recipe-defined future processed outputs (Copper Bar, Wolf Leather, Glassbound Alloy Bar, etc.) from primary resource collection sources: a proposed processing output does not prove that its inputs are obtainable.

## 2. Material identity compatibility decisions

| Tier | Existing source evidence | Proposed identity / issue | Safe next design choice |
| --- | --- | --- | --- |
| T1 | Copper Ore is gathered in Greenfields/Old Mines; Boar Hide from Roadside Boar | New EQ2_COPPER_ORE duplicates the gathering role; EQ2_BOAR_TUSK has no enemy source | Decide whether the *input* reuses COPPER_ORE; assign Boar Tusk as an explicit eligible Roadside Boar drop if approved |
| T2 | ASTER_IRON_ORE node exists; WOLF_PELT, IRONWOOD_FANG and TROLL_HIDE already drop | EQ2_IRON_ORE, WOLF_FANG and EQ2_TROLL_SINEW currently lack registration/drop source | Either reuse approved existing Aster-Iron and Ironwood Fang IDs with intentional rates, or introduce separate sources/IDs; never silently alias |
| T3 | SUNSTONE_ORE mining, DUNEWOOD woodcutting, SUNSTONE_INGOT smelting, SUNSCALE bloom gathering all exist | Proposed SUNSTONE_INGOT refining differs; EQ2_SUNSCAR_SCALE and Miragefang Core have no assigned drop | Keep unique canonical ingot recipe; treat SUNSCALE as a **botanical item** and choose appropriate leather/hide source rather than silently presenting a herb as animal leather |
| T4 | GLASSBOUND_CORE and ASTRAL_SCRIPT appear in monster loot; standard Glassbound Binder has Alchemy route | EQ2_GLASSBOUND_DUST, EQ2_GLASSHEART_FRAGMENT, Plate, Soul Fibre and Shard have no proven source | Design earned and gathering sources with measured throughput; ensure the first eligible T4 rare source is not locked beyond the item's own level requirement |

**No free material conversion or backfilled drops** should be inferred from similar names. The six rare blueprint-only items and Dungeon/Party Event/World Boss exclusive equipment remain gated.

## 3. Existing versus proposed SUNSTONE_INGOT: hard incompatibility

Existing authored Smithing recipe **SMELT_SUNSTONE_INGOT**:
- Input Sunstone Ore ×6 + Dunewood ×4;
- Output Sunstone Ingot ×3;
- 520 Smithing XP; 180 seconds per batch (before tool/queue effects).

Review-only EQ2 proposed processing route for the **same output ID**:
- Input Sunstone Ore ×3;
- Output Sunstone Ingot ×1;
- 32 Smithing XP; 38 seconds per batch.

The two cannot both be server-authoritative under the same unversioned material ID without an explicit processing-route design decision and compatible accounting. Changing the existing output recipe for old players also changes their retained skill economy; it must not happen as a hidden implementation.

### Illustrative T4 ten-slot tank bill including standard Alchemy binders

| Fully processed from scratch | 2.0 proposed ingot route | Preserve existing ingot route |
| --- | ---: | ---: |
| Sunstone Ore | **1,870** | **1,264** |
| Dunewood | **445** | **1,261** |
| Glassbound Dust | **506** | **506** |
| Astral Script | 10 | 10 |
| Glassbound Core | 10 | 10 |
| Smithing XP from prerequisite processing | **36,295** | **122,855** |
| Alchemy XP from binders | 7,000 | 7,000 |
| Nominal combined processing seconds | 52,872 (~14.7 h) | 66,412 (~18.4 h) |

Both variants require the previously documented 116 ordinary + 13 scarce combat components, and the 10-slot illustration is not a ten-piece set. This excludes the Forge item's own job times, mining/woodcutting/action cycles, price and player existing stocks. Smithing equipment XP for these pieces remains 10,016, so reusing the existing ingot formula as-is would dramatically tilt processing-to-equipment skill progression.

Existing Sunscar Sunstone Outcrop has an authored base 48-second mining cycle with ×2 generic gathering cycle scaling and a 1–1 output. Gathering-tool, buffs, activity pace and power changes make the real cycle variable; 1,870 ore at *unmodified 96 seconds each* alone would be ~49.9 theoretical activity hours. Do not mistake that hypothetical value for observed median or actual elapsed time. This is the largest known reason to measure raw gathering income before finalizing hard gear costs.

**Recommendation:** retain current SUNSTONE_INGOT behavior for 1.0.x, and in 2.0 choose either (a) explicitly reuse existing ingot recipe and rebalance all downstream costs/XP, or (b) introduce a versioned distinct 2.0 output identity with migration/compatibility policy. **Neither choice is implemented in this pass.**

## 4. A hidden double-scaling risk for proposed combat drop odds

In the inspected mobile MONSTERS normal-loot normalization, a non-boss ordinary material uses **×0.5**, then a sub-100% authored drop chance gets **×0.95**. These factors are source-code facts, not proof of the production SQL/Edge behavior for future EQ2 drops.

| Tier | Intended common per eligible normal kill | If mistakenly placed in pre-scale authored table | Intended scarce | If mistakenly pre-scaled |
| --- | ---: | ---: | ---: | ---: |
| T1 | 14% | 6.65% | 4% | 1.9% |
| T2 | 10% | 4.75% | 1.5% | 0.7125% |
| T3 | 7% | 3.325% | 0.6% | 0.285% |
| T4 | 5% | 2.375% | 0.25% | 0.11875% |

This would make real drops only **47.5% of intended** for ordinary sub-100% entries. At low T4 rates, total farming demands could roughly double. The review-only source audit reports the theoretical pre-scale chance needed to reach each intended final chance, but **do not put these inverses into production without proving which normalization stage the authenticated server actually uses**. Define all EQ2 drop specs in one authoritative *post-normalization* policy and use contract tests to prevent duplicate scaling.

Elite chances from the design are separate from normal-kill rates. The existing MonsterDef source excerpt has no audited eligible elite schedule or 2.0 loot path; do not treat 20%/10%/6%/4% elite rates as per-any-kill bonuses.

## 5. Next controlled workstream — blocked until review

1. Approve exact material reuse vs new ID for T1 Copper, T2 Aster-Iron/Fang, T3 Sunscale-as-herb and Sunstone Ingot. Keep data mapping **explicit and versioned**.
2. Assign candidate enemy/elite/area sources for the eight proposed common/scarce drops, with tier entry gates and drop receipt authority. At least one first-tier-eligible source for each mandatory scarce ingredient.
3. Design the source of Glassbound Dust with a sustainable yield tied to gathering and/or a separate non-farmable sink. Test both extreme source overlap and tradeable-market supply, without guaranteeing rare drops.
4. Measure real P10/P50/P90 gathering/hour and eligible kills/hour for each tier. Re-run 1/3/5/10 crafting retries and full-market listing/escrow simulations including binder Gold and Scarcity XP.
5. After economy and **actual UI/theme appearance** approvals, implement separately behind OFF EQ2 server/client flags, with idempotent player-account receipts, physical custody, staging races and rollback. Do not alter current Dungeon/World Boss combat until Classes/Skills/Equipment/Enemies 2.0 are ready together.

**No merged runtime, drop table, player item catalog, Alchemy recipe, UI, deployment or database edit is part of this audit.**
