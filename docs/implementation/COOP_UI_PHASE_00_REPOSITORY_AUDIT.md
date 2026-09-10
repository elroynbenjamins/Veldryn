# VELDRYN co-op UI — Phase 00 repository audit

Date: 2026-09-09  
Phase / commit: Phase 00 / working tree (no commit created)  
Mode: repository audit of the real app and backend; no fixture gallery or production co-op transport added

## Scope and source boundary

The requested workspace path, `design/VELDRYN_Coop_UI_Implementation_Pack/CODEX_START_HERE.md`, is not present in this checkout. The attached pack at `C:/Users/elroy/Downloads/VELDRYN_Coop_UI_Implementation_Pack/VELDRYN_Coop_UI_Implementation_Pack/` and the separately attached `C:/Users/elroy/Downloads/CODEX_START_HERE.md` are available; their start files are identical. The pack was treated as design and implementation reference material, subordinate to the user's request and the actual repository.

Phase 00 was limited to inspection, validation, and this report. No application UI, framework, navigation, gameplay value, asset, backend behavior, or dependency was changed.

## Actual app platform and dependency versions

- Frontend: Expo `~53.0.0`, React Native `0.79.5`, React `19.0.0`, TypeScript `~5.8.3`.
- Entry point: `apps/mobile/App.tsx`, registered by Expo. The app is a single React Native tree composed from native primitives and local components.
- Package manager: the repository contains `pnpm-lock.yaml`; project scripts are exposed through `apps/mobile/package.json` and `backend/package.json`.
- State: React state/hooks for current UI state and `AsyncStorageGameRepository` for the versioned local game save. There is no query/cache framework.
- Online/auth: `@supabase/supabase-js`, Expo SecureStore-backed sessions, and Expo Linking for magic-link completion.
- Backend: Node/TypeScript package `veldryn-backend-foundation` version `2.1`.
- Typography: system fonts and React Native font weights. No approved font binaries or app-level custom-font loader were found.

## Repository-specific integration map

| Concern | Existing integration point | Phase 00 finding |
| --- | --- | --- |
| App shell | `apps/mobile/App.tsx` | Owns save bootstrap/recovery, character creation, top bar, content, and bottom navigation. It must remain the root shell. |
| Primary navigation | `App.tsx`; `src/core/quick-navigation.ts`; `src/components/GameTopBar.tsx` | Custom state navigation, not React Navigation. The exact primary order is `Home / Character / World / Inventory / More`. Secondary destinations use a history stack. Android hardware back and an edge swipe call the same back function. |
| Co-op entry | `src/screens/WorldScreen.tsx`; `App.tsx` `showCoop`; `src/screens/CoopExpeditionScreen.tsx` | Expeditions belong inside World. The existing feature-gated co-op entry opens a secondary screen without adding a sixth tab. Preserve this placement. |
| Local save | `src/storage/async-storage-repository.ts`; `src/core/save-normalization.ts`; `src/screens/SaveRecoveryScreen.tsx` | AsyncStorage save/load/reset and recovery already exist and should not be bypassed by the co-op UI. |
| Account/character | `src/online/supabase.ts`; `src/online/account.ts`; `src/components/OnlineAccountPanel.tsx`; `src/core/types.ts` | Co-op requests can use the authenticated Supabase session and the existing character/profile snapshot. Offline mode remains valid when public Supabase configuration is absent. |
| Fixed appearance | `src/components/CharacterVisual.tsx`; `src/theme/character-assets.ts`; `src/theme/accepted-front-character-assets.ts`; `src/theme/event-character-assets.ts` | Characters use selected fixed skins. There is no equipment-layer appearance swap to restore. Use the current skin/portrait resolver for party members. |
| Shared theme | `src/theme/theme.ts` | Existing colors, spacing, radii, typography, and minimum touch sizes should be extended/mapped, not replaced. |
| Static asset loading | Literal `require(...)` registries under `src/theme/` | Metro-safe literal imports are the established convention. Variable `require()` must not be introduced. |
| Localization | `src/core/localization.ts` and localization tests | English, German, Spanish, Dutch, Italian, and French already exist. All new visible strings must enter this system. |
| Co-op mobile boundary | `src/online/coop-client.ts`; `src/core/coop-presentation.ts` | Typed request/presentation boundaries exist for entry, Q-mode, queue, run, choice, vote, ready check, and party chat. They are feature-gated by `EXPO_PUBLIC_COOP_ROGUELITE_V1` and `EXPO_PUBLIC_COOP_API_URL`. |
| Co-op backend domain | `backend/src/server/coop/`; `backend/src/shared/coop-types.ts`; `backend/src/server/expeditions/` | Domain rules, services, invariants, route generation, tests, and migrations exist. The feature flag is disabled by default. |
| Backend transport | No matching server router/handler found for `/coop/*` | The mobile URL contract is not backed by an HTTP server adapter in this repository. Several co-op repositories are memory-only. Production realtime subscriptions were not found. |
| Database candidates | `backend/supabase/migrations/20260917000001...006` | Co-op schema/RLS migration files exist, but application to a live Supabase project was not verified. |
| Developer tooling | `src/components/DeveloperTools.tsx`; existing Chat Pilot dev screen | A development-only entry pattern exists, but there is no co-op component gallery. |
| Visual validation | Pack preview/capture utilities only | The app has no native co-op screenshot runner or device matrix. Pack screenshots are references, not runtime proof. |

