# Deploy VELDRYN Control v17.3 on Cloudflare Pages — Free setup

## Recommended host

Use **Cloudflare Pages + Pages Functions**. The site is mostly static and the privileged API runs only when the private Control site is used, so a one/few-person admin console should be extremely light.

The VELDRYN game backend/Supabase usage will dominate infrastructure usage long before this admin website does.

## 1. Private repository

Recommended repository:

`veldryn-control`

Keep it private. Do not commit `.dev.vars`, `.env`, service-role keys or exported production data.

## 2. Merge against the current VELDRYN backend first

The Control site and database migrations rely on actual game-domain services for state-changing commands.

The current local VELDRYN repository is authoritative. Apply/wire the backend pieces there before treating Controls as production-ready.

## 3. Database migrations

Inspect your real migration history first.

For a database that does not yet have these Control modules, the reference order is:

1. v17 Social Live-Ops / Party Event dependency
2. `supabase/migrations/20260913_027_liveops_admin_control.sql`
3. `supabase/migrations/20260914_028_operations_safety_foundation_v17_2.sql`
4. `supabase/migrations/20260914_029_full_control_center_v17_3.sql`

Never rewrite a migration that was already deployed. Create a new forward migration if your local/deployed history differs.

## 4. First Owner

Create/invite your admin email under Supabase Authentication and insert its Auth UUID into `liveops_admin_users`:

```sql
insert into public.liveops_admin_users(account_id, role, display_name)
values ('YOUR_AUTH_USER_UUID'::uuid, 'owner', 'VELDRYN Owner')
on conflict(account_id) do update
set role='owner', enabled=true, updated_at=now();
```

There is intentionally no public self-elevation route.

## 5. Cloudflare Pages project

In Cloudflare:

- Workers & Pages
- Create application
- Pages
- Connect to Git
- select only the private Control repository where possible

Use:

**Build command**

`npm run build`

**Build output**

`dist`

No frontend framework preset is required.

## 6. Variables / secret

### Build/public variables

`PUBLIC_SUPABASE_URL`

`PUBLIC_SUPABASE_ANON_KEY`

These are compiled into `dist/config.js`; the anon key is public by design.

### Pages Function variables

`SUPABASE_URL`

`SUPABASE_ANON_KEY`

### Pages Function secret

`SUPABASE_SERVICE_ROLE_KEY`

Store this as a Cloudflare secret. Never expose it to the browser build.

### Optional

`CONTROL_ALLOWED_ORIGIN=https://your-control-hostname`

`CONTROL_REQUIRE_DUAL_APPROVAL_CRITICAL=true|false`

Use dual approval only when there are at least two trusted Owner accounts.

## 7. Backend workers / scheduler

Wire and deploy:

- Party Live-Ops worker + heartbeat,
- central reset worker + heartbeat,
- Admin Command worker + heartbeat,
- announcement worker,
- operations monitor,
- content-catalog sync hooks,
- authenticated Redeem Code service endpoint.

The Control site should show a stale worker warning until each expected worker has reported health.

## 8. Rewards

Before publishing events or creating Redeem Codes, verify the referenced bundle exists in the real VELDRYN reward system, then mark it validated in **Rewards**.

## 9. Redeem Codes

The admin site stores only hashes/hints. The actual game redemption endpoint is part of the trusted VELDRYN backend, not Cloudflare browser code.

Read:

`backend_integration/REDEEM_CODE_WIRING_V17_3.md`

## 10. Optional second access wall

The app already requires Supabase login plus explicit VELDRYN admin membership. You can additionally place Cloudflare Access/Zero Trust in front of the admin hostname later.

## Updating

Normal operations do not require a website redeploy:
- create/schedule events,
- create Redeem Codes,
- run player support commands,
- publish announcements,
- change registered remote config,
- operate resets/alerts.

Redeploy only when the Control software itself changes or a fundamentally new admin/read-model capability is added.

## Cost

This Control site is intended to remain on the Cloudflare free tier at small private-admin usage. Provider quotas can change, so verify current Cloudflare/Supabase plan limits before production launch.
