# World Boss V26 — Authored account raids and private atomic settlement

**Status:** HIDDEN / draft only, 15 November 2026. **Not live, deployed, merged or migrated.** Continuation of V22–V25: five full War Camp preparation days (Monday–Friday), one continuous 48-hour worldwide attack period (Saturday–Sunday), three account attempts per event, then seven cooldown days.

## Pass delivered in this draft

1. **Corrected draft SQL**: The V22 reservation SQL in the previous V23/V25 chain had become malformed by accidental duplicated sections during editing. This pass reconstructs it as one parseable transaction with the correct 48-hour weekend, authenticated account identity, ownership check for all 1–5 characters, three account-wide V18 attempt slots and a locked global HP-derived phase/profile selection. It is **NOT a Supabase migration**.
2. **Explicit packet/engine coupling**: The private helper `world_boss_v26_valid_packet_engine` accepts only two pairs: V22 generic timer packet+V22 engine or V26 authored account packet+V25 14-round engine. Every other pair, including V22 worker + V26 packet, is rejected. Private SQL smoke tests validate the function and denied public execution.
3. **Auth → frozen roster → reservation**: New `backend/online/world-boss-account-service-v26.ts` and `backend/online/world-boss-account-pg-v26.ts` retain the trusted V23-only account identity and online state reader. Exactly 1–5 owned, V12-verifiable character snapshots are frozen in canonical sorted order. A request may select only event ID, War Order and idempotency key. The server injects private entropy, rules and session identity; no client equipment, damage or roster.
4. **V25 authored worker**: At private checkout, V26 checks lease generation, server engine, frozen roster/content hash, account and request, War Camp and event-selected V13 profile; then calls `simulateWorldBossAuthoredAccountEncounterV25`, not the old generic combat timer. Includes Hollowroot, Sunscar and Frostmarch's 14-round authored bosses, roles, status effects, local Guard and deterministic replay.
5. **Replay-first, single global HP credit**: Persist an immutable digest-bound replay before V18 settlement. Credit **only provisional rank-weighted, real boss-HP damage** to the event; pass the **separate actual local Guard damage** only as a non-crediting receipt metric. The V18 settlement owns the global event row lock, residual Echo/zero HP, account attempt, replay digest, lease generation and idempotence.
6. **Synthetic integration regression**: New V26 test mocks the trusted private database and replay store, covers invalid Auth, 1–5 ownership boundary (prior tests), exactly-once retries and three attempt slots, V23 rejecting V26 engine, packet tampering, replay-store failure before HP transaction, Sunday expiry and 15-minute bounded recovery. It confirms stored V25 authored rounds and the exact Guard/HP pair used in `settle`. New disposable PostgreSQL smoke validates schema/engine disjointness, private grants and UTC weekend boundary.

## Safety and unresolved integration work

**V26 is a developer contract, not a launched battle.** Neither V23 nor V26 is mounted to a public API, production Auth adapter, hosted DB connection, live queue, rewards service or game UI. Both lack a full staging integration with real world-event rows and atomic two-worker concurrency against the V22 gate. The private SQL file remains under `docs/roadmap/` and must NOT be applied to any Supabase project without separate review.

The 14-round V25 script is still an authored, round-based proxy, **not yet reconciled with every effect in Veldryn's time-driven live PvE engine** (e.g. skill timings, gem/companion proc ordering). Its damage weighting remains the unapproved 100/12/7/5/4% hypothesis. V18's `raw_boss_damage` receipt field stores the **weighted preview passed as world impact**, not the original unweighted boss damage; launch needs explicit schema naming or a separate `rawPartyDamage` audit field.

Required release blockers: real private storage and Auth, War Camp transactional donations and Saturday snapshot freeze, two-connection database stress and settlement ownership tests, crash-recovery replay retrieval, per-account Sigils capped at theoretical 100, phase transitions and residual-Echo payout, real population/gear balance, mobile attack/replay/reward UX, analytics and security review. All feature flags remain false and no Android 1.0.10 changes.

## Verification
- New service/adapter: `backend/online/world-boss-account-service-v26.ts`, `backend/online/world-boss-account-pg-v26.ts`
- Corrected SQL and private packet checker: `docs/roadmap/world-boss-weekend-reservation-v22.sql`
- Disposable SQL regression: `docs/roadmap/world-boss-authored-settlement-v26-smoke.sql`
- Worker/memory-DB regression: `apps/mobile/tests/world-boss-authored-settlement-v26.ts`
- Dedicated typecheck + tests: `.github/workflows/world-boss-v12-validation.yml`

**Do not claim passing validation until the GitHub workflow actually finishes successfully.** No live user saves, items, gold or World Sigils are touched.
