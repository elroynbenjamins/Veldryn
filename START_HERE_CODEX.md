# Start here — VELDRYN development

Read these files in order before changing gameplay or content:

1. `CODEX_IMPLEMENTATION_GUIDE.md`
2. `MVP_SCOPE.md`
3. `CONTENT_MAPPING.md`
4. `docs/implementation/README.md`
5. `docs/implementation/TEST_CONTRACT.md`
6. `docs/implementation/UI_DESIGN_TOKENS.md`
7. `docs/sources/VELDRYN_Master_Design_Database_v5.6.xlsx`

## Current priorities

1. Preserve the complete offline Asterfall/Fallen Knight progression loop.
2. Complete authenticated server-backed Q-Mode and Live co-op integration without weakening server authority.
3. Keep co-op disabled by default until database concurrency, multi-device, reconnect, reward, and security gates pass.
4. Implement and balance Frostmarch before Ashlands; keep both gated until their encounter registries are complete.
5. Keep event expeditions as previews until their schedules, encounters, art, eligibility, and reward budgets are authoritative.
6. Continue native UI, accessibility, localization, telemetry, and release hardening.

## Required verification

For mobile gameplay changes, run the relevant checks from `apps/mobile`, normally:

```powershell
pnpm run typecheck:core
pnpm run test:core
pnpm run test:pre-codex
```

For backend/co-op changes, run `pnpm run typecheck`, `pnpm run build`, the affected smoke suites, and the applicable `coop-phase*` acceptance scripts from `backend`.

Before applying a Supabase migration, inspect linked migration status, perform a linked dry run, and lint the schema. Never put a service-role key in the mobile application.

After each implementation pass, report changed files, commands actually run, results, and remaining work in `docs/implementation/COOP_CURRENT_STATUS.md` or the relevant durable system document.
