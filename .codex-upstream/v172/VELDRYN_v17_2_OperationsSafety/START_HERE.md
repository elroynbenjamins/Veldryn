# START HERE — VELDRYN Control v17.2

This is the **Operations & Safety Foundation** pass built directly on the v17.1 VELDRYN Control website and the v17 Social Live-Ops / Party Events backend contract.

It is a real implementation/reference pack, not only a design document.

## v17.2 adds

1. **Server-authoritative Remote Config + emergency kill switches**
   - stable per-account staged rollouts,
   - Owner-only critical controls,
   - required reason + revision history,
   - client-safe exposure metadata,
   - live-safe value constraints,
   - global gameplay write lock,
   - feature gates for Parties, Party Contracts, Party Events, Guild recruitment, Live Dungeons, Market, Crafting, Chat, Companion Trials and reward claims,
   - safe tuning for global XP and Live Dungeon timers,
   - Party/social contribution hard ceilings that may only REDUCE a frozen event/system cap.

2. **Health & Economy monitoring**
   - bounded hourly telemetry buckets,
   - Gold created / destroyed / net,
   - market volume/trade hooks,
   - item generation hooks,
   - activity time, dungeon completion and social contribution hooks,
   - runtime-worker health,
   - open/acknowledged/resolved operational alerts,
   - reset/social dead-letter visibility.

3. **One central UTC reset service**
   - daily world boundary,
   - weekly Party Contract reset Monday 00:00 UTC,
   - monthly Companion Trials reset on day 1 at 00:00 UTC,
   - unique `(reset_key, period_key)` idempotency,
   - atomic `FOR UPDATE SKIP LOCKED` worker claiming,
   - retry/backoff/dead-letter design,
   - Owner-only schedule changes and manual retries.

4. **Player Support foundation**
   - support lookup index by existing VELDRYN public player ID / display name / account UUID,
   - masked Auth summary,
   - current character/social state inspection,
   - Party/Guild membership inspection,
   - Party Event progress/binding/reward-claim inspection,
   - account-specific operational alerts,
   - internal cases and notes,
   - deliberately NO currency grants, inventory edits, progression edits, reward injection, bans or destructive account actions in this pass.

## Apply order

If the real VELDRYN repository/database is already at v17.1, apply only the v17.2 changes and migration:

`supabase/migrations/20260914_028_operations_safety_foundation_v17_2.sql`

If it is not yet at v17/v17.1, merge those dependencies first. The original v17 backend pack remains in `dependencies/`.

## Mandatory backend wiring

The Control website alone does not magically enforce feature gates or generate telemetry. Codex must wire the included adapters into the CURRENT backend:

- `backend_integration/remote-config-v17_2.ts`
- `backend_integration/ops-metrics-v17_2.ts`
- `backend_integration/central-reset-service-v17_2.ts`
- `backend_integration/player-support-index-v17_2.ts`
- `backend_integration/OPERATIONS_WIRING_V17_2.md`

The current repository is authoritative. Adapt interfaces to the real repositories/services; do not replace newer systems wholesale.

## Cloudflare Pages deployment

The same **Cloudflare Pages Free** deployment used by v17.1 is still recommended. The site has no runtime frontend dependencies and uses a Pages Function for privileged admin API calls.

Build:

`npm run build`

Output directory:

`dist`

Read `DEPLOY_FREE_CLOUDFLARE_PAGES.md` and `SECURITY.md` before deployment.

## Verification in this pack

Local/reference validation covers:
- live-ops definition tests,
- deterministic rollout buckets,
- remote-config constraints,
- UTC reset period math,
- JavaScript syntax,
- strict TypeScript checks for the new backend adapters,
- production build,
- static secret/RLS/control-plane audit,
- ZIP integrity/checksums.

A real Supabase migration apply/reset, RLS verification, and current-repository end-to-end test still must be run by Codex against your actual VELDRYN project.
