# One-page music & audio customization

Date: 20 November 2026. Status: proposed PR, not merged into main.

## UX
- Settings > Sound opens one vertically scrollable panel containing both global volume levels and all seven contexts.
- Groups are Regions (Town & Menus, Asterfall, Sunscar, Frostmarch) and Activities (Dungeons & Co-op, Boss Battles, World Boss).
- Each context has an independent accessible on/off switch and a compact inline music picker.
- The picker expands within the same page, showing Default theme or any of the existing seven packaged tracks; only one picker expands at a time. Each choice has a short Play preview control. Preview automatically ends after eight seconds or when leaving Sound.
- Globally turning Music Off mutes all contexts but retains per-area preferences; Sound Effects remain independent.
- Reset area defaults does not change master volumes. Settings stay device-local.

## Audio runtime
- Preserve the original V1 storage key and parse legacy two-volume settings, defaulting all areas to enabled with their original theme.
- Resolve user preferences *after* scene/encounter priority, so boss and world-boss overrides can be independently muted/remapped.
- A muted context resolves to silence, not an unrelated region or town track. Scene exit restores the correct prior context.
- Persist repeated taps in order, and ensure a returning track cancels any in-progress fade-out.
- All seven existing assets can be selected without adding music or inflating the build.
- Reuse existing foreground-only, silent-mode-aware audio behavior.
- Translations supplied for DE, ES, NL, IT, FR, RU, TR.

## Verification
- The core tests cover V1 migration, corruption handling, isolated muting, track remapping, unchanged contexts, and JSON round trips. The Settings contract checks all seven contexts are accessible within the single outer scroll view.
- Run the repository's mobile typecheck and game-audio test in CI before merging.
- Listen-test scene overrides and rapidly toggling music on an Android release build.

- CI contracts updated: existing Settings navigation assertions now cover six categories, and localization validation recognizes the reviewed recent-screen catalog for new labels.
