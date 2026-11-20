# World Boss V58 — private account privacy reader, hidden handoff

**18 November 2026 · Review-only code · No migration, production route or gameplay enablement**

## Why this matters

V51 already validates an Auth-derived account and requires an `accountPrivacy.allowRead()` gate *before and after* reading an account's World Boss snapshot. V57 defines the shared private account-deletion fence. Until V58 there was no concrete Postgres reader connecting the two.

`backend/online/world-boss-account-privacy-v58.ts` supplies the **private, parameterized, read-only** adapter:

```sql
SELECT (
  EXISTS(SELECT 1 FROM auth.users WHERE id=$1::uuid)
  AND NOT EXISTS(
    SELECT 1 FROM private.world_boss_erasure_fences_v57
    WHERE account_id=$1::uuid
  )
) AS "allowRead";
```

The account ID is bound as a positional parameter, never interpolated into SQL and **never accepted from the mobile request**. The trusted server must verify the bearer token with Supabase Auth and pass its confirmed `user.id`. The adapter returns true only when the Auth identity exists and the account has no erasure fence.

Missing schema, PostgreSQL permission failure, malformed response (including zero, multiple or non-boolean rows) and invalid UUIDs all fail closed. The existing V52 unmounted HTTP boundary maps private failures to a generic unavailable response. Neither this helper nor V51/V52 is a mounted endpoint.

`createWorldBossCurrentOverviewPgV58(pg)` combines the V51 private event/overview readers with the V58 privacy reader. The server host still must inject independently verified `authenticate`, audited launch Monday and server-owned UTC clock. `WORLD_BOSS_V58_PRIVATE_READ_LIVE=false` remains false.

## Tests and safety

- Extended `apps/mobile/tests/world-boss-current-overview-v51.ts` to exercise unfenced/active Auth users, pending deletion, removed Auth identities, parameter binding, malformed owner IDs, response-shape errors and the complete V51 private-read composition.
- Added `docs/roadmap/world-boss-account-privacy-v58-smoke.sql`: all synthetic rows are rolled back; demonstrates Auth user existence, a V57 fence, removed Auth identity and no public access to the fence table, using the actual private database schema in disposable PostgreSQL CI.
- Registered V58 files under the existing hidden World Boss CI workflow. **No green result is claimed until a completed exact-head workflow run is verified.**
- The adapter is read-only. It cannot delete accounts, remove replay objects, change World Boss HP, donate, credit Sigils or enable attacks.

## Remaining launch gates

1. Confirm actual account-erasure/retention policy under [#1348](https://github.com/elroynbenjamins/Veldryn/issues/1348); the V57 fence does not implement approved data retention or a real privacy worker.
2. Complete the durable V56 private privacy-service adapter, Auth session invalidation/Admin deletion, external replay object purge and coordinated worker locks; no connected credentials or user-facing routes are authorized in this draft.
3. Review migrations for V17–V58 with permissions and V57 fencing on **staging** before any provider is mounted; current staging has zero private World Boss tables and functions.
4. Finish disposable two-session Postgres regression and all exact-head GitHub Actions tests, then multi-character (currently three available characters per account) staging fixtures, offline/mobile QA, and accessibility review.
5. Retain global single-boss 14-day rotation. Do not grant any public/anon/authenticated access to the private tables/functions. Keep both World Boss gameplay and deletion routes disabled.

**V58 is an internal adapter and documented contract, not a claim that World Boss is ready or live.**
