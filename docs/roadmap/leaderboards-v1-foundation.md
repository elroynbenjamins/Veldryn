# Leaderboards — hidden continuation and release-readiness (13 November 2026)

## Verified source baseline
- The native Rankings screen and authenticated `rankingsClient` already exist, with 19 board definitions in Account, Professions, Competitive, Dungeons and Guilds.
- **`RANKINGS_RELEASED=false` must remain unchanged.** The app routing already respects this.
- **Staging and production inspected read-only on 2026-11-13:** `rankings_board_server_v2(uuid,text,integer,integer)` exists, returns `jsonb`, and is executable by `service_role` but not `anon` or `authenticated`. This confirms the connection contract, not feature completeness. The original tracked `20261005000000_rankings_v1.sql` defines v1; the live v2 routine needs its full migration provenance reconciled with Git.
- **Verified release blocker:** the installed v2 routine only has scoring branches for `profession_total`, `arena_rating`, `arena_wins` and `guild`. The other **15 accepted board IDs currently return empty arrays** even when eligible data exists; 12 are individual Professions plus `dungeon_tier`, `dungeon_clears`, and `achievement_score`. Do not enable Rankings until these have server-authoritative scoring and fixture-based verification.
- Hidden Day 8 Party Event rankings already have their own independent gate. A Party Events release must not automatically expose those rankings.
- World Boss ranking projections exist independently; echo attempts must never count as competitive results.

## Implemented in this continuation
- A **bounded, read-only page navigator** fetches 51 entries and renders 50, so players can inspect beyond the first 50 without loading entire boards or exposing accounts.
- Each navigation causes an independent authoritative server request using an offset. Board/scope changes reset the page. A request-version guard ignores obsolete responses, while screen refresh preserves the current page.
- Pagination arithmetic is isolated and tested for full/partial/empty pages and maximum supported offset. There are **no client score writes, grants, or changes to ranking calculations**.
- A **pre-release SQL contract gate** checks that the v2 routine exists and is service-role-only. This test is intentionally not part of live migrations.

## Follow-up: verified server scoring foundation (13 November 2026)

**Source correction — important:** live `public.character_skills` has **zero rows** in both environments; never derive production profession rankings from this legacy table. Production stores current `{skillId,level,xp}` rows in the service-written `public.online_game_states.state.skills` JSON array; existing extra characters can be present in `state.otherCharacters[].skills`. The proposed scoring query joins both shapes to `public.characters` by account and character ID to exclude deleted/unowned characters. This changes `profession_total` to use saved character skill levels rather than the legacy square-root-of-XP approximation.

- **Verified production shapes (read-only):** 384 online game state rows, 239 with skill arrays; 11 observed profession IDs. Hunting exists in the staging skill catalog but has no production skill rows yet; do not invent leaderboard values for it.
- **Dungeon integrity:** the `coop_reward_entitlements` table can have `participant/final` entitlements for **failed** runs. Require a matching `coop_run_private_state.state_json.run.phase='completed'` and participant/final entitlement, then count each distinct `run_id` at most once. Ignore echo-assistance and failure consolation. Highest tier gets the count of verified clears at that tier as a tiebreaker.
- **Scoring prototype:** `docs/roadmap/leaderboards-authoritative-scoring-v3-proposal.sql` creates a private service-only scoring projection and a service-only public v3 board RPC. Professions and Dungeons are calculated in SQL; legacy Arena/Guild and unfinished Achievement Score delegate to v2. Ties share a rank for identical primary + secondary metrics; stable display order uses name and account ID without exposing IDs.
- **Opt-in backend support:** `SupabaseRankingRepository` now accepts a `useVerifiedV3` option, default **false**, so existing production calls remain on v2. No configuration or client gate was changed.
- **Verified staging smoke:** v3 proposal plus `backend/supabase/tests/leaderboards_v3_scoring_contract.sql` executed inside one explicit `BEGIN ... ROLLBACK`, including 15 v3 board projections, guild delegation, pagination values, invalid input rejection, and client-grant denial. Both new functions were subsequently verified absent; **no schema was deployed**.
- **Updated:** Achievement Score now uses provisional earned-Journal milestone scoring in the v3 draft; do not present it as a claimed-achievement ledger. Hunting still has no production skill records and will fill naturally when authoritative Hunting progress is saved. Arena/Guild boards retain v2's rank/self-standing limitations. Evaluate cost/snapshot stability of large JSONB scans before launch, backfill actual durable achievements, and migrate the prototype with the project's Supabase CLI only after review.

