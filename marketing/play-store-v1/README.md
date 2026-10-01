# Veldryn — Play Store creative v1

Created 28 September 2026. This is a reviewable English-language asset pack, not a published store listing.

## Deliverables and recommended order

1. **Forge your own legend** — actual character appearance, stats, and equipment crops.
2. **Hunt monsters. Claim the spoils.** — actual combat preview, drop table, and enemy cards.
3. **Small steps. Lasting mastery.** — Mining progression, equipped tool, and resource choices.
4. **Gather. Craft. Grow stronger.** — Smithing and available equipment recipes.
5. **Build your companion roster** — real collection cards and enlarged existing companion sprites.
6. **Every region. A new horizon.** — current region and unlocked travel destinations.
7. **Find your guild. Stay connected.** — full guild banner, decorative profile border, and private guild chat, using fictional sample members and messages.

The numbered PNGs in `exports/` are **1080 × 1920**, 24-bit RGB with no transparency. `feature-graphic-1024x500.png` is the Play Store feature graphic; `promotional-banner-2048x1000.png` is its larger promotional counterpart. The contact sheet is for reviewing the set, **not** for uploading as a screenshot.

`index.html` is a click-to-enlarge gallery. `veldryn-play-store-v1.zip` contains the final image exports and this guide.

## Competitor review: what to borrow, what to avoid

These are visual-design judgments from the current listings, not measured conversion results.

