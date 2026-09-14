# VELDRYN Control — Security contract

## Privileged secret

`SUPABASE_SERVICE_ROLE_KEY` is read only by Cloudflare Pages Functions / trusted backend workers.

It must never appear in:
- `src/` or `dist/`,
- React Native/mobile code,
- Git history,
- screenshots,
- browser localStorage,
- browser-visible environment config,
- player-facing endpoints.

## Authentication and roles

The private browser app signs into Supabase Auth using the public anon key. Every `/api/admin` request then resolves the authenticated user and checks `liveops_admin_users`.

Roles:
- **Viewer** — read-only operational access.
- **Editor** — routine event/support operations and medium-risk controls permitted by registry metadata.
- **Owner** — critical controls, reward validation, redeem codes, admin access, emergency operations.

The last enabled Owner cannot be disabled/demoted through the site.

For a small private console, localStorage access/refresh tokens are acceptable only behind HTTPS with the supplied restrictive CSP. Use Supabase MFA for Owner accounts where available. For a larger staff control plane, migrate to HttpOnly server sessions and stronger device/access policy.

## Admin Command Bus

There is deliberately **no raw SQL/table editor**.

State-changing player support is expressed as registered commands with:
- typed schema,
- target scope,
- minimum role,
- risk tier,
- reason,
- typed confirmation for high/critical operations,
- optional/mandatory second approval,
- idempotency key,
- append-only lifecycle events,
- trusted backend handler.

The Pages Function only validates and queues commands. A trusted game worker executes them through normal domain services.

Critical command dual approval can be enforced with:

`CONTROL_REQUIRE_DUAL_APPROVAL_CRITICAL=true`

When enabled, the requesting Owner cannot approve their own critical command.

## Reversals

A reversal is another audited command, never a database rewind. Handlers may return reversal metadata only when the game-domain operation can actually be reversed safely.

Do not claim automatic reversibility for rewards or items that may already have been consumed/transformed.

## Content catalog

`ops_admin_content_catalog` is a read-only-for-admin mirror. It exists to prevent typo/arbitrary IDs in support commands.

It is **not** gameplay source of truth. Trusted backend code syncs it from real registries after content updates.

## Reward safety

Live-Ops publishing and Redeem Code creation require reward bundle IDs that are enabled and explicitly validated.

Validation is an operator assertion. The underlying reward bundle must still exist in VELDRYN's authoritative reward registry and grant through normal idempotent reward receipts.

## Redeem-code security

- Random codes use a cryptographically secure generator.
- The DB stores SHA-256 code hashes plus a short hint only.
- Plaintext is returned only on the create request and is not persisted by the Control backend.
- Do not log admin request bodies containing custom/plaintext codes.
- Game redemption resolves the account from the authenticated server session; never accept an arbitrary account UUID from the client.
- `reserve_ops_redeem_code_claim()` is service-role only and atomically enforces enabled/time/global/per-account limits.
- Reward granting uses the reservation's idempotency key so crash/retry cannot double-grant.

## Remote config and kill switches

Client-safe flags are display hints only. Protected game endpoints enforce the resolved server value again. A modified APK must not bypass a disabled feature.

Only registered live-safe keys can be edited; no arbitrary key creator is exposed.

## Metrics and support privacy

Operational metrics must use bounded, non-identifying dimensions. Support indexes/cases must not store passwords, auth tokens, payment details, private chat bodies, device fingerprints or unrelated sensitive profile data.

## Audit

Control mutations write the main admin audit log. Admin Command events and Remote Config revisions are append-only by database trigger.

Do not add edit/delete controls for forensic history.

## Database exposure

All Control-plane tables enable RLS and revoke anon/authenticated access. Player/mobile clients do not query them directly.

## Current product boundary

The player Market is removed from VELDRYN. Do not restore old trading/listing control surfaces from historical backend references.
