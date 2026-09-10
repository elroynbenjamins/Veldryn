# VELDRYN co-op UI — Phase 01 report

Date: 2026-09-09  
Phase / commit: Phase 01 / working tree (no commit created)  
Actual app platform: Expo `~53.0.0`, React Native `0.79.5`, React `19.0.0`, TypeScript `~5.8.3`  
Mode: development-only fixture gallery; no real or simulated co-op backend activity

## Changes

Changed files and purpose:

- `apps/mobile/assets/coop-ui/`: copied the 28 pack crops marked `ready`, preserving their source bytes.
- `apps/mobile/src/core/coop-ui-contract.ts`: typed ready-asset IDs, co-op role IDs, and the immutable five-tab contract.
- `apps/mobile/src/theme/coop-ui-theme.ts`: navy/gold/cyan presentation tokens mapped to the current app conventions without replacing the existing theme.
- `apps/mobile/src/theme/coop-ui-assets.ts`: Metro-safe literal resource imports for all and only the 28 ready crops.
- `apps/mobile/src/components/coop/CoopVisualKit.tsx`: safe-area-hosted expedition shell, fantasy panels, actions, role badges, state chips, and image/fallback slots.
- `apps/mobile/src/screens/CoopUiGalleryScreen.tsx`: development component gallery for normal, pressed, selected, disabled, loading, error, missing-image, role, and five-tab states.
- `apps/mobile/src/i18n/index.ts`: gallery labels in English, German, Spanish, Dutch, Italian, and French.
- `apps/mobile/src/components/DeveloperTools.tsx`, `apps/mobile/src/screens/SettingsScreen.tsx`, and `apps/mobile/App.tsx`: development-only entry and existing back/swipe integration.
- `apps/mobile/tests/coop-ui-contract.ts` and `apps/mobile/package.json`: ready-asset, role-art family, prototype exclusion, and five-tab contract checks.

Reused components/assets and host behavior:

- Existing root `SafeAreaView`, status bar, Settings/Developer tools entry, Android hardware-back handler, edge-swipe handler, localization system, and navigation state.
- Existing production navigation icons and exact `Home / Character / World / Inventory / More` order.
- Existing system typography because the pack contains no licensed font binaries.
- Existing fixed character-skin resolver remains the only canonical character appearance source. Prototype party portraits were not imported.

New data adapters / endpoints: none. The gallery has no network adapter and cannot display mock matchmaking, rewards, or server success.

## Evidence

Tests actually executed:

| Command | Environment | Result |
| --- | --- | --- |
| `.\\node_modules\\.bin\\tsc.cmd --noEmit --pretty false` | `apps/mobile` | PASS after correcting one Phase 01 conditional-style type. |
| `npm run test:core` | `apps/mobile` | PASS, including co-op presentation, the new co-op UI contract, and all six localization catalogs (73 shared messages each). |
| `npm run test:pre-codex` | `apps/mobile` | PASS. |
| SHA-256 comparison of pack `assets/ready/` against `apps/mobile/assets/coop-ui/` | PowerShell | PASS: 28 files, zero mismatches. |
| Source scan for `prototype_only`, reference-screen paths, four prototype portrait IDs, and `nav_world` | App production source/import tree | PASS: zero forbidden imports. |
| `.\\node_modules\\.bin\\expo.cmd export --platform android --output-dir .phase01-export --clear` | Expo/Metro Android production export | PASS after rerunning outside the sandbox so the bundled Hermes executable could run; 1,167 modules bundled and 414 emitted files inspected. Temporary export was then removed. |

Screenshots actually captured: none. The configured AVD was discoverable, but ADB did not expose a connected/booted device to this task, and the project lacks the optional React Native Web dependencies. A browser reconstruction would not count as native evidence, so none was fabricated.

Comparison to named reference:

- The shared kit follows the references' near-black navy surfaces, restrained gold ornaments, cyan active state, blue primary action, green ready state, red error state, rectangular image tiles, and live text hierarchy.
- The gallery uses the supplied `rootbound_hero`, elite node, rooted boon, and guard skill crops to exercise every supported image size and the missing-art fallback.
- The implementation deliberately retains the real app shell and avoids the oversized logos, marketing banners, fake device chrome, and full-screen flattened reference compositions.

Expected/approved differences:

- System fonts are used because no approved font binaries were provided.
- Controls and labels are native, scalable UI rather than pixels baked into images.
- The gallery demonstrates three role types; the four-seat `1 Tank / 2 Damage / 1 Support` gameplay composition remains a later screen concern.
- Existing navigation icons are retained because the supplied navigation crops are prototype-only.

## Boundaries

Tests not run:

- No real-device/emulator screenshot at 390 logical width.
- No screen-reader traversal, software-keyboard, tablet, low-end Android performance, or complete 320/360/390/430 width matrix.
- No co-op backend or multiplayer tests; Phase 01 is presentation-only.

Missing backend capability:

- The Phase 00 findings remain: `/coop/*` HTTP handlers, durable production adapters, and party/run/chat realtime subscriptions are not implemented in this repository.

Missing approved art:

- No layered/animated combat character art or custom font binaries were supplied. No replacements were generated.
- The nine prototype-only crops and ten reference screens remain outside the app tree.

Known accessibility/device/performance issues:

- Interactive primitives expose role, disabled, busy, selected, focus, and readable fallback states and use 48-unit targets.
- Long labels wrap instead of being forced onto one line. Full native accessibility/device validation remains outstanding until an emulator or device is available.

Does the release bundle exclude reference/prototype-only material?: yes, based on the source import scan and successful Android production export. Only the 28 ready crops were copied into the application.

## Completion gate

Implementation gate satisfied: the reusable Phase 01 kit, exact ready-asset mapping, six-language copy, development-only access, and production export are complete without altering gameplay or navigation.

Visual-device gate pending: a 390-logical-width native screenshot and device accessibility pass could not be captured because no booted ADB target was available.

Next single phase after review: Phase 02 only. Do not begin it until the Phase 01 gallery has been reviewed, ideally from Settings → Developer / testing → Open Co-op UI Lab on a development build.
