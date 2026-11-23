# Equipment / Crafting 2.0 — 48-set source, material and scarcity pass
**22 November 2026 · HIDDEN REVIEW ONLY · no runtime activation or main merge**

## What is actually complete
- 48 planned launch set structures across T1–T4, 204 exact nonissued set member IDs.
- A distinct **204-entry item authoring sheet** including **130 newly authored draft template definitions** and **74 unapproved existing-template source suggestions**. These drafts are not canonical game items. Naming, archetype material, 1–2 base-stat profile, crafting profession, wear-gate suggestion and per-slot Style 4 art direction are now explicitly specified; numeric stats and art/owner approvals are NOT complete.
- A **746-route recipe review v3**: 338 material-review routes for 169 original items + 408 material-review routes for 204 newly drafted members. Exact recipe identities, two routes per item, hard combat material parity and profession-only crafting are maintained. The old original set pieces are not reassigned.
- Explicit recipes remain all **noncraftable/nonissuable**, pending owned server IDs and live material payouts.

## Exact material authoring corrections already reflected in v3
| Problem | Source-protected draft decision | Release state |
|---|---|---|
| Duplicate future EQ2_COPPER_ORE input | Process with existing COPPER_ORE | Need backend resource custody verification |
| Duplicate future EQ2_IRON_ORE input | Process with existing ASTER_IRON_ORE | Need backend resource custody verification |
| WOLF_FANG invented duplicate | Use the existing IRONWOOD_FANG source in all 746 routes | Do not invent an extra 10% wolf drop; inspect effective existing rate |
| SUNSTONE_INGOT conflicting output route | Reference **only** existing SMELT_SUNSTONE_INGOT, Sunstone Ore ×6 + Dunewood ×4 → 3 ingots / 520 XP / 180 s | One canonical processing route; no duplicate recipe or economy change |
| SUNSCALE as tanning input | It is a botanical item, **not leather**. Propose new EQ2_SUNSCAR_HIDE → EQ2_SUNSCAR_LEATHER / EQ2_HARDENED_SUNSCAR_LEATHER; T4 also needs Dust | No hide-bearing Sunscar creature with verified eligible source; cannot claim a scorpion yields hide. Must author approved wildlife or use another verified skin source |

The current T3 Sunstone recipe's high processing XP and ingredient bill require **explicit economy rebalance/owner approval** before binding the whole 2.0 skill curve. v3 does not modify it.

## Material source work still required
**14 unregistered material input identities** are referenced by the actual 746 routes or 15 future processing proposals. A further optional T1 Verdant Essence would bring the broader source list to 15 but is not required for ordinary recipes.

| Tier | Materials still needing real sources | Authoring action |
|---|---|---|
| T1 | Boar Tusk; Riverstone | Author server-controlled Boar Tusk eligible drop; fishing/mining find for Riverstone. Existing Boar candidate unlocks level 3, beyond the level-2 item entry; support a trade/commission bridge or an approved level-2 alternative |
| T2 | Troll Sinew; Thornstone; Thorn Fibre | Author gated Troll rare drop and two gathering sources. Existing Ironwood Fang remains independent of synthetic new Wolf Fang chance |
| T3 | Sunscar Scale; Miragefang Core; Sunscar Hide; Dune Fibre | Scorpion can be a *proposed* scale/rare-core source at level 26; Mirage Shade unlocks level 38, so cannot be sole tier-entry scarce source. Author a suitable hide-bearing animal explicitly; never treat botanical SUNSCALE or scorpion chitin as hide |
| T4 | Glassbound Plate; Glassheart Fragment; Glassbound Dust; Glassbound Shard; Soul Fibre | Candidate Sandplate Juggernaut (inspected level 38) bridges rare source before Sentinel (level 41). Prefer an independent profession-accessible Glassbound Dust node and trade; author owned shard/fibre gathering sources |

The **four existing Alchemy binding resins** are not part of the new IDs; each has an existing craft route with its own materials and cost. Do not silently make binders free, double-credit the same ingredient or bypass them through an alternate Forge recipe.

## Viability checkpoint before rarity/probability approval
Calculating from the draft *foundation* recipes, one complete T4 structural set costs:

- **135–422 Glassbound Dust** in upstream refining; a single new T4 member requires **14–117 Dust**. These are **design bills**, not player gameplay costs.
- **4–8 scarce Glassheart Fragments per full set** and separately mandatory common enemy materials.
- At an *illustrative*, not authorized, Dust supply of 80–150 per profession-gathering hour, Dust alone would take roughly 0.9–5.3 hours per set, ignoring all other resources.
- The old review's T4 scarce anchor is 0.25% *pre-normalization* per eligible kill. If the inspected legacy ×0.5 ×0.95 factors applied, **0.11875%** might be effective: 4–8 rare drops need roughly **3,368–6,737 eligible kills in expectation**, or **11.2–22.5 hours at 300 eligible kills/hour** (3.7–7.5 h at 900/h), *not* actual production drop rates. Elite rates, same-source overlap, player kill-speed variation and market acquisitions could change this substantially.

**Recommendation:** Maintain rare combat drops as the limiting finished-set sink; keep Dust readily gatherable by a specialist rather than forcing additional combat kills. Treat all suggested throughput targets as candidates only. Do not finalize the T4 reagent bill until gathering production and actual loot-payout normalization are measured.

## Engineering release gates
1. **Source registration**: finish 130 new item templates *canonically* (approved two-stat profiles, numeric budgets, art), decide 74 exact source migrations/new-item coexistence with no ID hijacking and preserve 42 legacy-set members.
2. **Material grants**: register missing inputs, source identities, actual availability gates, effective rates and ownership in the trusted server; enforce reproducible loot/grant tests and disable duplicate reward paths. Profession-only high-tier gathering must have a noncombat-accessible route or trade access.
3. **Recipe authorization**: use one canonical versioned catalogue; verify both routes' common/rare/binder parity, Smithing/Tailoring-only craft levels, zero combat craft requirement, separate combat *wear* gate, queue reservations, cancel/refund and per-character ownership. Preserve existing saved-item behavior.
4. **Economic staging**: test authenticated PostgreSQL item provenance, two concurrent sessions and market escrow/commissions; collect actual eligible kills/hour, drops/hour (including failed/no-loot rolls), profession throughput, raw ore demand, Gold/XP/time and supply by tier. Without authorized sources no valid real-player balance claim is possible.
5. **Integration approval**: nine classes/eighteen specs, 17-affix/28-trait proposed rules, equipment/skill/effect/boss co-op calculations, exact-head CI, Android and visually approved themes and actual UI screens. No accidental 2.0 activation or merge to `main`.

**Do not deploy or treat the 746 proposals, 204 proposed set members, or new item IDs as an executable source-of-truth.**