## Reuse list

Reuse or extend these app-native components rather than copying the reference screens into image-backed pages:

- `Panel` for bordered/glowing surfaces and code-drawn corner ornaments.
- `GameButton` for press, disabled, and tone behavior. Phase 01 should revisit its forced single-line label for text expansion.
- `GameTopBar` and the current bottom tab bar for the existing shell and exact five-tab contract.
- `ConfirmModal`, `EmptyState`, `StatBar`, `StatRow`, and `RewardPopup` for standard UI states.
- `CharacterVisual`, `CharacterPortrait`, `FixedCharacterPortrait`, and `EquipmentCharacterPortrait` for fixed-skin character presentation.
- `BattleStage` and `EnvironmentBanner` where canonical combat/environment presentation is needed later.
- Existing account/profile and online status components for authenticated context; do not duplicate login or profile state inside co-op.

New shared Phase 01 primitives are still warranted for a safe-area co-op screen shell, fantasy panel variants, role badges, state chips, image slots, and a development-only state gallery. Those primitives do not exist as generalized components today.

## Approved assets and review status

### Existing application character assets

- Nine class emblems and neutral male/female starting-character front/back art are registered in `src/theme/character-assets.ts`.
- Nine class-bound beginner skins provide male/female front/back artwork.
- Thirty accepted-front skin IDs provide approved male/female front portraits through `src/theme/accepted-front-character-assets.ts`.
- Event skin artwork is merged through `src/theme/event-character-assets.ts`.
- These registries are the approved runtime appearance source. Skin ownership/unlock state, not equipped item layers, selects appearance.

`apps/mobile/art-review/REVIEW_STATUS.md` marks the Ironwarden pilot as immutable reference material and identifies `aster-iron-pilot-aligned-v1` as still requiring human review. Accepted equipment sheets live in the documented accepted area; other candidate/reference folders must not be promoted implicitly.

### Supplied co-op pack

The pack validator confirms 37 exact crops: 28 marked `ready` and 9 marked `prototype_only`.

- Ready: 8 illustrations, 10 node tiles, 3 role tiles, 3 boon tiles, and 4 skill tiles.
- Prototype only: 4 opaque party portraits and 5 navigation tiles. Do not ship these as canonical character/navigation assets.
- The ten files under `references/screens/` were all visually inspected. They define composition targets, not shippable full-screen interfaces or gameplay truth.
- The ready artwork is opaque rectangular crop art. Titles, controls, status, timers, labels, locks, values, focus, and selection remain live code.

Proposed Phase 01 asset destination (not created in Phase 00):

```text
apps/mobile/assets/coop-ui/
  illustrations/
  node-tiles/
  role-tiles/
  boon-tiles/
  skill-tiles/
apps/mobile/src/theme/coop-ui-assets.ts
```

Only the 28 ready crops should be copied when actually used. `coop-ui-assets.ts` should use explicit literal `require(...)` entries. Reference screens and prototype-only crops should remain outside the production import graph.

## Dependency and blocker matrix

| Capability | Status | Consequence |
| --- | --- | --- |
| Existing Expo/RN framework | Ready | No framework replacement is needed or allowed. |
| Five-tab/navigation integration | Ready | Co-op remains under World and uses the current back/history behavior. |
| Fixed-skin character art | Ready, with named candidates still under review | Runtime party cards can use approved skin registries; review candidates stay excluded. |
| Pack ready crops | Ready and integrity-validated | Phase 01 may import exactly 28 ready assets. |
| Layered/animated co-op combat character art | Missing | Later combat UI must use approved fixed appearances/static presentation until separately approved art exists; no replacements should be generated. |
| Custom pixel/fantasy font binaries | Missing | Phase 01 must use system typography unless separately supplied/licensed. |
| Mobile co-op typed client | Present | UI can bind to an explicit adapter, but cannot claim online success without transport. |
| `/coop/*` HTTP handlers | Missing | Real online flow is blocked until server routes/adapters are implemented. |
| Durable co-op repositories | Partial/missing | Queue, ready check, decisions, Q-mode, rewards, and run storage include memory implementations; production persistence needs adapters. |
| Live party/run/chat subscription | Missing | No production realtime UX can be certified yet; polling or mock success must not be presented as live. |
| Live migration/RLS verification | Unverified | Database readiness cannot be claimed from migration files alone. |
| Co-op developer gallery | Missing | Phase 01 should add a `__DEV__`-only component lab using fixture states. |
| Native screenshot runner/device evidence | Missing | Visual acceptance needs a real device/emulator capture path. |

