# VELDRYN UI icon addendum

## Files

`assets/ui-icons-v1/` contains 11 families: character, skills, world, inventory, account, settings, search, filter, back, next and events.

Each family has:
- `name.png`: 32 × 32 px
- `name@2x.png`: 64 × 64 px
- `name@3x.png`: 96 × 96 px

All are RGBA/palette-alpha PNGs with transparent backgrounds. These are fixed-size icons, not sliceable frames: no 9-slice margins apply.

## Implementation

Installed in `apps/mobile/assets/ui-icons-v1/`. Use literal imports in `apps/mobile/src/theme/ui-icons.ts`; Metro selects the appropriate density automatically. The shared registry also references the approved existing Home, Quests, Friends, Guild, Party, Chat and Close assets in the project.

`PrimaryNavigationIcon` uses the destination registry; `UiIcon` exposes decorative symbols; `SearchField` combines the search symbol with a native text input and a labelled clear action.

Prefer the native 32 dp size for navigation. Reserve at least a 44–48 dp touch target around any interactive icon. Keep text labels on navigation and accessibility labels on icon-only actions. Keep the original gold/blue palette; avoid tinting these multicolour sprites.

For web, use nearest-neighbor / pixelated rendering. For native, use the supplied density files and integer layout sizes; do not assume React Native Image exposes a cross-platform nearest-neighbor CSS property. Avoid stretching a small raster to serve as a large illustration.

The Events icon was generated separately with genuine alpha, then technically trimmed, palette-reduced, resized and exported at exact integer density multiples. The other ten families are copies of the already-approved VELDRYN Pixel UI Kit assets. Existing project icons referenced by the registry remain in their established folders.

## Control rules

- Single-line field: minimum 48 dp, balanced 10 dp top/bottom padding, vertically centered native text, no Android includeFontPadding.
- Multiline field: minimum 104 dp, top alignment; keep larger caller minimums.
- Normal panel: radius 18 dp, quiet single outline. Co-op panel: radius 16 dp.
- Button/input radius: 14 dp. Button labels wrap; do not bake text into PNGs.
- Keep ornamentation on hero art, crests and meaningful selection accents; normal forms need space and readable labels.
- Keep actual names, validation messages and localization as native text.
