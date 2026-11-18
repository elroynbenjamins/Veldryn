# Veldryn Combat 2.0 — authoritative solo encounter snapshots

**18 November 2026 · Hidden development integration · not deployed**

## Problem addressed

Before this change, the Classes/Equipment/Enemies 2.0 draft could compose deterministic opponent kits and accept an authenticated callback claiming that an encounter had been persisted, but no database reservation transaction, private snapshot storage or read/replay repository was defined. A client retry or a stale multi-device submission must **never** roll new traits, change equipped gear or switch a skill build while referring to the same encounter ID.

## Implemented in the hidden branch

### Immutable private database store

Migration: `backend/supabase/migrations/20261118213000_combat_v2_solo_snapshot_hidden_v1.sql`.

- `private.combat_v2_solo_snapshots_v1`: one encounter ID per immutable, version-1 envelope; the record includes account/character ownership, game/build revisions, full enemy-kit snapshot, compiled player/enemy combat input, approved equipment evidence and a canonical SHA-256 digest.
- Table has RLS enabled, **no client policies**, and revokes table access from `public`, `anon` and `authenticated`.
- The read and first-write-wins reserve functions are `public.combat_v2_solo_read_server_v1` and `public.combat_v2_solo_reserve_server_v1`. They are callable **only with service-role permission**. No public client RPC is granted.
- Reservation checks the character-to-account association; then locks the character, online game-state revision and persisted skill-build revision. It checks the current class/level fingerprint and source-versioned snapshot shape before the initial insert.
- If the encounter already exists for that same owner and exactly the same canonical snapshot, reservation returns the original stored payload. Any other owner, digest, payload or race loser is rejected. After the first write, the row is **not updated or regenerated**; read/retry remains stable even if the character later gains levels, sells gear or edits a skill preset.
- The table has no settlement, payout, completion, inventory, marketplace or character XP mutation. The migration is not a live-game rollout.

**SQL dependency:** existing hidden `private.combat_v2_character_builds_v1` migration must be present. If build revision is absent, preparation fails closed. Apply this migration **to staging only**, after schema/security review and before any new experimental 2.0 solo snapshots are created.

### Server-only adapter and service

The hidden `solo-encounter-rpc-storage.ts` maps the existing service-role Supabase `rpc(name,params)` contract to strictly scoped read and reserve operations. The privileged client must never be derived from a player JWT.

`SoloEncounterPersistenceServiceV2` in `solo-encounter-persistence.ts` has three operations:

1. `reserve(scope,true)`: load first; if present, return the existing stored snapshot and **do not invoke the enemy RNG or gear/skills compiler**. If absent, request a complete authenticated server-compiled source, convert its enemy-kit candidate into the first persisted revision, validate the prepared enemy/gear snapshot, calculate a canonical digest, and reserve it with the database CAS. The readback is independently checked and must match the expected digest.
2. `load(scope,true)`: read a snapshot scoped to the authenticated account and character. Check immutable digest, enemy identity, seeded kit and unchanged abilities/phases, resolved player stats and equipment stages. This returns detached JSON data, not the server port's mutable object.
3. `replay(scope,true)`: load the same source row, issue the internally branded combat authority only for that exact full input digest, and run the deterministic Combat 2.0 engine. It computes an in-memory battle only. **No gold, gear drops, quests, Expedition Marks, dungeon completion or other rewards are paid.**

All methods fail closed without an explicit server-enabled flag. No route wires the flag or the service today.

### Regression and safety

- TypeScript tests simulate service-role RPCs with a first-writer-only in-memory port and verify repeat requests, canonical digest integrity, deterministic event transcripts, readback isolation, stale game/build CAS, incorrect owner, changed enemy damage, player stats or gear evidence.
- Separate static Node SQL tests check RLS, privileged function grants, ownership predicates, revision locks, immutable semantics and the absence of live economy changes. **These static tests passed in an isolated evaluation; they do not prove SQL deployment or transactional Postgres behavior.**
- The hidden Combat 2.0 GitHub workflow compiles/tests this code and bans imports from public Edge/online/mobile modules.

## Explicit remaining gates

The store and service define the first true persistence boundary but do not yet make a **production-ready encounter lifecycle**. Before activation:

- Wire `resolveFresh` to the actual trusted equipment-copy ledger, character build storage, class/skill policy compiler and private enemy seed issuer. Never let HTTP bodies supply the trusted scope, comparator, receipt or source callback.
- Execute the SQL migration in **staging**, run live Postgres concurrency tests (two requests racing an encounter ID, duplicate ID across characters, stale build/revision, transaction rollback), and inspect RLS/service-role grants.
- Persist a separate single-settlement outcome with replay-safe claims, cooldown/HP rules and exactly-once rewards; do not treat `replay()` as a settlement or claim endpoint. Design archive/retention and operational recovery.
- Validate nine-class and all-18-specialization balance, rolled gear/trait stat budget, boss telegraphs, companion modifiers and Android reconnect UX.
- Resolve all draft CI jobs and perform production-appropriate release/rollback review.

**Scope:** integrate into the unfinished Classes/Skills 2.0 draft (#1377), not `main`; current dungeons and existing players remain unchanged.