## Evidence

### Tests actually executed

| Command | Environment | Result |
| --- | --- | --- |
| `npm run test:core` | `apps/mobile`, local Node | PASS: offline smoke plus skins, equipment, quick navigation, save transfer, six-language localization, live events, and gathering tools. |
| `npm run test:pre-codex` | `apps/mobile`, local Node | PASS. |
| `.\\node_modules\\.bin\\tsc.cmd --noEmit --pretty false` | `apps/mobile` | PASS. |
| `..\\apps\\mobile\\node_modules\\.bin\\tsc.cmd --noEmit --pretty false` | `backend` | PASS. Backend has no installed local `tsc`, so the compatible mobile compiler was used without installing dependencies. |
| `..\\apps\\mobile\\node_modules\\.bin\\tsc.cmd --pretty false` | `backend` | PASS; emitted the existing backend test build. |
| `npm run smoke` | `backend` | PASS. |
| `npm run squad-smoke` | `backend` | PASS. |
| `npm run coop-phase1` | `backend` | PASS: co-op phase-one invariants. |
| bundled Python `tools/validate_pack.py` | attached pack | PASS: 10 references, 37 exact crops, 28 ready, 9 prototype-only, route fixture constraints valid. |
| `node qa/test_presentation_helpers.mjs` with project `tsc` on `PATH` | attached pack | PASS: 22 presentation-only cases. Node emitted a child-process shell deprecation warning. |

The first attempts at backend `npm run typecheck`, pack `python tools/validate_pack.py`, and the pack helper test failed because those command names were not locally available. They were rerun successfully using already-bundled/project tools; nothing was downloaded or installed.

### Visual evidence

- Visually inspected all ten named pack reference screens: dungeon list, dungeon details, loadout selection, live matchmaking, live ready check, expedition map, live node choice, combat, boon choice, and Q-mode team.
- No new app screenshot was captured. There is no co-op gallery/screenshot runner, and no connected emulator/device was established during this audit. Reference images are not counted as current-app evidence.
- Expected/approved difference: the real app retains its own shell, live controls, fixed-skin characters, exact five-tab order, and canonical gameplay data instead of reproducing the screenshots pixel-for-pixel.

## Release and safety boundaries

- No reference or prototype-only co-op material was imported, so Phase 00 adds nothing to the production bundle.
- No gameplay balance, reward, timer, route, role, or combat value was changed.
- No backend success state was mocked.
- No authentication, save, or navigation behavior was changed.
- Accessibility, large text, keyboard focus, 390-logical-pixel layout, low-end Android performance, and device safe-area behavior remain Phase 01 validation work for the new primitives.

## Completion gate

Gate satisfied for Phase 00: the real framework, root shell, navigation, reusable components, fixed appearance sources, asset loader, state/auth/network boundaries, backend gaps, test tools, and exact World-to-Expeditions placement are mapped. Phase 00 contains documentation only.

## Proposed next single phase — Phase 01 (not implemented)

After review/approval, Phase 01 should build only the shared visual kit:

1. Copy the 28 `ready` crops into `apps/mobile/assets/coop-ui/` and register them with literal imports; exclude all references and prototype-only crops.
2. Map the pack's navy/gold/cyan tokens onto `src/theme/theme.ts` conventions rather than replacing the app theme.
3. Add typed, app-native primitives for a safe-area co-op shell, fantasy panel variants, buttons, role badges, state chips, and robust image/fallback slots. Borders, glows, corners, labels, and states stay code-rendered.
4. Reuse the existing `GameTopBar`, five-tab navigation, fixed-skin portrait resolver, save/auth context, and back behavior. Do not add a tab or a parallel navigator.
5. Add a `__DEV__`-only component gallery reachable from the existing developer tools, covering normal, pressed, selected, disabled, loading, error, missing-image, long-text, and large-font states. It must not imply backend success.
6. Add every visible string to all six existing locales: English, German, Spanish, Dutch, Italian, and French.
7. Add import/fallback/presentation tests and capture the gallery at 390 logical width on a real runtime before any Phase 02 screen work.

Do not begin Phase 01 until this audit and proposal have been reviewed.
