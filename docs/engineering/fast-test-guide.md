# Fast test workflow (2026-11-22)

## Mobile gameplay regressions

The canonical mobile core manifest is `tools/mobile-core-tests.json`. Every entry
runs in its own process, and the default runner still performs a fresh TypeScript
compile and **all** checks. Do not delete regression cases solely to make CI pass.

From the repository root:

```sh
# List all core checks without compiling
node tools/run-mobile-core-tests.mjs --list

# Preview a focused selection without compiling
node tools/run-mobile-core-tests.mjs --list --match dungeon --match gem

# Recompile from source, then run relevant regressions
node tools/run-mobile-core-tests.mjs --match dungeon --match gem

# Full release regression suite
pnpm --dir apps/mobile test:core
```

`--match` is a case-insensitive substring of the manifest path and may be
repeated. Multiple filters are combined with OR. Unknown options and zero
matches fail rather than silently passing. Every actual run compiles fresh;
there is deliberately no stale-build shortcut. Execution remains sequential
to preserve existing test isolation. The runner now reports total duration,
compile duration and the five slowest selected checks.

## CI ownership and duplication

- `mobile-core-validation.yml` owns the **full mobile core suite** for mobile,
  backend and tools changes. Its `test:core` build also typechecks the core;
  the former separate `typecheck:core` step was redundant. It retains mobile
  app typechecking and all distinct release-safety checks.
- `gem-dungeon-runtime-validation.yml` still exercises its backend dungeon
  suite, but the mobile job selects gem-related core regressions instead of
  rerunning the whole 429-entry manifest.
- `v1-0-9-merge-validation.yml` retains the historical badge/profile/weapon
  regressions (including PGlite badge tenure) without rerunning unrelated
  mobile tests on the same PR. Full suite coverage remains in the canonical gate.

## Next optimization passes

1. Collect actual CI duration and failure data from finished workflow runs,
   not just queue size, before retiring more specialized jobs.
2. Consolidate repeated `tsc -p tsconfig.online.json` backend compilation into
   a single build per CI job while retaining all corresponding assertions.
3. Only archive an old version-specific workflow once its remaining unique
   checks have a named owner in an active workflow.
4. Keep staging, migrations, combat, dungeon settlement, inventory custody,
   auth and production deployment checks independent of cosmetic/UI changes.
5. Do not parallelize stateful, file-writing or database integration tests
   without an isolation audit and repeatable runs.

**Release rule:** do not treat a targeted green check as equivalent to the
full release gate. This optimization neither deploys nor changes gameplay.

## Pass 2: shared backend compiler and workflow audit

From the repository root, preview a CI batch without compiling:

```sh
node tools/run-backend-test-batch.mjs --list test:release-gate test:coop-composition test:qmode-merchant
```

The batch runner accepts only existing `test:*` scripts containing an
explicit `tsc [-p config]` followed by `node path.js` assertions. It rejects
unrecognized commands instead of replacing them with a silent pass. A requested
script runs its tests in the same order as its package definition and stops on
failure; independent `pnpm test:*` commands remain unchanged. The compilation
for each TypeScript configuration runs **once per batch**, before the first
test that needs it. Every test retains its own log group and elapsed time.

- Canonical mobile-core CI: 10 backend test scripts, 31 distinct node assertions,
  4 TypeScript targets (online, co-op composition, co-op rewards and gems), down
  from 10 compile invocations for these scripts. Other safety checks remain.
- Gem/dungeon validation backend job: 5 scripts use 4 distinct compiler targets;
  no assertions are removed.
- Dungeon-mechanics workflow: the *identical* regional clear-rate / minimum
  combat-power node test was invoked in two consecutive steps; now one execution
  covers both conditions.
- Release-economy and unsigned 1.0.11 candidate jobs: duplicate no-emit
  typechecks removed only where the very next compile of the same project
  already performs TypeScript validation. The release AAB job, staging
  protections and hidden-feature fences are untouched.

### Older workflow disposition

Do **not** delete a workflow merely because its file name contains a previous
version. The `release/1.0.10-aab-prep-20261115` and
`release/1.0.11-clean-consolidation-20261120` branches both still exist, so
their historically scoped diagnostic/reconciliation and unsigned staging jobs
are retained. The 1.0.9 badge workflow remains focused and preserves its
PGlite fixture. Retirement requires verification of no active branch consumers
and a replacement check owner.

### Known failures are not obsolete tests

Recent CI logs showed an Expo compatibility failure on a separate PR revision:
installed Expo 58.0.25 versus expected 58.0.26. The inspected `main` mobile
manifest **and lockfile** already reference Expo 58.0.26; do not bypass the Expo
dependency gate to make unrelated CI pass. Another 2.0 branch had a real
TypeScript missing-import error for
`equipment-crafting-v2-economy`; that is a source integration failure, not
a reason to delete core tests.

Measure actual run time using **completed successful jobs**, excluding queue
delay and early unrelated failures. Structural compile savings are not a claim
that the whole release suite is passing or faster by a verified percentage.
