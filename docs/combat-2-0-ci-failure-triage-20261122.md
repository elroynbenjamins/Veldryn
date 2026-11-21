# Hidden Combat 2.0 CI failure triage — 22 November 2026

**Development only:** This branch is stacked over draft 2.0 traits, not `main`.
Do not merge, deploy, change game flags or approve UI layouts based on this document.

## Root causes from last completed pre-fix run

| Check | Evidence | Remediation on this draft | Remaining gate |
| --- | --- | --- | --- |
| Combat 2.0 skills / Live Edge isolation | `unexpected_combat_v2_legacy_shim:./v2/equipment-trait-engine-authority` and `./v2/equipment-trait-engine-runtime` | The explicit no-authority Edge shim allowlist now covers Equipment 2.0, reactive rewards and shared reflection; all unauthorized input fails closed. Expanded adversarial isolated-builder tests. | Re-run exact-head build + legacy parity |
| Edge bundle parity | `tools/verify-gameplay-edge.mjs` previously built without the production isolation plugin used by `tools/build-online.mjs`; gameplay and co-op generated artifacts also differed from source | Verifier now uses the exact same fail-closed plugin and rejects any private V2 module reaching Edge; this does **not** fabricate identical generated artifacts. | Rebuild both generated Edge files from the verified source, review the diff, commit only through release-safe consolidation |
| Mobile Expo compatibility | Hidden stack pins `expo~58.0.25`, Expo check expects `~58.0.26` | Current `main` already pins `~58.0.26`; no blind manual edit of nested `pnpm-lock.yaml` in an older stacked branch | Controlled rebase/reconciliation with updated 1.0.11 dependency baseline; fresh frozen-lockfile and Expo checks |
| Gold core test | Old test expected 288 Gold for Copper Pickaxe; authored tier-one multiplier 3× and round-to-100 yield 400 | Test now asserts 400 and still verifies the entire source recipe/charged-price catalog | Re-run mobile-core |
| Gathering blueprint precision | `9 * 0.001` binary drift fails strict equality with `0.009` | Compute an integer number of rarity steps and divide by the integer precision denominator, preserving exact 0.10 percentage-point downward rounding | Re-run monster drop tests and mobile-core |
| Rarity balance test | Old 3.5% Thornling blueprint expectation, current 1.6% authored base × 75% scarcity × 95% general drop × downward 0.10% step = 1.1% | Updated test to 1.1% rather than weakening the intended rarer drop balance | Re-run mobile-core |
| Scroll-contract test | Hidden `SkillsV2PreviewScreen` lacked `showsHorizontalScrollIndicator={false}` | Added the prop only to the private preview; no redesign or production preview enablement | Re-run mobile-core |

## Important distinctions

- The **last previously completed** hidden dungeon reward suite passed before these later changes.
- The newer nine-reactive/four-person implementation and this CI-fix pass
  **have NOT yet received a passing exact-head CI run**.
- Several GitHub Actions runs are currently **queued**, not failed.
  This is a validation blocker, not evidence of a TypeScript/runtime failure.
- The broader mobile and Edge checks are **stack/base drift**, not proof of a
  Combat 2.0 simulation defect. Do not suppress checks or adjust assertions to
  hide bugs.
- Preserve production build isolation. A private Combat 2.0 import must never
  leak into a gameplay, co-op, mobile, or Edge bundle.
- No privileged transactional 4-player dungeon grant or persisted HP/room
  run implementation exists; synthetic QA verifiers are not DB authority.

## Next release-safe actions

1. Wait for a real exact-head backend compile and nine-reactive/four-player QA run; fix only evidenced failures.
2. Sync the dependency base with verified 1.0.11 (without overwriting the 2.0 stack).
3. Build both current Edge artifacts with the same isolation plugin, compare
   against the actual checked-in artifacts, and review generated diffs;
   do not hand-edit or bypass the parity validator.
4. Run the 403+ mobile-core checks and Live Edge parity after synchronization.
5. Do not merge anything into `main` until user approval and green gates.
