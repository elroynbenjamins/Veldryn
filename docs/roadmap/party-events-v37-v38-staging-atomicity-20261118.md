# Party Events V36–V38 continuation — 18 Nov 2026

**Backend PR #1347: DRAFT. No migration installed, no live event transport,
no payout writer, and no player-facing rollout.**

## Pass 1 — Correct the Day 8 regression fixture

The prior V36 test changed `eventStartsAt` alone, creating a five/14-day
week. V33 correctly rejected that as an invalid snapshot instead of the
expected cross-offer date mismatch. The corrected test moves **both** week
endpoints by seven days for an identity mismatch, then separately verifies
that an invalid interval produces `invalid_event_snapshot`.

The exact focused PR workflow for `0aae61d9e1d8d78be996088d771d4db5f0065071`
completed successfully. Later commits must be validated independently.

## Pass 2 — Private migration and canonical material review (V37)

- The hidden V11, V16 and V17 SQL provides the core V33 tables. The V35
  readiness contract contains **28 required column definitions**.
- `backend/tests/party-event-hidden-migrations-v37.mjs` compares those
  source SQL definitions, RLS declarations, restricted grants, and the
  v29 paired receipt/Inbox and v30 locked-read routines. It also checks
  that the hidden release-dated migrations remain outside executable
  `backend/supabase/migrations`.
- The audited **V22** source includes real Level 1 Greenfields:
  `GREENWOOD_TREE → GREENWOOD_LOG`,
  `GREENFIELDS_COPPER_OUTCROP → COPPER_ORE`,
  and `DEWLEAF_PATCH → DEWLEAF`. Hidden V22 enables *Dewleaf*, keeping
  Thorn Sap and other unverified herbs disabled.
- The old **Guild** supply catalogue contains no herb category rows;
  that does **not** mean Dewleaf is ungatherable. V22 resolves the hidden
  starter-source requirement at the **code/draft SQL level only**.
- `party-event-staging-assessment-v37.ts` evaluates actual canonical
  gathering data plus a strictly verified schema and reviewed migration
  contract. It can report dry-run readiness but always returns
  `deployAuthorized:false`, `liveEventEnabled:false`,
  `rewardClaimsEnabled:false`.
- Fresh read-only staging metadata probe: **zero** installed private
  `party_event_*` tables. No staging or production DDL was executed.
  The currently deployed staging schema therefore still fails closed.

## Pass 3 — Day 8 economy and replay hardening (V36 / V38)

- V36 now requires **exactly one** completed required wood, ore and herb
  order in each of the **three** stages. Three wood orders no longer
  masquerade as a complete set of category requirements.
- Negative cases explicitly include duplicate-category substitutes and
  missing herbs; all claimed/granted/paid flags remain hard false.
- `backend/tests/party-event-atomic-rollback-v38.mjs` exercises a
  **disposable PGlite simulation**, not a production writer. It intentionally
  fails after wallet update, after paid receipt insertion, after Inbox
  insertion and at commit when the paired Inbox row is missing. It verifies
  transaction-wide rollback, stale revision rejection, account ownership,
  no duplicate reward on same week / reused request, and that separate
  event weeks can each commit once in the simulation.
- Existing `backend/tests/party-event-paid-schema-v29.mjs` separately
  tests the actual draft v29 SQL schema, its deferred paired foreign keys,
  frozen quote consistency, RLS/GRANT constraints and locked recovery.
- **Important limitation:** neither the mock V38 packet nor the V36 audit
  authorizes a production claim; no real online save, wallet, XP, inventory,
  companion, Party Renown, recovery or Inbox writes were deployed.

## Remaining gates before merge or activation

1. Pass exact-head CI for V37/V38, then broader Mobile/Android/Edge parity.
2. Independently review migration chain order, dependencies, definer grants,
   RLS, source data and rollback. Promote to **staging only** with approval;
   staging currently has no hidden Party Events tables.
3. Test real **transactional** online state + wallet + skill projections +
   companion resources + Party Renown + linked native Inbox, under account
   row lock, exact revision/quote verification and concurrent replays.
4. Integrate verified-authenticated V34 transport only after private tables
   exist. Keep account switching/no-store/abort-safe mobile behavior.
5. QA 2–4 person class-role mixes, 7-day/14-day cadence, all four story
   families, finale combat and rewards, translations and device UX.

**No release switch, production migration or new public function was enabled.**
