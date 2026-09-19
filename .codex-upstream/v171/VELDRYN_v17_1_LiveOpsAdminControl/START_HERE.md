# START HERE — VELDRYN Control v17.1

This pack adds a **private Live-Ops administration website** for the v17 Social Live-Ops + Party Events engine.

It is deliberately a separate web project from the mobile game. Players never need this code and the VELDRYN APK must never contain its server secrets.

## What you get

- Secure Supabase email/password admin login.
- Explicit Owner / Editor / Viewer authorization.
- Dashboard for active, scheduled, settling and draft events.
- Full Party Event Builder for the v17 definition model.
- Combat / Skilling / Mixed eligibility controls.
- Activity/challenge multipliers with v17-safe bounds.
- Region/content-tag restrictions.
- Personal and Party milestone editor.
- Reward catalog safety gate.
- Party ranking / anti-leech rules editor.
- Local-time schedule entry with UTC authoritative storage.
- Immutable definition publishing.
- Event scheduling, rescheduling before start, cancellation and archival.
- Reusable editable templates seeded with the five v17 events.
- Clone published definition -> next version workflow.
- Live/final Party leaderboard inspection.
- Event operational stats.
- Admin audit log.
- Live-Ops worker heartbeat/health monitoring.
- Dead-letter contribution inspection + Owner-only safe retry through the normal idempotent worker.
- Responsive dark VELDRYN-themed UI.
- Cloudflare Pages Function backend so the Supabase service-role key is never in browser JavaScript.
- No frontend framework and no runtime npm dependencies.

## Dependency

This pack depends on the v17 database/content contract. The original v17 ZIP is included under `dependencies/` when this package is distributed.

Apply v16.1/v17 first if they are not yet in the real VELDRYN repository/database, then apply:

`supabase/migrations/20260913_027_liveops_admin_control.sql`

## Recommended deployment

Use **Cloudflare Pages Free**.

Build command:

`npm run build`

Output directory:

`dist`

The `functions/` directory is the private same-origin admin API.

Read `DEPLOY_FREE_CLOUDFLARE_PAGES.md` before deployment.

## Security model

Browser:
- public Supabase project URL,
- public Supabase anon key,
- user's short-lived Auth access token.

Cloudflare Pages Function only:
- Supabase service-role key.

Database:
- admin tables have RLS enabled and intentionally no normal authenticated/anon policies,
- Pages Function validates the user's Supabase token,
- then checks `liveops_admin_users`,
- then applies Owner / Editor / Viewer permissions,
- mutations are written to `liveops_admin_audit_log`.

Never put `SUPABASE_SERVICE_ROLE_KEY` in `src/`, `config.js`, GitHub, the mobile app or a client-side environment variable.

## First-time setup sequence

1. Merge/apply v17 if it is not already present.
2. Apply migration `20260913_027_liveops_admin_control.sql`.
3. Create your admin user in Supabase Auth.
4. Copy that Auth user's UUID.
5. Bootstrap that UUID as Owner using the SQL shown at the end of the migration and in the deployment guide.
6. Wire the existing v17 once-per-minute worker through `backend_integration/liveops-worker-health-v17_1.ts` (adapt imports/repository to the current backend).
7. Confirm the real game economy can grant each v17 reward bundle and mark those bundles Validated in the Control site.
8. Deploy this folder to a private GitHub repository connected to Cloudflare Pages.
9. Configure Cloudflare environment variables/secrets.
10. Sign in to the Pages URL.

The site is then ready to create and schedule events without changing mobile-game source code.
