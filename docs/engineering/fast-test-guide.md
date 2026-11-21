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
