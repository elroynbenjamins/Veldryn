# Equipment 2.0 V20 — integration recovery and verified static sensitivity

24 November 2026. V14 canonical catalogue/economy and V18 source effects remain unchanged. This is a draft integration branch, not a production release. C12 and D1–D10 remain open/enforced.

## Verified V19 outcomes

Exact V19 commit 543d2a65115dae8863248f9bd3cd6006e2c580fd:
- Hidden catalogue workflow 45387994541/job 138423871761 succeeded: 99 tests, zero failures. All 142 conditional definitions compiled to phase-bound QA intents, amount arithmetic and source comparison checks passed.
- Private expanded integration 45387994975/job 138423872821 succeeded. Its existing original Forge harness verified 18 source-compatible multi-slot class/spec builds (10 nine-slot and 8 ten-slot, zero source-gap slots), 36 short multi-slot engine runs and 324 regional boss baseline encounters. Existing 9/10-slot proof is the pinned original catalogue only.
- `EQ2_V19_STATIC` reports 324 actual-engine matched static-stat counterfactual pairs. Zero baseline wins and zero modified wins; both-win time metric null. Mean damage delta +430.0902; mean healing delta zero. Breakdown below, raw damage units, not percentages and not comparable as equal-power effects.

| Candidate channel | Pairs | Mean damage delta | Mean heal delta |
|---|---:|---:|---:|
| Defense | 72 | +5.6616 | 0 |
| Attack | 96 | +1119.3981 | 0 |
| Authored healing | 72 | 0 | 0 |
| Direct ability damage | 48 | +650.2341 | 0 |
| Max HP | 36 | +7.4483 | 0 |

These runs use a single genuine source-compiled original item, a common 150,000-HP QA boss stat fixture with genuine persisted authored regional ability/phase kits, 35-second maximum duration, solo combat and unchanged seed within each pair. No owned candidate set or trait; the proposed static coefficient alone is perturbed. Zero wins makes them unsuitable for final victory/clear-speed CP calibration. Zero healing delta does not prove support effects are useless. No conditional effects executed. Next benchmark should use tier-appropriate source-verified complete/multi-slot loadouts, record source gaps instead of inventing gear, production-relevant boss stat references or explicitly QA-labeled difficulty bands, longer encounter horizon, party healing workloads and role-appropriate outcomes. Do not use the current raw deltas as CP weights.

## Backend recovery

V18 broad logs showed 183 backend TypeScript errors, largely cross-project rootDir and missing historical readiness imports/metadata. V20 restores exact read-only dependencies from PR #1549 at 3da1a180211b0781fad10d573059486813b0f26b:
- mobile legacy audit blob 15e85970537c64e0373a3a2d6cfed16728757684
- mobile authoritative readiness blob 2861f6240c22943e05f7ffabeeefbf0fa026bbf3

No economics or live gameplay changes. These are historical preflight modules, not a final EQ2 production authority. Private GameState intersection allows opaque hidden ledger metadata in the three unmounted rehearsal modules and the four associated fixtures; original Mobile GameState type unchanged. Existing runtime validation of receipts, schema, custody and wallet remains unchanged.

Separate only the exact four cross-project rehearsal module/type files and five test files from backend-only rootDir compilation. A new dedicated strict cross-project config extends existing mobile core settings, explicitly includes all five original tests (delivery, game-state, gem-sidecar, virtual-custody, physical-delivery-staging), and the new private GameState CI workflow installs frozen dependencies, runs backend strict typecheck, compiles those tests and executes all five. Public route imports and enabled server gate are prohibited. This is boundary separation, not test deletion or replacing strict typecheck with a stub. New exact-head compilation and execution not confirmed; verify all tests in new workflow and check dependent scripts before considering merge.

## Edge isolation

The exact three previously rejected shared engine imports now have narrowly scoped legacy-build replacements: equipment trait authority, equipment trait runtime, dungeon reward engine. No authority returns empty Map/undefined; any explicit authority token (including falsy forged values) or V2 player marker throws. Runtime constructor unconditionally throws. Unexpected new V2 imports still fail; real private source paths and four new authority/policy markers are forbidden in compiled output. Tests extend existing isolation test, no weakening of real-source bans. Private engine stays unchanged. Generated gameplay/coop bundles NOT regenerated or deployed; parity still unresolved until build and exact artifact verification. Expo version/lockfile mismatch not changed.

V20 remains draft. No main merge, DB, staging/production flags, player state, reward, mint or market changes. No full CP approval. Conditional compiler is validated but actual effect adapter remains blocked until verified event provenance and source/custody rules are available.
