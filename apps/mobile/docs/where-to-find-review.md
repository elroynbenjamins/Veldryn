# Where to Find — design review gate (not for live release)

**Status:** Implementation proposed on an isolated branch. Do **not** merge into `main`, enable in a release build or ship until the owner approves actual screenshots of the source panel and World route cue in each supported UI theme.

## Player journey

1. Tap an item ingredient, material source, tracked goal or Codex source.
2. Existing **How to Get** / **Where to get it** shows all authored sources, with odds/yields and ready/travel/locked states.
3. Selecting a different-region monster or gathering node opens **World** and shows a compact, dismissible **WHERE TO FIND** panel with the full **region › sub-area › activity › target** breadcrumb.
4. The target zone is marked on the World chapter list; unavailable travel retains the region/level lock reason.
5. Choosing an available **Travel** runs the existing travel command. Only after success does it deep-link to **Combat** or **Skills**, selecting the exact monster/node and sub-area. In the current region, it deep-links directly without a redundant World visit.
6. The panel can be dismissed. Routes are transient and cleared when switching accounts/characters.

## Visual and accessibility acceptance before release

- Capture actual app screenshots of the source panel and its World destination on every supported theme, including light/dark where applicable; obtain explicit approval.
- Verify compact widths, large text accessibility, landscape, long translated location names, safe areas and 44px-equivalent touch targets.
- Verify screen reader labels and navigation/back behavior, and that player navigation remains optional (no forced combat, gathering or travel).
- Check normal, off-region, level-locked and undiscovered travel routes; the blocker must be visible and no unauthorized action offered.
- Check Asterfall's region-only monsters (no invented subarea), Sunscar/Frostmarch specific areas, regular gathering, rare secondary finds, dungeons, unlisted items, Codex and Item Quick Inspect.
- Confirm source odds/yields come from the existing catalog and remain accurate after any server content changes.
- Verify strings in all supported languages; new English copy is source-keyed and translated for DE/ES/NL/IT/FR, with other supported languages falling back to English.

## Automated checks

`apps/mobile/tests/source-route-guidance.ts` checks catalog-driven combat/gathering IDs, correct regional area, route immutability, and locked-source discoverability. `apps/mobile/tests/source-route-guidance-ui.cjs` protects the World → exact Combat/Skills handoff. Both are included in the mobile core test manifest.

No backend changes, player-save migration, direct travel, activity start or reward-table edits are part of this PR.
