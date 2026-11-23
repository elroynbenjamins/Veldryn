# Skills × Equipment 2.0 — ten-slot counterplay and reason-coded encounter QA (23 Nov 2026)

**PRIVATE / HIDDEN / NO MAIN MERGE OR DEPLOY.** Stacked on PR #1663 → #1655 → #1638 → hidden canonical #1377. No app UI changes, new migrations, reward grants or player item changes.

## Pass 5: Actual ten-slot equipment × three skill tactics
- Extract the existing tested Equipment/Skills/Enemies fixture into a single shared, review-only server source. The 216-case test retains its original behavior.
- Run **18 class specializations × 6 existing regional boss profiles × 3 genuinely authored server skill loadouts = 324 additional full-gear simulated encounters** using ten distinct synthetic equipped receipt copies and current signed version-2 trait receipt test authority.
- Include 2/4/6 role set effects, rotating 13 supported Combat V2 affix channels, rarity+quality stage, one gated EQ2 executable trait and source-owned authored-unscaled base stats.
- Hold **same actor, level, server seed, boss, item receipt ledger and compiled class/gear stat stages** across generic/targeted/alternative skill variants, and reject any gear evidence drift.
- Re-run each combat deterministically, assert source inputs and item receipts remain untouched, and use observed engine events in the existing paired comparison reducer. Report actual counterplay flags, not claimed class fairness.
- Crucial limit: test items and set numeric effects remain synthetic. These are NOT actual issuance of the expanded 48 families or the original pre-scaled Forge 2.0 inventory. Comparisons use an internal numeric stat index, **not final policy-approved Combat Power**.

## Pass 6: Evidence-linked reasons when counterplay does not trigger
- Add pure, read-only counterplay opportunity analyzer with five explicit categories:
  1. `class_native_counter_unavailable`: that specialization lacks the selected route.
  2. `boss_opportunity_not_observed`: no relevant interruptible cast, debuff, incoming damage or attack window.
  3. `selected_counter_not_cast`: the class has a matching move but none completed inside the encounter.
  4. `counter_cast_without_result`: a valid counter move was completed, but no selected skill produced a relevant outcome event.
  5. `counter_effect_observed`: at least one source-attributed event was observed from a selected ability.
- Consume live deterministic-engine event summaries only. Check route-specific cast/effect attribution; neither generic/basic hits nor merely owning a skill is falsely treated as a successful specialized counter.
- Reject duplicate/missing strategies, malformed numbers, fabricated route names and incomplete matrices. Preserve stable ordering. **No thresholds imply release approval.**
- Add both tests to the hidden Combat Skills CI; require exact-head success before claiming passes.

## Source reconciliation with actual Equipment 2.0 Forge branch
The source-authentic Forge/Bank/custody work lives in hidden PR #1661 (based on Forge #1653), **not in this Skills synthetic fixture**. Future integration must:
- Use original `V2ExactEquipmentTemplate`, minted `V2DraftItem`, custody `V2CustodyCopy`, immutable claim and Forge start/XP receipts and authenticated virtual Bank transfer/equip history.
- Preserve already rarity/quality-scaled Forge `baseStats` **exactly once**; the current generic authored-unscaled equipment-base resolver must never re-multiply frozen Forge stats.
- Reconcile exact original Forge affix units: original Potency remains undefined and must not be silently translated; Tenacity/Healing Power/Ability Damage require their explicitly versioned adapters and caps.
- Reconcile all 15 authored Forge sets (42 original pieces), the later expanded 48 set concepts (204 proposed pieces), the actual 2/4 and proposed 3-piece milestone effects, innate percentage attributes and ten equipped slots. Do not invent or give bonuses for pending effects.
- Carry trusted authenticated account readback, serialized DB lock / CAS, physical item custody, socket/enhancement/gem provenance and real final CP weights. QA callbacks do not provide release-level authority.
- Gate future Party Events, World Bosses and Player Market on the very same verified minted **Equipment 2.0 copy provenance**, never legacy gear, including resale.

## Remaining release blockers
- Final approved class/spec counterplay coefficient calibration based on measured results and multiple viable routes (not one mandatory class); actual Android timing and responsive UI review.
- Real Forge source/custody integration, T5–T9 equipment and professions progression, all final set effects and all approved item roll caps.
- Full four-player persistence, boss/enemy thresholds, replay and transactional rewards; World Bosses and Party Events owner/custody handoff; strict new-minted-only Player Market.
- The hidden `SkillsV2PreviewScreen.tsx:315` scroll-indicator presentation mismatch must not be altered without user review and approval. No UI/theme redesign is authorized.

**This PR cannot be merged into main, released or enabled independently.**
