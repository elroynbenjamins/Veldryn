# Veldryn — World Bosses v3: Hollowroot Encounter, Balance & War Supplies

**Date:** 2026-11-10 · **Status:** DETAILED DESIGN / VALIDATION PROPOSALS ONLY · **Production state:** hidden; no game-mode, asset, migration or service activation.

This is **Pass 1** of the World Boss roadmap v2 design (`docs/roadmap/world-bosses-design-v2.md`). It adds the first implementable boss specification, synthetic participation/reward analysis, five relative account-power benchmarks, and actual T1–T4 donation recipes derived from Veldryn's checked-in content.

## A. Immutable confirmed design baseline

- World Boss event every **14 days**, with a **seven-day active** battle period.
- Up to **three world-boss attacks per account per event**; attacks can be used on any active day. No mandatory daily task.
- **Asynchronous combat**: initiating character + saved Echo loadouts of other players; no synchronous party lobby.
- **Shared server-wide War Supplies** where community preparation benefits later battles. This is not a compulsory personal quest chain.

Retained but **not independently user-approved** from earlier drafts: four combatants (Tank, Damage, Damage, Support), normal replay 60–90s, 70% / 30% global HP phase boundaries, World Impact benchmark scoring, 98-Sigil theoretical maximum, and two War Supply bundles per account. Their exact balance remains subject to review.

## B. Hollowroot encounter: server-implementable mechanics

**Identity:** a colossal forest guardian of split wood and living roots with an amber core. The boss is visually huge, but gameplay remains 2D fantasy pixel-art; one unique boss combatant, four cooperating actors below.

**Mode:** one **14-round server-simulated raid attempt**, with a real combat/replay event log. The global phase is chosen from server-wide HP **once, at attempt start**, and stays fixed until that attempt finishes. The `world-bosses-hollowroot-rounds-v3.csv` file is the 42-row authoring script (14 rounds × three phases). Ordinary attacks may be resolved in any round by the shared combat engine; the table schedules signature telegraphs/actions and **does not invent damage text**.

| Phase captured at start | Role story | Telegraph and action | Initial coefficient proposal |
| --- | --- | --- | --- |
| I — Armored, HP 100–70% | Tank reliably intercepts telegraphed cleaves; Damage breaks amber-heart guard | Bark Mantle, Root Slam, two-round heart exposure | Bark reduces incoming player damage by **12%** while protected; Slam **1.35×** benchmark boss attack to Tank and **0.45×** to each side target |
| II — Exposed, HP 70–30% | Support becomes especially valuable against true damage-over-time and crowd control | Entangling Vines, Sporeburst, Regrowth, Root Slam | Vines halve one visible non-Tank actor's **next action** unless cleansed; Spores **3.5% of target maximum HP** for **two real ticks** unless cleansed; Regrowth restores at most **8% of local guard** |
| III — Enraged, HP 30–0% | Coordinated mitigation, shields and exposure windows | Splinterstorm, heavier Root Slam, pulsing exposed heart | Slam **1.45×** Tank and **0.50×** sides; Storm **0.70×** benchmark boss strike per surviving member |

**Important integrity decision:** Regrowth must never *restore community World Boss HP*. It replenishes a separate, actual **local guard/barrier** belonging to the committed 14-round combat instance. Barrier breaks and the boss's credited event damage are calculated by the server. Do not conflate the local guard gauge with the global community HP bar.

**Amber heart:** after a scripted guard exposure, a real two-round weak-point window adds **+10% damage on that exposed target only**. Break Armor War Order is an additional, capped **+5% relevant barrier/weak-point effect**, never a generic +5% Attack to everything. This makes the tactic meaningful without requiring new, high-powered gear.

**Telegraph rule:** special attacks are signaled exactly one round in advance, with ground cracks, root arcs, bright amber core or spore puffs from runtime events. Boss should never execute a unique unavoidable spike without a previous visible cue. The same action/reaction sequence must render consistently at normal speed, 2× speed or Skip.

