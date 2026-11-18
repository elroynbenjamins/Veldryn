# Veldryn World Boss V18 — PostgreSQL multi-worker transaction prototype

**2026-11-13 · HIDDEN / REVIEW ONLY. No real Supabase deployment.**

## What V18 implements

V17 added immutable private attempt records, three-slot partial uniqueness,
request-ID tombstones, lease fencing and RLS restrictions. V18 adds **real
PostgreSQL transaction functions** to that disposable design schema:

- `private.world_boss_v18_reserve`: serializes by event row lock, returns the
  original attempt on a same-key retry *before event-close checks*, validates
  character ownership, expires hard-deadline reservations, selects the lowest
  free ordinal 1–3, fixes phase/seed/roster/profile/War Camp at reserve time.
  The same ID with a different character/order is rejected.
- `private.world_boss_v18_checkout`: locks event then attempt, lets the same
  worker read its frozen job, rejects an unrelated worker while the 2-minute
  lease remains active, and increments the durable generation on takeover after
  timeout. The full seed/squad returned is **server-secret internal data**.
- `private.world_boss_v18_heartbeat`: extends the same worker+generation
  lease without exceeding the hard 15-minute deadline. Superseded workers fail.
- `private.world_boss_v18_settle`: locks event then attempt in one SQL call,
  fences generations, validates replay references and nonnegative finite
  server-supplied result fields, credits only `min(remainingHP,
  floor(serverDamage))`, atomically advances the event revision and terminal
  receipt, and inserts 70/30/0 milestones with unique keys. Already committed
  identical receipts return without a second HP debit.

All four are **SECURITY INVOKER**, with EXECUTE revoked for PUBLIC, anon and
authenticated roles; their intended caller is a private trusted service role.

### Critical remaining server authority boundary

These SQL functions **do not** authenticate an app session; nor do they
cryptographically verify that supplied four-player roster JSON, random seed,
damage, replay digest or worker identity came from a trusted simulator. Merely
calling `service_role` is *not enough* to trust arbitrary user input.

**Never give the app, public RPC, anonymous JWT, or exposed Edge request direct
access to the function arguments.** V16's read-before-prepare coordinator
and the genuine owner-bound V12/V15 state reader must be wired inside a
private, authenticated backend. The backend must compute and verify the actual
14-round result from frozen server data, and manage nonce generation and
worker tokens. Before launch, document replay artifact persistence, failover,
account and character data retention, hard deadline behavior, and per-server
authorization reviews. No SQL function in this PR is used by the game.

The lease 2-minute / recovery 15-minute parameters are **engineering test
values**. Event cadence, squad composition, three attempts, War Camp and
rewards remain unchanged in design. No World Sigils are minted or wallet
tables written.

## Test coverage with separate database sessions

The focused World Boss CI starts an isolated PostgreSQL 16 container,
applies the V17 fixture/schema/smoke, and then loads V18 functions and a
separate synthetic event/account setup. A Bash harness starts:

1. **16 actual `psql` processes** all trying to reserve the same request ID;
   precisely one insert and fifteen canonical retries must result.
2. Twelve independently reserved accounts each make a simulated server
   settlement from **12 simultaneous connections** for the last 1 global HP.
   Exactly one credits HP, eleven become Residual Echoes, all twelve settle,
   revision advances twelve times and each community threshold crosses once.
3. An identical settlement retry must return the original receipt, while a
   conflicting replay digest is rejected.
4. A lease takeover with a previously expired fixture must increment
   generation; the old worker fails and the new worker can settle without
   awarding extra global HP.
5. A hard-expired reservation becomes voided; its old ID remains a tombstone,
   but a new ID may reuse the ordinal.
6. Second and third account requests succeed, fourth active slot fails;
   event close blocks new requests while existing receipts remain available.
7. Private SQL function grants are checked for no client access.

These tests exercise PostgreSQL row-level serialization across independent
connections—not merely a JavaScript Promise lock. However they are still
**synthetic, disposable and transaction-focused**; they are not a staging
integration or proof of production correctness.

## Release blockers before actual migrations

- Authorized private server integration: JWT/session validation, owner-bound
  GameState/revision read, validated roster publication, frozen Echo match,
  War Camp snapshot, replay storage and server deterministic simulation.
- Independent security and DBA reviews of SQL, role grants, function
  invoker privileges, row locks under traffic, deadlocks, timeouts, replay
  artifact access and retention; run advisors in staging if migration is approved.
- Cross-system exactly-once War Supplies inventory debit and rollback;
  independently approved reward entitlement ledger and event max 100 Sigils.
- Real account Combat Power cohort sampling approvals; five-bracket thresholds,
  encounter tier mapping and fairness for Tank/Damage/Support.
- Staging migration **generated by the normal Supabase CLI process**, test
  restart/recovery with two backend instances, then explicit release sign-off.

**No Supabase migration was created/applied, no staging or production database
was contacted, no live player resources, boss HP, currencies or events changed.**
