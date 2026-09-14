# Live matching and ready checks — 13 September 2026

Automatic matching, persistent ready checks and the internal mobile lobby are implemented. Production co-op remains disabled. A committed ready roster is not yet a running Live dungeon: run creation, voting, combat progression, recovery and run chat still need integration.

## Behavior

- Authenticated queue polling runs the existing bounded matcher. Candidate selection retains required players during refill, filters blocked pairs, and still requires exactly one Tank, two Damage and one Support from distinct accounts and characters.
- Matching and ready-check creation happen in one database transaction. Original queue times survive replacement and requeue.
- Ready checks last 20 seconds. Acceptance is per account and roster revision, with persistent request receipts. Decline releases the declining player; accepted players wait up to 60 seconds for replacements. A replacement roster starts a new acceptance round.
- The final acceptance freezes four current server-derived loadouts. The transaction rechecks source revisions, role/hash evidence, blocks and the deadline after taking locks. Concurrent acceptance retries return their saved responses.
- A service-only database worker expires unattended checks every 10 seconds. It retains accepted players, then requeues them if refill expires. Hosted testing waited for an actual 20-second deadline using only read-only database polling.
- Mobile now has saved-queue recovery, foreground heartbeat, acceptance/decline, cancellation, countdowns based on database time and durable mutation retry. This is behind `EXPO_PUBLIC_COOP_LIVE_READY_V1`, which remains unset/off, in addition to the existing co-op gate. Back/background stops heartbeats; server expiry remains authoritative.

The internal lobby stops at the committed-ready state. It must not be enabled for players before committed rosters can enter and recover a Live run. The current ready operations use a shared advisory lock to serialize their short database transitions; high-volume performance has not been established.

## Exact files from this continuation

Added:

- `backend/online/live-ready.ts`
- `backend/online/tests/live-ready.ts`
- `backend/supabase/migrations/20261016000000_online_live_ready.sql`
- `backend/supabase/tests/online_live_ready.sql`
- `backend/src/server/combat/__tests__/portable-rng.ts`
- `apps/mobile/src/core/coop-live-lobby.ts`
- `apps/mobile/src/components/coop/CoopLiveLobby.tsx`
- `apps/mobile/tests/coop-live-lobby.ts`
- `apps/mobile/metro.config.js`
- `docs/implementation/LIVE_READY_INTEGRATION.md`
- `docs/implementation/online-verification/hosted-live-ready.json`
- `docs/implementation/online-verification/live-ready-followup.json`
- `docs/implementation/online-verification/live-ready-exports.json`
- `docs/implementation/online-verification/live-ready-final.json`

Changed:

- `backend/online/live-queue.ts`
- `backend/online/coop.ts`
- `backend/online/tests/live-queue.ts`
- `backend/src/server/coop/queue-service.ts`
- `backend/src/server/combat/deterministic-rng.ts`
- `backend/src/server/combat/types.ts` — optional combatant metadata tags used by the new companion assist.
- `backend/src/server/companions/character-assist.ts` — removes an unsupported, explicitly undefined target property.
- `backend/src/server/companions/special-challenges.ts` — only the string replacement compatibility fix.
- `backend/package.json` and `backend/pnpm-lock.yaml`
- `backend/supabase/functions/coop/index.ts` and `backend/supabase/functions/gameplay/index.ts` — rebuilt generated bundles; neither deployed to production.
- `apps/mobile/src/online/coop-client.ts`
- `apps/mobile/src/screens/CoopExpeditionScreen.tsx`
- `apps/mobile/src/core/companion-runtime.ts` — resolves the existing Old Mines zone name from its catalog ID for verified kill progression.
- `apps/mobile/tests/companion-integration.ts` — uses a real catalog technique and reaches/tests its required ascension.
- `apps/mobile/package.json` and `apps/mobile/pnpm-lock.yaml`
- `tools/check-v16.mjs`
- `tools/test-fresh-migration-chain.mjs`
- `tools/test-online-live-queue.mjs` — adds the `--ready` hosted scenario.
- `docs/implementation/ONLINE_GAMEPLAY_STATUS.md`
- `docs/implementation/COOP_CURRENT_STATUS.md`
- `docs/implementation/LIVE_QUEUE_INTEGRATION.md`
- `docs/implementation/v16-verification/repository-checks.json`
- `docs/implementation/online-verification/fresh-migrations.json`
- `docs/implementation/online-verification/test-project-cleanup.json`

