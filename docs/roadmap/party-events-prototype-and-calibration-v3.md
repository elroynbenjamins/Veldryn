# Veldryn — Party Events v3: Stage prototype and gear-informed boss calibration

**Date:** 10 November 2026  
**Status:** HIDDEN / TEST-ONLY engineering prototype and calibration. **No public release, backend migration, scheduled worker, reward delivery, route, or navigation.**  
**Predecessor:** [Party Events v2](party-events-design-v2.md), which remains the broader gameplay design.  
**Workbook:** `docs/roadmap/spreadsheets/Veldryn_Party_Events_Design_v3_2026-11-10.xlsx.b64` (standalone 26-sheet v3 workbook, not an active data source).

## 1. Real implementation boundaries

This pass adds a separate in-memory stage prototype and a separate in-memory boss calibration runner. Both run under tests, and their output is intentionally **non-rewarding**.

- `backend/src/server/party/weekly-party-stage-prototype-v3.ts` — authoring preview for four families × three variants × three stages, with real deterministic backend combat for Stage 2/3. Stage 1 remains noncombat scouting. Supplies activate only from valid fully donated existing orders. A route vote selects a bounded hazard variation, not an irreversible gameplay mutation. Display metrics and authored time cues are **test projections**, not an actual escort-objective settlement.
- `backend/src/server/party/weekly-party-finale-readiness-v3.ts` — standalone stage readiness projection: `ready_for_finale`, `frozen_full`, `frozen_partial`, `boss_settled_full`, and `boss_settled_partial`. It refuses a premature boss result and explicitly marks every preview as **ineligible for reward grant**. The v2 SQL/state implementation is **not** replaced by this projection.
- `tools/party-events-gear-calibration.mjs` + `tools/party-events-gear-calibration-entry.ts` — dynamically bundle the current mobile v33 gear catalog and `effectiveStats` with existing backend class kits and Day 8 boss. This does **not** use the full authoritative server gear-instance, quality, gem, companion, potion or skill snapshot. It calculates **actual catalog-informed gear multipliers applied to baseline server combat class kits**, and must remain labeled a proxy.
- The private `PARTY_WEEKLY_EVENTS_RELEASED` gate stays false; new stage and readiness prototype constants also stay false.

## 2. Validated test coverage

The first passing hidden Party Events CI run exercised:

| Test | Scope | Outcome |
| --- | --- | --- |
| Stage preview matrix | 4 families × 3 variants × 3 party sizes × 3 stages = **108** previews | Passed; deterministic paths |
| Stage combat | Stages 2/3, each family/variation/size = **72** backend fights | Passed; encounter events, bounded telemetry |
| Gear-informed boss calibration | Nine classes × T1–T4 × 2/3/4 players × 3 difficulties = **324** deterministic complete boss simulations | Passed; numeric results below |
| Security boundary | No stage preview can mint EP, currency, supplies or reward entitlements | Passed contract assertions |
| Equipment tier source | Current `EQUIPMENT_ITEMS_V33`, v33 crafting recipes, mobile `effectiveStats`, backend nine class ability kits | Runtime input provenance confirmed; cross-engine modeling limitations remain |