### Proposed safe deployment sequence
1. Reconcile the live v2 function's migration provenance in Git; keep current client and API behavior as-is.
2. Create the numbered migration with `supabase migration new` in the real repo checkout, using the reviewed v3 proposal; do not paste the proposal's own `BEGIN/COMMIT` inside an outer migration transaction without review.
3. Run the scoring SQL integration test on staging, including meaningful fixture data, permission checks and performance plans, then use the explicit opt-in adapter flag for limited server QA.
4. Build the missing Achievement Score source and cross-system/privacy tests; only then consider promoting the v3 endpoint and client feature gate.

## Next pass: earned Journal Score + World Boss history (13 November 2026)

### Earned Journal prestige
- The Journal V42 catalog has **nine achievement families, each with five tiers**. Milestones unlock automatically; there is no achievement-claim requirement. Achievement Score therefore means **earned** achievements, not claimed reward entitlements.
- The verified online command handler loads state server-side, validates a bounded command, computes its result with the game engine, and persists through service RPC. The snapshot still needs a focused end-to-end anti-tamper review before enabling a competitive ranking.
- Hidden v3 SQL now calculates `achievement_score` with an explicit catalog allowlist (45 IDs), matching account ID and schema version 42, valid millisecond unlock timestamps, and provisional prestige weights **10 / 25 / 50 / 100 / 200** for Novice / Adventurer / Veteran / Master / Grandmaster. Unknown IDs and future timestamps contribute nothing. These are ranking-only weights, not earned currency or combat power.
- Read-only production audit returned **95 accounts with 266 accepted earned unlocks**, scores 10–325, without exposing any personal data in the review. The staging contract and synthetic fixtures passed in an explicit transaction that was rolled back.

### Historical World Boss rankings
- The existing `shared_world_world_boss_final_ranks` table is an authoritative finalized snapshot. A separate **disabled-by-default** private history proposal reads historical final rank, impact, applied damage, attempts and display name per specific event.
- A separate private feature gate is required even after global Leaderboards are enabled; current `RANKINGS_RELEASED=false` is unchanged. Only rows with valid attempts and positive impact are eligible; excluded echo-only/invalid rows cannot appear. Public profile visibility and mutual blocks are checked at read time; original event-wide ranks are preserved, so gaps are possible after filtering.
- A staging transaction seeded synthetic final-rank rows and validated gate denial, hidden/unfinalized events, correct history and self-standing, private-profile removal, mutual blocks and zero-valid-attempt exclusion. All inserts, gate changes and profile changes were rolled back.
- The private reader remains the scoring authority. The SQL proposal now also contains a **public, service-role-only RPC bridge** (anonymous/authenticated SQL roles are explicitly denied); both objects are undeployed. The new server-only `WorldBossHistoryService` checks global Rankings **and** World Boss History flags (both default false), validates inputs, and forwards only the authenticated account ID to that service RPC. No mobile/public HTTP route was registered.

### 13 November follow-up — CI fixes and integration hardening
- Fixed an unescaped apostrophe in the Achievement Score board description that previously broke TypeScript parsing and caused multiple CI workflows to fail.
- Restored required localized Rankings pagination labels and no-results guidance in German, Spanish, Dutch, Italian, French, Russian and Turkish. Updated the localization count and UI density contract to assert that board changes reset page 1, clear stale snapshot, and close the picker.
- Added the service-role-only **public RPC bridge** for the private World Boss final-history query. Current public profile name is used, so renamed accounts do not leak their old final-rank display name.
- Added backend integration tests for disabled-by-default history, either server release flag disabled, UUID/bounded input validation, and the exact server RPC call payload.
- Verified in staging inside a transaction that service role has execute access to the proposed bridge, neither anon nor authenticated does, the independent database gate denies access, and current name, final global rank, privacy, mutual blocks and invalid attempts remain correct. Synthetic fixtures and gates were rolled back.
- Merged the two non-overlapping new main commits into the draft branch; GitHub subsequently reported the PR **mergeable**. Mergeability is **not** CI or product approval.

