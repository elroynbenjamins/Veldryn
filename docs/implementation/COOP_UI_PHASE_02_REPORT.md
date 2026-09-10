# VELDRYN co-op UI — Phase 02 report

Date: 2026-09-09  
Phase / commit: Phase 02 / working tree (no commit created)  
Actual app platform: Expo `~53.0.0`, React Native `0.79.5`, React `19.0.0`, TypeScript `~5.8.3`  
Mode: authenticated real-data adapter plus explicitly development-only canonical fixtures

## Changes

Changed files and purpose:

- `apps/mobile/src/core/coop-dungeon-browsing.ts`: typed dungeon projection/presenter, supported room filtering, exact route-range validation, art-theme mapping, locked-reason validation, and All/Available filtering.
- `apps/mobile/src/online/coop-client.ts`: expanded the `/coop/entry` dungeon projection boundary without inventing a new endpoint.
- `apps/mobile/src/online/coop-entry-source.ts`: isolated the real authenticated entry adapter.
- `apps/mobile/src/dev/coop-dungeon-fixtures.ts`: development-only review adapter mirroring the eight canonical launch expedition IDs, names, regions, minimum/recommended levels, difficulty tiers, and supported room families.
- `apps/mobile/src/components/coop/CoopDungeonBrowser.tsx`: S01 dungeon list and S02 dungeon details/mode choice using Phase 01 primitives.
- `apps/mobile/src/screens/CoopExpeditionScreen.tsx`: loading, retry/error, empty, list, details, and active-run resume entry orchestration. It does not start matchmaking or recruit Echoes.
- `apps/mobile/src/i18n/coop.ts` and `src/i18n/index.ts`: 57 co-op browsing messages in English, German, Spanish, Dutch, Italian, and French.
- `apps/mobile/App.tsx`: moved Co-op Expeditions into the existing World navigation history so the real five-tab bar remains visible; development builds use fixtures only when the authenticated co-op service is not configured.
- `apps/mobile/src/screens/CombatScreen.tsx`: narrow compatibility adjustment for a concurrent `currentCombatRegionId` signature change, retaining the explicitly selected region only when level-unlocked.
- `apps/mobile/tests/coop-dungeon-browsing.ts` and `apps/mobile/package.json`: canonical identity, lock, filter, unknown-art, unsupported-room, route-range, and six-catalog tests.

Reused components/assets:

- Phase 01 `ExpeditionScreenShell`, `FantasyPanel`, `PrimaryAction`, `StateChip`, and `CoopImageSlot`.
- Approved `rootbound_hero`, four environmental thumbnails, and ten node tiles.
- Existing `GameTopBar`, bottom navigation, app-level safe area, back history, Android BackHandler, and edge-swipe gesture.

New data adapters / endpoints:

- Added `CoopEntrySource` with separate `real` and `fixture` implementations.
- No endpoint was added. Production still calls the existing `/coop/entry` contract with the authenticated Supabase token.

## Evidence

Tests actually executed:

| Command | Environment | Result |
| --- | --- | --- |
| `.\\node_modules\\.bin\\tsc.cmd --noEmit --pretty false` | `apps/mobile` | PASS. |
| `npm run test:core` | `apps/mobile` | PASS, including `coop-dungeon-browsing`; 6 co-op catalogs with 57 messages each. |
| `npm run test:pre-codex` | `apps/mobile` | PASS. |
| `.\\node_modules\\.bin\\expo.cmd export --platform android --output-dir .phase02-export --clear` | Android production Metro/Hermes export | PASS after using the approved Hermes execution path. The export contained 414 files and was removed after inspection. |
| Forbidden import scan | `App.tsx`, `src/`, `assets/coop-ui/` | PASS: no reference-screen, prototype portrait, or prototype navigation imports. |

Screenshots actually captured: none. The configured Android AVD is listed, but no booted device is available through ADB to this task. React Native Web dependencies are not installed, and a recreated browser image would not be native evidence.

Comparison to named references:

- S01 follows reference 01 with a compact World/Expeditions heading, All/Available filters, vertical illustrated cards, live level/status copy, expanding locked reasons, and the existing five-tab bar.
- S02 follows reference 02 with a landscape hero, live name/description, facts, supported node tiles, server-projected difficulty choices, explicit Live/Q-Mode cards, and a persistent primary action.
- Rootbound uses canonical `EXP_001 · Rootbound Vault · minimum 15 · recommended 25`, not the mockup's Rootbound Depths/level 20 copy.

Expected/approved differences:

- The list uses all eight canonical backend launch definitions in development, not five invented mock dungeons.
- Existing navigation icons and app chrome remain unchanged.
- Locked overlays, labels, mode copy, difficulty, facts, and controls are live native UI.
- The Phase 02 primary action records a truthful “loadout selection is not available in this phase” notice. It does not make a queue/recruit request before Phase 03.
- Unsupported `forge` and `secret` backend node families are hidden because the supplied UI kit has no approved/functioning room presentation for them.

## Boundaries

Tests not run:

- Required native captures for S01/S02 at 360, 390, and 430 logical widths.
- Screen-reader traversal, 1.3/1.6 font-scale device runs, tablet, software keyboard, and low-end Android performance.
- Real `/coop/entry` integration, because the repository still has no matching HTTP route implementation or configured live service.

Missing backend capability:

- `/coop/entry` must eventually project localized/structured locked reasons, descriptions, recommended level, enabled room definitions, supported difficulty tiers, and reward-budget state.
- Production HTTP transport, durable adapters, and realtime run services remain absent as recorded in Phase 00.
- If the real projection omits difficulty or supported rooms, the UI shows an explicit unavailable state and disables continuation rather than assuming success.

Missing approved art:

- Unknown expedition IDs use the Phase 01 missing-art fallback.
- No new dungeon, font, character, or combat art was generated.

Known accessibility/device/performance issues:

- Dungeon cards have one accessible action, two-line-capable live titles, readable locked reasons, explicit selected state, and 48-unit controls.
- Available/locked and selected modes use text plus color/borders.
- Device-width and assistive-technology evidence remains pending until a booted native target is available.

Does the release bundle exclude reference/prototype-only material?: yes, based on the source scan and successful Android production export.

## Completion gate

Functional implementation gate satisfied: S01/S02, canonical fixtures, real adapter boundary, state coverage, navigation placement, localization, and production bundling are implemented without changing gameplay balance.

Visual-device gate pending: the required 360/390/430 native screenshots could not be captured because no ADB device was available.

Next single phase after review: Phase 03 — loadout selection and verified synchronization. Do not begin it until Phase 02 has been reviewed.
