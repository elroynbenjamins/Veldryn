# World Boss V17 — private PostgreSQL transaction foundation

**2026-11-13. Hidden and not deployed.** Stacked after V16, which fixes
read-before-prepare idempotency and canonical V9/V10 roster commitments.

## What exists

- [V17 SQL contract](world-boss-postgres-contract-v17.sql) creates three
  **proposed** private tables: event state, account/event attempt reservations,
  and one-time milestone crossings. It does not import V9's vulnerable global
  ordinal uniqueness or create a World Boss event.
- The request primary key includes **voided tombstones forever**, while a
  **partial** unique index permits an ordinal to be reused by a new request
  only when the previous reservation is voided.
- A private invoker-security trigger prevents mutation of the frozen
  event/actor/phase/seed/roster/War Camp/threat/engine identifiers, terminal
  receipt changes, and unfenced worker-lease owner changes.
- Database checks enforce a three-slot ordinal range, 2-minute/15-minute
  lease fields (timing policy itself belongs to the trusted service), positive
  event HP and coherent committed HP delta; milestone keys are unique.
- Private tables have RLS enabled and no anon/authenticated grants. There
  are **no public or SECURITY DEFINER RPCs**. Service credentials must never
  be placed in a mobile build.

The schema is a **review draft**, not under
`backend/supabase/migrations/`. It must not be applied to staging or
production until it passes authorization, migration, performance and
transaction-isolation review. In particular, a digest is an integrity
commitment, not account authentication.

## Required durable operation contracts (not implemented in V17)

Every transaction begins with the **same order of row locks**: lock event
`FOR UPDATE`, then (when present) the specific account/request attempt row
`FOR UPDATE`, then dependent milestone rows. Never hold a database lock
while simulating the 14 rounds or running combat animations.

### Reserve

1. Server authenticates the principal before reaching the repository; only
   server-owned class/equipment/gem/companion resolution may build the roster.
2. Read current `(event, account, request)` before preparing a new roster
   or generating a seed, as V16 does. Re-read under the event lock inside
   the short reservation transaction to handle simultaneous workers.
3. Under the event lock, expire only *past-hard-deadline* uncommitted rows as
   `voided` (preserve their request IDs). Verify active event UTC window,
   owner/character, roster binding, policy versions and server-side event
   state. Do not trust request JSON for account ID, seed or CP.
4. Select the lowest free ordinal from `generate_series(1,3)` where no
   `reserved/committed` row uses it. Insert exactly one row with the
   server-generated nonce, immutable four-member roster, frozen phase,
   War Camp revision/digest and bracket-based threat digest.
5. Commit. A concurrent matching ID returns the existing canonical receipt;
   different character/War Order must fail. Do not reroll, even on an ACK loss.

### Checkout / heartbeat

- A worker checks out the frozen job with lease owner and generation;
  recovery after lease timeout increments the generation by exactly one.
- Heartbeat/settlement must use `WHERE lease_owner=$server_worker AND
  lease_generation=$expected AND status='reserved'`; no client may choose a
  lease owner. Keep `lease_expires_at <= hard_expires_at` at every heartbeat.
- If the lease or 15-minute recovery window has expired, a stale worker
  cannot write HP or rewards. A voided request ID remains non-reusable.

### Settle

1. Trusted server recomputes the complete deterministic battle from the
   frozen inputs outside SQL and binds engine version, replay object digest,
   cohort profile, War Camp and worker generation. Never accept app-computed
   raw damage, winning result or user-chosen replay digest.
2. Event lock first, then attempt lock. A committed matching receipt is read
   unchanged. Reject voided, expired, foreign or superseded workers, altered
   roster/order/seed/profile and invalid replay.
3. Set `credited_hp=LEAST(remaining_hp,FLOOR(server_verified_damage))`.
   Decrement event HP, increment revision and set **one** terminal receipt in
   the same transaction. If HP is already zero, mark a legitimate previously
   reserved fight as Residual Echo with zero credited HP.
4. Insert each newly crossed 70/30/0% milestone using unique
   `(event_id,threshold)` keys and `ON CONFLICT DO NOTHING`.
5. Commit. No World Sigil wallet writes in V17. Entitlements and any
   currency debit must be independently reviewed and transactionally bound
   to trusted committed receipt keys.

### Privacy / operations

- The proposed `private` schema MUST NOT be in the exposed Data API schemas.
  Verify permissions with `has_table_privilege`, RLS and real role tests.
- Avoid returning `server_seed`, `frozen_squad` or individual Echo data in any
  mobile response. Expose a distinct minimal account-scoped projection later.
- The actual database migration needs Supabase CLI generation, staging-only
  first, and independent review. Do not run the V9 draft migration either.
- Future true multi-worker tests require **two separate PostgreSQL sessions**,
  transactional event lock contention, stale worker takeover, simultaneous
  last-HP settlement, lost-ACK replay and recovery over event close.

## Verification scope

A new isolated GitHub Actions job loads
`world-boss-postgres-contract-v17-fixture.sql`,
the proposed schema, and
`world-boss-postgres-contract-v17-smoke.sql`
into a disposable PostgreSQL 16 service. The smoke script tests private RLS
and grants, active-slot uniqueness, permanent request tombstones, frozen
seed protection, lease-generation fencing, terminal receipt immutability and
the 1–3 ordinal CHECK. Fixture records are wrapped in a ROLLBACK.

**Passing this CI job proves SQL syntax and single-connection constraints,
not multi-worker transactional safety, real authentication, rewards or launch
readiness.** No production player, inventory, account, Supabase schema,
or currency is accessed or modified.