Only migration `20261016000000_online_live_ready.sql` was added. Earlier migrations were not edited. It extends existing ready tables and adds seven service-only RPCs plus one cron schedule. No parallel Party, Social or matchmaking system was introduced.

## Integration conflicts resolved

The existing bounded matcher could replace accepted players with a higher-scoring roster. Required-ticket constraints now preserve those players during refill, while an optional eligibility predicate excludes blocked pairs before attempting the transaction. Existing callers retain their previous behavior.

Concurrent companion work began importing the server combat engine into mobile. That exposed Node-only crypto and Metro's app-only source boundary. The combat RNG now uses pinned `@noble/hashes` 1.8.0, with **1,280 exact comparisons against the previous Node HMAC stream**, including long keys, Unicode and malformed surrogate input. The existing numeric conversion and combat outcomes are preserved. The library's platform/submodule guidance is documented in its [versioned README](https://github.com/paulmillr/noble-hashes/tree/1.8.0). Metro now watches the shared backend sources and dependencies. The companion implementation itself was preserved.

Those shared imports also widened TypeScript's output directory. The full runner now executes only test files emitted by the current compilation, and mobile package scripts point to their new locations, preventing stale compiled tests from being mistaken for current results.

The newly added companion integration test used a nonexistent technique before its required ascension. Correcting that fixture exposed a real unlock bug: the activity hook compared a monster's zone name with a zone ID. It now resolves the name from the existing zone catalog. All 87 assertions in that integration test pass. Companion assist metadata was also aligned with the shared combat types without changing target selection or adding party slots.

An initial regression run failed while the companion module was incomplete. Subsequent compatibility failures were repaired as described above. The initial Android export needed the shared-source Metro configuration and permission to execute Hermes; the subsequent export passed. These intermediate failures are not evidence of a production outage: production was not changed.

## Verification and deployment

- Fresh disposable database: **58 migrations and seven SQL suites PASS**. The tested ready migration hash matches the source file.
- Hosted automatic matching, decline/refill, concurrent acceptance, frozen roster privacy and real offline expiry: **PASS**, including a repeat after the portable combat bundle update. See `online-verification/hosted-live-ready.json`.
- Focused Live queue/ready HTTP and runtime tests: **PASS**.
- Portable RNG compatibility: **PASS**, 1,280 comparisons.
- Android Hermes export: **PASS**, `.expo-export-live-ready-android`.
- iOS Hermes export and Expo dependency compatibility: **PASS**.
- Combined repository evidence after fixes: **86/86 PASS**. See `online-verification/live-ready-final.json` for per-check provenance.
- The complete run was **85/86 PASS before fixes**. Follow-up recompilation/tests resolve that failed case and the transient typecheck errors from concurrent edits; `online-verification/live-ready-final.json` records the combined result while retaining the original full-run and follow-up evidence. Unchanged long balance suites were not needlessly repeated.
- No new native APK, physical Samsung test, production deployment or store publication was performed.

The disposable project `qoaqrqpxtrhjyzsrifsq` and its temporary test accounts were removed. Production `nyjwigipamnvpdvpauuv` was not modified. Source lint is not configured. Final whitespace validation passed.

Remaining work includes Live run creation/progression/voting/recovery/chat, merchant and boon/artifact/curse gameplay effects, gated content, mobile localization and physical/native confirmation/reset verification. Existing v8–v15 systems and concurrent artwork/companion work were retained; preservation does not mean every historical feature has been exhaustively tested on every device.
