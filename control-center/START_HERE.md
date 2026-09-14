# START HERE — VELDRYN Control v17.3 Full Control Center

This pack turns the earlier VELDRYN Control / Live-Ops console into the long-term private administration site for VELDRYN.

It is designed to merge into the **current local repository**, which the user described as broadly based on the v16-era implementation. The current local repository is authoritative. Older backend/source packs in this ZIP are compatibility/reference material only.

## Critical current product rule

**There is no player Market in VELDRYN.**

Do not restore old listing/order/trading UI, APIs, telemetry, remote config or support tooling from older reference files. The fresh v17.2 migration bundled here no longer seeds any Market control. Migration 029 contains only an idempotent cleanup for anyone who previously applied the older v17.2 pack.

## What v17.3 adds

### 1. Full Game Controls
A schema-driven, audited Admin Command Bus rather than direct database editing.

Current command families cover:
- account session/deletion recovery,
- chat moderation and account suspension,
- character rename,
- Gold and registered currency adjustment/repair,
- inventory/material adjustment/repair,
- reward-bundle grants and failed-claim recovery,
- skill XP adjustment/exact repair and derived progression recalculation,
- stuck activity recovery,
- entitlement overrides,
- pets/backgrounds/borders/skins/achievements/titles,
- companion grant/revoke and XP correction,
- Party/Guild membership, leadership, rename and disband repair,
- Live/Q-Mode Dungeon run/queue recovery,
- content-catalog synchronization.

The Control UI is generated from the command registry. Ordinary future admin actions normally need a new registry definition + trusted domain handler, **not a new page**.

### 2. Content Catalog
A read-only admin mirror of source-of-truth IDs used by safe dropdowns:
- items/materials,
- skills,
- non-premium currencies,
- premium currency,
- reward bundles,
- companions,
- entitlements,
- future registered content types.

Gameplay never trusts this mirror as its source of truth.

### 3. Secure Redeem Codes
Owners can create bounded codes tied to an already-validated reward bundle.
- high-entropy random generation by default,
- optional custom codes with minimum strength validation,
- SHA-256 hash stored in the database,
- plaintext returned only from the create request and kept only in current browser memory until hidden/refreshed,
- start/end window,
- global claim cap,
- per-account claim cap,
- enable/disable control,
- recent claim status visibility,
- atomic server-side reservation and idempotent reward-grant wiring.

### 4. Announcements
Schedule all-player, single-account, Guild or Event-participant messages, with optional push delivery through the trusted notification service.

### 5. Admin access
Owner / Editor / Viewer access is manageable from the site while protecting the last enabled Owner.

## Previous systems retained

- Live-Ops event builder, templates, immutable versioning and scheduling
- Party Event leaderboards/finalization
- remote config / kill switches / staged rollout
- health and economy telemetry
- central UTC reset service
- Player Support cases/read models
- worker health and dead-letter recovery
- append-only audit history

## Database apply order

If the current local database already has some of these migrations, **do not rewrite applied history**. Inspect first and create a new forward migration for any differences.

Reference order for a database that has none of these modules yet:

1. v17 Party/Live-Ops backend dependency
2. `20260913_027_liveops_admin_control.sql`
3. `20260914_028_operations_safety_foundation_v17_2.sql`
4. `20260914_029_full_control_center_v17_3.sql`

## Mandatory backend wiring

The Cloudflare site is only the private control plane. Real gameplay state changes must execute through the current game backend/domain services.

Read:
- `backend_integration/ADMIN_CONTROL_WIRING_V17_3.md`
- `backend_integration/REDEEM_CODE_WIRING_V17_3.md`
- `backend_integration/admin-command-worker-v17_3.ts`
- `backend_integration/admin-command-handlers-v16-reference.ts`
- `backend_integration/admin-content-catalog-v17_3.ts`
- `backend_integration/announcement-worker-v17_3.ts`
- `backend_integration/redeem-code-service-v17_3.ts`

Do not directly patch player tables from Cloudflare just because a support action is powerful.

## Free hosting

Use the same recommended deployment:

**Cloudflare Pages + Pages Functions (Free plan)**

Build command:

`npm run build`

Output:

`dist`

Read `DEPLOY_FREE_CLOUDFLARE_PAGES.md` and `SECURITY.md` before deployment.

## Local/reference verification

Run:

`npm run verify`

This pack can verify syntax, validation behavior, static SQL safety and secret leakage. Codex still must run the real migrations, RLS checks, domain-handler tests and end-to-end flows against the actual local VELDRYN repository/Supabase project.
