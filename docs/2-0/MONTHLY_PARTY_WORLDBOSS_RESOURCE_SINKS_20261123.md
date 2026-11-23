# Veldryn 2.0 — Monthly Party Events + World Boss resource-sink review

**23 November 2026 · HIDDEN DESIGN + READ-ONLY POLICY · no live activation**

## Decision

Review **resource supply, true consumption and the held balance once per calendar month**. Recommend only modest, **optional** future event demand for demonstrably surplus materials. A review proposes a next-cycle versioned policy; it **cannot modify, debit or reprice** an active Party Event, War Camp, Guild upgrade, equipment recipe or any player inventory.

This is a **resource sink**, not an inventory confiscation mechanism or a mechanism to make equipment crafting painful. Different activities are complementary:
- Equipment 2.0 = persistent core demand for refined inputs, with rare monster drops gating valuable finished gear.
- Guild 2.0 = permanent tree unlock projects + chosen repeatable weekly projects.
- Party Events = cooperative required supply stages **already budgeted by gathering time**, plus separately optional preparations. Bias **future optional supply selection**, never block low-level participation.
- World Boss = 5 days of shared War Camp construction/food/siege supplies. Each account has at most two bundle donations per 14-day event; 3 account-wide battle attempts are separate. All 3 lanes and bonuses are frozen before Saturday's fight.

## Verified source contracts and no-source-limit