**Combat event/HP ledger:** each hit has real original damage, absorbed amount, effective healing and mitigation. The authoritative battle sums `combat_damage`, `local_guard_damage` and `global_hp_credit` separately. After atomic global deduction, the credited hit portions sum **exactly** to that attempt's committed delta. When the final global HP is depleted by a concurrent battle, clip the committed delta; do not pretend the rest of the player's combat damage decreased shared HP. Players still see their true combat output and receive a normal Residual Echo result.

**Victory semantics:** an attempt is successful if the squad completes its committed encounter objective (survives the 14-round engagement or a legitimate early server-defined resolution) and collects 10 Sigils. A squad wiped by actual mechanics receives 5; server failure *before* a durable outcome uses **zero attempts**, and reconnect recovers the same result. The server must make the exact success rule explicit before implementation.

### Hollowroot ability priorities for later engine testing
1. **Tank:** Root Slam's forecasted frontline damage and actual intercepted damage are credited; no rewards for nonexistent blocks.
2. **Damage:** Amber Heart exposure, verified local guard break and real boss damage are the primary counters; no credit for idle weak-point windows.
3. **Support:** only real HP restored, absorbed shields and successful root/poison cleanses count; **no overheal** or wasted shield value.
4. **Scaling:** use class/power-bracket **real engine benchmarks** before accepting coefficients; the 12% and ×1.35 numbers here are only starting hypotheses, not patched production combat.

## C. World Boss population and wallet model — synthetic v3 results

A seed-20261110 Monte Carlo model was run with stochastic participation, 1–3 account attempts, variability of effective squad damage, phase-specific success/loss factors, role-normalized Impact and optional supplies. It is **not Veldryn's real battle engine**, **not live account telemetry**, and **not a measured economy forecast**. Scenario rows and assumptions are archived in `world-bosses-simulation-v3.csv` and the standalone XLSX.

Calibration remains **70% expected participation × 2 attacks × 28,000 reference squad damage × 0.88**, fixed for standard populations. Global HP is rounded to the nearest 1,000 **once at event creation**; it is never adjusted secretly during the event.

| Eligible accounts | Actual participation / attacks | Proposed HP | Synthetic victory chance | Mean earned Sigils | Implication |
| --- | --- | ---: | ---: | ---: | --- |
| **40, small-group adjustment** | 70% / 2.0 | **1,286,000** | **81.3%** | **62.9** | New proposed **0.82** HP factor for communities with ≤75 eligible |
| **200 reference** | 70% / 2.0 | **6,899,000** | **81.7%** | **63.1** | Baseline 0.88 factor retained |
| **1,000 reference** | 70% / 2.0 | **34,496,000** | **97.4%** | **65.3** | Much lower outcome variance at scale |
| 200, low engagement | 40% / 1.2 | 6,899,000 | 0.0% | 25.9 | Genuine world defeat remains possible |
| 200, moderate | 60% / 1.8 | 6,899,000 | 0.2% | 47.2 | Carefully choose intended completion target |
| 200, high | 85% / 2.8 | 6,899,000 | 100% | 80.8 | Boss dies near day 3.9; **44.2%** of attacks may occur afterward |
| 40, stress with adjustment | 40% / 1.2 | 1,286,000 | 0.0% | 25.1 | Small-pop relief is not a guaranteed pity victory |

Under unchanged 0.88 factor, the **40-player reference** had only **64.1%** modeled victory. Lowering a *published, event-start-only* factor to 0.82 raised this scenario to 81.3%, while the stress scenario still failed. **Recommend the small-pop factor as a proposal**, contingent on actual observed server population and simulations using Veldryn's engine.

**Interpretation of milestone economy:** in the 200-player baseline model, approximately **95.8%** of active accounts reach Impact milestone I (0.8), **64.5%** milestone II (1.8), and **14.6%** milestone III (3.0). Milestone III generally requires all three attacks; this means the full 98-Sigil ceiling is rare rather than typical. A normal engaged account averages around **63 Sigils**, within the prior draft 40–80 target. World Sigils remain untradeable and are not sold.