| Listing inspected | Effective | Less effective / our response |
| --- | --- | --- |
| [Melvor Idle](https://play.google.com/store/apps/details?hl=en&id=com.malcs.melvoridle) | Clear feature-specific headlines, color consistency, genuine interface inside the composition. | Phone frames and long UI panels reduce detail at thumbnail size. Enlarge focused UI crops instead. |
| [IdleMMO](https://play.google.com/store/apps/details?hl=en&id=dawsn.idlemmo) | Character art creates an immediate fantasy identity; each image focuses on a feature. | Extra explanatory sentences and device chrome compete with gameplay. Keep Veldryn’s overlay copy short. |
| [Idle Clans](https://play.google.com/store/apps/details?hl=en&id=com.idleclans.temsoft) | Enlarged item art and strong contrast make collection depth easy to understand. | Decorative, tilted item montages explain the interface less directly. Keep Veldryn’s first three images UI-led and upright. |

Our direction: deep blue/teal, warm gold, ivory editorial headlines, the existing Veldryn wordmark, large unmodified gameplay crops, and a consistent hierarchy. Do not imitate competitor logos, claims, or artwork. Seasonal event advertising is omitted from this evergreen set; add a replacement only while that event is actually available. The seventh screenshot highlights the implemented guild and chat interface; it does not promise synchronous multiplayer combat, player population, premium benefits, rankings, or unspecified release features.

## Google Play checks

[Official preview-asset guidance](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-GB), checked 28 September 2026: feature graphic 1024 × 500; JPEG or 24-bit PNG without alpha. Google recommends at least three 1080 × 1920 portrait game screenshots, actual gameplay, and UI priority in the first three. Overlay taglines should occupy no more than 20%; avoid rankings, download claims, pricing, or install calls to action. This pack uses a 335-pixel headline area (17.5% of height), plus a small footer. Export dimensions, RGB channels, crop bounds, proportional scaling, and headline width are checked by the compositor. These checks are not a guarantee of Google approval.

## Authenticity and release gate

- All screenshot panels come from the current Veldryn **React Native web implementation**, captured in a 432 CSS-pixel-wide frame at 2.5× rendering scale. There is no fabricated game UI or generated screenshot text.
- `StoreCaptureReview.tsx` supplies an isolated in-memory test profile: Aster, Level 28 Ironwarden, real Emberwatch Reprisal equipment, level-appropriate skills/tools, supplies, companions, and discovered routes. No account, save, purchase, or production data is changed.
- The social capture mounts `GuildIdentitySummary`, `GuildMemberRosterPanel`, and the same `GuildChatView` presentation used by live `GuildChat`. The Bloomwardens, member activity, and conversation are staged sample data, not real players or a verified live session. Network/account actions remain in the live wrapper and are not mounted in the capture fixture. No messages or read receipts are sent. The crest sizing and guild-specific message placeholder were corrected in the actual components before recapture.
- The revised social export uses the full banner and the selected decorative artwork as the profile's actual perimeter. Compact views use plain, uncropped miniature banners without frames. Guild profile names and tags have no decorative backing or outline. Existing nameplate IDs are preserved, but the unused nameplate selector is hidden. The profile crop uses `bare: true` to avoid adding another marketing frame. `captures/guild-profile-border.png` is an unmodified close-up of the new in-game component. `guild-identity` is an additional opt-in visual QA screen for frame variants, compact icons and narrow layouts.
- Captures intentionally omit unrelated helper/setup panels. Separate crops are arranged into marketing compositions; these are not uninterrupted full-phone screenshots. Exact source rectangles are in `layouts.json` and `exports/capture-manifest.json`.
- Companion sprite ornaments are existing game assets. Pixel-art edges are intentional. The World screen’s region images are the current in-game assets, not invented high-detail replacements.
- Before upload, compare the crops with the final **Android release build**, confirm every featured feature/asset is in that release, and recapture if native typography/layout or balance differs. The current UI still uses “gathering” internally; the marketing category uses “Skilling.”
- No conversion uplift is claimed. A sensible later experiment is swapping the hero and combat screenshots as the first image, keeping the rest unchanged.

## Rebuild / edit

`layouts.json` is the editable headline, category, crop, and placement source. `compose.cjs` renders the layouts with deterministic canvas code; it never regenerates or rewrites gameplay pixels. Keep source captures unchanged when editing crops.

From the repository root:

```powershell
node marketing/play-store-v1/compose.cjs
node marketing/play-store-v1/serve.cjs
```

Then open `http://localhost:8112/marketing/play-store-v1/index.html`.

The compositor uses `@napi-rs/canvas` and `sharp` from the configured Codex runtime, and Windows Georgia/Segoe UI fonts. For another machine set `VELDRYN_ART_NODE_MODULES` to the appropriate Node modules directory and adjust/register equivalent licensed font paths. No fonts are redistributed in this pack.

To recapture, start Expo from `apps/mobile` in a separate PowerShell process:

```powershell
$env:EXPO_PUBLIC_VISUAL_QA='1'
$env:EXPO_PUBLIC_VISUAL_QA_SCREEN='store'
$env:EXPO_PUBLIC_SERVER_GAMEPLAY='false'
$env:EXPO_NO_DOTENV='1'
node node_modules/expo/bin/cli start --web --port 8099
```

Open `capture.html?screen=hero` through the review server, replacing `hero` with `combat`, `battle`, `skills`, `crafting`, `companions`, `world`, or `social`. Save full-page screenshots to `captures/<screen>.png`. The capture wrapper is intentionally taller than a phone to allow clean section crops. The fixture is opt-in and guarded by `__DEV__`; normal and release builds still use `App`. Stop that Expo process before resuming normal development on the same port.

## Promotional artwork provenance

**Mode:** built-in image-generation tool, reference-guided generation; not CLI/API fallback. Only the promotional key art was generated. The logo and tagline were added deterministically afterward. The generation skill guided reference fidelity, inspection, and saving the output into the project; no generated UI was substituted for gameplay.

**References:** `apps/mobile/assets/events-startup-v1/backgrounds/startup_firstlight@3x.png` (world/style), and `apps/mobile/assets/character-skins-t1-ironwarden/T1_003/female-front.png` (heroine identity). Source output: `source/promotional-key-art.png`.

**Final prompt:**

> Use case: ads-marketing. Create one wide landscape promotional key art for the fantasy idle RPG VELDRYN. Reference image 1 is the game's actual pixel-art world: blue crystal-spired citadel, bridges across waterfall ravines, evergreen forest, golden morning light. Reference image 2 is the actual Ironwarden heroine design: blonde woman in weathered blue hood, blue padded armor with gold stitched crosses, brown leather, iron sword and blue wooden shield. Preserve her recognizable design and the game's refined detailed pixel-art aesthetic, not photorealism or anime. Compose at approximately 2.05:1 landscape ratio, ideally 2048x1000. The heroine stands on a mossy stone overlook on the right third, three-quarter view with sword lowered, looking toward the radiant citadel in the central distance. Adventure atmosphere, majestic scale, teal mist and warm gold rim light. Left third and left-center are dark blue forest mist with clean negative space for our existing logo, which we will add separately. No text, no logo, no UI, no buttons, no watermarks, no extra characters, no monsters. Keep heroine head and the citadel safely inside the central 80 percent. This is illustrated promotional key art, not a gameplay screenshot.
