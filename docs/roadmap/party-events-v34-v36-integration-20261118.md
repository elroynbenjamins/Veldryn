# Party Events — V34–V36 hidden integration continuation

**18 November 2026. Draft only; no launch, no migration, no paid claims.**

## Pass 1 — Authenticated private read boundary (V34)

- `backend/online/party-event-authenticated-read-v34.ts` is an **unmounted**
  server-side adapter that calls the Supabase Auth **getUser(token)** verifier
  for every request. It uses only the verified user's account UUID to invoke the
  V33 private, parameterized status reader. It accepts a bearer header, not a
  user-specified `accountId`, party ID, metadata claim or unsigned JWT.
- Rejects unverified, forged, missing or malformed headers before private SQL;
  handles account A → B → A without carrying forward another account's
  event record. No token or Auth errors are returned to callers.
- The envelope requires `Cache-Control: private, no-store` at a future HTTP
  boundary and keeps claiming, donating and fighting disabled.
- **No Edge Function, API route, PostgREST grant or mobile fetch is mounted.**
  The Supabase Auth client and private SQL handle must be created on the server
  only; never embed the `service_role` key in mobile.

## Pass 2 — Staging schema and permission readiness (V35)

- `backend/online/party-event-schema-readiness-v35.ts` defines read-only
  `pg_catalog` queries for the six V33 dependency tables and their exact
  column types. A passing structural audit requires RLS enabled, no anon or
  authenticated direct SELECT grant, and no player-callable private event
  functions. The audit is separate from any release approval.
- Verified **read-only** on `Veldryn Staging 20260924` on 18 Nov 2026:
  the private `party_event_*` tables/functions are **not installed**.
  A metadata-only schema probe against the V35 requirements found **28 expected
  column definitions, 0 matching and 28 missing**. No personal or player data
  was accessed in the probe. Real
  `public.characters`, `public.character_wallets`,
  `public.online_game_states`, and
  `public.guild_project_supply_catalogue_v1` exist.
- The existing Guild supply catalogue provides **three wood and three ore
  items, with no herb category entries**; however, the later **V22 hidden
  migration and gameplay source audit explicitly approve Level 1 Greenfields
  Dewleaf** (`DEWLEAF_PATCH`) as the herb starter item while keeping Thorn
  Sap disabled. The source mapping is verified in draft code but **not installed
  on staging**, so three-category live supply orders remain blocked.
- Tests verify that missing/incorrect columns, absent RLS, unexpected player
  privileges, exposed private function EXECUTE, and duplicate audit rows all
  produce a non-ready report. This is no production migration or DDL.

## Pass 3 — Read-only Day 8 proof preflight (V36)

- `backend/online/party-event-day8-audit-v36.ts` cross-checks account/offer,
  frozen character, week identity, event closure + one-hour settlement hold,
  locked Stage 2 and 3 ballots, completed **required** Stage 1–3 supply orders,
  reconciled reward evidence, current online revision/gold/quote, released
  SQL locks, and any prior paid receipt.
- A coherent projection can only produce `previewEvidenceCoherent:true`.
  Its `canGrant`, `payoutAuthorized` and `claimReady` fields stay **false**,
  *even for a passing fixture*. A malformed snapshot fails closed.
- The actual `settlePartyEventDay8V36` entry point always throws an explicit
  unreleased error. No wallet, resource, XP, Renown, Inbox, ledger or receipt
  writes are provided. Test cases cover 17 negative security/consistency paths.

## Independent blockers and next work

1. Latest-head focused CI and broader mobile/economy/Edge parity validation;
   read CI statuses from this specific head after every new commit.
2. Review hidden migrations against actual staging and install only after
   explicit schema/RLS/rollback review; no private events schema exists yet.
3. Independently validate audited herb sources, category unlocks and real
   donation receipts before consuming resources.
4. Build authenticated Edge/server read transport **after** the private
   source is deployed, then verify stale async responses, account switching,
   background/foreground, no-store headers, and locale/UI semantics.
5. Build a **single atomic** account-locked payout writer: compare current
   revisions and exact quote, update all canonical stores, create a paired
   receipt and native Inbox item, commit or roll back together, and guarantee
   exactly-once concurrent replay. Party Renown has no approved canonical
   persistence in V28 and **must not** be faked.
6. Balance all nine classes / 2–4 member mixes, story finales and reward
   economics and run live-device visual/translation QA.

### Existing unrelated CI blockers

The prior broad mobile suite failed tests tied to an independent tools
recipe/cost and blueprint drop-rate rebalance. The prior generated gameplay /
co-op Edge parity job similarly identified stale tool-crafting constants.
These failures should be repaired on their owning economy integration, not
silenced in the hidden Party Events branch.

**All Party Events feature flags remain off, SQL drafts stay outside
`supabase/migrations`, and both backend PR #1347 and UI PR #1349 stay draft.**
