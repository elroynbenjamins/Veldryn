# VELDRYN UI Icons v2

18 cohesive fantasy UI icon families, generated with the built-in image tool and installed in the current project.

## Contents
- `assets/ui-icons-v2/name.png`, `name@2x.png`, `name@3x.png`: 32/64/96 px exports, intended for 32 dp.
- `assets/ui-icons-v2/small/name.png` and density variants: 24/48/72 px exports, intended for 24 dp.
- `sources/`: full-resolution transparent masters, one per icon.
- `prompts.json`: exact final generation prompts and provenance; use the included local masters instead of the original generated-image paths.
- `preview.html`: self-contained before/after and dark/light review.
- `asset-verification.json`: dimensions, transparent gutters and pale-boundary checks for all 108 PNGs.
- `integration/ui-icons.ts`: snapshot of the installed static registry, for reference.

## Visual rules
Warm bronze/gold, dark navy material and restrained blue crystal accents; consistent shaded depth and readable silhouettes. No white outer strokes, flattened white matte, emoji fallback, glow or framing box. Metal and crystal may contain small highlights inside the object; these are not a surrounding border.

The prior set mixed ornate sprites, flatter people/chat symbols and mismatched edge treatments. Every symbol in this shared family was redrawn: Character, Skills, World, Inventory, Account, Settings, Search, Filter, Back, Next, Events, Home, Quests, Friends, Guild, Party, Chat and Close.

## Export and implementation
Every density is independently resized from its full-resolution master. Alpha is preserved without palette reduction, background removal, colour-keying or binary-alpha thresholding. Each icon has a transparent 2 dp gutter and normalized bounds. These fixed-size icons do not use 9-slice scaling.

The installed files live under `apps/mobile/assets/ui-icons-v2/`. Metro uses literal requires and density suffixes. The `uiIcons` registry selects 32 dp icons; `uiSmallIcons` selects 24 dp icons. `UiIcon` selects the small family for sizes up to 24 dp. Keep action hit targets at least 44–48 dp, and keep accessible labels on the containing controls. Do not tint these multicolour assets or enlarge a 1× file for a high-density screen.

Updated consumers: primary navigation, quick navigation, Account destinations, search/clear controls, chat launcher/close, app back control, and character-carousel arrows. Existing game state, navigation callbacks, class-emblem art and gameplay behavior are preserved. The separate historical Chat Pilot preview keeps its own standalone registry.

## Validation
All 108 exported files have genuine alpha and transparent gutters. The automatic boundary check found zero pale/near-neutral edge pixels using the documented predicate in `export.cjs`. Dark, parchment and blue surface previews were visually reviewed. Full mobile TypeScript and Android Metro JavaScript export passed. Native device rendering was not tested.

The PNGs in this ZIP are the final version. Earlier drafts with baked checkerboards or unwanted glow were rejected and are not included.