### Additional global-board readiness (13 November 2026)
- The staged v3 SQL contract now calls **all 19 canonical board IDs**, including Arena Rating, Arena Wins and Guild passthrough. This verifies permission, valid JSON projections, IDs and routing, not 19 populated production fixtures.
- A new transaction-only global privacy fixture seeds no permanent data. It exercises current public profile visibility, private-profile removal, private self-standing, reciprocal player blocks and removal of account UUIDs from the response. It passed staging and was rolled back.
- The new UI localization rows cover all five pagination strings in the eight supported languages. The pre-existing localization/social and UI density tests were updated rather than disabled, after investigating the actual failing GitHub job logs.
- Latest GitHub Actions are still queued; **no claim is made that the full mobile/Android CI passes**.

### Before release
1. Reconcile tracked v2 migration provenance and convert the reviewed proposals into properly numbered migrations using the Supabase CLI; this PR's draft SQL files are **not deployed**.
2. Confirm long-term authoritative Journal snapshot integrity and verify the 45-ID catalog after gameplay updates. Add simulated duplicate/invalid saves and simultaneous ranking requests.
3. Validate 19 existing boards + any new World Boss event-scope UI on realistic seeded accounts, including pagination stability, ties, all privacy modes, deleted/renamed users and Android accessibility.
4. Review scoring performance and introduce server snapshot/keyset pagination before scale; keep event-specific World Boss history independently disabled until the overall Leaderboards launch is approved.

## Next implementation passes (not claimed complete)
1. Harden the new earned Journal Score source and Hunting data path, reconcile v2 migration provenance, and validate the 19-board v3 architecture against trusted gameplay receipts. Verify self standings, privacy filters, blocks, deterministic ties and absolute ranks on later pages.
2. Prefer **stable keyset/snapshot pagination** for large boards: offset pagination can shift as scores update between requests. Until then, this UI remains behind the release gate.
3. Define seasons and archive snapshots before Arena or World Boss competition is made public. Distinguish current season, previous season and all-time boards; no character-class or gear power rewards for rank.
4. Integrate World Boss results only after authoritative settlement and anti-duplicate checks, with the established account-wide attempt cap and no echo/fake submissions. Guild PvE and Party Events should get independent category and permission gates, not auto-publish with general Rankings.
5. Add privacy/deletion tests: profile visibility, mutual blocks, guest accounts, renamed characters, disbanded guilds, and cache invalidation. Avoid exposing account UUIDs or banned users in projections.
6. Verify staging and device behavior, locale coverage, rendering for large font scale and poor network, then deliberately enable server/client gates in a separate release.

## Release checklist
- [x] V2 RPC identity and permissions checked read-only on both staging and production (2026-11-13)
- [x] Read-only staging v2 permissions preflight passed
- [x] v3 scoring prototype, 16 scoped boards and earned Journal fixture dry-ran with full rollback on staging
- [x] World Boss historical-result, hidden-gate, privacy, mutual-block and echo-exclusion staging fixtures passed with rollback
- [x] All 19 board dispatch/shape contract tests passed in rollback-only staging
- [x] Global visibility, private self-standing, mutual block and account-ID privacy fixture passed in rollback-only staging
- [ ] Long-form fixtures for 19 boards, ties, pagination drift and performance pass
- [ ] All 19 boards return correct nonempty results from seeded fixtures where applicable
- [ ] Stable global ranks, ties and self-standing are verified for >50 accounts
- [ ] All permission/privacy/blocks and rewards-free prestige policies pass
- [ ] Stage/mobile tests pass; Android screen and screen-reader QA complete
- [ ] Product approval to switch client and server feature flags; **no flag changed in this pass**