**Evidence:** [Hidden Party Event validation run #42837556101](https://github.com/elroynbenjamins/Veldryn/actions/runs/42837556101). Numbers come from its logged proxy-calibration output, **not** from production characters.

## 3. Initial Day 8 boss result — major scaling risk

**Existing hidden boss tuning**: HP `×1.22`, Attack `×1.14`, Defense `×1.11` **per new boss tier**; a maximum of 12 tiers with up to 90 seconds simulation per tier. The proxy results show the upper tiers flatten out and T2–T4 groups hit the cap.

| Equipped cohort | Standard duo: mean tiers cleared / 12 | Standard trio | Standard four-player |
| --- | ---: | ---: | ---: |
| T1 | 8.78 | 11.11 | 11.67 |
| T2 | 11.78 | 12.00 | 12.00 |
| T3 | 12.00 | 12.00 | 12.00 |
| T4 | 12.00 | 12.00 | 12.00 |

All 324 proxy scenarios cleared Tier 1. The testing used pre-authored class-party partners and one deterministic seed/scenario; it is not statistically representative of every game party.

### Balance interpretation

**Recommendation (NOT applied to the boss):** Keep accessible Tier 1 entry; increase the steepness of upper-tier pressure, and/or add stronger growth after a tier threshold, to create persistent room for stronger T2–T4 parties. This is preferable to simply boosting boss HP at the opening tier, which would disproportionately punish beginners. The three calibration-only proposed growth profiles are:

| Experimental profile | HP growth/tier | Attack growth/tier | Defense growth/tier |
| --- | ---: | ---: | ---: |
| A / Gradual | 1.35 | 1.17 | 1.14 |
| B / Medium | 1.42 | 1.20 | 1.16 |
| C / Steep | 1.50 | 1.23 | 1.18 |

### Experimental results — Standard, no supplies (actual CI proxy runs)

The candidate tests executed additional deterministic combat simulations, with the current boss unchanged. Source: [trial run #42838119775](https://github.com/elroynbenjamins/Veldryn/actions/runs/42838119775).

| Gear | Current duo mean | A / Gradual | B / Medium | C / Steep |
| --- | ---: | ---: | ---: | ---: |
| T1 | 8.78 | 6.67 | 5.89 | 5.11 |
| T2 | 11.78 | 8.78 | 7.78 | 6.78 |
| T3 | 12.00 | 9.33 | 8.33 | 7.33 |
| T4 | 12.00 | 9.56 | 8.33 | 7.33 |

A similarly bounded four-player sample was also measured; see the workbook's **V3 Candidate Curves** tab. **Medium (B)** looks like the most balanced *starting hypothesis*, but the flattened T3→T4 outcomes indicate a missing authentic snapshot/gear differentiation question rather than a solved scaling curve. Do not pick or deploy B yet.


These are **evaluation inputs only**; do not deploy any as gameplay balance until actual authoritative server snapshots, companions, gear rarity/quality, character-skill effects and phase mechanics are included.

### Required calibration improvements

1. Build a trusted source-to-snapshot bridge for actual equipped T1–T4 gear, gem sockets, item quality/rarity, class skill specialization, companions and any applicable potion effects. Current full-item ratios applied to backend ability-kit baselines are **not exact player snapshots**.
2. Run at least three reproducible combat seeds per matchup, plus mixed-level and partially-equipped parties. Define outcomes by difficulty and actual gear cohort, not raw damage leaderboard.
3. Distinguish 2/3/4-player depth and ensure Tank, Support and Damage combinations remain viable. A party with no healer should lose some sustain efficiency but not be barred from entry.
4. Cost-check 12 × 90-second simulated boss tiers in the server worker, and persist the result once. A client opening results must only replay server events.
5. Add the family's 14-round warning/counterplay mechanics **after** the class-kit baseline is coherent, then rerun the complete matrix. Current Day 8 v2 boss is still **generic across the four families**.

## 4. Two hidden consistency corrections

The hidden boss now uses a **true midpoint median** of the authoritative party levels. In two- or four-person parties, the median is the rounded mean of the middle two levels. A level-1 partner cannot force a level-100 duo to face a level-1-scaled boss. The `weeklyPartyBudget` private difficulty multipliers now match the existing boss scales at **1.00 / 1.20 / 1.40** for Standard/Veteran/Heroic. Reward scaling remains separate at **1.00 / 1.20 / 1.35**.

These are fixes to dormant/server-only code paths, not an activation. The Stage III `finaleCleared`/boss-settled SQL flow is **still pending** a formal transition migration; the v3 readiness projection demonstrates the intended distinction without changing that database contract.

## 5. Stage playability and authored preview boundaries

| Stage | Family-specific gameplay | Player decision | Server authority required before launch |
| --- | --- | --- | --- |
| 1 · Expedition | Scouting the location, family-themed hazard previews, supply collection | Noncombat route survey; no forced fight | Unique scout receipt, verified 5 EP per member, actual source handling |
| 2 · Confrontation | Family-specific skirmish using the real combat engine, three deterministic preview cues | Safe vs fast / clear vs shadow / ground vs charge / quiet vs deep | Open vote on stage entry, auto-resolve at deadline, trusted encounter receipt |
| 3 · Preparations | Family-themed defensive rehearsal, objective metric and optional buffs | Brace/disrupt, hold/hunt, protect/overload, preserve/break | Saved legal loadouts, authentic objective state, final 5 EP receipt |
| Day 8 · Finale | Current deterministic 12-tier generic boss (family variants are *not yet wired*) | No live action after Sunday close | Frozen trusted roster, single settlement, atomic rewards, private replay |

The optional supply multipliers remain exactly as in v2. The v3 stage adapter has a **display-only objective-integrity estimate**, not a real convoy-health/ward-stability/pressure system. Do not treat that preview number as authoritative victory, EP or a resource transaction.

## 6. Non-negotiable server contract / release checklist

- Enroll a snapshotted 2–4-member roster for exactly one event/week per account. Check account ownership, active roster and no duplicate allocations.
- Save one verified loadout/member, freeze at close, ignore late mutations; never trust client-provided stats, event receipts, item prices, or supply completion.
- Run supplies through atomic DB inventory burns and idempotent donation receipts; no partial-order buffs, no double-spending.
- Open vote on stage entry; settle by strict majority or a default at **min(6-hour expiry, Sunday close)**. Never accept late ballots.
- Introduce a real `ready_for_finale` state distinct from `boss_settled`; a loss is still a real settled attempt, not a stage-clear fabrication.
- Keep full reward cache gated by approved eligibility. **Partial-event reward policy is not yet approved; do not give full caches based on boss damage alone.**
- Atomic reward claim must deliver Gold, XP, companion resources, materials, Renown and Inbox ledger **all-or-nothing**, with replay/idempotency checks.
- Party leaderboards continue behind an independent disabled gate. No public UI, navigation, cron, migration deployment or reward payout in this pass.

## 7. Recommended v4 work

1. Add the *actual* Veldryn equipment-to-authoritative combat snapshot adapter; run real class/gear/companion cohorts.
2. Evaluate curve A/B/C against the official reference cohorts and choose one *only after* low-level entry and T4 depth targets agree.
3. Implement a complete private stage source/receipt ledger with tested ballots, secure EP, dedicated family mechanics and one-time objective claim.
4. Reconcile Stage III readiness and partial settlement in a staging-only transaction plan; approve the incomplete-event reward policy.
5. Build a compact party-event screen with stage progress, owned/needed resource donation cards, readable vote choices, and a deterministic Day 8 replay. Keep it hidden until release QA and economic balancing pass.

**No production feature is activated by this design and testing pass.**
