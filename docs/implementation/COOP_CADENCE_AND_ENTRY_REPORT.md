# Co-op cadence and entry requirements

Date: 2026-09-09

## Product decision

- Rootbound runs use exactly five non-boss nodes followed by one final boss.
- The end-to-end target is 6–8 minutes: roughly 4–6 minutes in the dungeon plus matchmaking, ready checks, choices and results.
- Entry is unlimited. Reward charges affect payout, never access.
- Each account shares three enhanced-reward charges across Live and Q-Mode. One charge returns every eight hours, up to three. At most twelve enhanced rewards can be claimed per week. Valid clears without a charge retain the existing 20% Marks payout.
- Rootbound Tier I–V require character levels 15, 20, 25, 30 and 35 respectively.
- Every run requires one Tank, two Damage and one Support. The server derives role and readiness, freezes the chosen loadout, and normalizes combat stats.

## Changed files

- Backend policy and engine: `backend/src/server/coop/config.ts`, `backend/src/server/coop/reward-cadence.ts`, `backend/src/server/coop/reward-integrity.ts`, `backend/src/server/expeditions/constants.ts`, `backend/src/server/expeditions/node-resolution.ts`.
- Acceptance and balance coverage: `backend/src/server/coop/__tests__/phase1-invariants.ts`, `phase4-routes.ts`, `phase11-rewards.ts`, `phase12-balance.ts`, `backend/artifacts/coop-balance-summary.json`.
- Database: `backend/supabase/migrations/20260922000000_coop_reward_charge_cadence.sql`, `20260923000000_coop_reward_week_clock.sql`.
- Mobile contract and UI: `apps/mobile/src/core/coop-dungeon-browsing.ts`, `coop-shared-run.ts`, `apps/mobile/src/dev/coop-dungeon-fixtures.ts`, `apps/mobile/src/components/coop/CoopDungeonBrowser.tsx`, `apps/mobile/src/i18n/coop.ts`, `apps/mobile/src/i18n/index.ts`, `apps/mobile/tests/coop-dungeon-browsing.ts`.

## Tests actually run

- `backend: npm run build` — PASS.
- Backend co-op phases 1–10 — PASS.
- `backend: npm run coop-phase11` — PASS, including shared Live/Q charges, post-charge 20% payout, eight-hour recovery and idempotency.
- `backend: npm run coop-phase12` — PASS, 8,000 simulated full-combat runs. Fixed route count was five; reference parties cleared 95.3% and 96.6%; solo roles cleared 0%; observed Damage share reached 41.52% without a cap.
- `apps/mobile: npm run test:core` — PASS, including all co-op browsing, loadout, shared-run, Q-Mode and localization suites.
- `supabase db push --linked --dry-run --include-all` — PASS; only migrations `20260921000000` and `20260922000000` were pending.
- `supabase db push --linked --include-all --yes` — PASS; the saved-loadout, reward-cadence and database-clock hardening migrations were applied to the hosted Veldryn project in two validated pushes.
- `supabase migration list --linked` — PASS; local and remote histories match through `20260923000000`.
- `supabase db lint --linked` — PASS; no schema errors found.
- A final repeat of `apps/mobile: npm run test:core` was blocked before tests ran by concurrent, out-of-scope TypeScript errors in the untracked `src/core/equipment-enhancement.ts`; the successful full run above was completed after the co-op code changes, and the final co-op-only edit after it changed localized route literals only.

## Remaining release work

- Exercise Tier II–V balance and add production content for the remaining dungeon maps.
- Measure real two-device end-to-end duration, queue time, reconnect behavior and database claim races before enabling the production flag.
