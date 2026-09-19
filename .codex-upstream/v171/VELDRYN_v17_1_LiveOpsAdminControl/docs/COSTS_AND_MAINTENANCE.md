# Costs & maintenance

## Cloudflare Pages

The admin site itself is expected to cost €0 at VELDRYN's initial/admin-only scale.

- Static assets are served by Cloudflare Pages.
- The API uses only a handful of Pages Function calls when an admin opens screens or performs actions.
- There is no always-running admin server.
- A site deployment occurs only when admin-site code changes.

Normal event creation, scheduling and monitoring happen in the database and do not require a new site deployment.

## Supabase

This site should use the **same VELDRYN backend project** rather than creating a second game database.

The additional admin workload is negligible compared with actual game traffic:

- a few admin Auth sessions,
- small draft/template/audit tables,
- reads of the existing v17 Live-Ops tables.

The game's eventual Supabase/hosting plan is a separate production scaling decision. Do not size VELDRYN's game backend based on the tiny admin-panel usage.

## Maintenance

Routine maintenance is low:

No code change needed for:
- cloning Frostfall/Veilbreak/etc. for a new year,
- changing dates,
- changing eligible activity categories,
- changing milestones,
- selecting different validated reward bundle IDs,
- changing permitted event multipliers inside v17 bounds,
- scheduling/cancelling/archiving events.

Admin-site/backend code changes are needed when VELDRYN adds a **new event capability** that the existing v17 schema cannot express, for example:
- a global world-boss HP bar,
- multi-phase event scripting,
- server-wide faction choice,
- new reward mechanic,
- new contribution category outside Combat/Skilling.

That is feature development, not monthly maintenance.
