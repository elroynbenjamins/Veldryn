# Party Events V50 — one co-op event source per witnessed human (18 November 2026)

**State:** HIDDEN DRAFT ONLY. No production or staging installation; no service registration, scheduler, client RPC, player-visible Party Events, Event Points, Gold, XP, inbox, Party Renown or item payout.

## Why V50 follows V49

V49 snapshots the verified human actors at the exact successful live node commit. V43/V14 can later validate those immutable witnesses without consulting mutable live membership, so an ordinary dungeon disconnect does not erase evidence. But calling the credit RPC synchronously after the original co-op commit could lose progress on server crash. V50 makes a **durable, separate per-human source outbox** and validates that it is created in the same transaction as the canonical node.

## Draft components

- `docs/roadmap/party-events/hidden-migrations/20261118220000_party_event_coop_actor_outbox_v50.sql`: new private outbox with the witnessed `(run_id,node_id,account_id)` key and a foreign key to V49 evidence (account erasure cascades). Its AFTER INSERT trigger on the V49 attestation runs within the same canonical node settlement, enqueuing only actors in a real **active Stage 2** Party Event on a frozen roster, with at least **two witnessed event-roster humans**. The Party/week/stage is selected exclusively from private database rows, never client input.
- Separate lease/retry/complete SQL with max 25 rows, `FOR UPDATE SKIP LOCKED`, fresh DB-owned fencing token on each lease, 30–300-second lease bounds, bounded exponential backoff, and token-checked acknowledgement only after V43/V14 credit commits. No arbitrary failure or terminal-drop action is exposed.
- `backend/online/party-event-coop-source-dispatcher-v50.ts`: default-off, **unmounted** service-only dispatcher calling V43 with the actual immutable run/node/actor identity. It distinguishes first credit from replay and non-enrollment, never adds EP itself, and retries upon a credit or ACK outage.
- `backend/online/tests/party-event-coop-source-dispatcher-v50.ts`: deterministic canonical identity, replay, retry, stale-worker, invalid-leases and default-off tests.
- `backend/tests/party-event-coop-outbox-v50.mjs`: disposable PGlite executes real V49 and V50 DDL and tests two enrolled humans from a three-human dungeon, source durability after disconnect, exact node replay denial, lease takeover, backoff and retry, role restrictions, and a failure injected *after* source commit begins. The failed queue write rolls back the original canonical node, all V49 human witnesses and the outbox together.
- Hidden SQL/TypeScript contract checks and the existing full Party Events CI are expanded to include V50. Results must be read from exact-head CI, not assumed green.

## Important remaining blockers

1. The V50 dispatcher is **not connected to a running production or staging worker**. A future server-owned private database adapter must invoke its lease/complete/retry functions and V43/V14 using privileged connections. No user JWT or mobile request can supply actor/Party/week/source data.
2. Stage 2 currently requires the stage to be active **at credit execution time**. If a credit is delayed until stage 3 or event closure, V14 correctly rejects late new credit rather than bypassing locks. A reviewed stage-scoped eligible grace/locked-ledger design with expiration and replay tests is required before enabling automatic V50 delivery.
3. No historical co-op witnesses may be backfilled from mutable membership. If a node happened before V49 was installed, do not invent source-time participants.
4. Current V49 node witness is source-only and created on any successful qualifying live dungeon. V50 narrows actual outbox population to verified active Stage 2 event cohorts. It does not alter dungeon outcome, drops, boss phases or ordinary currency.
5. Release still depends on all source/receipt SQL passing, staging permissions, real co-op end-to-end fault injection, one-time objectives and Day 8 account-locked Gold/XP/items/Renown/Inbox, seven-day Android UX, accessible small-screen views, localization, balance and final go/no-go.

**This pass does not modify live players or make any reward claims.**
