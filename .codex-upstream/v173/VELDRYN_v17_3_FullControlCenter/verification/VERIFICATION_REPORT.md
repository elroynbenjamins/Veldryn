# VELDRYN v17.3 Full Control Center — Verification Report

Date: 2026-09-14
Compatibility baseline: current local VELDRYN repository, described as broadly v16-era. The current local repository remains authoritative during merge.

## Product correction verified

The player Market is removed from VELDRYN.

- No active Market code exists in the Control UI, admin API, operations metrics, remote config adapter, or v16 reference command handlers.
- Migration 028 does not seed a Market feature flag.
- Migration 029 contains only an idempotent cleanup of `feature.market.enabled` for anyone who applied the older v17.2 pack before this correction.
- Historical v16/backend dependency material may still contain deprecated Market files; Codex is explicitly instructed not to restore them.

## Reference checks completed

- `npm run verify` — PASS
  - Node tests: 16/16 PASS
  - production static build: PASS
  - v17.2/v17.3 SQL static safety audit: PASS
  - pack static verification: PASS
- `tsc -p tsconfig.backend-check.json` — PASS for included v17.2/v17.3 backend adapters (historical v17.1 worker-health adapter is intentionally excluded because its v17 dependency path lives inside the dependency ZIP).
- JavaScript syntax checks for admin API/shared modules/browser app — PASS.
- Browser source/build service-role secret scan — PASS.
- Removed-Market active implementation scan — PASS.

## Included control surface

- Live-Ops events/templates/calendar/rewards/leaderboards
- Remote Config, kill switches and stable staged rollouts
- Health/economy/worker monitoring and central reset operations
- Player Support read models, cases and internal notes
- Owner/Editor/Viewer administration and audit history
- Schema-driven Admin Command Bus for powerful support/game-state corrections
- Gold/currency/inventory/progression/entitlement/collection/companion/social/dungeon/account/moderation controls
- Content Catalog synchronization
- Secure hashed Redeem Codes
- Scheduled announcements

## Deployment-only checks still required

These cannot be truthfully completed without the user's actual current local repository and Supabase project:

1. Diff/merge against the current local VELDRYN source tree; do not overwrite newer local work.
2. Inspect which v16.1/v17/v17.1/v17.2 migrations/features are already integrated.
3. Apply only forward migrations to the real Supabase environment; never rewrite already-applied migration history.
4. Run real RLS/role tests with anon, authenticated and service-role contexts.
5. Run concurrent command-claim, redeem-code claim, reset-worker and critical dual-approval tests against PostgreSQL.
6. Wire every enabled Admin Command handler through current authoritative game/domain services, then run backend integration tests.
7. Verify economy/reward idempotency and receipt behavior against the real reward/inventory/purchase systems.
8. Verify account suspension/deletion/session invalidation against the production auth flow.
9. Verify Party/Guild/Live Dungeon/Q-Mode recovery commands against current implementations.
10. Verify Cloudflare Pages secrets/public Supabase config and end-to-end admin authentication before exposing the site.

The pack is a reference implementation/merge pack; it is not claimed to have been deployed to Cloudflare or the user's Supabase project.
