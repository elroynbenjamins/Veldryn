# Co-op refinement pass 03 — Sunscar runtime and regional authority

## Outcome

- Added explicit server implementation gates to every regional expedition.
- Enabled both Asterfall and both Sunscar dungeons. Frostmarch and Ashlands remain non-startable until their encounter registries ship.
- Replaced the shared Rootbound-only route pool with dungeon-specific pools for all eight regional dungeon identities.
- Added three battle encounters, three elite encounters, and a final boss for each Sunscar dungeon.
- Added missing Lanternwatch route encounters so its generated combat nodes always resolve.
- Added a combined authoritative encounter registry used by the combat service.
- Enforced base and tier level requirements again at Q-Mode run creation.
- Updated the development browser to use the actual character level and the server implementation boundary instead of the old fixed level-25 availability shortcut.
- Sorted each UI region by its required level and added localized “Encounters in development” messaging.
- Applied role ability corrections through the shared co-op resolver. This fixed Stonecaller parties clearing Asterfall but failing Sunscar.

## Balance verification

The new phase 13 simulation covers 2,000 complete five-room-plus-boss runs at level 45 with two valid 1 Tank / 2 Damage / 1 Support compositions.

| Dungeon | Party | Clears | Clear rate | Average combat time |
| --- | --- | ---: | ---: | ---: |
| Buried Observatory | Ironwarden, Wayfinder, Ravager, Dawnkeeper | 474 / 500 | 94.8% | 94.52 s |
| Buried Observatory | Ironwarden, Hexweaver, Knife Dancer, Stonecaller | 493 / 500 | 98.6% | 107.11 s |
| Mirage Well | Ironwarden, Wayfinder, Ravager, Dawnkeeper | 487 / 500 | 97.4% | 95.38 s |
| Mirage Well | Ironwarden, Hexweaver, Knife Dancer, Stonecaller | 494 / 500 | 98.8% | 107.32 s |

The simulation also checks exactly five pre-boss nodes, dungeon-specific content prefixes, resolvable combat IDs, and closed gates for Frostmarch/Ashlands. Damage contribution remains observed rather than capped; the existing phase 12 test continues to assert an ordinary Damage share above 35%.

## Changed files

- `backend/src/server/combat/content/asterfall-encounters.ts`
- `backend/src/server/combat/content/expedition-encounters.ts`
- `backend/src/server/combat/content/sunscar-encounters.ts`
- `backend/src/server/combat/expedition-combat-service.ts`
- `backend/src/server/coop/qmode.ts`
- `backend/src/server/coop/config.ts`
- `backend/src/server/coop/__tests__/phase13-regional-content.ts`
- `backend/src/server/expeditions/content/coop-route-content.ts`
- `backend/src/server/expeditions/content/launch-content.ts`
- `backend/src/server/expeditions/create-run.ts`
- `backend/src/server/expeditions/node-resolution.ts`
- `backend/src/server/expeditions/route-generation.ts`
- `backend/package.json`
- `apps/mobile/src/core/coop-dungeon-browsing.ts`
- `apps/mobile/src/dev/coop-dungeon-fixtures.ts`
- `apps/mobile/src/i18n/coop.ts`
- `apps/mobile/tests/coop-dungeon-browsing.ts`

## Verification

- Backend TypeScript build — PASS.
- Phase 4 route generation — PASS across 10,000 seeds with three distinct reachable choices and 90 distinct first layers.
- Phase 5 stateful run — PASS with five pre-boss nodes and one boss.
- Phase 6 Q-Mode — PASS with a valid four-member roster and completed reward settlement.
- Combat service smoke — PASS.
- Phase 12 Asterfall balance regression — PASS across 8,000 runs. Baseline clear rates remain 95.3% and 96.6%; solo clears remain zero; maximum observed Damage share remains uncapped at 41.52%.
- Phase 13 Sunscar content and balance — PASS across 2,000 runs, with results shown above.
- Mobile core suite — PASS, including 75 co-op messages in all six supported languages.
- Full mobile TypeScript check — PASS.
- Android Expo/Hermes export — PASS: 1,218 modules and 435 assets bundled.

## Remaining work

- Add Frostmarch encounter mechanics and tune both valid support compositions before enabling EXP_005 and EXP_006.
- Add Ashlands encounters after Frostmarch.
- Promote Suncrest and Starfall from UI previews only after their server event schedules, encounter registries, reward budgets, and event-specific node art are implemented.
