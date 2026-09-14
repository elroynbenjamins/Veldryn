# VELDRYN Ingredient Icons v1 — Visual Polish v5
This pass replaces the twenty remaining neutral icons used by the current crafting recipes. Runtime integration is already applied to the workspace. The v5 ZIP also carries forward the v4 implementation update; it is still an update for the existing VELDRYN repository, not a standalone game.

## Filenames and native sizes
- MOSS_FIBER: moss_fiber.png
- OATHGLASS_SHARD: oathglass_shard.png
- TORN_OATHCLOTH: torn_oathcloth.png
- SUNSTONE_ORE: sunstone_ore.png
- AMBERGLASS: amberglass.png
- ASTRAL_SCRIPT: astral_script.png
- FROSTIRON: frostiron.png
- RIMEGLASS: rimeglass.png
- CHOIR_BLOOM: choir_bloom.png
- WISP_DUST: wisp_dust.png
- THORN_SAP: thorn_sap.png
- TROLL_HIDE: troll_hide.png
- LANTERNSTEEL_SHARD: lanternsteel_shard.png
- FALLEN_RIVET: fallen_rivet.png
- ECHO_TOUCHED_PELT: echo_touched_pelt.png
- BANNER_ASH: banner_ash.png
- OATHGLASS_FRAGMENT: oathglass_fragment.png
- GLOAM_DUST: gloam_dust.png
- RUNEBOUND_CORE: runebound_core.png
- ECHO_BAT_WING: echo_bat_wing.png
Each family includes 48×48, @2x 96×96, and @3x 144×144 RGBA PNGs. Runtime directory: apps/mobile/assets/ingredient-icons-v1. Each image is exported independently from its preserved generation master. The export audit records the master dimensions and alpha checks.

## Rendering and layout
Use the literal paths in src/theme/ingredient-assets.ts. resource-assets.ts merges the mappings into the existing shared material/food source table. Recipe ingredients use ItemArtwork at 32dp; inventory cards use ResourceArtwork at 58dp; reward rows use 34dp. Preserve aspect ratio with contain and choose density siblings through Metro. Keep native text separate.
There are no slice margins: these are isolated icons, not nine-slice panels. Keep the transparent canvas intact, avoid stretching or clipping, and keep tap targets on the surrounding native control. Earlier frame/button slice specifications continue to apply unchanged.
Art uses compact silhouettes, navy contour shading, restrained bronze/gold details, and material-specific colors. Magical glass, powder, cloth and hide have distinct shapes rather than recolored generic markers. No decorative frame, white outer halo or opaque backdrop should be added.
Density exports use one downsample from the master with Lanczos3. Browser nearest-neighbor rendering can be requested with image-rendering: pixelated when integer magnification is desired. React Native core Image has no universal nearest-neighbor flag; rely on suitable native density files and device review.

## Sources and generation
Built-in image generation was used, one image per ingredient. ingredient-prompts.json preserves the exact prompts. ingredient-sources/ contains the chosen masters. Do not reference a Codex-generated_images path from the app.
The shared map improves existing consumers automatically: recipe requirements, inventory ItemCard and reward breakdowns. No item definitions, drop rates, costs, progression, account state or saved data are changed.
ItemCard also removes stray literal spaces between adjacent JSX action controls to avoid a native text-node warning.

## Review and integration
The native fixture screen supports EXPO_PUBLIC_VISUAL_QA_SCREEN=ingredients alongside EXPO_PUBLIC_VISUAL_QA=1. It mounts the actual IngredientList and ItemCard with memory-only counts and harmless actions. The normal/release App entry remains unchanged.
See PROGRESS.md for completed verification and NATIVE_QA.md for device scope. Physical-device and iOS validation are not implied by an Android emulator review.
