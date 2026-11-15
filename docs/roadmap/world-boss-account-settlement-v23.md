# Veldryn World Boss V23 — authenticated full-account reservation and private settlement (review only)

**Date:** November 15, 2026  
**State:** stacked draft on V22, all flags disabled, no API handler or Supabase migration. Not merged into any Android release candidate.

## Scope implemented

V23 converts the V22 five-day preparation / six weekend attack windows / all-owned-character raid idea into a **private unmounted server workflow**. All raid attempts remain three PER ACCOUNT PER EVENT. The World Boss global HP ledger also remains a single worldwide entity.

The public-shaped request has exactly three selectors: eventId, requestId and War Order. Account ownership is derived by trusted Supabase Auth verification; the public client **cannot supply accountId, characterId, roster, stats, powers, game state, rewards, damage, seed or server worker identity**.

The V23 private PostgreSQL reader enumerates **all 1–5** character rows of the authenticated account, joining online_game_states via account and character IDs, ordered and bounded by LIMIT 6 to detect an unexpected sixth entry. LEFT JOIN ensures missing state is an error, never a silently missing character. No external player Echoes, NPC fillers, classes or role quotas are required. Each row gets its own V12 real-equipment, forged-copy, gem, companion, role, Combat Power and GameState revision verification.

Server chooses strongest verified character solely as the reference for the encounter threat band, then freezes all characters in a deterministic character-ID order using the V22 roster hash. The private V20 rule loader loads all three phase profiles so the DB can select the correct profile at the **event lock**, not from a stale global HP read. The server also binds the War Camp snapshot/digest.

## Private reservation + worker

New private function world_boss_v23_reserve_account locks the global event row before the account's request. It:
- returns an existing immutable attempt receipt even after an attack window closes, rejecting reuse with a different War Order/leader;
- rejects new reservations outside Saturday/Sunday 00:00–00:30, 08:00–08:30, 16:00–16:30 UTC;
- validates one to five *distinct* owner characters and a leader included in that roster;
- binds event/account/request/War Order, roster digest, JSONB selectors and byte-stable serialized roster;
- locks each owned GameState and verifies exact revision under the event lock, so a concurrent gear update cannot alter the reserved loadout;
- checks the immutable selected phase profile/digest and War Camp digest against the event before delegating to the V18 3-attempt account ordinal transaction.

The new V23 worker accepts only an **internal DB queue job**, checks out V18's versioned private lease, rejects any non-V23 frozen packet, verifies all roster and rule bindings, executes one real V22 five-character battle, and stores its exact replay in content-addressed private storage **before** V18 atomically credits the normalized account contribution to the worldwide boss HP. Replays contain actual uncapped per-character damage/healing. The one world-HP contribution is computed with the provisional 100/12/7/5/4% descending-character weighting; it is not paid five times. V18 milestone crossings and residual-Echo handling remain accounted at the event row lock. Network retries after lost ACK and retrying already committed worker jobs do not debit HP again.

The original V19/V20 four-Echo worker and V21 Echo opt-in lifecycle are **retained only for historical drafts**. They are not called by this new account-raid service. No real World Sigils or currency is awarded.

## New code and CI

- backend/online/world-boss-private-pg-v23.ts — restricted parameterized DB reader/adapter.
- backend/online/world-boss-service-v23.ts — authenticated full-account roster resolution and private combat settlement worker.
- docs/roadmap/world-boss-account-reservation-v23.sql — **review-only SQL**, not a deployable migration.
- docs/roadmap/world-boss-account-reservation-v23-smoke.sql — disposable PG ACL/closed-window/lost-ACK fixture.
- apps/mobile/tests/world-boss-account-service-v23.ts — synthetic five-character account reservation, replay storage/settlement, idempotency and tampering tests.
- .github/workflows/world-boss-v12-validation.yml — focused TypeScript/PG tests, no real Supabase connectivity.

## Launch gates still open

1. Real authenticated HTTP route/queue host and production-worthy private database **schema review, migration and permissions**. The modules remain unmounted, and draft SQL must never be executed on staging or production as-is.
2. Strict server-enforced **Friday-to-Saturday immutable War Camp donation freeze**, actual inventory debits/idempotency, and persistent event scheduler with fortnightly cooldown; the current V20 rule interface does not enforce the global preparation cutoff.
3. Replace the V22 temporary single-enemy combat adapter with the authored **Hollowroot/Sunscar/Frostmarch 14-round scripted abilities**, correct role-specific protection/healing/interrupt scoring, and balance across 1–5-character rosters/power tiers.
4. Bound/persist replay recovery and durable post-close settlement, including stale lease renewals/retries. V18's hard reservation lease is at most fifteen minutes.
5. Exactly-once account-wide rewards and World Sigil 100 cap; no payout table or wallet integration exists.
6. Mobile experience: compact five-character raid roster, local-time display with UTC source, session start/countdown, end results, accessibility, and disabled-by-default flags.
7. Release security review of concurrent online GameState mutation vs account-row locks, character unlock status, post-deletion characters, and privacy/performance. The current enumeration treats all owned character rows as unlocked and playable; this assumption must be reconciled with deployed account progression and deletion policies.

**Never merge this draft to main/1.0.10 or enable World Bosses until separately authorized and all launch gates have passed.**
