# World Boss V51 — authenticated current-cycle read-only bridge

**18 November 2026 · Hidden engineering draft · NO staging/production activation**

## Why V51

V41's private overview already validates event HP, War Camp, account attempts, donations, wallet and existing reward ledger. Its internal API, however, requires an `eventId` argument. The user-facing design must not allow choosing a different boss or gaining extra account-wide attempts. V50 defines one global canonical boss for each 14-day cycle.

V51 adds a **server-only** bridge that authenticates an account, selects the present global cycle from trusted config/clock, reads the matching private event row, and returns a tightly verified V41 payload. No mobile/client input can select a boss, event ID, account ID, launch epoch, calendar or attempt count.

## Implementation

`backend/online/world-boss-current-overview-v51.ts`:

1. Verify the incoming bearer credential using an injected trusted Auth provider; reject malformed/missing identities **before any database lookup**. Do not use JWT user metadata as account authority.
2. Read a server-configured Monday UTC launch epoch and a server-owned clock. Compute the canonical cycle and its boss with `worldBossRotationAtV50`. Before launch, report no event; **do not invent Hollowroot as live**.
3. Query the private World Boss event table for **all events overlapping the selected cycle**, using parameterized UTC bounds and `LIMIT 2`. Zero results means no announced event; two results means a broken uniqueness invariant and is rejected. A single but mistimed/wrong-boss event is rejected by `assertWorldBossCanonicalEventV50`.
4. Read `private.world_boss_v41_overview` through the preexisting private Postgres adapter using **only** the authenticated account ID and the privately selected event ID.
5. Validate the projection, event ownership, cycle boss ID, start date and read lease; return the original V41 read-only JSON shape without calculated `canAttack`/`canDonate` flags. No mutation, reservation, resource debit or currency claim is performed.
6. Keep `WORLD_BOSS_V51_AUTHENTICATED_OVERVIEW_LIVE=false`. No HTTP route or service-role credentials are added to mobile.

V51's SQL selector is deliberately a **read-time overlap detector**, *not* a database constraint or proof that concurrent event creation is safe. Before staging, add a transactionally enforced unique global cycle index and non-overlapping event interval constraint in a separately reviewed private migration.

## Mobile handoff

The developer-only `FeaturePreviewScreen` accepts an optional `worldBossReadCurrent(): Promise<unknown>` callback supplied **only by a future authenticated host**. It sends no account, event ID or token through the callback; its owner account UUID comes from the authenticated host, and all results still pass the original strict two-minute V46 decoder. The screen supports:

- Explicit loading, empty event, failed request and expired/invalid response states, without invented boss/currency data.
- User-requested Refresh, as well as an in-screen 60-second status refresh when a host callback exists; stale/foreign-account responses are discarded on route/account changes.
- All actions disabled in QA, regardless of the snapshot or backend status flags.
- No live callback passed by `apps/mobile/App.tsx`, no endpoint URL, no bundled service key, no Supabase RPC, no production feature flag.

The callback is **not** an authorization mechanism. The future HTTP/Edge endpoint must validate the bearer token with Auth (e.g. verified getUser), bind the account to the returned UID, enforce private server credentials and respond with no-store caching and proper status/error codes. Never proxy a client-provided account ID to the private SQL function.

## Security and QA gates

- Staging currently has no deployed `private.world_boss_*` schema, function or event. V51 cannot read live event data yet.
- `apps/mobile/tests/world-boss-current-overview-v51.ts` exercises account spoofing, unauthorized calls, unavailable event, prelaunch, altered boss identity/dates, stale response, second-cycle rotation, parameterized private SQL, and duplicate events. The existing World Boss CI includes V51.
- The mobile feature-hub source tests cover loader gating, race cancellation, hidden QA route, refresh states and unchanged disabled combat/economy buttons.
- Before a real staging integration: approve #1348 account deletion/retention, review SQL access & constraints, install migrations in staging with rollback tests, seed authorized 1–5 character fixtures, implement verified Auth endpoint, replace the injected callback with the reviewed host transport, test device lifecycle and screen reader, and confirm no privileges leak to `anon` or `authenticated`.
- Latest-head CI and native Android QA must pass; no staging write, migration or production activation is approved by V51.

**No deployment or user-facing World Boss availability is claimed.**