- The **current hidden Party Events V2** (source `backend/src/server/party/weekly-party-events-v2.ts` and planner) uses wood/ore/herb categories, 2–4 party members, 3-week schedule (one 7-day event then 14 days off), required/optional stage orders and true server-verified gathering unlocks. Four authored family category weights and common/uncommon/advanced 65/25/10 tier share are part of its current draft. Do not rewrite already-enrolled party orders or change the 3-week calendar.
- **Hidden World Boss V27** (on separate `feature/world-boss-v27-war-camp-transactions` and consolidated hidden #1346, **NOT merged here**) has exactly **12 verified recipes (T1–T4 × Fortifications / Field Provisions / Siegecraft)** installed immutably before the event. Example T1 Fortifications = 70 Greenwood Logs + 12 Copper Ingots; T1 Provisions = 60 Dewleaf + 12 Cooked Meadow Perch; T1 Siegecraft = 70 Copper Ore + 12 Copper Ingots. T2 Fortifications = 60 Ironwood Logs + 10 Aster Iron Ingots; T2 Siegecraft = 55 Aster Iron Ore + 4 Reinforced Fittings. Changing recipe count, materials, or donated quantities after installation would violate its transaction policy, receipt validation and frozen buffs. Any new recipes or variations need a **versioned V28+ successor** and same source-owned SQL/auth/canonical-catalogue reconciliation first.
- World Boss release is blocked on real account settlements, final boss balance and owner-approved UI. This review must not promote either isolated feature.

## What to watch from the 23 Nov production snapshot (not monthly growth)

| Resource | Held total* | Current future-event opportunity | Status |
| --- | ---: | --- | --- |
| Greenwood Logs | 73,951 | Party: wood; World Boss: T1 fortifications | Existing recipes |
| Ironwood Logs | 21,554 | Party: wood; World Boss: T2 fortifications | Existing recipes; concentrated holders, check access |
| Copper Ore | 37,729 | Party: ore; World Boss: T1 siegecraft | Existing recipes |
| Aster Iron Ore | 12,741 | Party: ore; World Boss: T2 siegecraft | Existing recipes |
| Dewleaf | 39,019 | Party: herb; World Boss: T1 provisions | Existing recipes |
| Moss Fiber | 36,096 | New optional repairs/banner/fortification supply | Needs new approved recipe |
| Boar Hide | 21,688 | New optional shelter/repair supply | Needs new approved recipe |
| Meadow Perch | 30,721 | Feed **existing cooking** → T1 War Camp Cooked Meadow Perch | Indirect processing, not a direct donation |
| Holy Water | 23,763 | Possible new authorized optional support supplies | Needs new approved recipe |

\* Player inventory + personal Bank + Guild Bank; stock at one point in time. **Not proof of resource growth or oversupply**. A few holders can account for much of a stock. Never assume that guild-bank deposits are genuine material consumption or creation.

Protected higher-tier resources: **Dunewood, Crownwood Logs** and any unresolved scarce/rare profession material. Existing V27 Dunewood War Camp donations remain possible, but the monthly adaptive policy does not increase demand for them. Never turn combat-gated rare binding resins or newly minted Equipment 2.0 into donation fodder.

## Monthly measurement contract

The monthly collector (separate future authoritative read-only pipeline) must capture:
1. **Unique time-frozen snapshot** at local month end: each real account once; same inventory/Bank/guild bank coverage every month; active-30-day holdings, active holder count and concentration (top five share), excluding duplicate saved revisions.
2. **True source creation and destruction** by exact stable item ID: gathering/loot/refining outputs and crafting/guild/event debits. Inter-account transfers, Bank deposits, Market listings and trades **do not count** as resource burns; processed inputs and outputs must be treated as distinct item IDs.
3. **Supply accessibility**: gathering rank, source-enabled status, region and profession skill requirements, participating accounts and price indicators. Do not claim high-tier 'surplus' based on unused stocks alone.
4. **Missing historical data = HOLD.** The production `economy_rollups_hourly` table was empty during the 23 Nov read-only economy investigation. First complete monthly snapshot establishes only a baseline; need consecutive *comparable* snapshots and actual flow proof before claiming trend or generating actionable cost changes.

## Review-only recommendation algorithm

In `backend/src/server/liveops/monthly-resource-sink-review-v1.ts`, candidate status requires:
- consecutive prior/current completed months with validated source identity and *actual* monthly generation/consumption;
- at least **15 active holders**, **500** units in 30-day-active inventory, with top-five share no more than **65%** (avoid chasing a single wealthy inactive holder);
- active held balance increased by at least **5%**, and source generation at least **20%** above consumptive flow; positive net source creation;
- currently verified accessible material, never protected T3/T4 stock.

Suggested **extra optional** monthly units for a proven candidate are capped at the smallest of **4% of active stock, 20% of genuinely produced units**, and a modest net-inflow-plus-2%-stock ceiling. These are intentionally *maximum suggestions*, not guaranteed consumption, fixed tariffs, or automatic dynamic difficulty. Each item has a conservative semantic route and explicit `mayApplyAutomatically:false`.

If a category (Moss Fiber, Boar Hide, fish) is absent from existing Party and World Boss donation catalogues, it receives `future_recipe_authoring_required`, **not** permission to edit the current event recipe.

## Applying proposals safely

**Party Events (3-week cycle):** Prioritize surplus inputs only for a future party's **optional preparations** and only among server-verified, same-tier, all-party-unlocked resources. Preserve duration budget, 3 required stages and the existing boss-preparation buff caps. Any new fiber/hide/fish repairs order requires a new content/catalog contract and test; no mandatory gathering of inaccessible items.

**World Boss (14-day cycle):** Use a monthly report to propose the **next** War Camp recipe variant and community goal forecasts *before the event's Monday UTC creation*. Three tracks, at most two bundles per account/event, 5-day prep, frozen weekend buffs, exactly-once receipts and server-controlled quantities remain invariant. Rebalancing one material may require its paired ingredient; never treat a single material's suggested unit count as a ready-to-install recipe. If a War Camp already exists, DO NOTHING to its goals or twelve registered recipes.

**Guild Projects:** Use the separate hidden Guild V2 basket policy, not the World Boss V27 receipt. Double count prevention must distinguish every resource actually destroyed by each system, while allowing a player to choose where to donate.

**Market:** Allow lawful trade/commissions of materials; keep pre-2.0 gear permanently excluded from equipment listings. Do not reduce gathering yields as a shortcut to reducing stocks.

## Required approval and integration steps

1. Build month-end read-only inventory + actual source/sink telemetry, collect one month-end baseline. Current holdings have no complete trustworthy month-on-month series.
2. Run the conservative monthly recommendation; annotate whether each resource is *existing optional recipe*, *fixed War Camp recipe* or *new proposal requiring approval*.
3. With owner's economy approval, author versioned optional Party resources and only prospective War Camp recipes; maintain all 2.0 content sources, challenge budgets and existing caps.
4. Test small-population, beginner and high-level cohorts, retained stocks, actual collection hours, multi-character/Bank concurrency, duplicate receipts, 2-bundle World Boss limits and immutable pre-event snapshots.
5. Review actual UI/themes and obtain coordinated 2.0 release approval. No write SQL, migrations, flags, live event changes, unapproved UI/theme updates or player resource debits in this pass.

**Outcome of this pass:** read-only monthly evaluator, adversarial tests and CI in a separate hidden PR; no live event item cost was modified.
