# Regional completion transactional settlement and production migration assessment — 27 November 2026

Private 2.0 QA only; no live schema, state, reward, travel or release change.

## Verified parent evidence

#1944 exact head 03b600fbf0c1d9cc489cbbf4d99e30e3e1be9dba passed private integration (45997577642): all 1620 executions won, including reference/common/mixed equipment and default/offensive/counter builds. Mean remaining HP mixed → stronger pressure: Knight 71→68%, Tyrant 64→62%, Wyrm 62→56%. Approved-rate basic conversion arm mean duration across all profiles/classes 36/34/33s, versus 40/37/36s in pressure counter arm. Keep pressure + basic candidate for further review, not final balance. Fast Damage kills and slow Bastion/Dawnkeeper remain. #1945 exact head 77518f0ab2aaa6afde3f16e96aefb74a5fee61aa private integration passed (45998452054). Existing Mobile, Edge, skills/gem runtime validation blockers remain.

## Production read-only aggregate assessment

27 November 2026, production project, SELECT only. No user identifiers exported or written to repository.

- 611 online_game_states rows: 406 linked to existing characters with matching account ownership, 205 null character IDs, zero missing nonnull character references, zero different-owner conflicts.
- Four distinct linked characters carry FALLEN_KNIGHT in defeatedBossIds array. No malformed nonnull arrays, no null-character Knight flags, zero BOSS_002/BOSS_003 flags in matching linked saves.
- Current region: Greenfields 375, Silverbrook 17, Ironwood 8, Old Mines 3, King's Road 2, Sunscar 1. No current Frostmarch/Ashlands among these 406. No later-region row without Knight flag.
- regional_combat_receipts_v1: zero rows; no Sand Tyrant receipt-based historical victories available in this table at this snapshot. No Frost Wyrm receipt source established. Do not equate no receipt with proof no player ever won under another system.
- Both online_game_states and regional_combat_receipts_v1 have RLS enabled, anon/authenticated lack direct INSERT/UPDATE/DELETE privileges, service_role has write privileges. This supports service-owned storage but does not independently prove server RPC provenance or historical flag validity.

Keep four Knight flags as candidates pending authoritative write-path/history verification. Exclude null-character records from character-scoped import, without deleting or modifying any records. Existing travel entitlements must be derived independently from verified historical access, not inferred as new boss victories. No actual import attempted. Read-only snapshot can change before launch; rerun then. Audit aggregate counts only.

## Transaction contract

Private review adapter accepts authenticated identity + receipt ID, not arbitrary client result. Under one transaction lock current character ownership, load current ledger and terminal server evidence, revalidate prior progression contract, reserve global receipt fingerprint (account, character, boss, input/event digest), perform CAS on revision and commit atomically. Exact receipt replay does not write; new rematch receipt retained without granting again; conflicting reuse rejected even across characters. Inconsistent receipt/ledger state fails closed. All grant/release flags false and Region IV disabled. Real DB adapter must independently verify immutable reservation/input and result provenance before returning evidence; current equality check only ensures the pure verifier receives the loaded evidence. No claim of production transaction isolation.

Async tests use serialized in-memory transaction emulator with cloned working maps and commit only on success. Eight simultaneous claims for one receipt: exactly one first completion, other seven duplicates, single revision. Forced CAS failure rolls back reservation and ledger. Additional tests cover foreign owner and same-account sibling character, missing receipt, wrong order, changed digest, global receipt collision, replay, rematch, wipe rejection and final milestone without Region IV activation. New exact-head CI pending; emulator is not Postgres concurrency proof.

## Remaining
Implement service-only real transaction with durable unique constraints, immutable receipt lookup, ownership lock/recheck, CAS/rollback tests in disposable DB, no public API exposure. Verify legacy story write paths and access provenance; review migration dry run with updated aggregates. Keep profession-independent progression/access separate from chapter combat gates. Ordinary Tank progression and T5 preparation next; no live merge/deploy. No SQL DDL, migration or production write performed.
