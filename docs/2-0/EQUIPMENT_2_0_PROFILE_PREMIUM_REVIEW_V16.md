# Equipment 2.0 V16 — complete candidate profile coverage and premium review

24 November 2026. V14 remains canonical catalogue/economy baseline. V15 partial power score remains a candidate, not CP. V16 extends the profile view without modifying any existing V5 profile, original copy, source recipe or source item identity. All C12 and D1–D10 gates remain enforced/open.

## Profile coverage
554/554 candidate profiles. 233 existing V5 profiles unchanged. 321 additions: 204 exact V3 reconciled base profile records, 22 exact authored source profiles, 39 dungeon class armaments matched to same class/tier/slot signature profile, 56 role/slot-based proposed profiles for items without authored numeric splits. Last 95 require explicit approval, not source-authored facts. Six blueprint-only items preserve exact proposed source multipliers +3%/+4%/+5% for T2/T3/T4; they still have no approved crafting routes. All 79 boss-only items retain same-tier base budgets, no new blanket premium multiplier. No T7 future or retired drafts admitted. All profiles use V5 slot budgets, HP conversion, one rarity/quality base scale and V6/V15 two budget lanes for combined weapon. Distinct weapon restrictions and legal cross-class families remain unresolved.

## Premium comparisons
105 distinct premium or missing-blueprint records (99 V7 audited premium entries plus six blueprint pieces). 259 same-tier, same-slot replacement fixture comparisons across all nine classes (T2 54, T3 6, T4 56, T5 143); Rare Q50, matched random rolls. Recompute partial index using changed base profile/multiplier and exact mapped permanent innate additions under the shared cap. Independent arithmetic gives 0–2.6131% partial index change for one replacement. Zero priced increment is not zero total power. No set/trait/skill effects in comparison; not actual combat outcomes. Holding random rolls fixed is an upper sensitivity experiment, not approved additive premium policy: dungeon source says future affixes replace rather than add budget slots. Resolve exact replacement budget and scarcity before declaring final premium power.

## Semantic decision packet
- attack_pct: existing engine channel multiplies authoritative attackPower once. Candidate separate innate channel; cap/weight require approval.
- evasion_pp: existing probability channel; final hit/evasion interaction and cap require approval.
- haste_pct: relative percent vs existing haste_pp percentage points; cannot silently map. Explicitly reauthor unit or define separate mechanic.
- healing_power_pct: distinguish class_healing_pct and forge_healing_power_pct (authored direct/HoT heals); event scope decision required.
- crit_chance_pp: candidate explicit alias to crit_rate_pp only after confirming exact probability meaning; one cap, never two.
Potency remains excluded. Source: backend/src/server/combat/v2/equipment-affixes.ts, inspected at V15 head. No actual mapping or effect activated.

95 set records reconciled to exact membership; 34 have V7 numerical source proposals, 61 still need effect authoring and numerical review. 27 signature traits remain unpriced. All set thresholds and event rules require approval. Partial CP still excludes skills, companions, gems, traits, sets, unresolved innate channels and temporary effects. No final CP or integrated Skills combat comparison; source-side stat fixtures only. Next: settle premium allocation and semantic decisions, expand set/trait effect specifications and event budget, calibrate full CP against actual Skills/Combat runs. Source-side arithmetic independently checked counts and mixed comparison range; Node suite and CI not verified. No live changes, main merge or deployment.
