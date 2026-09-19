# VELDRYN v18 reference verification report

Date: 2026-09-14

## Passed reference checks

- Backend strict TypeScript check against the supplied v17 contribution/Party reference modules.
- `guild-projects-v18.test.ts`: project slots/scaling, candidate board, voting/tie handling, Mixed rules, Decrees, seasonal scoring, roles and bulletin validation.
- `guild-project-service-v18.test.ts`: contribution settlement, idempotency and weekly Guild-binding behavior.
- Mobile core strict TypeScript check.
- Mobile Guild Project helper test.
- TSX syntax audit for all six supplied Guild screens.
- Static v18 pack audit: required files, migration transaction, RLS-enable coverage, manifest flags and critical schema surfaces.
- Active-code Market/Procurement audit: no forbidden Market imports/config/paths or Procurement runtime symbols in the supplied v18 backend/mobile implementation.
- Included v17.3 dependency ZIP integrity test.

## Deliberately not claimed

This environment is not the user's current local VELDRYN repository or deployed Supabase project. The following MUST be validated by Codex after merge:

- Real repository full build/typecheck/test suite.
- Real forward Supabase migration apply/reset in the project's actual schema.
- RLS and authorization tests against real Guild membership tables/role columns.
- Concurrent project starts, concurrent daily-cap settlements and concurrent final donations.
- Atomic Gold/item debit with the current authoritative economy/inventory services.
- Reward bundle IDs, building/resource IDs and permanent Guild progression mappings against current content registries.
- Current notification, quiet-hours, activity settlement and Guild XP integration.
- v16/v17/v17.3 regressions for systems already merged locally.
- End-to-end React Native rendering/navigation in the actual app.

Reference tests are evidence that the supplied isolated implementation is internally consistent; they are not a substitute for current-repository integration testing.
