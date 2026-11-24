# Skills / Equipment / Party Synchronization consolidation — 24 Nov 2026

Hidden review-only child of Class Synchronization PR #1726. This branch copies the 17 non-workflow files from Skills/Forge PR #1700 unchanged, merges both CI sections explicitly, and adds one new cross-system party matrix. No main merge, public route, DB write, item grant, UI, feature flag or deployment.

## Why consolidate now
#1700 and #1726 diverged historically, but their changed-file sets overlapped only in `.github/workflows/combat-v2-skills-validation.yml`. The Skills counterplay/Forge review modules therefore integrate without rewriting Party Synchronization runtime code.

## New matched-build party matrix
`party-sync-ten-slot-matrix.ts` runs 432 deterministic four-player dungeon cases:
- 36 legal 1 tank / 2 distinct damage / 1 support class compositions
- 6 current boss identities
- 2 specialization bands (spec index 0 and 1)
- real Skills 2.0 class skill compilation from the #1700 fixture
- all 10 Equipment 2.0 slots per character
- 2/4/6 set thresholds
- nine ordinary affix sources plus ten base item sources per character
- epic / quality 100 synthetic review profile
- Party Synchronization composition resolution and scoped encounter authority

Each synchronized run is compared with the exact same unsynchronized compiled party. The matrix requires deterministic replay, immutable original input/gear/build snapshots, identical Equipment compiler evidence, identical compiled personal stat snapshots, finite outcomes, and a broad 0.90–1.50 integration-only damage-ratio safety envelope. It records per-boss damage/survival changes rather than claiming approved balance.

## Explicit limitations
The ten-slot fixture remains synthetic review data. Signed Equipment 2.0 traits are intentionally not supplied to a four-player encounter because the existing trait authority remains persisted-solo-only. Persisted authored Enemy/Boss 2.0 kit authority also remains solo-only, so this matrix uses the shared private Enemy bridge for the six boss identities rather than claiming signed authored party-boss custody.

This is therefore the first genuine Skills + ten-slot Equipment + Party Synchronization compiler integration, but it is still NOT equal-CP final tuning and does not authorize a release.

## Next gates
1. Exact-head consolidated CI must pass.
2. Add authenticated persisted party/dungeon encounter roster and enemy-kit authority rather than QA callbacks.
3. Extend exact-copy Equipment trait authority to persisted party encounters without weakening its current solo provenance rules.
4. Repeat the 36 × 6 party matrix with signed party gear traits, authored persisted boss kits and matched CP/loadout budgets.
5. Tune Synchronization percentages only after that evidence; keep no-level/no-XP/random-party parity and no personal CP rules.
