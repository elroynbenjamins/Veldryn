# Home, reward collection and online connection review — 13 October 2026

## Follow-up: first-event and permanent visibility contract

User clarification: Veilbreak is the first official event. Removed Harvestwake
pet definitions, pet/companion asset imports and prototype background/border
entries from the shipped collection catalog. Source artwork and authoring metadata
remain locally archived for possible future-year reuse; no production account
records were deleted.

Released event definitions and artwork must remain in the shipped catalog after
their earning window ends. Removed the active-window filter from profile icons,
profile cosmetic discovery and collection rows. Profile pet selection now shows
owned pets and locked pets from released events rather than only the current
event. Visibility does not grant ownership: authoritative profile commands still
reject unowned icons/pets/borders. Earned rewards remain usable after deactivation.

This is explicit release-catalog management, not automatic first-live detection
for every reward type. Future authored packs must be added at their official
release and retained thereafter. Guild event colors already have separate
server-side first-release history. Event reward acquisition remains controlled
by the server's event window and applicable claim grace period.

Follow-up verification: released-event lifecycle/ownership tests and profile-icon
tests pass; asset checks now cover 774 paths and three released event companions.
The earlier full-suite count below predates this follow-up. No deployment made.

## Scope and result

Reviewed the current working tree and recent file changes. HEAD predates the last 24 hours, so Git history alone cannot attribute all uncommitted changes to that window. Existing staged, unstaged and untracked work was preserved. This is a local implementation and verification pass, not a deployment or a clean release sign-off.

## Implemented fixes

- Activity reward summaries now open for explicit Collect Rewards claims or login/foreground return. Starting/stopping activities, travel, equipment changes, food, crafting, quests and event actions can settle earned progress without opening that modal. Empty repeat claims remain quiet. Incidental mastery notices remain separate.
- Online foreground return refreshes state before issuing one authoritative claim per arrival. Loading, in-flight commands and pending retries gate that claim. Account changes cannot accept a stale asynchronous refresh. Class training is included in arrival settlement.
- Switching away from processing/alchemy refunds unfinished reserved materials and Gold through the normal stop path. Stop uses the trusted command timestamp. Idle startup keeps recovered HP even without activity rewards.
- Explicit legacy single-craft payloads (`count: 1` / `batches: 1`) work, including the existing Faith UI. Invalid/multiple counts are rejected before settlement. Historical multi-batch save refund tests use explicit legacy fixtures.
- Fixed the missing RewardPopup theme binding, stale Guide destination comparison, QuickFoodSheet pressed style, missing localization rows and native scroll-indicator contracts.
- Fixed 18 event artwork require paths containing backslashes that JavaScript interpreted as escapes. Added missing released Veilbreak pet definitions and companion/pet portrait mappings while retaining previously owned Harvestwake artwork.
- Hollow Knightling and Lantern Keeper now use names/descriptions matching their supplied portraits. Stable collectible IDs, ownership and combat numbers are unchanged.
- Atlas cells clip to their own scaled viewport to prevent adjacent resource artwork leaking into the icon.
- The local event review switch selects the released catalog entry instead of retired Harvestwake.
- Admin QA setup uses a valid creation name before applying its privileged fixture identity; the reserved-name check no longer breaks the QA command.

## Home upgrade

Added a regional scene header with the selected profile portrait, class accent, character name, level, live XP progress and activity status. The scenery derives from the actual current region. The layout supports narrow screens, larger text and both light/dark themes. Home also resolves timed-processing labels from authored recipes.

The memory-fixture web preview bundled and rendered. Inspected Home at desktop and phone widths, including 390px and 320px. This was a web preview, not an Android/iOS lifecycle test or a signed-in production write test.

## Verification

- Mobile typecheck, core compilation, backend typecheck and online backend compilation passed.
- Focused reward-feedback, processing/refund, alchemy, startup recovery, online command/recovery/roster, live-health and released-event connection tests passed.
- Backend authenticated gameplay HTTP, event expedition, co-op entry and co-op loadout tests passed. These exercise local server handlers/mock transports; they do not prove every production user flow.
- All 777 static mobile image references resolve with portable paths and exact filename case.
- Asset validators passed for 33 pet sprites, 24 companion sprites, 24 transparent upgraded companion portraits, nine region scenes, and four released/historical event companion mappings. Path/ID coverage does not certify every image's visual content; the two renamed event portraits were visually inspected.
- All 135 native scroll surfaces satisfy the repository indicator contract.
- Regenerated the gameplay and co-op Edge Function bundles locally. A transient Windows file-mapping lock affected a redundant rebuild; an earlier rebuild completed successfully and both generated bundles retain the updated companion identities.
- The full non-fail-fast mobile run finished with **185/198 checks passing**. The 13 remaining failures are recorded below. Several test contracts still describe removed planners, retired events or old equipment counts; those were not hidden or removed from the suite. The combat food-budget failure needs separate balance investigation.

## Live read-only evidence

The configured production Supabase project is active. Gameplay and co-op Edge Functions are active. All 91 statically referenced mobile RPC names exist. The three RPCs without authenticated execute permission (`guild_contribute`, `transfer_storage_item`, `upgrade_storage_capacity`) are unused legacy helper paths; current Inventory mutations go through gameplay commands.

In the inspected last-24-hour log window, all 11 gameplay function requests returned HTTP 200. Login/token, game-state reads and presence calls also had successful responses. Two friend-request reads and one social-invitation read returned HTTP 401. Their cause was not established by aggregate logs. No production records were changed for verification.

Deployed function source retrieval failed in the connector, so byte-for-byte parity with the current local bundles remains unverified. Local fixes have not been deployed. Native foreground/background behavior and signed-in production end-to-end actions remain release verification work.

## Remaining regression failures

See the generated list below, retained rather than weakening the assertions to obtain a green run.

- `equipment-set-runtime.js`: Expected all 243 V33 sets in runtime coverage
- `live-events.js`: Scheduled events should be visible before they begin
- `live-event-catalog.js`: Harvestwake is the active release pack: expected harvestwake, got veilbreak
- `collectible-runtime-parity.js`: event pet diagnostics follow the release gate: expected true, got false
- `v40-preferences-loadouts.js`: goals_retired
- `working-toward-v2.js`: goals_retired
- `profile-customization-polish.js`: event background routes to Events: expected Events, got Collections
- `profile-showcase-prestige.js`: legendary event background receives prestige presentation: expected prestige, got notable
- `theme-polish-ui-contract.js`: src/screens/EventScreen.tsx must keep semantic theme token backgroundColor:C.accentSurface
- `ui-density-hierarchy-contract.js`: Full goals, weekly, daily and skill snapshots must stay behind the secondary progress disclosure and respect staged unlocks
- `balance-projection-ui-contract.js`: Simple gathering rows must show resource count and current action duration
- `ui-accessibility-responsive-contract.js`: Events must adapt dense navigation/actions to narrow phones and large text
- `combat-buff-boundaries.js`: King's Road/DREADGUARD must stay near the authored prepared food budget