**After boss defeat:** keep the existing **Residual Echo** concept, paying the same eligible personal battle/Impact rewards without further community HP damage. This is critical in high-engagement events that finish early. Supplies should continue to strengthen remaining **Residual Echo** attempts, rather than becoming unusable after a community victory.

### Relative power brackets and fairness

Treat reference squad damage as five **relative**, simulation-only power brackets: Emerging 0.55× (15% population), Developing 0.80× (25%), Established 1.0× (30%), Veteran 1.35× (20%), Elite 1.80× (10%). These must become server-calibrated quantiles later; they are **not literal Character Levels or gear tiers**.

A second illustrative sample of **18,000 synthetic accounts in each bracket** with a mean two attempts returned:

| Bracket | Illustrative battle loss rate | Impact II reach | Impact III reach | Mean personal Sigils, before global + supplies |
| --- | ---: | ---: | ---: | ---: |
| Emerging | 16.6% | 63.7% | 13.6% | 31.6 |
| Developing | 14.0% | 63.7% | 14.3% | 31.9 |
| Established | 11.4% | 65.5% | 14.4% | 32.4 |
| Veteran | 9.2% | 66.3% | 15.0% | 32.8 |
| Elite | 7.7% | 66.5% | 15.5% | 32.9 |

**Design target:** milestone reach for each Tank/Damage/Support identity and each power bracket should be within **five percentage points** after benchmarking. A low-power account can still earn participation rewards even while its squad deals less total shared boss damage. Strong characters visibly help kill the boss faster but do not simply monopolize Sigils.

## D. Real T1–T4 War Supply bundle proposals

I checked the current definitions in:

- `apps/mobile/src/content/skills.ts` — gathering node IDs, yields, timers, Smelting and Cooking transformations.
- `apps/mobile/src/content/herbalism.ts` — botanical nodes and actual gathering timers.
- `apps/mobile/src/content/items.ts` — registered materials and crafted food.
- `apps/mobile/src/content/equipment-recipes-v33.ts` — T1–T4 ingredient overlap and **Sunscar for both T3 and T4**.
- `apps/mobile/src/content/alchemy.ts` — resins: Verdant T1, Ironwood T2, Dune T3, Glassbound T4; **exclude all equipment-binding resins from donations**.

These item IDs are known to the content catalog. **No new item or processing recipe is needed** for the proposed donations. One bundle should represent roughly **30–45 nominal gathering+crafting minutes** using the current source timers, expected 1–2 yields and available tier tools. These estimates omit harvesting failures, bonuses, passive AFK improvements, inventory competition, gold cost and the future Player Market; **they are not measured actual player times**.

| Tier | Fortifications | Field Provisions | Siegecraft | Nominal range |
| --- | --- | --- | --- | --- |
| T1 | 70 Greenwood Logs + 12 Copper Ingots | 60 Dewleaf + 12 Cooked Meadow Perch | 70 Copper Ore + 12 Copper Ingots | 35–38 min |
| T2 | 60 Ironwood Logs + 10 Aster-Iron Ingots | 38 Ironbloom + 8 Roasted Rootstream Trout | 55 Aster-Iron Ore + 4 Reinforced Fittings | 38–39 min |
| T3 | 20 Dunewood + 6 Sunstone Ingots | 14 Sunscale Bloom + 8 Grilled Oasis Carp | 24 Sunstone Ore + 4 Sunstone Ingots | 34–41 min |
| T4 | 23 Dunewood + 6 Sunstone Ingots | 18 Sunscale Bloom + 8 Grilled Oasis Carp | 25 Sunstone Ore + 5 Sunstone Ingots | 39–42 min |

