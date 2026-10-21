# Release readiness and Veilbreak currency promotion — 19 October 2026

The code and database have passed release-candidate checks. Final production sign-off still requires the signed Android AAB and the real-device sign-in, billing/restore, Guild Shop purchase/relaunch, chat and reconnect smoke pass. An Expo JavaScript/assets export is not a signed native build. Existing security advisor warnings recorded in the Guild Shop deployment receipt have not been represented as cleared.

## Veil Shard promotion

- Exact event: `EVT_ANNUAL_010_2026` only.
- Earning window: 19 October 2026 at 05:48:31 UTC through 3 November 2026 at 00:00 UTC (end exclusive), bounded by the runtime's active earning window for normal gameplay.
- Common event currency receives +50%. Existing balances, Lantern Embers, shop prices and activity-unit counters are unchanged. Currency and its associated reputation retain the normal shared accounting.
- Includes activity drops, festival gifts, weekly rewards, eligible community currency and newly completed seasonal expedition rewards. Existing focus and daily blessings multiply alongside the promotion. Fixed fractional awards round down once; probabilistic activity rates retain their existing fractional-roll behavior.
- Offline activity is grouped by UTC day and promotion eligibility so completed units before the start never receive a later rate. Event-end filtering remains intact. Claimable weekly rewards retain the final earning-period amount during grace.
- Expedition rewards freeze the bonus into authoritative private state on the first successful completion. Claims and replays read the stored amount, including during claim grace; they cannot apply a second multiplier. Runs already completed before the promotion retain their original earned amount.
- Gameplay v29 and co-op v12 are deployed and ACTIVE. Downloaded sources match local tested bundles byte-for-byte; hashes and status are in `output/event-currency-promotion/deployment-receipt.json`. Both handlers reject unauthenticated requests with HTTP 401 `auth_required`. No database migration or real player reward mutation was needed to activate this promotion.
- Existing clients receive the server-side increase. The event banner, boosted reward previews and six-language promotion copy are part of the next mobile build.

## Evidence

- Full mobile TypeScript check passed.
- All 209 mobile core checks passed, including the promotion regression added to the normal core runner.
- Promotion tests cover +50% rates, focus/blessing stacking, fixed awards, weekly and daily claim idempotency, same-day offline boundary splitting, event expiry, different annual runs, unchanged shop pricing and expedition previews.
- Backend promotion integration passes actual successful boss simulation, persisted promoted reward, SQL amount parity, repeated completion/claim requests and post-expiry reward retention.
- Full backend `test:online` passed, including authenticated gameplay, co-op ownership/loadouts, QMode, event expeditions, queue/ready flows, regional combat and Guild Shop reads/policies. Its balance gate passed 9,600 complete QMode runs covering all nine classes and all launch expeditions.
- Separate linked `public` and `private` lint runs passed at error level; normal linked dry run reports no pending migrations. Migration uniqueness/dollar-quote checks and Guild Shop transactional migration tests passed.
- Fresh production Android export completed after the final copy changes: 141.4 MiB total, 132.9 MiB assets (965 files), 8.4 MiB JavaScript. The configured export budget passed. The future-event release graph and Edge Function auth contract checks passed.
- Browser verification shows +50% Veil Shards, a 150 → 225 festival gift, 1 → 1.5 gathering rate and 102 → 153 base seasonal expedition reward. Screenshot: `output/event-currency-promotion/banner.png` (development fixture).

Primary commands: `npm run test:core` and `npm run typecheck` in `apps/mobile`; `npm run test:event-currency-promotion` and `npm run test:online` in `backend`; `node tools/validate-mobile-export-budget.mjs apps/mobile/.release-readiness-2026-10-19`.
