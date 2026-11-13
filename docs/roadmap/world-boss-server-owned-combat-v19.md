# World Boss V19 — authenticated owner-state and server-simulated settlement

**November 13, 2026. HIDDEN / DEVELOPMENT ONLY.**
Builds on V18 private PostgreSQL transaction proposal. No new deployed migration
or live route; the feature flag stays OFF.

## Implemented code

- `backend/online/world-boss-auth-v19.ts`: server-only Supabase Auth
  `/auth/v1/user` verification factory; refuses malformed user identities and
  **does not trust user_metadata or decode client JWT payloads**. This is the
  co-op Edge pattern but is NOT mounted in a World Boss endpoint.
- `backend/online/world-boss-private-pg-v19.ts`: parameterized, direct
  PostgreSQL repository for `public.online_game_states`, private V17 event and
  attempt rows, and V18 reservation, checkout, settlement functions. Requires a
  trusted server-side Postgres executor: **no direct PostgREST/public RPC**,
  no service key in app code, no actual DB connection shipped.
- `backend/online/world-boss-service-v19.ts`: authenticated reserve and
  private worker settlement functions:
  1. Verify bearer session from Auth, validate a minimal event/character/
     request/order/revision selector. Reject client-supplied combat stats,
     untrusted fields and arbitrary game-state or power.
  2. **Read existing attempt before touching current equipment or generating
     entropy.** A retry returns the original status/ordinal; changed intent
     is rejected. V18 handles the final transactional race under event lock.
  3. For a new reservation, use owner+character-filtered online game state,
     positive revision and recent `updated_at` (7-day audit limit), V12 forged
     equipment verification, co-op stat/gem/companion rules, server-only power
     bracket policy and V9 roster construction. Random seed comes from
     server-side secure entropy, never a request ID.
  4. Freeze V9's full verified prepared roster as a **serialized string inside
     JSONB**, not an unordered JSONB object. This preserves V9/V10's
     order-sensitive SHA256 digest across a PostgreSQL round trip. The
     unmodified structured request, actor identities, server seed and digest
     must verify before simulation.
  5. A **private worker**, not a player HTTP request, checks out the frozen
     reservation and independently simulates the existing 14-round combat
     engine. It stores a content-addressed private replay **before** attempting
     the V18 atomic HP settlement. It submits server-calculated boss/guard
     damage with decimal precision matching the SQL `numeric(18,2)` receipt.
  6. The only user-appropriate reservation projection contains
     `status / ordinal / repeated`. Neither player endpoint nor mobile code
     receives the server entropy, borrowed fighter stats, internal worker ID,
     or damage authority.

## Deliberate release restrictions

- The verified initiator loads from actual game calculations, but the V19
  development adapter does **not** select real borrowed Echoes. V9's
  deterministic NPC role backfill is used instead. Future Echo sharing
  requires consent, owner-bound snapshot publication, expiry, duplicate
  protection, authorization and replay-safe frozen eligibility.
- There are **no approved five Combat Power cutoffs or production encounter
  threat profiles**. V19 injects a private bracket policy and requires no
  War Camp/profile digest when settling; live tuning is not authorized.
- Event IDs/characters must be PostgreSQL UUIDs; account identity is resolved
  by verified server Auth. The private DB reader validates row owner, selected
  character and revision. The eventual integration must verify actual staging
  `online_game_states` column types, ACLs, updated-at semantics, request key
  lifetime, PII handling and service connection privileges.
- The replay store is an injected durable **private** interface. Production
  storage, retention, encryption/access control and content-addressed collision
  checks are still required. If writing fails, no settlement is attempted.
- The code is not imported into any Edge handler, scheduler or mobile UI.
  V17/V18 DDL remains under `docs/roadmap/`, **not**
  `backend/supabase/migrations/`; do not apply it to production or staging.
- **No World Sigils, actual wallet credits, supply inventory debits, event
  scheduling or leaderboards are implemented by V19.** Do not claim launch
  readiness or real-player balance from synthetic tests.

## Verification

`apps/mobile/tests/world-boss-server-service-v19.ts` exercises real game
fixture equipment rules, verified initiator ownership and revision, Auth
lookup identity, forged-copy denial, stale revision, lost-ACK retries with no
reroll, stale/foreign account denial, order conflicts, canonical serialized
JSONB preservation, privately computed combat, durable-replay-before-commit,
corrupted frozen payload rejection, and parameterized SQL call assembly.
All data is synthetic and the database adapter is mocked for this unit test.

The V18 workflow already uses PostgreSQL 16 with **16 separate concurrent
reservation clients** and **12 simultaneous last-HP settlements**. V19 adds
service boundary coverage; a real staging end-to-end integration with two
separate private workers is still required before deployment.

## Next development pass

1. Establish reviewed private database access for authenticated service
   workers; verify the current online-state/characters DDL and safe replay
   store implementation, then exercise V19 against disposable PostgreSQL
   using actual parameterized query executor.
2. Add server-owned consented Echo snapshot readers and validated 1 Tank /
   2 Damage / 1 Support matching with realistic mixed-CP cohorts.
3. Bind event-fixed War Camp, V13 pressure profile and final five-bracket
   policy after statistical class-role calibration.
4. Implement atomic War Supplies debits, reward entitlement proofs, exact-once
   World Sigils up to 100/event, and account-safe result/readback projection.
5. Security review, separate-worker chaos/restart tests, migration generation
   through normal Supabase CLI flow, staging approval, then explicit launch
   authorization with all flags still OFF until signed off.

**Current V19 is an internal code path with real game-rule computations,
not an activated World Boss feature.**
