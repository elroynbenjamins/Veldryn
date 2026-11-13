# Leaderboards — hidden continuation and release-readiness (13 November 2026)

## Verified source baseline
- The native Rankings screen and authenticated `rankingsClient` already exist, with 19 board definitions in Account, Professions, Competitive, Dungeons and Guilds.
- **`RANKINGS_RELEASED=false` must remain unchanged.** The app routing already respects this.
- The backend repository calls `rankings_board_server_v2`. The original tracked `20261005000000_rankings_v1.sql` declares `rankings_board_server_v1`, so verify the v2 routine **in a real staging database** before release. Do not substitute v1: that legacy body does not populate every declared board.
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
- [ ] Staging SQL contract test passes, including v2 RPC existence and permission checks
- [ ] All 19 boards return correct nonempty results from seeded fixtures where applicable
- [ ] Stable global ranks, ties and self-standing are verified for >50 accounts
- [ ] All permission/privacy/blocks and rewards-free prestige policies pass
- [ ] Stage/mobile tests pass; Android screen and screen-reader QA complete
- [ ] Product approval to switch client and server feature flags; **no flag changed in this pass**
