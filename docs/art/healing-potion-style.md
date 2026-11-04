# Veldryn healing-potion icon art direction

Approved visual baseline: existing high-detail Vigor Tonic artwork in `apps/mobile/assets/ingredient-icons-v1/vigor_tonic.webp`, with the accepted Dewleaf Draught T1 art in the same directory.

## Repeatable design brief

A **single centered, collectible fantasy RPG item icon**, viewed from the front on a **fully transparent** canvas. Maintain the established tonic art: richly detailed rounded translucent glass, radiant internally swirling liquid with fine bubbles, realistic sharp highlights and warm rim lighting, cracked/cut cork, gleaming metal collar, aged stitched brown leather straps and buckles, small rivets, a modest fabric ribbon, and clean metallic ornamental flourishes. For healing potions use **crimson-red glowing liquid and a small, readable red/white medical cross**. No labels, UI frame, backdrop, text, smoke filling the background, cast shadows outside the silhouette, or cropped parts.

T1 `DEWLEAF_DRAUGHT` — simple elegant cross emblem, red liquid, leather and warm brass, limited ornamentation; heals **20% max HP**.
T2 `RIVERHEART_DRAUGHT` — same silhouette and materials, a reinforced filigree collar, red gem accents, sharper shield emblem; heals **35% max HP**.
T3 `OATHBLOOM_DRAUGHT` — highly detailed gold-and-red royal fittings, jewel-studded collar, filigree and floral flourishes; heals **50% max HP**.

These are **healing potions** (dungeon/boss consumables), visually distinct from pre-combat Vigor/Ward/Harmony tonics. Preserve the same glass rendering, leather construction, metallic depth and transparency as tonic icons.

## Export rules

- Store final assets as 256×256 RGBA WebP under `apps/mobile/assets/ingredient-icons-v1/`.
- Keep roughly 5–8% empty transparent margins; validate nonzero-alpha bounds stay **inside** the canvas to prevent clipping.
- Preserve the full vessel and accessories when resizing; use an RGBA intermediate and a high-quality resampling filter.
- Use WebP lossy compression with alpha retained (quality around 70, method 6); inspect at 32, 48, and 64 px.
- Art is selected by stable item ID through `apps/mobile/src/theme/resource-assets.ts`. Avoid changing recipes or gameplay when updating icons.
- Final asset names: `dewleaf_draught.webp`, `riverheart_draught.webp`, and `oathbloom_draught.webp`.

The source prompt and reference screenshots may remain outside the repository; these approved WebP files are the runtime canonical artwork.
