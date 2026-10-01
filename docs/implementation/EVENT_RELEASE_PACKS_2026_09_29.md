# Event release packs

The mobile production graph intentionally ships only the currently released event pack. At the moment that pack is Harvestwake.

Future event definitions and art remain in the repository for Live-Ops preparation, but production modules do not import them. This keeps future event pets, companions, badges, currencies, candy, borders, startup scenes, reward art, and event hero art out of the downloadable AAB until the event is ready.

The source-only archive modules are:

- `apps/mobile/src/content/annual-events-v2.ts`, `annual-events-v3.ts`, and `annual-events-v4.ts`
- `apps/mobile/src/theme/event-collectible-assets.ts`
- `apps/mobile/src/theme/event-decoration-assets.ts`
- `apps/mobile/src/ui/live-event-visuals.ts`
- `apps/mobile/src/theme/profile-background-assets-future.ts`
- `apps/mobile/src/theme/card-background-assets-future.ts`

To release a future event, promote its definitions and assets deliberately: add its definition to `LIVE_EVENT_CATALOG`, add the event to the active collectible/decorations/visual modules, and run `npm run test:event-release-graph` plus the mobile typecheck before building the AAB.
