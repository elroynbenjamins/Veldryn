# Deploy VELDRYN Control on Cloudflare Pages — Free setup

## Why Cloudflare Pages

This project is designed for Cloudflare Pages because the admin UI is almost entirely static, while the few privileged API calls run in Pages Functions on the same origin.

For a private one/few-person VELDRYN admin tool, expected traffic is tiny.

## 1. Create a private GitHub repository

Recommended name:

`veldryn-control`

Upload this project folder to that repository. Do **not** commit `.dev.vars`, `.env`, or any service-role key.

Cloudflare Pages supports private GitHub repositories.

## 2. Apply the Supabase migration

The game database needs v16.1 + v17 before this admin migration.

Apply:

`supabase/migrations/20260913_027_liveops_admin_control.sql`

Using your normal Supabase migration pipeline is preferred. During early development, Supabase SQL Editor is also acceptable.

## 3. Wire worker health

Adapt `backend_integration/liveops-worker-health-v17_1.ts` to the current server repository and route the existing v17 once-per-minute worker entrypoint through it.

The admin site will show a stale/unknown worker warning until the server has written its first heartbeat.

See `backend_integration/WORKER_HEALTH_WIRING.md`.

## 4. Create the first admin account

Create/invite your own email under Supabase Authentication -> Users.

Copy the user's UUID, then run:

```sql
insert into public.liveops_admin_users(account_id, role, display_name)
values ('YOUR_AUTH_USER_UUID'::uuid, 'owner', 'VELDRYN Owner')
on conflict(account_id) do update
set role='owner', enabled=true, updated_at=now();
```

There is intentionally no public "make me admin" route.

## 5. Connect Cloudflare Pages to GitHub

In Cloudflare:

- Workers & Pages
- Create application
- Pages
- Connect to Git
- Select only the private `veldryn-control` repository if possible

Use:

**Build command**

`npm run build`

**Build output directory**

`dist`

No framework preset is required.

## 6. Configure variables and secrets

Set these for Production, and Preview too if you want preview deployments to work.

### Public/build variables

`PUBLIC_SUPABASE_URL`

Example: `https://abc123.supabase.co`

`PUBLIC_SUPABASE_ANON_KEY`

Your Supabase anon/public key. This key is designed to be public; RLS still controls normal client access.

### Pages Function variables

`SUPABASE_URL`

Same project URL.

`SUPABASE_ANON_KEY`

Same anon/public key. The Function uses it only to validate the signed-in user's access token against Supabase Auth.

### Pages Function secret

`SUPABASE_SERVICE_ROLE_KEY`

**Mark/store this as a secret. Never expose it to the build output.**

### Optional origin allow-list

`CONTROL_ALLOWED_ORIGIN`

Example after first deployment:

`https://veldryn-control.pages.dev`

Same-origin requests are accepted automatically, so this value is mostly useful when you deliberately use another admin origin during development.

## 7. Deploy

Trigger a deployment.

The build script creates:

- `dist/index.html`
- `dist/app.js`
- `dist/styles.css`
- `dist/liveops.js`
- `dist/config.js`
- security headers/redirect files

Cloudflare separately deploys the root `functions/` directory as the protected `/api/admin` endpoint.

## 8. Sign in

Open the Pages URL and sign in with the Supabase Auth email/password you bootstrapped into `liveops_admin_users`.

A valid game/Supabase account that is **not** in the admin table receives `admin_access_required` and cannot use the admin API.

## 9. Validate rewards before publishing

Migration 027 seeds the v17 reward IDs into the admin Reward Catalog with:

`validated = false`

This is deliberate.

Before you can publish an event, use your Owner account to verify that each reward bundle is genuinely implemented in the game's existing economy grant path, then mark it Validated.

This prevents an event from going live with a typo or an unimplemented reward ID.

## 10. Optional second security layer

The application already requires Supabase login + explicit VELDRYN admin membership.

If you later attach a domain to Cloudflare, Cloudflare Access/Zero Trust can also be placed in front of the admin hostname as a second identity gate. This is optional, not required for the app's own authorization model.

## Updating the site

Push to the connected GitHub branch. Cloudflare Pages automatically creates a new deployment.

Normal event creation does **not** require redeploying the site. You only redeploy when the admin software itself changes.

---

# v17.2 deployment additions

After the v17.1 Control migration is present, apply:

`supabase/migrations/20260914_028_operations_safety_foundation_v17_2.sql`

No new Cloudflare secret is required for v17.2; it continues using the same protected Supabase service-role binding in the Pages Function.

The additional Remote Config / Health / Resets / Support pages are part of the same static build, so they do not require another web host or another database.

Backend/cron deployment must additionally wire:
- remote config repository/cache,
- hourly ops metric writes,
- `central_reset_worker` on the existing scheduler (at least once per minute),
- support-index lifecycle sync,
- runtime health heartbeats/alerts.

For a small private developer dashboard, Cloudflare Pages' free tier remains the recommended target. Provider quotas can change over time, so check Cloudflare's current free-plan limits before production launch; the dashboard itself should generate negligible traffic compared with the game.
