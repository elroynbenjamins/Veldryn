# Equipment 2.0 — canonical approval record

**Status date:** 24 November 2026  
**Scope:** source-backed Equipment 2.0 decisions through PRs [#1706](https://github.com/elroynbenjamins/Veldryn/pull/1706), [#1711](https://github.com/elroynbenjamins/Veldryn/pull/1711), and [#1713](https://github.com/elroynbenjamins/Veldryn/pull/1713)  
**Authority:** design approval record only  
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
