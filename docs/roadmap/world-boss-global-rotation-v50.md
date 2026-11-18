# World Boss V50 — one canonical realm-wide boss per 14 days

**18 November 2026 · Hidden prototype only · NOT RELEASED**

## Product contract

One and only one World Boss is announced for the entire realm in each global event cycle. Bosses do not have separate world tabs, concurrent events, or independent account attempts. All characters on an account fight **the same boss** during a single event; attempts remain **three per account**.

| Zero-based cycle index modulo three | Stable event boss ID | Player-facing name | Region |
| --- | --- | --- | --- |
| 0 | `hollowroot` | Hollowroot | Asterfall |
| 1 | `sunscar` | Solbrand | Sunscar |
| 2 | `frostmarch` | Rimewarden | Frostmarch |

**Never migrate those three internal IDs**: they are part of frozen combat scripts, encounter/replay checks, event ledger receipts and historic schema. The names Solbrand and Rimewarden are **presentation labels**, and old private combat actor IDs are identifiers, not player-facing strings.

## UTC cadence

- Server-owned launch Monday 00:00 UTC = index 0, **Hollowroot**.
- Every subsequent 14-day Monday 00:00 UTC increments index by exactly one; rotation loops after three cycles (42 days).
- Event day 1–5 Monday through Friday: War Camp preparation, at most two donations per account, with Saturday freeze.
- Event day 6–7: one continuous worldwide 48-hour fight, Saturday 00:00 through Monday 00:00 UTC (exclusive), three attacks per account.
- Event day 8–14: recovery/results; no new attacks or donations; next cycle begins after day 14.
- DST/local time never changes the UTC world event. The UI may show the local-time translation and the UTC boundary.
- Before launch the first cycle is *upcoming*, never an assumed active encounter.

## Hidden enforcement utilities

`backend/src/server/combat/world-boss-weekend-v22.ts` exports:
- `worldBossRotationForCycleV50(serverLaunchUtcMs,index)` — pure immutable schedule with exact timestamps and canonical boss ID.
- `worldBossRotationAtV50(serverLaunchUtcMs,serverNowUtcMs)` — one current (or prelaunch upcoming) event.
- `assertWorldBossCanonicalEventV50(serverLaunchUtcMs,event)` — rejects an event row with an inconsistent boss ID or start/end dates.
- `WORLD_BOSS_V50_ROTATION_LIVE=false` — reminder that no route, event job, schema or wallet feature is activated.

The existing V22 14-day UTC schedule remains the authority for phase boundaries. Tests in `apps/mobile/tests/world-boss-weekend-account-raid-v22.ts` cover six consecutive cycles, Monday boundaries, prelaunch, UTC DST changes, invalid epochs/indices, and altered boss IDs.

## Critical transactional work before release

The pure utilities **do not guarantee one event row in PostgreSQL**; implement that *separately* in the private event provisioning transaction:
1. Derive the launch epoch from trusted server configuration, never from a client request or feature preview.
2. Under a serialized server process or database advisory/event lock, check the cycle index against the canonical resolver.
3. Enforce a unique global cycle index and no overlapping worldwide event windows in PostgreSQL. Consider a uniqueness constraint plus range exclusion; validate the exact existing private schema first.
4. Reject a second active event even when its boss ID or region differs. Do not grant three additional attacks when an account selects a different character.
5. Write idempotent event provisioning and rollback/compensation tests. Re-check after simulated worker retries, concurrent starts, week boundaries and a crashed finalizer.
6. Derive all player-facing boss portraits, names and future history labels from a single trusted `bossId`, with no selector or default boss when the authenticated snapshot is absent.
7. Complete staging migrations, authenticated read/write services, 1–5 character fixtures, economy settlement, erasure/retention (#1348), Android QA and explicit launch approval.

**No database migration, Supabase write, live schedule or account reward was changed in V50.**
