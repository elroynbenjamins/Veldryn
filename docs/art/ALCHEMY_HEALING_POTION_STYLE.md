# Veldryn — approved healing potion art direction (2026-11-04)

## Reference and usage
- Visual baseline: `apps/mobile/assets/ingredient-icons-v1/vigor_tonic.webp` and user-approved **T1 Dewleaf Draught** redraw at `apps/mobile/assets/ingredient-icons-v1/dewleaf_draught.webp`.
- This is **high-detail painted fantasy item art**, NOT chunky pixel art, emoji, vector art, spritesheets, label cards, or 3D product render.
- Render a single centered round glass bottle with realistic transparent glass thickness, highlights and reflections, vivid swirling **crimson healing liquid**, suspended bubbles/sparks, and bright internal glow.
- Ornate antique brass/gold metallic neck ring and lower accents, natural cracked cork, richly detailed stitched brown leather straps and metal studs, elegant red fabric ribbon or neck wrap, and a small gold-edged hanging tag with a simple red medical cross. A gold-trimmed central shield with a red cross makes the icon clear at small scale.
- Silhouette should match the game's existing tonic family. T1 is restrained; T2 adds visibly richer brass fittings and more energetic liquid; T3 may be most elaborate. Preserve recognizability between levels.
- Background **fully transparent**. No scene, shadow pedestal, tile border, name, text, UI, glow halo outside alpha area, or other objects.
- Compose with **safe ~6–9% transparent padding on every edge**; no cropped corks, tags, straps, ribbons, metallic pieces, or trails.
- Ship as optimized **256×256 RGBA WebP** with transparency, at a practical visual/size balance. Check at inventory 32/40/48px.
- Healing potion IDs: `DEWLEAF_DRAUGHT` (T1, 20%), `RIVERHEART_DRAUGHT` (T2, 35%), `OATHBLOOM_DRAUGHT` (T3, 50%). Don't change the gameplay IDs or effect values to match illustration labels.

## Regeneration prompt seed
"Single isolated high-fidelity RPG healing potion inventory asset, same detailed painted fantasy look as the existing Veldryn Vigor Tonic. Thick clear spherical glass bottle with gorgeous reflections, intensely glowing luminous red liquid forming swirling currents, suspended bubbles and sparkles, natural cracked cork stopper, engraved aged-brass metal neck ring, stitched rich brown leather harness and brass buckle/rivets, small gold-edged parchment tag carrying a distinct red healing cross, finely crafted central shield medallion with cross, restrained deep-red cloth accents. Clean readable iconic shape, consistent warm studio rim lighting, fully transparent background, 256x256-ready isolated artwork with generous safe margins, no card, no text, no clipping."