**Three critical cautions:**
1. **T4 is still Sunscar** for equipment recipes. Do **not** require Frostiron, Whitepine, Rimeglass or rare Glassbound Core to contribute to a T4-labelled supply bundle.
2. **Don't cannibalize rare progression:** never require Verdant/Ironwood/Sunscar/Glassbound binding resin, Astro Script, Glassbound Core, pet resources or uniquely rolled gear. T1–T4 common/raw/processed stockpiles are the intended Player Market sink.
3. **Account-bracket validation:** choose an event-locked supply bracket from the highest eligible progression *across that account*, capped at T4 for launch, rather than allowing cheap donations by swapping to an early alternate character. This is still proposed, not approved. Allowing multiple equal-effort recipes later may be better once actual market prices exist.

**Existing proposed caps preserved:** two contributed bundles per account **across** all tracks; each validated bundle grants 4 Sigils; community Tier I/II grants the already proposed combat benefits. A track's donation thresholds and current global levels are frozen/determined by server rules and any upgrades affect **only subsequent battles**.

The `world-bosses-war-supplies-v3.csv` contains the exact 12 item-ID recipes, estimated nominal minutes and competition notes. The Excel workbook additionally expands all crafted items recursively into raw gathering demands and processing times with editable formulas.

## E. Hollowroot original pixel-art production brief

**Asset identity:** original Veldryn fantasy pixel art; 2D front-facing, readable silhouette, dark forest bark, asymmetrical roots and an easily recognized amber heart. Do not borrow a known fantasy character. No photorealistic or painterly shading, no embedded words and no runtime rarity borders baked into the art.

| Asset | Source size | Content |
| --- | --- | --- |
| Full-body master | 512×640 transparent PNG | Asymmetric bark shoulders, root hands, amber core and legs |
| Compact portrait | 256×256 PNG → optimized WebP | Recognizable branch + heart silhouette on 20–60dp displays |
| Root-laced arena | 1024×512 separate layers | Ancient broken stone, moss floor, low-contrast trees; clean lower HUD space |
| Idle/attack/impact/defeat | 4–8 frames each, consistent grid | Root sway, bark crack, branch swing, shudder and shatter |
| Root Slam glyph/telegraph | 256×256 alpha + ground overlays | Distinct rust-amber floor crack; 1 round lead |
| Entangling Vines / Sporeburst | 256×256 alpha glyphs + effect layers | Vine hold is not mistaken for poison; tinted green spore clusters |
| Regrowth / Amber Heart | 256×256 alpha overlays | Guard restoration separately readable from two-round heart exposure |
| Splinterstorm | 6–8-frame transparent atlas | Readable top-down rain of shards; reduced-motion static hit cue |
| Themed cosmetics | Existing badge/pet size rules | Profile icon, account border/background, future pet. No new stat budget |

Color anchors: deep forest `#365746`; bark `#6A5643`; amber `#F3B45C`; danger crimson reserved for true danger. Phase I guard is dark/mossy, Phase II heart glows bright amber, Phase III splits expose red-orange fissures. Keep HUD statuses and battle numbers **rendered by game code**, never painted into exported images. **No actual assets generated in this pass.**

## F. QA contract and next implementation recommendation

The workbook tab **v3 QA Matrix** lists 24 cases, including same-device and cross-device replay idempotency, attack cap, regrowth-vs-global-HP invariant, spore cleanse timing, shield accounting, true damage logs, 40/200/1000 population stress, account-bracket manipulation, 30–45-minute supply recipes and no passive loot from borrowed Echoes.

Before any game changes, recommend:
1. Approve or revise **Hollowroot's 14-round signature schedule and local guard** semantics; benchmark real role-based battle outputs in the engine.
2. Approve or revise the **small-pop HP factor 0.82** (≤75 eligible) based on measured eligible-player counts and real battle volatility.
3. Validate all 12 War Camp recipes against **current production** gathering success, event-currency purchasing power, current gear/guild competition, and the planned Player Market.
4. Implement server-only event receipts and matching behind a feature flag; then make original pixel art, compact UI, signed replay and the 7-day staging season. Do **not** activate until the staged season and server/client build gates pass.

**Current state:** GitHub design documentation and a local versioned XLSX only. No migration, server or Android changes, no new graphics, and no real World Boss event enabled.
