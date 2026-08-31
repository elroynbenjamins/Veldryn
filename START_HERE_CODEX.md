# START HERE — CODEX

Read these files in order before changing code:
1. `CODEX_IMPLEMENTATION_GUIDE.md`
2. `MVP_SCOPE.md`
3. `CONTENT_MAPPING.md`
4. `docs/implementation/TEST_CONTRACT.md`
5. `docs/implementation/UI_DESIGN_TOKENS.md`
6. `docs/sources/VELDRYN_Master_Design_Database_v4.5.xlsx`

## Current task
Polish and complete the offline Asterfall Milestone 1 without adding production online systems.

Priority order:
1. Core Home/activity feedback.
2. Loot/reward presentation.
3. Item comparison/equipment clarity.
4. Quest guidance and first-session pacing.
5. Fallen Knight encounter presentation/balance.
6. Local balance telemetry and debug screen.

Before committing gameplay changes run from `apps/mobile`:
`npm run typecheck:core`
`npm run test:pre-codex`

Do not deploy Supabase or enable paid infrastructure during this milestone.
