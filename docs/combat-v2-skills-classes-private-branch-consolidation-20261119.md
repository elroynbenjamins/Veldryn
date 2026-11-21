# Skills & Classes 2.0 — private branch synchronization and consolidation
Date: 2026-11-19 · Release state: **DRAFT / HIDDEN / NOT ENABLED**

## Canonical integration decision

**Canonical long-running draft**: `feature/combat-v2-foundation-contract-20261118`, PR #1377 targeting `main`. This document originates in the previously deepest private work branch and accompanies the canonical branch **fast-forward**.

Prior nested stack (each a direct ancestor of the next, no rebase or cherry-pick necessary):

| Source PR | Branch | Integration payload |
|---|---|---|
| #1377 | feature/combat-v2-foundation-contract-20261118 | 9 class identity/baseline contracts; 18 specs; skill variants/passives; full gear and enemy authority |
| #1410 | integration/combat-v2-edge-isolation-regressions-20261119 | live Edge isolation, inherited legacy combat and Q-Mode regression fences |
| #1414 | integration/combat-v2-persistence-settlement-gates-20261119 | PG17 solo immutable CAS snapshot and replayed outcome settlement boundary |
| #1417 | integration/combat-v2-atomic-rewards-balance-matrix-20261119 | pinned reward transaction, 540 synthetic class/tier/foe encounters, inherited CI recovery |
| #1419 | integration/combat-v2-transaction-writers-balance-diagnostics-20261119 | disposable QA-only grant ledger, Inbox proof, 16-way PG races, role/tier outlier reports |

A compare of #1377 head to #1419 head **before consolidation** showed 50 commits ahead and 0 behind. **Sync method**: one non-force, expected-SHA-checked fast-forward of the canonical #1377 branch; no changes to `main`, no release/feature flag toggles.

### Superseded draft handling

The four intermediate draft PRs remain referenced in history and can be closed as **superseded**, not merged into `main`. All source commits are retained in the canonical branch, and their detailed discussion remains available on GitHub. Do not cherry-pick them again or duplicate their source modules.

## Excluded parallel 2.0 branches

Two cross-system pilots have substantial unrelated divergence and must NOT be wholesale merged into Skills & Classes:
- `integration/combat-v2-enemy-class-snapshot-20261118` (enemy/class preview contract and status projection)
- `integration/combat-v2-exact-craft-interop-20261118` (exact crafted copies with **pre-scaled** rarity/quality evidence)

Their `backend/src/server/combat/v2-integration/` scripts belong to separate Equipment/Enemies coordination. In particular, pre-scaled crafting receipts cannot be passed through the Combat 2.0 item base pipeline that independently applies rarity and quality: that would double-count equipment. A server-authoritative source format choice or verified adapter must be approved before promotion.

Older `integration/combat-v2-ci-types-recovery-20261118`, `integration/combat-v2-enemy-effects-on-class-engine-20261118`, `integration/combat-v2-solo-persistence-20261118`, and `integration/combat-v2-traits-boss-kits-20261118` are already contained in the 50-commit lineage (0 commits ahead when compared against the latest private stack).

## Validation and release gates (not waived)

- On PR #1419's former head, the latest **available completed** Combat 2.0 job failed TypeScript parsing: an accidentally truncated QA-only reward writer's source-key regex. Fixed on the private branch as part of synchronization; all branch heads require fresh CI at the *new exact commit* before passing.
- PG17 snapshot reservation, hidden preview and transport checks had passed in that previous run; whole backend/server, synthetic class matrix and Edge checks were blocked by the QA writer compilation error.
- 540 fixtures remain **synthetic**, not production balance sign-off. T1 authored Enemy 2.0 kits remain a coverage gap; approved nine-class stat curves, tier roll budgets and source-owned transaction writers remain incomplete.
- The `main` line is already hundreds of commits ahead of the original private draft's fork point. This consolidation intentionally does **not** rebase on or merge from moving `main`; that conflict resolution, private migration/staging proof, Android checks, economy approval, and combined Equipment/Enemy release gate must occur as a separate reviewed integration pass.
- Live legacy dungeons, Q-Mode, World Bosses and reward issuance remain untouched. No live routes, Supabase migrations, activated flags or player item/stat rerolls are approved by this PR.

## Future development workflow

Continue Skills & Classes work on the canonical #1377 draft or a short-lived child branch targeting it, and report exact-head CI before claiming ready. Avoid opening additional multi-level drafts for purely linear work. Integrate Equipment/Enemies only after source version and class stat contracts match; do not cross-merge unsynchronized live-main state.
