# World Boss V45 — staging readiness and rollback rehearsal plan

**Read-only preflight completed on Veldryn staging on 18 November 2026.
No schema/data mutation, player account IDs, inventory or replay content accessed.**

## Measured staging result
The checked-in `world-boss-staging-preflight-v45.sql` was executed unchanged
against Veldryn staging (PostgreSQL 17.6):

| Check | Result |
| --- | --- |
| Public one-save-per-account shape & class owner columns | **compatible** |
| Private World Boss tables | **0** |
| Private World Boss functions | **0** |
| Relational accounts containing 3–5 characters | **0** |
| Approved launch route, rollback, erasure policy, calibration | **not proven** |
| Ready for launch | **false** |

Public `online_game_states` is keyed on `account_id`, not
`character_id`. `public.characters.account_id` references `auth.users`
with `ON DELETE CASCADE`; World Boss prototype account references under
`docs/` still have restrictive FKs and require the #1348 erasure decision.
The preflight only checks schema shapes. It cannot prove V33 ownership,
multi-character roster load or transaction behavior for a real account.

## Planned incremental rollout (not executed)
1. **Review gate:** prove the World Boss private draft chain V17, V18, V22,
   V26, V27 and V28 on disposable PG17 against a copy of staging *schema
   metadata*; reconcile current server save/owner/auth contracts. Prove
   each `private.world_boss_*` function is invokable only by service role.
2. **Backup and recovery gate:** retain a recovery point and a reviewed
   dependency graph before an approved migration. Test restoring the entire
   unpublished private subsystem in an isolated database. Never use
   `DROP SCHEMA private CASCADE`, because it is a shared schema.
3. **Private schema install:** only after approval, create versioned
   migration files for the reviewed private objects. Keep events `draft`,
   schedules disabled, no player RPC grants, no client-visible routes,
   no actual wallet integration. Verify ACL, RLS and schema audit.
4. **Synthetic account tests:** in a transaction or isolated staging
   test cohort, prove 1–3 new-class characters and 4–5 legacy fighters,
   active/inactive save ownership, locked attempt slot, idempotent retries,
   Saturday frozen bonuses, donation rollback, immutable replay, global HP
   near zero, exactly-once claim/receipt.
5. **Read-side integration:** expose only a separately reviewed authenticated
   service action, deriving account ID from trusted Auth, with short cache
   lifetime and explicit event selection. Do not surface the private SQL
   function directly through the Supabase Data API.
6. **Go-live gate:** require a reviewed event schedule, real nine-class
   bracket calibration, planned account deletion/retention (#1348),
   inventory/economy QA, Android test coverage and sign-off. No automatic
   event activation follows a migration.

## Abort / rollback decision tree
- **Before install:** no rollback needed; this V45 pass made no changes.
- **Installed but never used (all new tables empty, no workers/routes):**
  freeze any workers; verify provenance of each migration-created object and
  dependencies; run the approved *reverse-order* uninstallation against
  an isolated copy first. Preserve unrelated objects in `private`.
- **Any donation, attempt, claim, wallet or replay evidence exists:**
  **DO NOT delete or reset the private ledger**. Disable feature routes,
  schedules and writers; snapshot relevant data; reconcile player costs,
  committed damage and outstanding claim liabilities before a coordinated
  forward fix or audited restore procedure.
- **Failed schema verification:** fail closed, revoke unreviewed exposure,
  block events and do not open production gameplay.
- **After rollback:** require an empty leaked/public access audit, matching
  expected database catalog, no grants to `anon`/`authenticated`,
  and a new exact-head CI+staging smoke before any retry.

## Remaining blockers
Real staging lacks World Boss schema and a multi-character test fixture.
No authoritatively authenticated public/Edge route is wired. The draft
`WORLD_BOSS_*_LIVE` flags remain false; V28 Impact remains locked; the
Expo baseline and account-erasure/retention review remain open. **This
document is not approval to deploy a migration.**
