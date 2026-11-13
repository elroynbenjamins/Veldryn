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

## Next implementation passes (not claimed complete)
1. Audit the actual `rankings_board_server_v2` definition on staging. Confirm every one of the 19 boards derives from verified gameplay receipts, and that self standings, privacy filters, blocks and guild identity are consistently applied. Verify deterministic ties and absolute ranks on later pages.
2. Prefer **stable keyset/snapshot pagination** for large boards: offset pagination can shift as scores update between requests. Until then, this UI remains behind the release gate.
3. Define seasons and archive snapshots before Arena or World Boss competition is made public. Distinguish current season, previous season and all-time boards; no character-class or gear power rewards for rank.
4. Integrate World Boss results only after authoritative settlement and anti-duplicate checks, with the established account-wide attempt cap and no echo/fake submissions. Guild PvE and Party Events should get independent category and permission gates, not auto-publish with general Rankings.
5. Add privacy/deletion tests: profile visibility, mutual blocks, guest accounts, renamed characters, disbanded guilds, and cache invalidation. Avoid exposing account UUIDs or banned users in projections.
6. Verify staging and device behavior, locale coverage, rendering for large font scale and poor network, then deliberately enable server/client gates in a separate release.

## Release checklist
- [x] V2 RPC identity and permissions checked read-only on both staging and production (2026-11-13)
- [ ] Staging SQL preflight script and full board coverage/fixture tests pass
- [ ] All 19 boards return correct nonempty results from seeded fixtures where applicable
- [ ] Stable global ranks, ties and self-standing are verified for >50 accounts
- [ ] All permission/privacy/blocks and rewards-free prestige policies pass
- [ ] Stage/mobile tests pass; Android screen and screen-reader QA complete
- [ ] Product approval to switch client and server feature flags; **no flag changed in this pass**
