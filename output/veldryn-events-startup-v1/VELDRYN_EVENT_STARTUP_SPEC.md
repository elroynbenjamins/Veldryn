# VELDRYN event decoration and startup pack v1

This pack adds three wide profile borders, three matching event badges and three portrait startup scenes. It extends the existing game artwork and Core UI kit.

## Source of event identity

The event names were checked against `apps/mobile/src/content/live-events.ts`, `apps/mobile/art-review/event-sets-v1/README.md` and the accepted concept overviews under `apps/mobile/art-review/event-sets-v1/liveops-catalog`.

| Event | Established visual identity | New decoration |
| --- | --- | --- |
| Harvestwake | Amber, wheat, autumn foliage, field-spirit warmth | Amber lantern with wheat and vine corners |
| Winter's Bell | Icy blue crystals, silver frost, winter detail | Bell crest, frosted leaves and ice crystals |
| Anniversary of Veldryn | Gold sunburst, deep-blue stones and ceremonial navy | Eight-point gold sunburst and blue-stone laurel |

`firstlight` in filenames refers to the existing anniversary set direction, Firstlight Legacy. It is not a new event. The initial suggested Frostmoon / Ember Harvest / Crystal Dawn names are not used. Only Harvestwake currently has a live runtime event definition; the two other decorations follow accepted catalog concepts. Registering a visual does not activate an event or grant a reward.

Existing profile backgrounds and the Amber Vine / Wheat Crown borders remain in place. `preview/event-overview.png` demonstrates the new borders over existing Harvestwake, Aurora Citadel and Starfall profile artwork. That image is a review composite, not a replacement profile-background asset.

## PNG contract

| Type | Base | @2x | @3x | Use |
| --- | --- | --- | --- | --- |
| Startup scene | 360×640 | 720×1280 | 1080×1920 | Opaque portrait background, centered cover |
| Profile border | 320×180 | 640×360 | 960×540 | Transparent overlay, fixed 16:9 aspect |
| Event badge | 48×48 | 96×96 | 144×144 | Transparent icon, fixed aspect |
| Reused VELDRYN logo | 288×96 | 576×192 | 864×288 | Separate transparent brand layer |

There are nine new assets with 27 density PNGs, plus three density files for the existing Core UI logo. Asset filenames, hashes and dimensions are recorded in `asset-manifest.json`.

Border and badge exports have binary alpha, a two-pixel transparent outer gutter, no dither and a maximum 256-color palette. The protected profile-center rectangle x=64..255, y=36..143 is fully transparent. Place portraits, names and event text within the clear region; avoid the top crest. For the existing 16:9 profile scene, overlay the full border with `pointerEvents="none"`; retain the aspect ratio. These ornamented event frames are fixed-aspect artwork, not 9-slice assets. Never stretch them into square avatar rings or tall cards.

Source images are individually generated art. PNG export uses source alpha, a hard 128 alpha threshold for sprites, nearest-neighbor grid normalization and exact integer density expansion. Sources are retained under `source/originals`; prompts and accepted revisions are in `source/results.json`. Backgrounds use centered aspect-preserving cover normalization, with no logo or UI painted into the scene. Preview composites are never used as asset sources.

## Startup composition and behavior

The three scenes are Autumn Kingdom, Aurora Citadel and Firstlight Kingdom. They are atmosphere illustrations, not declarations of new gameplay regions or event schedules. The existing profile environments informed their palette and visual direction; they were composed anew for portrait phones to avoid enlarging a 320×180 profile crop into a full-screen background.

Keep the scene behind all UI with centered `cover`. Important landmarks sit near the central 65% width. At tall 390×844 and 414×896 layouts, side cropping is intentional. Place the separate logo near the upper quiet sky, inside safe-area bounds, and put loading text on a dark translucent footer. The pack includes nine aspect-ratio review crops plus three assembled phone previews.

The mobile integration uses a lazy React state initializer to choose uniformly from three static bundled images. The selected scene remains fixed across rerenders and online/local loading phases for that app mount. Separate launches may repeat by chance. It introduces no remote image fetch, persistent preference, artificial delay or fake progress percentage. Very fast loads can show the artwork only briefly. Image failure falls back visually to the navy background and never blocks the existing load/error flow. Existing translated loading text is reused.

This is the React-rendered startup/loading screen. The operating-system launch splash remains a separate build-time asset. Expo documents native splash configuration as requiring a rebuilt binary; runtime randomization belongs after the React runtime starts. See [Expo SplashScreen documentation](https://docs.expo.dev/versions/latest/sdk/splash-screen/).

## React Native / Expo integration

Runtime files are installed under `apps/mobile/assets/events-startup-v1`. `src/theme/startup-art.ts` contains literal Metro `require` calls, `src/components/StartupScreen.tsx` renders the art, and `App.tsx` uses it in existing online and local loading branches. `src/theme/event-decoration-assets.ts` registers the three border/badge pairs. `profile-border-assets.ts` adds their sources while retaining the existing border IDs.

Event reward assignment is still owned by the game's event catalog and backend. The art pack does not invent drop rates, dates, currencies, reward rarity or purchase costs. A future event reward can use a registered `borderId` when its design calls for it.

Keep all @2x/@3x siblings with the base PNG and import the base filename. Avoid fractional transforms. Web previews use `image-rendering: pixelated`. Core React Native Image does not expose a cross-platform nearest sampler; density variants and integer sizing help, but verify final device filtering. Startup scenes intentionally use cover for phone fit. For static exported images, the tools use explicit nearest-neighbor sampling.

## Further visual work

The repository already contains a profile-background catalog, event skins/equipment, Harvestwake pets, currencies, discoveries and emotes. These do not need to be generated again. Future decoration batches should fill the remaining accepted event themes when their screens or rewards need them: Echo Surge, Gatherer's Week, Guild Rally, Monster Hunt, Co-op Festival and Market Fair. Event page headers, reward-card states and boss encounter art can then be audited against actual screen usage before commissioning new assets.

## Rebuild and QA

Use Node with `sharp`; set `VELDRYN_SHARP_PATH` only when the library is outside normal resolution. Run `node tools/export.mjs`, `node tools/verify.mjs`, `node tools/preview.mjs`, then `python tools/package.py`. Preview rendering uses a local UI font; `VELDRYN_PREVIEW_FONT` overrides its path. The preview script also reads the already-existing profile art from this workspace.

The asset checks cover decoding, dimensions, hashes, exact density expansion, opaque backgrounds, true transparent sprite silhouettes and empty profile centers. ZIP packaging validates CRCs and every archived member. App checks and their limits are recorded under `qa`. Native device presentation still requires checking in a release build.
