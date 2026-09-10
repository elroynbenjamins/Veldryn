# Co-op refinement pass 02 — progression board and event expedition previews

## Outcome

- Reworked the expedition browser into compact region groups, with an open/total count at each region heading.
- Kept the existing All / Available control; the Available view now suppresses non-playable seasonal previews.
- Added presentation-only seasonal expedition contracts and validation.
- Added two event previews grounded in the annual event concepts:
  - Suncrest Games — The Shattered Isles — Aureon, First Champion.
  - Starfall Convergence — Astral Rift Expedition — The Constellation Eater.
- Each preview exposes three distinct route highlights. Preview cards cannot start a run and do not invent level, reward, schedule, or encounter data.
- Kept all playable dungeon authority in the existing server dungeon projection. The next regions already represented on the progression board remain locked until their server combat content is complete.

## Deliberate boundary

The annual event concepts explicitly reserve node-based roguelite play for suitable events. Harvestwake, Merchant's Accord, Heartbond, and Turning of the Age were not converted into standard co-op dungeons. The two preview expeditions must not become selectable until an authoritative event schedule, encounter registry, normalized tier rules, reward policy, and event-specific art are supplied.

## Changed files

- `apps/mobile/src/components/coop/CoopDungeonBrowser.tsx`
- `apps/mobile/src/core/coop-dungeon-browsing.ts`
- `apps/mobile/src/core/coop-event-expeditions.ts`
- `apps/mobile/src/dev/coop-dungeon-fixtures.ts`
- `apps/mobile/src/i18n/coop.ts`
- `apps/mobile/src/online/coop-client.ts`
- `apps/mobile/src/screens/CoopExpeditionScreen.tsx`
- `apps/mobile/tests/coop-dungeon-browsing.ts`

## Verification

- `pnpm run test:core` — PASS. All core tests passed, including co-op browsing/event validation, role/loadout presentation, shared run presentation, Q-Mode presentation, localization, live events, and the surrounding offline systems.
- `tsc -p tsconfig.json --noEmit --pretty false` — PASS on the final run.
  - An earlier run briefly failed while the concurrently edited `EquipmentEnhancementModal.tsx` was absent; the file returned and the unchanged command passed.
- `expo export --platform android --output-dir .expo-export-coop-pass02 --clear` — PASS after rerunning with Hermes execution permission: 1,218 modules and 435 assets bundled.
  - The sandboxed attempt reached Hermes and failed with `hermesc.exe: permission denied`; this was an environment permission failure, not a bundle error.
- Temporary `.core-build`, `.expo-export-coop-pass02`, and `.codex-tmp` verification output was removed after the successful runs.

No combat numbers changed in this presentation/content-contract pass, so the prior 8,000-run co-op balance result remains the applicable balance evidence rather than being relabeled as a new simulation.

## Remaining work

- Build server-authoritative Sunscar encounter content before unlocking the next regional dungeon.
- Add event-specific static node/card art for Suncrest and Starfall.
- Add event schedules, event reward budgets, boss encounters, and live/Q-Mode eligibility on the server.
- Run device-level visual QA at narrow and large phone widths.
