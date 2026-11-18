# Party Events V48 — default-OFF canonical online gameplay commit bridge (18 Nov 2026)

**Status:** Hidden implementation draft in PR #1388. No deploy, no runtime activation, no migrations promoted to executable Supabase paths, no EP/reward writes, no change to current clients.

## Current backend contract (verified from main source)

`backend/online/gameplay.ts` authenticates the session, reads the existing command receipt, verifies the command, loads server-owned state and invokes `executeGameCommand` on the server. It derives weighted guild/party contributions from trusted game content and calls `public.commit_online_game_guild_pve_v1`. This existing RPC is the normal path and must remain unchanged by default. The current normal commit DOES NOT persist the new canonical Party Event `craft_receipts` or `idle_claim_receipts`.

## V48 implementation

- `backend/online/party-event-gameplay-commit-v48.ts` defines a **default-false** gate `PARTY_EVENT_GAMEPLAY_COMMIT_V48_RELEASED=false` and a pure plan function.
- `backend/online/gameplay.ts` uses that function only after authoritative game simulation and all existing contribution normalization. While the flag remains false, the adapter returns **the exact existing RPC name and exact original argument object**; all current gameplay semantics remain unchanged.
- A future deliberately enabled server-only *staging* path, only for eligible commands and real server-derived packet sources, would route the old arguments plus a V44 canonical packet to `public.commit_online_game_party_sources_server_v48`. The **draft** V48 PostgREST-accessible gateway grants `EXECUTE` only to `service_role` and delegates directly to private V45; that writer invokes the unchanged online commit inside its PostgreSQL transaction.
- `docs/roadmap/party-events/hidden-migrations/20261118194500_party_event_server_gateway_v48.sql` adds the required **unpromoted** public-schema RPC boundary. Verified current `backend/online/edge.ts` calls `/rest/v1/rpc/{name}` and cannot reach a private-schema function directly; V48 does not expose the private writer to `anon` or `authenticated` clients.
- PGlite tests call the actual gateway wrapper, assert only `service_role` has `EXECUTE`, and attempt a call using `SET ROLE authenticated` to prove a player role cannot invoke it. No brittle dependence on JWT claim GUCs.
- No Party Event routing for QA commands, create/delete or roster mutations, missing character, or empty eligible source packets. Queued multi-activity intervals remain unsupported because their segment timestamps are not authoritative enough.
- `backend/online/tests/party-event-gameplay-commit-v48.ts` checks unchanged default behavior, eligible source selection in pure preview only, stable idempotency, no direct rewards/EP in packet, QA/roster exclusion, empty and queued no-op, invalid source context denied.
- Hidden Party Events CI runs the V48 test after compiling server-only code.

## Release gating and follow-up

1. Exact-head GitHub CI green including TypeScript and V43–V48 tests (none should be presented as green before actually completed).
2. Independently review V45 private routine permissions, return JSON shape, V44 packet matching and all table schema assumptions on real *staging* data. SQL drafts under `docs/roadmap/party-events/hidden-migrations/` must NOT be promoted without these checks.
3. Only then install the hidden schema on staging, explicitly opt into the V48 bridge behind a private backend gate for staff accounts, and verify real authoritative game commands, canonical receipts, outbox rows, V14 event credit replay and whole-transaction rollback.
4. Finish source delivery for real human co-op node clears and V12–V17 special objectives, implement account-locked Day 8 rewards/Inbox and Party Renown, full 2–4 flexible-party balance, Android lifecycle, localization and small-screen QA, then controlled live rollout.

**Current release recommendation: NO-GO** until those gates close. This authoring pass has not activated any functionality or modified persistent databases.
