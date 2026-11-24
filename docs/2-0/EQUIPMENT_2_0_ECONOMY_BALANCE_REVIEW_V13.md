# Equipment 2.0 V13 — refining, pacing, source access and cost candidate

24 November 2026. Hidden design review only. The owner requested five further passes. C12, C14 and D1–D10 remain enforced. Nothing here authorizes runtime implementation, release, production changes, grants, market actions or new stat values.

## 1. Refining quantities and batch yields

Preferred calculation scenario is the separately owner-approved but unmerged PR #1693 smelting input and charged-fee proposal. Keep the current snapshot as an independent scenario; no merge or legacy recipe edit. Existing Copper/Aster-Iron/Sunstone/Frostiron ingot yields (5/4/3/3), ingredient variants, XP and durations remain exact source references. For the proposed new basic T1–T4 component routes, batch 3 units with 3x original input, 3x XP and ceil(3x original seconds /1.2). T5 already outputs 3; retain quantities, inputs and XP. All new component recipes have proposed zero additional processing Gold (including advanced T5 and T5 binder). Existing standard T1–T4 binder outputs, inputs, times and XP remain pinned. Existing binder fee modeled with source 20% surcharge once; pending smelt charged fees 30/50/290/730, not a second surcharge. Exact runtime modifier application still needs verification. Whole batches preserve leftovers. 1:1 replacement of draft T1/T2 bars by existing ingots remains a reauthoring candidate only, not automatic conversion or final quantity approval.

## 2. XP and pacing

New processing candidate speed 1.2x (seconds /1.2 rounded up), no reduction of XP per output, up to 20% higher XP/hour versus same source processing. Existing smelting/binder speed and XP remain unchanged in the selected source scenario. T5 median processing work is below T4 in this model; do not inflate delays just to force monotonic processing alone. A separate 2x base T5 new-processing duration stress gives median 5,714.5s vs 3,880s at preferred speed, but would reduce new recipe XP/hour; not recommended until raw acquisition and actual player activity are verified. Total resource acquisition and scarcity must drive difficulty. No final T5 equipment XP invented where absent. Proposed gathering actions use effective final durations (not pre-doubling legacy values); dedicated nodes earn one XP award, secondary Riverstone/Thornstone finds grant no extra action XP.

| Tier | Median component work s | Median processing Gold | Median total Gold (pending #1693) | Median total Gold (snapshot) |
|---|---:|---:|---:|---:|
| 1 | 626 | 52 | 252 | 258 |
| 2 | 1325 | 184 | 984 | 1004 |
| 3 | 2640 | 1014 | 4064 | 4198 |
| 4 | 5416 | 2548 | 8628 | 8628 |
| 5 | 3880 | 4380 | 13055 | 13802 |

Gold includes whole-batch processing + existing V9 final Forge fee; no raw material opportunity cost, gathering effort, market fee, resale value or full economy forecast. Median components need not sum to median total. Example Fieldborn helm: 16 required ingots, 4 whole batches with 4 leftovers; pending scenario 60 ore/47 logs (total nested bill), 18 hides, 5 tusks, 5 Dewleaf, 12 Moss Fiber, 3 Wisp Dust and 1 Botanical Essence. 142 processing +200 final Gold =342; 454s processing. Snapshot 40 ore/35 logs, 366 Gold. No raw source grant implied.

## 3. Source access and scarcity

Candidate effective drop rates on inspected enemy IDs: Boar Tusk 18%, Troll Sinew 1.2%, Sunscar Scale 18%, Miragefang Core 0.6–1.2%, proposed Dune Hare hide 20%, Glassbound Plate 18–20%, Glassheart Fragment 0.6–1.0%. Preserve prior T5 source candidates. 25 enemy/material pairs at 150/300/900 eligible kills/h =75 stress cases, not evidence of combat throughput, actual drop rates, or production availability. Dedicated gathering candidates: Thorn Fibre 8, Dune Fibre 26, Soul Fibre/Glassbound Dust/Shard 34, Frostflax 46; Riverstone 1 and Thornstone 8 as secondary finds at proposed 10% effective probability. No second XP award. Frostflax V13 candidate uses 130 effective seconds, one unit, 220 XP; supersedes V11's illustrative 65s base and 1–2 yield only in this scenario. Exact source node registrations, effective-rate normalization and reachable areas remain unresolved. Dune Hare remains concept, not a live enemy.

All 928 craft eligibility records preserve no combat skill requirement and no secondary profession skill requirement; unlock levels 1/8/20/34/42 are tier minimums, not source-access guarantees. T1 boar source entry and T3/T4/T5 later resource availability require skill-only travel and genuine trade/commission supply. No free grant or artificial drop workaround. Solo self-supply is not guaranteed at first craft level. Retain dormant Verdant Essence until a real consumer exists. No existing drop changes.

## 4. Finished costs and rarity supply

928 baseline bills and 50 separately modeled combined-hand bills expand the same source ingredients; combined candidates consume the V11 scaled manufactured quantities once and preserve direct Forge fee, final time/XP and combat/binder inputs. Lane time remains separate; lane XP unset. V11 pair value parity used hypothetical weights and must be recalibrated against actual raw material/production costs. No assembly, mint, grade receipt or salvage authority.

Candidate V4 rarity supply per 1000 independent crafts: Common 800, Uncommon 130, Rare 50, Epic 15, Legendary 4, Mythic 1. Exactly Mythic expected 1000 attempts; 90% chance of at least one after 2302 independent attempts; no guarantee or pity. Separate retained two-lane successes average 2000 lane attempts, not two Mythic gear copies or a simultaneous roll. Does not include quality, affix preferences, drop-only gear or actual sale demand. Never assign these rates to the 79 dungeon-exclusive pieces. Final rates and scarcity remain open pending data and approval.

## 5. Skills/Combat compatibility

Source-only review pins structural boundaries: server equipment gate false; frozen Forge handoff pre-scaled rarity/quality added once; Skills 2.0 counterplay uses server compiled builds; universal preview mint gate denies rebranding/mint. New tests assert these fences and no economy authority. No direct import into gameplay and no numerical CP, set effect or combat benchmark approval. Actual integrated Skills/Combat/Enemies validation requires authoritative item rules version and custody, approved stat caps, source rates, loadout tests and CI. Market waits for this sequence.

Independent connector-side source arithmetic checked all 928 recipe rows and 29 output definitions, medians, source scenario differences and sample bill. Node suite added, not executed locally through connector. CI pending. Candidate choices (zero new processing fee, batch 3, speed, early source rates, rarity scenario) remain explicit proposals; no live modification.
