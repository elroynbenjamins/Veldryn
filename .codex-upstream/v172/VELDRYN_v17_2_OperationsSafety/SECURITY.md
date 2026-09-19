# VELDRYN Control — Security contract

## Secrets

The only highly privileged credential in this project is `SUPABASE_SERVICE_ROLE_KEY`.

It is read only by `functions/api/admin.js` through Cloudflare runtime secrets.

It must never appear in:

- `src/`,
- generated `dist/`,
- Git history,
- React Native/mobile code,
- screenshots,
- browser localStorage,
- browser environment configuration,
- player-accessible APIs.

## Browser authentication

The browser signs in directly to Supabase Auth using the project URL and public anon key.

It stores a short-lived access token and refresh token in localStorage for the admin session. This is suitable for this small private tool only when the site is served over HTTPS and protected from injected third-party scripts. The supplied CSP disallows third-party script origins.

For a later enterprise-grade control plane, move to secure HttpOnly server sessions and mandatory MFA/device policies.

## Admin authorization

Every `/api/admin` request:

1. must include a valid Supabase access token,
2. resolves the user through Supabase Auth,
3. checks `liveops_admin_users`,
4. rejects disabled/non-admin accounts,
5. enforces one of:
   - Viewer,
   - Editor,
   - Owner.

Viewer:
- read dashboard/templates/definitions/events/rewards/leaderboards/audit.

Editor:
- Viewer permissions,
- create/edit/delete drafts,
- edit templates,
- publish definitions,
- schedule/reschedule scheduled events,
- cancel scheduled events,
- archive finalized/cancelled events.

Owner:
- all Editor permissions,
- validate/edit reward catalog,
- emergency-cancel active/settling events with a reason,
- retry reviewed contribution outbox dead-letter rows through the normal worker pipeline.

## Database exposure

Migration 027 enables RLS on all new admin tables and creates no normal anon/authenticated access policies.

The mobile game must never query these admin tables directly.

Existing v17 player-readable event tables remain governed by v17 policies.

## Immutable live event content

The admin site cannot update a published `liveops_event_definitions` row.

The v17 database trigger rejects update/delete of published definitions.

Editing after publication means:

Clone published definition -> increment version -> edit draft -> validate -> publish new immutable version.

Scheduled instances snapshot the exact definition/hash.

## Reward safety

Publishing is blocked when any referenced reward bundle is:

- absent from `liveops_admin_reward_catalog`,
- disabled,
- not explicitly validated by an Owner.

`validated=true` is an operator assertion, not automatic proof. Codex must wire/verify every bundle ID against the real economy reward registry.

## Worker health and dead-letter recovery

The game server/cron, not the browser, writes `liveops_runtime_health`. The admin UI only reads the heartbeat.

A dead-letter retry does not execute gameplay settlement inside the admin request. It resets the envelope to `pending`; the regular v17 worker processes it again. Existing downstream idempotency receipts remain the safety boundary.

## Audit

Successful mutations create records in `liveops_admin_audit_log`.

Audit rows are intentionally append-only from the site's point of view. Do not add delete/edit controls to the UI.

## Recommended operational rules

- One Owner account for you initially.
- Enable strong password and Supabase MFA when available in the actual project.
- Do not share Owner credentials.
- Create Editor/Viewer accounts instead of sharing one login if another person later helps.
- Keep GitHub repository private.
- Limit Cloudflare GitHub App access to the admin repository only.
- Review audit log before/after important seasonal events.
- Never mark a reward Validated until the real reward-grant path has been tested.
- Use new definition versions instead of attempting to patch live event balance invisibly.

## v17.2 Operations security additions

### Remote config is not a client authority
The mobile app may receive resolved `client_safe` flags so it can hide/disable UI, but every gameplay mutation must be checked again on the trusted backend. A modified APK must not be able to bypass a kill switch.

### Registered controls only
The Control site edits only keys that already exist in `ops_remote_config`. Do not add a generic "create arbitrary config key" UI. New remotely controlled behavior requires code/migration review and explicit bounds/defaults/risk metadata.

### Critical controls
`risk_tier=critical` requires Owner role. The Pages Function also requires an operator reason and writes both an immutable config revision and the Control audit log.

### Support privacy
`ops_support_accounts` is a denormalized lookup index, not a shadow user database. Do not store passwords, access/refresh tokens, payment data, private chat content, medical/sensitive profile data or device fingerprints there. The Control API masks Auth email in the returned support summary.

### Support actions
v17.2 intentionally does not provide economy/progression mutation buttons. Future support mutations must be narrow server commands with idempotency, role checks, reason, before/after snapshots and audit logging.

### Metrics
Operational metric dimensions must stay bounded and non-identifying. Do not put account IDs, emails or free-form player text in `ops_metric_buckets` dimensions.

### Reset safety
Reset handlers must be idempotent by `(reset_key, period_key)`. Do not manually bypass the reset ledger by running raw SQL against progression tables during ordinary support operations.
