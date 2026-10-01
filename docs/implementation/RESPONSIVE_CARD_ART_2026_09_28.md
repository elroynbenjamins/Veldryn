# Responsive card artwork — 2026-09-28

## Scope

All available profile backgrounds now have landscape, square and portrait compositions, reused by their personal-profile cards. Forest Sanctum and Guild Plaza keep their existing guild-card variants; the remaining backgrounds are personal-profile variants.

- Landscape: high-resolution 16:9 compositions.
- Square: high-resolution 1:1 compositions.
- Portrait: high-resolution 2:3 compositions.
- Actual surface ratio selects portrait below 0.8, square below 1.45, otherwise landscape. Cover scaling preserves proportions. Missing portrait assets safely fall back to square.
- Small 320 × 180 originals remain available for thumbnails; full-card backgrounds no longer use them.
- Source PNGs are retained losslessly. Shipping compression/remote delivery can be handled separately; no live assets or unlock rules were changed.

## Typography

Public class labels use authored names (Ironwarden, Knife Dancer), never internal uppercase IDs. Both cards share 14px name, 11px semibold title and 10px level/class text, a more opaque plate and light/dark contrast colors. Custom player-name styles remain intact.

## Catalog coverage

The upgraded personal backgrounds are Bloomwake, Veilbreak, Frostfall, Harvestwake, Grand Storehouse, Heartbond, Starfall, Kingdom Approach, Volcanic Stronghold, Aurora Citadel, and Cosmic Rift Gate. Grand Storehouse previously reused the Harvestwake thumbnail but now has its own responsive artwork set. Guild Plaza and Forest Sanctum use their guild-card sets for both contexts.

## Generation provenance

Built-in image tool, separate edit requests for each composition. Existing thumbnails supplied as references; existing files preserved. New project assets:

- `apps/mobile/assets/card-backgrounds/forest_sanctum_wide_v2.png`
- `apps/mobile/assets/card-backgrounds/guild_plaza_wide_v2.png`
- `apps/mobile/assets/card-backgrounds/forest_sanctum_portrait.png`
- `apps/mobile/assets/card-backgrounds/guild_plaza_portrait.png`

## Exact prompt set

### forest_sanctum_wide_v2

Use case: precise-object-edit. Asset type: production fantasy pixel-art game card background. Create a landscape 16:9, ideally 2048x1152 high-resolution variant of Forest Sanctum. Image 1 is the original landscape composition and scene identity. Image 2 is the approved detailed square version and pixel-art detail reference. Preserve the same place, architecture, landmarks, palette and lighting. Recompose the environment naturally to the requested aspect ratio, never stretch it. Keep a quiet central foreground stage for an app-rendered character and a dark comparatively quiet top-left region for a small UI label. Preserve the detailed crisp pixel-art style, no blur or painterly smoothing. Full-bleed opaque background only, no characters, typography, lettering, interface, borders, watermarks or logos. One complete image, not a sheet or mockup.

### guild_plaza_wide_v2

Use case: precise-object-edit. Asset type: production fantasy pixel-art game card background. Create a landscape 16:9, ideally 2048x1152 high-resolution variant of Guild Plaza. Image 1 is the original landscape composition and scene identity. Image 2 is the approved detailed square version and pixel-art detail reference. Preserve the same place, architecture, landmarks, palette and lighting. Recompose the environment naturally to the requested aspect ratio, never stretch it. Keep a quiet central foreground stage for an app-rendered character and a dark comparatively quiet top-left region for a small UI label. Preserve the detailed crisp pixel-art style, no blur or painterly smoothing. Full-bleed opaque background only, no characters, typography, lettering, interface, borders, watermarks or logos. One complete image, not a sheet or mockup.

### forest_sanctum_portrait

Use case: precise-object-edit. Asset type: production fantasy pixel-art game card background. Create a portrait 2:3, ideally 1024x1536 high-resolution variant of Forest Sanctum. Image 1 is the original landscape composition and scene identity. Image 2 is the approved detailed square version and pixel-art detail reference. Preserve the same place, architecture, landmarks, palette and lighting. Recompose the environment naturally to the requested aspect ratio, never stretch it. Keep a quiet central foreground stage for an app-rendered character and a dark comparatively quiet top-left region for a small UI label. Preserve the detailed crisp pixel-art style, no blur or painterly smoothing. Full-bleed opaque background only, no characters, typography, lettering, interface, borders, watermarks or logos. One complete image, not a sheet or mockup.

### guild_plaza_portrait

Use case: precise-object-edit. Asset type: production fantasy pixel-art game card background. Create a portrait 2:3, ideally 1024x1536 high-resolution variant of Guild Plaza. Image 1 is the original landscape composition and scene identity. Image 2 is the approved detailed square version and pixel-art detail reference. Preserve the same place, architecture, landmarks, palette and lighting. Recompose the environment naturally to the requested aspect ratio, never stretch it. Keep a quiet central foreground stage for an app-rendered character and a dark comparatively quiet top-left region for a small UI label. Preserve the detailed crisp pixel-art style, no blur or painterly smoothing. Full-bleed opaque background only, no characters, typography, lettering, interface, borders, watermarks or logos. One complete image, not a sheet or mockup.

## Verification

Card appearance tests cover ratio boundaries, invalid dimensions, high-resolution file dimensions and all registered variants. Profile tests cover class display names and shared typography. The memory-only `?storeScreen=profile-identity` review includes a Background formats toggle for representative Forest Sanctum and Guild Plaza landscape, square and portrait compositions.
