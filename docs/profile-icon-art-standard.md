# Profile icon art standard and review gate

Scope: every registered profile icon, including class emblems, starter portraits,
creatures, event rewards, dungeon and guild rewards, standard cosmetic atlas cells,
wave-two cosmetic portraits and Ascendant profile symbols. Preserve existing
IDs, ownership, unlock conditions, and release flags. Profile borders, pets,
backgrounds, navigation glyphs and animated badges are not profile icons.

## Art standard

- Reference: Stonebound Explorer and Dawn Priestess for human portrait quality;
  retain the cohesive existing class emblem designs.
- 512 × 512 runtime canvas, true alpha, optimized WebP; high-quality master kept
  separately where available. No visible background, watermark or added frame.
- Aim for about 92% meaningful silhouette on the longest axis with balanced
  transparent margins; never stretch anatomy or remove important features.
- Human portraits: close head-and-shoulders composition, consistent face scale and
  eye-line, clearly defined pixel clusters, controlled shading, crisp silhouettes.
  Creatures and emblems retain recognizable shapes, matching detail and lighting.
- Free, earned and premium icons share the same technical quality floor.
- Test on dark UI at 32, 96 and 160px; validate native roster, chat, collection,
  profile showcase and public player inspection. Inspect actual facial scale,
  not just silhouette measurements.

## Initial visual audit (49 registry entries)

| Group | Count | Review |
| --- | ---: | --- |
| Classes | 9 | Cohesive palette/detail; verify padding and tips |
| Starters | 9 | Dune Warden, Gilded Duelist, Runic Scholar have extra padding |
| Standard cosmetics | 8 | Atlas cells are low resolution; recover high-resolution masters or redraw |
| Wave-two cosmetics | 8 | Review face framing, shading, and pixel density; preserve collection motifs |
| Events | 6 | Spirit Lantern, Veilbreak pair, Frostfall trio: variable resolution/detail |
| Creature/combat | 3 | Review edge clearance and silhouette; retain creature identity |
| Dungeon | 3 | Asterfall, Sunscar, Frostmarch portraits require detail/style review |
| Guild | 1 | Stormwatch Crest: low resolution; recover master or redraw |
| Ascendant | 2 | Crown and Ruby: small source symbols; require dedicated high-res profile masters |

The review tool inventories both registry maps and the atlas. Any future registered
entries in those maps are included automatically. New independent registries must
be added to the inventory. It makes review-only 512px candidates and before/after
sheets; it cannot improve original drawing detail or certify art style. Upscaling
a 48px symbol or a 128px atlas cell is not a quality upgrade. Redraws or recovered
masters need visual approval before replacing runtime assets.

## Acceptance and rollout

1. Inspect audit and contact sheets. Verify every ID is represented; compare
   face size and optical weight in each category.
2. Recover or redraw insufficient sources first (Ascendant, guild, atlas, dungeon).
   Preserve character identities, event motifs, emblem designs and ownership IDs.
3. Approve representative art and then every replacement batch. Re-run audit;
   compare actual runtime byte sizes, keep the app bundle efficient.
4. Once baked assets replace the existing art, remove overlapping per-icon runtime
   zoom (including the compact portrait calibration from PR #1969 if merged).
   Do not double-scale; use the same normalized source on all surfaces.
5. Verify native screenshots at compact and showcase sizes, test existing selection
   and public projection, and only then merge and ship approved art.

No runtime file or release switch is changed by the review workflow.
