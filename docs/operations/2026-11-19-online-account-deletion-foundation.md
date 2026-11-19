# Online-account deletion — request-only foundation and erasure release hold

**Status: DRAFT / NOT ENABLED / NO AUTH USER DELETION.** Related to #1057. Separate from character removal and offline "Delete local save".

## Delivered on the isolated branch

- A dedicated, compact **Data & Privacy → Online account deletion** disclosure, showing the signed-in identity and a localized request date. The request controls fail closed until the status lookup succeeds, and require refresh after ambiguous network failures.
- Explicit warnings about all characters, inventory, account-wide entitlements, guild membership, payments and Google Play subscriptions.
- While `ONLINE_ACCOUNT_DELETION_REQUESTS_RELEASED=false`, the UI links to the existing Privacy Policy/support process; it never exposes an unconfigured write button.
- A future authenticated request/cancel/status RPC contract. It writes only a pending **review request** for a *linked* account; it never calls `auth.admin.deleteUser`, deletes characters, or impersonates account owners.
- Single active request per account (PK + conditional UPSERT). Duplicate active submissions **do not update the row**, preserving its ID and timestamp; a cancelled request may be reopened. Cancellation is allowed only while pending.
- Guard verifies `auth.uid()`, the active `auth.sessions` JWT session and a non-anonymous `auth.users` account. An expected account ID is accepted only to prevent stale-account UI races and must exactly match server-derived `auth.uid()` for submit/status/cancel; it is never an authorization target. No service-role key in the mobile app or direct authenticated table access.
- RLS on the private queue, no anon/authenticated table grants. Public RPCs are deliberately owner-scoped and authenticated-only; the internal guard is not executable by a mobile role.

## Production Auth FK audit (read-only, 19 Nov 2026)

Among references to `auth.users` from the `public` and `private` schemas: **157 CASCADE**, **20 SET NULL**, and **11 NO ACTION** foreign keys. The 11 NO ACTION dependencies are:

| Table | Reference | Decision required |
| --- | --- | --- |
| `public.guilds` | `owner_account_id` | Transfer leadership or dissolve/reassign consistently |
| `public.event_dungeon_completions_v1` | `account_id` | Purge personal reward evidence or retain strictly anonymized aggregates |
| `private.reward_gift_campaigns_v1` | `actor_id` | Separate operator/admin audit from player ownership |
| `public.ops_alerts` | `acknowledged_by`, `resolved_by` | Preserve operational action trace without retaining the deleted identity |
| `public.ops_remote_config` | `updated_by` | Protect global config and operator history |
| `public.ops_remote_config_revisions` | `actor_account_id` | Evaluate immutable revisions and retention policy |
| `public.ops_reset_definitions` | `updated_by` | Protect reset definitions and operational audit history |
| `public.ops_support_cases` | `assigned_to`, `created_by` | Review support retention and ownership |
| `public.ops_support_notes` | `created_by` | Review support retention and lawful basis |

These are only **direct FK blockers**; inspect child tables, guild leadership, active dungeon/live-party transactions, Play Billing and refunds, Storage ownership, replay receipts, chat and backups before designing a destructive handler. Hidden World Boss/Market/Party Event schemas need an additional audit before their release.

## Release gate to enable *request intake only*

1. Generate/review the committed SQL migration via the project's migration CLI and check migration history order. Apply **staging only** after approval. Production migration stays blocked.
2. Test with disposable **linked** and anonymous staging users: unauthenticated, forged user IDs (none accepted), revoked `session_id`, expired JWT, malformed confirmation, duplicate request ID, concurrent submits, second-character retries, cancel/re-request, status scoped to owner, and RLS grants. No deleteUser calls.
3. Verify `auth.uid()` and `auth.sessions` checks still enforce auth on PostgREST/SECURITY DEFINER and anonymous sign-ins. Run Supabase security advisors.
4. Eight-language screen strings are authored in the branch; **verify on Android** (keyboard, large font, screen reader, scroll, locale layouts). Review error-message translations and confirm the Privacy Policy contact/support inbox workflow before enabling intake.
5. Explicit approval before setting `ONLINE_ACCOUNT_DELETION_REQUESTS_RELEASED=true`; confirm staging and production parity and monitor request intake.

## Verified in a rollback-only staging database exercise

- 19 November 2026: executed the exact branch migration with the outer `BEGIN/ROLLBACK` transaction; PostgreSQL accepted all statements and confirmed RLS, no direct authenticated table INSERT, authenticated-only submit RPC access, and no direct execute grant on the internal definer guard.
- Repeated after changing UPSERT to avoid duplicate updates: SQL compilation and privilege assertions passed.
- Negative runtime probes within the same rolled-back staging transaction confirmed `AUTH_REQUIRED` without a subject and `ACTIVE_SESSION_REQUIRED` when a fabricated JWT subject/session did not correspond to an active `auth.sessions` row.
- Follow-up schema queries confirmed the private queue, submit RPC and definer guard did **not** exist after rollback. No migrations, users, player states, or production services were changed.
- **NOT verified:** a real linked-user request, cancellation/re-request under concurrency, current-role RLS in a live PostgREST request, any Android device flow, staging migrations history, and GitHub CI on final PR head.

## Separate irreversible deletion release gate — NOT IMPLEMENTED

- Require fresh reauthentication at the moment of approval (password/one-time code or verified equivalent, not simply refreshed JWT), deliberate typed confirmation and recoverable status.
- Define policy for guild leadership, account-wide purchases/subscriptions and Google Play obligations, stored files, chat, moderation, financial/legal records, retention periods and anonymization.
- Use a **server-only** idempotent erasure orchestrator with explicit state transition, session blocking/revocation, dependency-safe transaction design and manual recovery on partial failure.
- Verify deterministic account/character deletion, identity unlinking, active JWT behavior, no orphaned references or asset ownership, retries, interrupted requests, and complete staging delete of **disposable accounts**.
- Never silently call `supabase.auth.admin.deleteUser` from the mobile app or assume cascading FKs alone perform legally sufficient erasure.
- Do not conflate "request received" with "account erased." Support/privacy processing must remain available until final self-service erasure is approved.

### Authoritative references

- Supabase user data / deleting users: https://supabase.com/docs/guides/auth/managing-user-data
- Supabase Auth sessions: https://supabase.com/docs/guides/auth/sessions
- Supabase Auth Admin deleteUser (server only): https://supabase.com/docs/reference/javascript/auth-admin-deleteuser
