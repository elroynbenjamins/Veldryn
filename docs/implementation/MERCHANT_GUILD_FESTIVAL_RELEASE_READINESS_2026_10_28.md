# Veldryn — Merchant & Guild Festival release readiness (28 October 2026)

**Assessment: NOT READY FOR RELEASE.** This is a source-level inventory, not a verified live deployment test.

## Intended production dates
- The Veilbreak: ends 2026-11-03 00:00 UTC, with the existing +50% one-season earning boost unchanged.
- Merchant & Guild Festival (EVT_ANNUAL_011_2026): 2026-11-06 00:00 UTC through 2026-11-30 00:00 UTC (last playable day Nov 29). DB claim grace currently ends **2026-12-03 00:00 UTC**.
- Frostfall Festival (EVT_ANNUAL_012_2026): begins **2026-12-01 00:00 UTC**. Source schedule ends 2026-12-30 and grace ends 2027-01-03.

**CRITICAL schedule conflict:** `backend/supabase/migrations/20261018000030_live_event_admin_lifecycle.sql` enforces one visible event across the *entire* event+claim window. Merchant's grace extends until Dec 3 but Frostfall starts Dec 1. Both cannot be enabled at these dates under this guard. Resolve the calendar/claim-only visibility policy *before* activation; do not silently reduce players' earned claim grace.

## Event economy
- Maintain Veilbreak 2026's current +50% common-currency promotion through its configured end.
- Future annual events (Merchant Nov 2026, Frostfall Dec 2026, 2027+ annual editions): **75% of authored common-currency earnings**, i.e. **-25% from unboosted baseline**, *not* -25% from Veilbreak's temporarily boosted 150%.
- Applies to activity event currency, daily gifts, weekly objectives, community common rewards and seasonal expedition displays. Prestige currency and shop prices stay unchanged. Verify server-side co-op settlement independently of its mobile display.
- Review progression feasibility at 10,000 Merchant Festival Reputation, unchanged store costs, 100,000 Pavilion goal, and the impact on casual vs heavy active players.

## Authored and test-covered assets/content
- `apps/mobile/src/content/annual-events-v4.ts`: Merchant event definition, 10,000 reputation milestone cap, 5 milestones, 3 shop offers, 4 discoveries, 4 activity objectives, 3 weekly objectives, daily gifts and 4 community stages.
- Merchant milestone unlocks: Ledger Ferret (pet) and Caravan Sentinel (companion). Shop includes Guildcrest Drakelet (pet). This totals **two pets and one companion**; unlike Veilbreak's **three companion** structure. Confirm intended collection depth before launch.
- `apps/mobile/src/content/merchant-caravan-escort.ts`: deterministic encounter generation for 3 level bands (1–20, 21–40, 41+) and 3/4/5 stops; `apps/mobile/tests/merchant-caravan-escort.ts` tests the generator.
- `backend/src/server/expeditions/content/event-expeditions.ts` and `apps/mobile/src/core/coop-event-expeditions.ts`: the Gilded Road co-op expedition route, boss, mechanic and questline are authored.
- `apps/mobile/src/ui/live-event-visuals-future.ts`: prepared hero/landscape, badge, both currency icons, candy, 4 discovery illustrations, 2 pet images, Caravan Sentinel portrait, profile background and 3 enemy images; referenced image files exist.
- `apps/mobile/tests/merchant-event-visuals.ts` checks the source-only bundle mapping. The test does NOT establish that assets appear in the running game.
- `apps/mobile/art-review/merchant-guild-festival-v1/`: Guild Pavilion shop scene, quartermaster and 3 emote images remain **source-only concepts**, not runtime exports.

## Must resolve before release (prioritized)
1. **CRITICAL — Activate published event identity and assets deliberately.** `apps/mobile/src/content/live-events.ts` production `LIVE_EVENT_CATALOG` only includes Veilbreak. Merchant must be explicitly added; otherwise `liveEventDef` does not resolve the server runtime. Promote Merchant's visual bundle to `apps/mobile/src/ui/live-event-visuals-active.ts` and the corresponding collectible/companion and cosmetics registries. Keep Frostfall staged until its own release.
2. **CRITICAL — Calendar/claim overlap.** Resolve Merchant claim grace Dec 1–3 vs Frostfall Dec 1 (see above); verify one-visible-event guard, claims, and offline progress at UTC boundaries.
3. **CRITICAL — Community module mismatch.** Merchant definition uses `communityEnabled: true` and a 100,000-point Guild Pavilion. The scheduled DB config in `20260925221327_autumn_winter_2026_event_schedule.sql` contains `communityModuleEnabled: false`. Reconcile server settings with desired player experience, confirm shared totals are projected from contribution ledger, and wire player UI for selecting a project and contributing currency. Currently `EventScreen` does not surface an explicit contribution or project choice action although the core functions exist.
4. **HIGH — Standalone Caravan Escort.** `merchant-caravan-escort.ts` authors enemy selection/scaling; no dedicated player-facing escort initiation, progress persistence, combat settlement, or route results were verified in the Event screen. Design/build that flow or remove the unsupported promise of a three-route standalone escort. The separate Gilded Road co-op expedition is not a substitute for this planned feature.
5. **HIGH — Finalize event visuals.** Export and integrate the source-only Guild Pavilion shop background, quartermaster portrait and Guild Greeting / Guild Salute / Contract Stamp emotes. Review fallback reward art, profile decorations and both light/dark themes at mobile scale. Validate shipped AAB asset inclusion only after activation.
6. **HIGH — Production QA.** Verify actual backend runtime schedule, authenticated event claims, daily/weekly/leaderboard updates, community aggregation, prestige shop, post-cap cache bulk claims, owned-companion candy targeting, co-op settlement, guild boss rewards, expired/reopened claim windows, event notices, and no duplicate reward grants.
7. **HIGH — Progression/monetization policy.** Confirm whether future events intentionally have only one companion versus Veilbreak's two milestones + one shop companion. Evaluate casual-accessible achievement of 10,000 reputation and two shop pets under a 25% currency reduction.
8. **MEDIUM — Frostfall preparation.** Authored content and individual artwork exist, but Frostfall still lacks a promoted active visual bundle and active catalog entry; repeat the same activation and end-to-end tests after resolving the overlap.

## Release gate
Do **not** enable Merchant in Live-Ops or create a production AAB until critical blockers are closed, source-only art is promoted, CI passes, and an end-to-end staging run covers before/start/end/claim transitions. A passing content/unit test alone is not a release-ready verdict.
