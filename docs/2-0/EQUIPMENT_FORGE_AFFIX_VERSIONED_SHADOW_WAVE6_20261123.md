# Veldryn 2.0 — Wave 6: versioned Forge affix shadow selection (23 Nov 2026)

**HIDDEN AND UNRELEASED.** Child of Wave 5 PR #1687 (Wave 4 #1682, Wave 3 #1679). No `main` merge, live gameplay, production SQL, Edge deployment, player item mint, UI/theme change, or economy changes.

## Scope and rationale

Wave 5 established **30 role/slot candidate pools**, technically able to carry the existing 1–3 Forge roll counts for **340 physically required class × T1–T4 tier × slot combinations**. Their eligibility and weighting are **not yet owner approved**. The old generator still has 88 unrollable original-role physical cells, 316 with possible off-slot/unsupported original Forge affixes, and 168 with too few exact-compatible affixes for maximum rarity, overlapping. No raw production item is retroactively fixed or discarded.

Wave 6 introduces an **entirely isolated shadow selector** in `backend/src/server/combat/v2/equipment-forge-affix-newmint-shadow.ts`.

- Uses **canonical original Forge recipe + piece ID**, deriving tier, class role and slot from the original server-owned manifest; never trusts client tier/rarity/slot to create equipment. It accepts rarity **only as a QA test case**, not as a client-authorized result.
- Requires an exact, **complete 30-row review fixture** for Tank, Damage and Support across all ten slots. Each row must contain the **precise ordered Wave 5 proposed compatible stat identities**, with a positive integral weight between 1 and 10,000 for *every* candidate. There are **no fallback values, in-code default probabilities or approval-flag overrides**.
- Requires five exact identity tags: `REVIEW_FIXTURE_NOT_SIGNED_POLICY`, a separate `eq2-affix-selection-shadow-v1-20261123-UNRELEASED` review version, source manifest version, original Forge rules version, and Wave 5 candidate review version. Unknown fields, missing/duplicate rows, wrong source stats, `potency`, omitted candidates, zero/fractional/overflowed weights or mismatched tags are rejected.
- A supplied QA draw callback selects distinct stat IDs by weighted draw without replacement, with fully validated output bounds. Each stat reuses the actual existing original Forge **tier percent ranges and rarity strength percentile bands**, and calculates an inspection-only magnitude + grade. Original rarity chances, quality calculation, baseStats scaling and affix counts are unchanged.
- The return value is **`EQ2_AFFIX_SELECTION_SHADOW_NOT_AN_ITEM`**, no account, character, job, instance ID, base stat multiplier, old `rulesVersion`, claim receipt, money transaction, custody, or production signature. It cannot be consumed as an original `V2DraftRollOutcome`. The only numerical weight distribution in tests is an explicitly synthetic QA fixture (`1,2,3,4`), not an approved or recommended player-facing table.
- Does not import into or modify `draftEquipmentV2Outcome`, `v2ServerCreateExactTemplate`, the original Forge claim/custody model, 1.x combat, live Edge or mobile. The private CI's public import fence now rejects the new shadow entrypoint by name.

### Test coverage (not proof of a live release)

The strict private regression is designed to exercise **169 genuine source templates × six original rarity bands × two extreme deterministic draw strategies = 2,028 complete shadow scenarios**, with real range/grade checking for every stat and anti-duplicate assertions. It also compares original frozen Forge generator outcomes **before and after** the review, and requires them to remain byte-identical. Adversarial tests cover missing/duplicate rows, wrong source identity/receipt-like fields, stale version tags, stat replacement, weight omissions, non-finite values and invalid QA draw callbacks.

The shadow preview intentionally reports `releaseReady:false`. **None** of the proposed affix eligibility/weight decisions has been approved for a production generator; no real signed policy, authenticated server mint or ten-item combat proof is provided here.

## Next work and release stop-gates

1. Present **candidate stat/role eligibility and weighting principles** for explicit owner review. Do not infer approval of `1,2,3,4` QA fixture weights. Decide whether Defense/Damage/Support receive additional slot-eligible unique source stat identities or whether Combat slot constraints should be amended with independently evaluated counterplay, especially Tank Gloves and Damage Helmets.
2. Once approved, create a **new real item `rulesVersion`** with source-issued canonical probabilities, correct cryptographic draw and truly immutable ledger claim/custody provenance. The current original version and existing copy bytes must stay unchanged.
3. Continue real Forge source set effects and per-piece innate stats reconciliation. No unsupported `potency` alias, no live signed set bonus, no unauthenticated temporary verified callback.
4. Resolve independently red Mobile/Edge/Dungeon/Skills/Economy CI, audit offline payout, market anti-legacy admission, release-gated 2.0 UI and themes.

**Do not claim Wave 6 is production-ready even if isolated private CI passes.** A review shadow selecting stat IDs is not a craftable, physically settled or Combat-authorized 2.0 equipment item.
