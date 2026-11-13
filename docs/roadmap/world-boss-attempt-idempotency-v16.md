# World Boss V16 — retry before roster generation

**November 13, 2026 · Hidden test-only server coordinator. No World Boss feature is live.**

## What changed

V10's existing in-memory reservation engine supports three account-level
attempts, 15-minute hard recovery, two-minute worker leases, immutable
seed/squad/phase, fencing and last-HP clipping. But its callers must **read an
existing reservation before generating a second V9 roster and nonce**.
A network lost ACK or a quick retry on another worker could otherwise
regenerate a seed, producing an avoidable idempotency conflict.

The new `backend/src/server/combat/world-boss-attempt-command-v16.ts`
models the missing **server-only orchestration step**:

1. Validate only a server-authenticated principal plus client-selectable
   event ID, character ID, request ID and War Order. Never accept game-state
   JSON, combat stats, power, seed, arbitrary squad, damage or phase.
2. **Read (event, authenticated account, request ID) first**. When present,
   verify event/account/character/order, status, ordinal, frozen seed/digest
   and any committed settlement. Return a detached copy, including after
   event close; a voided request remains a tombstone.
3. On a genuinely new request, use the existing V9 authoritative roster
   resolver and server entropy. Call one atomic, server-owned reservation
   method. No result can be minted from the mobile request.
4. Under concurrent requests, only a known V10 idempotency conflict may
   trigger a second read. The losing worker returns the existing winning
   reservation, never its freshly generated random seed. All other errors
   propagate. A different character/War Order with the same request key
   is denied without consuming another attempt.

The `WorldBossAttemptStoreV16` contract does **not** provide a database
implementation and is not proof of cross-worker durability. The existing V10
single-process emulator is used solely by tests. Do not attach any public
HTTP route to this adapter: the returned internal reservation contains
server-only seed and full combatant snapshots.

## Validation

`apps/mobile/tests/world-boss-attempt-command-v16.ts` tests:

- First reservation; lost ACK retry with no fresh roster read or nonce.
- 12 concurrent same-key callers: one immutable winning reservation, 11
  canonical duplicate responses, one boss HP settlement.
- Read after event close; full committed replay digest retained.
- Request-ID reuse with a different character/War Order blocked.
- Voided request tombstone cannot silently reroll; a fresh ID may reuse
  an available ordinal.
- Foreign reservation, invalid principal/request, and failed storage read
  rejected; three account-wide attempts enforced by the store.

The focused workflow now runs V16 after the original V7–V15 World Boss
regressions. Synthetic fixtures do not read player data and are not a
production multi-worker SQL test.

## Next launch-blocking steps

- Implement the repository using approved **private PostgreSQL tables**,
  with event/account locks, partial unique active ordinal constraints and
  permanent unique idempotency tombstones. Test two physically separate
  workers and transaction isolation, not just Promise concurrency.
- Durable checkout generation and leases, immutable roster/War Camp/phase/
  threat profile, and atomic last-HP settlement must be enforced in SQL.
- Verify owner-bound GameState, CP distribution and five-bracket profile
  selection through an authenticated service, not request JSON.
- Add rollback-safe War Supplies inventory debit, trusted reward
  entitlements, 100 World Sigils max and server-side exactly-once grants.
- Keep the public World Boss flag OFF until full economy, fairness, security,
  mobile and release gate reviews approve a launch.

**No production/staging database read or write, migration, route, currency,
inventory debit, player reward, combat balance adjustment or event activation.**
