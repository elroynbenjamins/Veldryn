# Equipment 2.0 — canonical approval record

**Status date:** 24 November 2026  
**Scope:** source-backed Equipment 2.0 decisions through PRs [#1706](https://github.com/elroynbenjamins/Veldryn/pull/1706), [#1711](https://github.com/elroynbenjamins/Veldryn/pull/1711), and [#1713](https://github.com/elroynbenjamins/Veldryn/pull/1713)  
**Authority:** design approval record only
**Current consolidated review index:** `docs/2-0/eq2-consolidated-review-index-v14.json` (supersedes V8 index, preserves historical source pins)  
**Release state:** **REVIEW-ONLY, NON-ISSUABLE, NON-TRADEABLE, NON-EXECUTABLE**

This is the canonical status record for the current Equipment 2.0 tranche. It supersedes any inference that a source test, preview, proposed coefficient, successful simulation, or review-branch implementation is owner approval.

## Status vocabulary

| Status | Meaning |
|---|---|
| **CONFIRMED** | Explicit design constraint that later work must preserve. |
| **SOURCE FACT** | Verified property of the current source catalogue or review evidence; it is not automatically a launch decision. |
| **PROPOSAL** | Candidate design or implementation shape awaiting explicit approval. |
| **OPEN GATE** | A decision or production authority required before the affected path can ship. |
| **PROHIBITED** | Must remain impossible unless this record is explicitly revised and approved. |

## 1. Confirmed decisions and invariants

| ID | Status | Canonical decision |
|---|---|---|
| EQ2-C01 | **CONFIRMED** | Equipment 2.0 remains part of the coordinated 2.0 foundation. Equipment and Skills must establish their contracts before Combat 2.0 is finalized; Combat then feeds Enemies/Bosses, World Bosses, Party Events, and Player Market. Review work does not independently authorize release. |
| EQ2-C02 | **CONFIRMED** | Random **bonus-stat identity** must not be class-bound. A lucky, unusual roll can be valuable outside the item's expected archetype. The final roll source must be class/role independent. |
| EQ2-C03 | **CONFIRMED** | Class-independent random bonuses do **not** erase authored item identity. Innate/base stats, authored innate percentages, class restrictions, role, slot, weapon type, hand rules, and equip requirements may remain item-specific and class-specific. |
| EQ2-C04 | **CONFIRMED** | Existing original Forge copies and all pre-2.0/legacy items are immutable: no rerolling, rewriting, receipt substitution, rebranding, or migration into a newer universal-affix version. |
| EQ2-C05 | **CONFIRMED** | Legacy/pre-2.0 equipment is permanently ineligible for Player Market listing, sale, purchase, and resale. Future market eligibility can only attach to a newly minted, versioned Equipment 2.0 copy with authoritative provenance and current custody. |
| EQ2-C06 | **CONFIRMED** | Minting, RNG, claim, ownership, custody, Bank movement, equip authorization, rewards, and market eligibility must be server-authoritative. A preview, client value, test callback, item name, visual tag, or QA-shaped receipt can never grant authority. |
| EQ2-C07 | **CONFIRMED** | Existing copies keep their original rolled values. No later balance or pool revision silently rerolls player-owned equipment. Any future policy requires a new rules version and newly minted copy identity. |
| EQ2-C08 | **CONFIRMED** | Generic **Potency** has no approved Combat 2.0 meaning. It must remain quarantined and unmapped until one exact mechanic, cap, CP treatment, and display meaning are approved. It must not be silently converted into damage, healing, Hex, or another stat. |
| EQ2-C09 | **CONFIRMED** | Equipment counterplay should create meaningful advantages against particular enemies and bosses without making one class, companion, set, or mechanic mandatory. Multiple viable counter-build routes must remain possible. |
| EQ2-C10 | **CONFIRMED** | Observed boss results are evidence, not approval. Equal source inputs, deterministic replay, or a targeted tactic outperforming another does not certify final CP, class balance, set balance, economy, or release readiness. |
| EQ2-C11 | **CONFIRMED** | Until every affected gate below is approved, Equipment 2.0 review code must not mint, equip, grant, modify combat, award loot/XP/gold, write production state, expose player-facing release UI, or authorize market actions. |
| EQ2-C12 | **CONFIRMED — 24 Nov 2026** | **ALL Equipment 2.0 across T1–T5, including original Forge, expanded-set concepts, rare blueprints, crafted and boss-only equipment, weapons/offhands, item icons, collections, tooltips, loot, crafting, inventory, shops, player search and Player Market, must remain hidden/unavailable throughout 1.0.x and every pre-2.0 build.** Public equipment discovery, minting, crafting, drops, equipping, set effects and trading may be enabled only as part of the one coordinated, owner-approved Veldryn 2.0 launch after server/client/version/custody/UI gates pass. Merely recording T5 in a catalogue does **not** approve T5 for the 2.0 release. |

| EQ2-C13 | **CONFIRMED DESIGN DIRECTION — 24 Nov 2026** | Use overlapping adjacent-tier random bonus-stat ranges with increasing lower and upper bounds so exceptional lower-tier rolls remain valuable. Owner accepts the proposed universal roll and diminishing-returns direction, with Critical Damage examples T1 1–3.5%, T2 2.5–5.5%, T3 3.5–6.5%. The V4 candidate table extends this principle to all eleven channels through T5; exact remaining numeric values, integrated caps and final D1–D10 runtime/release approval remain open. Original Forge copies and rules are not rewritten. |
| EQ2-C14 | **CONFIRMED DESIGN DIRECTION — 24 Nov 2026** | Owner approves the recommended finished Equipment 2.0 crafting rebalance: direct Gold fee −30% (nearest 100, minimum 100 without increasing a source fee), refined materials +20% and advanced manufactured components +25% (ceil per line), existing binder +1 from T2 onward. Keep combat drops including source-authored Glassbound Plate, rare signatures, processing recipes, XP, queue duration and profession-only craft gates unchanged. V9 applies this to 928 hidden source routes; actual recipe budgets, supply validation, unresolved blueprint recipes, combined-weapon acquisition parity and every release gate remain open. No live activation or D1–D10 approval implied. |

## 2. Source facts and review evidence

These facts describe what the current private branches verify. They do not approve the proposed gameplay rules.

| ID | Status | Verified evidence | Approval consequence |
|---|---|---|---|
| EQ2-F01 | **SOURCE FACT** | The original Forge catalogue contains 15 pinned set families and 42 authentic source pieces. | Membership evidence only. No set effect is approved or executable. |
| EQ2-F02 | **SOURCE FACT** | The expanded catalogue contains 48 proposed families / 204 proposed pieces. | All remain unissuable. Presence in source review does not make them canonical launch content. |
| EQ2-F03 | **SOURCE FACT** | The original Forge roller is role-weighted and uses a 70% slot preference; legitimate original rolls can therefore differ from the synthetic Combat slot preference. | Original source compatibility may be reviewed without weakening generic validation or rerolling the source copy. This is not the final universal roll policy. |
| EQ2-F04 | **SOURCE FACT** | Eleven original Forge affix identities already have candidate mappings to existing Combat channels: armor, Max HP, ward, tenacity, crit rate, crit damage, haste, penetration, accuracy, ability damage, and healing power. | This supports a candidate pool; it does not approve that exact pool, ranges, caps, weights, or launch version. |
| EQ2-F05 | **SOURCE FACT** | PR #1711 classifies 1,620 set-versus-authored-boss opportunity rows across 15 original families and 108 class/spec/boss traces. All effects remain unapplied and unverified. | Opportunity relevance only; no proc, coefficient, balance, or set effect is approved. |
| EQ2-F06 | **SOURCE FACT** | PR #1713 runs 324 engine encounters: 9 classes × 2 specializations × 6 authored bosses × generic/targeted/alternative tactics, grouped into 108 source-identical triplets. | The harness can compare tactics while rejecting stale receipts, substituted copies, and changed source inputs. It is not a final equal-CP or release benchmark. |
| EQ2-F07 | **SOURCE FACT** | PR #1713's mint boundary rejects preview-to-original rebranding and denies mint, equip, rewards, combat, market listing, legacy resale, and release. | This is a tested denial boundary, not a production mint/custody implementation. |
| EQ2-F08 | **SOURCE FACT** | Review tooling uses authenticated-shaped QA callbacks and pinned source digests, not privileged production DB attestations. | It cannot establish real account ownership, custody, transaction locks, or market authority. |

## 3. Proposals awaiting explicit approval

| ID | Status | Proposal | What is not yet approved |
|---|---|---|---|
| EQ2-P01 | **PROPOSAL** | Use one universal 11-stat random bonus pool for every class, role, and equipment slot. | Exact pool membership; whether any stats are added/removed; final weighting; interaction with slot identity. |
| EQ2-P02 | **PROPOSAL** | Retain the original Forge rarity bands, Q0–100 quality curve, per-rarity roll counts, T1–T4 tier ranges, and distinct stat identities per item. | Final rarity rates, quality scaling, roll counts, roll magnitudes, caps, duplicate policy, and economy impact. |
| EQ2-P03 | **PROPOSAL** | Exclude Potency from the first universal pool. | Whether Potency is removed permanently or returns with an approved definition. |
| EQ2-P04 | **PROPOSAL** | Use the 15 source-backed original set families as the first review tranche. | Launch set roster and whether any expanded family belongs in the initial release. |
| EQ2-P05 | **PROPOSAL** | Give authentic original families only attainable 2/3/4-piece review milestones, with provisional coefficients below 5%. | Threshold model, exact mechanics, exact coefficients, stacking, cooldowns, proc rules, and whether the broader 2/4/6/8/10 system supersedes these source-sized families. |
| EQ2-P06 | **PROPOSAL** | Use authored boss opportunities and three-way Skills tactics to tune sets and counterplay. | Final benchmark protocol, target advantage bands, encounter sample size, equal-CP method, class tolerance, and acceptance thresholds. |
| EQ2-P07 | **PROPOSAL** | Introduce a new universal-affix rules version rather than mutating original Forge `draft-1`. | Final version ID, schema, migration/non-migration policy, secure RNG implementation, and production transaction contract. |
| EQ2-P08 | **PROPOSAL** | Preserve class-specific authored innate percentages on selected equipment while keeping random bonuses universal. | Which items receive innate percentages, their values/caps, their CP cost, and their market/economy effect. |

## 3A. Consolidated economy decisions (V14)

Owner requested V9–V13 consolidation before proceeding. C14 remains confirmed direction; subsequent candidate numerical details are **not** independently approved for gameplay.

| Domain | Current review authority | Status / unresolved choice |
|---|---|---|
| Membership and source scope | V2 exact roster, V14 classification | 554 items / 95 sets; 469 craft-review items / 928 routes; 79 boss-only; six missing blueprint recipes; ten T5 single-route items. No launch roster approval. |
| Finished crafting | V9 C14 | Preserve fee reduction and increased manufactured requirements; no V8 combined fee reversal. |
| Material identity | V12 | 75 candidate identities including dormant Verdant Essence; prefer existing Copper/Aster-Iron Ingot, no automatic conversion or final quantity approval. |
| Processing | V13 | 29 outputs; 21 new candidates, eight existing references. Batch 3 for new basic recipes, 1.2x speed for new processing, zero new processing fee are proposals. Existing recipes retained; separate pending #1693 source variant not merged. |
| Sources and access | V12 source identities and V13 rate/XP/duration candidate | No actual grant, area access, rate or commission verification. V13 Frostflax effective action replaces V11 illustrative timing/yield. |
| Hand acquisition | V11 50 alternate bills, V13 full bill calculation | Separate alternative, never extra recipe consumption or fee. Independent receipt, actual parity, XP and custody open. |
| Recycling | V11 refined-only 20% proposal, V14 normalized preview | Never recover based on preview as authority. Actual paid immutable bill and one-time destruction required; boss/legacy/receipt policy open. |
| Market/economy | V14 current raw baskets from V13; V4 rarity candidate | V10 prices/profile and V11 raw baskets historical only, not current estimates. Raw value, supply, fees, demand and rarity rates remain open. |
| Combat dependency | D1–D10 | No numerical power, CP, set, equip, source or Market decision accepted merely by consolidating this economy. |

V14 index records 21 original/current source pins, contract precedence and denial flags. It does not replace the historical source files or create runtime authority. See `docs/2-0/EQUIPMENT_2_0_CONSOLIDATED_REVIEW_V14.md`.

## 3B. V15 power contract review extension

V14 remains the canonical catalogue/economy baseline. `tools/eq2-review/t1-t5/equipment-power-contract-review-v15.mjs` (documented in `docs/2-0/EQUIPMENT_2_0_POWER_CONTRACT_REVIEW_V15.md`) combines V4/V5/V6/V7 for a **partial equipment budget index, not final CP**. 9,720 matched and 4,860 mixed grade fixtures; ten budget lanes with independent grade/quality on combined weapons; exact scalar parity does not imply equal combat outcomes. Only 233/554 identities have authored profiles; 321 remain unprofiled, zero premium entries in the benchmark fixtures, 28 unresolved innate lines and 61 sets outside numerical audit. All D1–D10 remain open, no approval inferred. Next: source-backed profile extension, semantic decisions, then legal mixed build and combat calibration.

## 3C. V16 complete candidate profile coverage

V16 extends V15 without altering the V14 canonical catalogue or existing V5 profiles. All 554 exact identities now have candidate profiles: 233 preserved, 226 additional explicit source profiles and 95 proposed role/class-slot profiles requiring review. 105 premium/blueprint candidates and 259 same-slot class comparisons are non-executable; zero blanket boss base-stat premium, six source-authored blueprint budget modifiers retained. Five unresolved innate semantic decisions, 27 signature traits and 61 sets outside the prior numerical audit remain open. Matched random rolls in the premium sensitivity comparison are not approval of additive premium budgets. CP, legal ownership, Skills/Combat effects, D1–D10 and all release gates remain unapproved. See `docs/2-0/EQUIPMENT_2_0_PROFILE_PREMIUM_REVIEW_V16.md`.

## 3D. V17 set, trait and CP candidate extension

All 95 exact families /195 attainable milestones have numerical proposals: 68 V7 source effects preserved verbatim (typed event/unit work open) and 127 new typed candidate effects. 27 dungeon signature traits normalized with existing coefficients/cooldowns, six separate blueprint trait concepts remain unresolved. The candidate stat decision packet covers all 99 innate lines (71 exact, 28 proposed changes), including explicit haste reauthoring rather than silent unit conversion. Partial permanent power extension does not return full CP. 972 planned integration cases not executed; V16 exact-head private integration passed, including prior engine rehearsal, not V17 effects. No D1–D10 or runtime/release approval. See `docs/2-0/EQUIPMENT_2_0_SET_TRAIT_CP_REVIEW_V17.md`.

## 3E. V18 normalized effect and trigger review

V18 preserves V14/V17 authority boundaries: 68 remaining source milestones normalized, all 195 candidate milestones structured, 27 dungeon and six blueprint trait candidates. 142 conditional records have isolated classified-event QA tests and proposed cross-effect limits, not runtime implementation. Private baseline engine trace export/audit prepares 324 baseline plus 648 shadow rows; no candidate effects applied or candidate outcomes measured. V17 focused workflows passed but six broad workflows failed; V18 exact-head CI unconfirmed. D1–D10, actual trigger evidence, effect compiler, final CP and all release approvals remain open. See `docs/2-0/EQUIPMENT_2_0_NORMALIZED_EFFECTS_REVIEW_V18.md`.

## 3F. V19 effect compiler and permanent-stat sensitivity review

V18 exact-head focused checks succeeded; 324 baseline traces, 648 shadow rows, 444 with broad hints, no applied candidate effects. Seven broader workflows failed; exact historical mobile preview economy module restored, backend readiness and Edge isolation remain blockers. V19 compiles 142 conditional definitions into phase-bound QA intents, not engine execution. Private harness prepares 324 matched actual-engine counterfactual pairs for one permanent candidate stat only; new CI unconfirmed, no results claimed and no candidate custody or conditional effect authority. D1–D10 remain open; see `docs/2-0/EQUIPMENT_2_0_EFFECT_COMPILER_REVIEW_V19.md`.

## 3G. V20 integration recovery and measured static sensitivity

V19 exact-head catalogue (99 tests, zero failures) and private engine integration passed. The 324 matched static-stat counterfactuals actually ran; zero wins in either condition, raw damage delta +430.0902 averaged across heterogeneous channels, healing delta zero. Single-item 35s QA boss fixtures cannot calibrate final CP. V20 restores two exact historical readiness dependencies, confines opaque metadata to the private cross-project rehearsal type, moves exact cross-project files to a dedicated strict build with all five original tests retained, and adds fail-closed legacy-build replacements for three equipment/dungeon hooks. Edge generated bundles remain stale until verified regeneration; Expo mismatch and all new V20 CI remain outstanding. No live runtime or gate change. See `docs/2-0/EQUIPMENT_2_0_INTEGRATION_RECOVERY_V20.md`. D1–D10 remain open.

## 3H. V21 multi-slot and controlled-party benchmarks

V20 focused catalogue, isolated core and private integration passed; the broader backend/private-state check failed through a sixth cross-project effect-gem test. V21 retains all six tests in the dedicated strict harness, fixes pure type imports, and runs private compilation independently. Expo, tool economy/blueprint/scroll regressions and both stale generated Edge bundles remain open. New 648 solo and 108 controlled-party matched permanent-stat pairs are authored and wired to private CI, NOT confirmed executed. Tier-bounded original Forge QA copies only, exact source coefficient, explicit hypothetical boss stat bands, 120s limit and missing/downgraded slots recorded. Party workloads are generic, not authored solo authority. No conditional effects, CP or release approval; see `docs/2-0/EQUIPMENT_2_0_MULTISLOT_BENCHMARK_REVIEW_V21.md`. D1–D10 remain open.

## 3I. V22 first private conditional engine execution candidates

V21 focused CI remains queued at readback; no new benchmark outcomes confirmed. V22 adds a private exact-input QA authority and actual current-hit engine hook for Winterbreaker (+7%, below 35% HP) and Avalanche Crushing Finish (+8%, physical below 30% HP), four source IDs / two mechanics, shared family 20s cooldown. No source custody or live authority; explicit legacy Edge denial. 120 new matched QA pairs prepared, not yet verified executed. Other 138 conditional records not supported by this adapter. Source coefficients preserved; no CP/release approval, no deployment. See `docs/2-0/EQUIPMENT_2_0_PRIVATE_CURRENT_HIT_REVIEW_V22.md`. D1–D10 remain open.

## 3J. V23 one-use charge mechanics and fixture recovery

V21 backend typecheck/release economy, dungeon mechanics, isolated core and catalogue passed; private GameState stopped at an underfunded second-character QA fixture and expanded combat stopped at wrong generic boss name. Both exact fixture causes corrected; no new result claims. V23 adds three phase-separated one-use charge candidates (Follow-Through, Talonstrike, Thornstrider), seven source IDs/five mechanics including V22. Post-effective-HP-loss earning, later pre-hit consumption, exact expiry, receipt and same-tick guards; conservative same-target and timing policy. 96 matched QA pairs prepared, CI unconfirmed. Remaining 135 conditional records, CP, D1–D10, Expo, mobile regression and Edge parity remain open. See `docs/2-0/EQUIPMENT_2_0_ONE_USE_CHARGE_REVIEW_V23.md`.

## 3K. V24 private incoming damage reduction

V22/V23 focused CI remains queued. V24 corrects a non-exported V17 source import in the V22 audit and adds three private defensive source definitions: Heliarch Guard, Unyielding Frame, Rimevanguard. Actual post-hit HP-loss threshold, next-hit/timed reduction, strongest-only overlap and expiry; conservative QA semantics, no ownership or release authority. 96 matched Ironwarden pairs prepared, execution unconfirmed. Ten source definitions/eight mechanics supported, 132 remaining. CP and D1–D10, previous mobile/Edge blockers remain open. See `docs/2-0/EQUIPMENT_2_0_INCOMING_DEFENSE_REVIEW_V24.md`.

## 4. Open launch gates

### A. Item identity, mint provenance, and custody

- Define the canonical immutable item-copy ID and rules-version fields.
- Define server-only secure RNG and reproducible audit evidence without exposing a client-controlled draw.
- Define atomic craft → mint → claim → inventory/Bank custody transitions.
- Define account, character, and multi-character Bank ownership rules and revision/CAS locks.
- Define battle/loot grants, duplicate/retry idempotency, rollback behavior, and tamper rejection.
- Decide whether original Forge QA copies are deleted, retained as test fixtures, or archived; they cannot become production copies.
- Provide production-authenticated readback tests. Review callbacks are insufficient.

### B. Final stat contract

- Approve the launch bonus-stat pool and each stat's exact Combat semantic.
- Resolve Potency.
- Approve rarity probabilities, quality curve, affix counts, stat selection weights, duplicate rules, and T1–T9 ranges.
- Approve hard/soft caps, diminishing returns, rounding, stacking order, snapshot/live recalculation, and UI precision.
- Approve authored innate percentages and their separation from random affixes.
- Define boundaries among base stats, innate percentages, random affixes, set effects, gems, traits, companions, skills, buffs, and debuffs.

### C. Combat Power and balance

- Approve CP weights for base stats, quality/rarity scaling, random affixes, innate percentages, set effects, gems, and traits.
- Define whether CP values are additive, nonlinear, capped, or context-sensitive.
- Establish the equal-CP comparison method for ten-slot builds, paired weapons/secondary slots, class passives, Skills loadouts, companions, and consumables.
- Approve target performance bands across damage, tank, and support builds.
- Validate T1–T9 progression and prevent high-rarity/quality double scaling.

### D. Set roster and executable effects

- Approve which source families launch.
- Reconcile family sizes with the intended 2/4/6/8/10 equipment-set model; do not invent unavailable pieces to satisfy a threshold.
- Approve every set's member IDs, 2/3/4 or 2/4/6/8/10 thresholds, mechanic, coefficient, target, duration, cooldown, refresh/stack rules, cleanse/dispel behavior, and combat event source.
- Specify interaction with bosses, PvP if applicable, parties, multi-hit attacks, dots, shields, healing, death/revive, and encounter resets.
- Prove alternative counters exist so no set/class is mandatory.
- Add server-authoritative worn-set custody and runtime effect tests only after approval.

### E. Combat 2.0 integration contract

- Freeze equipment-to-combat input types and trusted source boundary.
- Approve cooldowns, class passives, damage/healing formulas, mitigation, accuracy/evasion, penetration/armor, wards, tenacity, crit, haste, and effect timing required by equipment stats.
- Add full ten-slot and weapon-hand handling.
- Establish deterministic encounter seeds/replay requirements and authoritative long-form boss/party state persistence.
- Define which equipment values snapshot at battle start and which may change during combat.

### F. Player Market eligibility

- Define the exact market-eligible rules versions and mint authorities.
- Enforce provenance and current custody for listing, purchase, delivery, cancellation, resale, and Bank moves.
- Permanently reject legacy/pre-2.0 items, original review copies, previews, synthetic fixtures, and unverifiable copies.
- Decide bind state, trade history, listing limits, price rules, fees, and behavior after future balance/version changes.

### G. Catalogue, crafting, drops, and economy

- Complete and approve T5–T9 items, recipes, resources, rare combat drops, dungeon/boss-only sets, and class/role coverage.
- Decide the launch status of the 48-family/204-piece expanded catalogue.
- Approve recipe difficulty, drop rates, rarity/quality supply, salvage, repair if any, and Player Market supply targets.
- Validate that profession-only progression and trade can access required materials without forcing combat progression, while keeping finished gear meaningfully scarce.

### H. Release and operations

**Mandatory EQ2-C12 visibility gate:** all T1–T5 2.0 item families stay completely hidden from pre-2.0 players even if a hidden test, source template, icon or reward definition exists. Implementation previews in private development tools are not live app disclosure. No individual tier, blueprint, dungeon source, set or Player Market integration receives an early release exception.



- Complete security/threat review, migrations, backfill/non-migration plan, observability, audit logs, admin recovery, and rollback.
- Pass exact-head Equipment + Skills + Combat integration CI and production-like transaction tests.
- Complete owner approval of gameplay numbers and UI before public routes, production SQL, launch flags, grants, or release.
- Preserve the coordinated 2.0 launch gate; no isolated Equipment 2.0 rollout.

## 5. Minimum approval packet before Combat 2.0 implementation can depend on Equipment 2.0

Combat simulation and read-only reconciliation may continue, but implementation must not treat Equipment 2.0 as a stable runtime dependency until the following choices are recorded:

| Required decision | Why Combat is blocked without it |
|---|---|
| **D1. Launch stat vocabulary** — exact affix pool and Potency disposition | Combat cannot compile or display a stat whose mechanic is undefined or whose identity may disappear. |
| **D2. Stat calculation contract** — ranges, caps, stacking, rounding, snapshot timing | Damage, healing, mitigation, timing, and tests otherwise encode provisional behavior as fact. |
| **D3. CP v1 formula** — weights for every equipment contribution | Equal-CP class, skill, enemy, and boss comparisons are not meaningful without a stable denominator. |
| **D4. Launch set scope** — families, authentic member IDs, and threshold model | Combat cannot implement worn-set detection or bonuses against an unresolved catalogue/threshold shape. |
| **D5. Set effect specification** — mechanics and coefficients, including alternatives | Runtime events and boss counterplay cannot be authored against labels or opportunity rows alone. |
| **D6. Equipment source contract** — immutable copy/version/provenance fields and trusted read API | Combat must reject previews, legacy copies, forged receipts, and stale custody before applying stats. |
| **D7. Equip/loadout contract** — ten slots, weapon hands/paired weapons, class restrictions, Bank-to-character custody | Actor compilation and CP cannot be correct while the equipped-item model is unsettled. |
| **D8. Existing-copy policy** — no migration plus explicit handling of original Forge QA fixtures | Prevents accidental grandfathering or rerolling when the universal version is introduced. |
| **D9. Benchmark acceptance criteria** — equal-CP method and target tolerances | The 324 encounter suite can measure outcomes, but cannot decide whether an outcome is acceptable. |
| **D10. Market eligibility contract** — eligible mint versions and permanent legacy exclusion | Equipment identity must be designed once for both Combat trust and later Market custody; retrofitting provenance is unsafe. |

### Decisions that may remain later than the first Combat dependency freeze

Exact recipe costs, final drop rates, market fees/limits, UI presentation, and the complete T5–T9 content catalogue may continue in parallel **only if** their schemas cannot change D1–D10 and no items are issued.

## 6. Work allowed before approval

- Read-only catalogue reconciliation and source-gap reports.
- Non-issuing simulations using clearly versioned proposal inputs.
- Provenance threat modelling and transaction design.
- Deterministic test harnesses that fail closed.
- Boss opportunity measurement and comparison-method development.
- UI mockups that cannot create, equip, reward, or trade items.

## 7. Work prohibited before approval

- Production minting, migration, grants, drops, claims, rewards, or inventory writes.
- Runtime set modifiers or provisional affixes in player combat.
- Final CP publication or balance claims based on current review values.
- Market listing, purchase, resale, or eligibility for any review/legacy/original QA copy.
- Player-facing release UI or launch flags.
- Merge/deployment that makes review modules reachable from public mobile, online, Edge, loot, craft, combat, or market routes.

## 8. Approval checklist

The record moves from review to implementation dependency only when the owner explicitly resolves and signs off:

- [ ] D1 — Launch stat vocabulary
- [ ] D2 — Stat calculation contract
- [ ] D3 — CP v1 formula
- [ ] D4 — Launch set scope
- [ ] D5 — Set effect specification
- [ ] D6 — Equipment source contract
- [ ] D7 — Equip/loadout contract
- [ ] D8 — Existing-copy policy
- [ ] D9 — Benchmark acceptance criteria
- [ ] D10 — Market eligibility contract

Until then, the canonical state remains: **review-only, non-issuable, non-executable, and non-tradeable**.
