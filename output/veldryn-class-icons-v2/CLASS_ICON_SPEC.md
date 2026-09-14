# VELDRYN class emblems v2

Nine class identities are retained: Ironwarden, Bastion, Dreadguard, Dawnkeeper, Wayfinder, Ravager, Hexweaver, Knife Dancer and Stonecaller. The reference motifs and colors are recorded in `source/jobs.json`; these follow the existing class emblems and `src/content/classes.ts`.

The upgrade replaces blurry edges, noisy texture and clipped ornamentation with deliberately shaped pixel clusters, stronger major silhouettes, controlled bevel highlights, consistent top-left lighting and complete safe margins. It changes visual presentation only.

## Exports

| Family | Base size | @2x | @3x | Intended use |
| --- | --- | --- | --- | --- |
| `hero` | 256×256 | 512×512 | 768×768 | Large class-selection carousel |
| `icon` | 62×62 | 124×124 | 186×186 | Existing 62 dp Character identity icon |

There are 54 transparent RGBA PNGs. Each family is normalized directly from its accepted source; density files are exact nearest-neighbor expansions. The hero family has an 8 px transparent perimeter and the icon family has 2 px. Preserve aspect ratio. The entire ornament stays inside the canvas. The small size is exported separately so the app does not have to reduce a large source at runtime.

Sprites use hard binary alpha and no dithering. The hero palette has at most 256 colors; compact icons use at most 128. The exporter trims the generated alpha bounds and fits the whole silhouette. Hero reduction uses nearest neighbor. Compact icons use one Lanczos3 reduction to 62 px before palette quantization and a hard alpha threshold of 128; this avoids speckled highlights caused by skipping source pixels at this small size. Every density expansion then uses exact nearest neighbor. The exporter does not paint new art or remove backgrounds using color guesses. All emblems were individually rebuilt with the built-in ImageGen tool, using their previous icon as an identity reference. Exact prompts and source paths are retained under `source`.

## Integration

Files are installed under `apps/mobile/assets/class-emblems-v2`. `src/theme/class-emblem-assets.ts` uses static literal Metro requires for both families. `character-assets.ts` preserves the public `classArtwork` name for the large family and exports `classIconArtwork` for compact display. The Character screen uses the small family; the class-selection carousel continues to use the large family.

The previous `assets/classes` files remain available as references. Character models, equipment skins, class definitions, abilities and stats are unchanged. An emblem is a class symbol, not a replacement character portrait.

Keep @2x/@3x siblings alongside the base file and import only the base path. Use integer layout sizes where possible. Web previews use `image-rendering: pixelated`; native React Native Image does not provide a portable nearest-neighbor sampler. Verify device rendering at the target layout sizes. The carousel is responsive and can scale its large preview slightly; the Character icon is authored at its exact 62 dp layout size.

## Review and checks

`preview/class-overview.png` shows all nine new hero emblems. `size-comparison.png` compares old and new icons at the actual 62 px size; `hero-comparison.png` shows a large comparison. These are assembled from the final exports. `preview/index.html` supports dark, light and checker backgrounds.

`tools/verify.mjs` checks the nine canonical IDs, PNG dimensions, hashes, binary alpha, clear safe margins, palette size and every 2×/3× expansion. App compilation and bundling results are recorded in `qa/integration.md`; archive integrity is reported beside the ZIP.

To rebuild, use Node with `sharp`: run `node tools/build.mjs`, `node tools/verify.mjs`, `node tools/preview.mjs`, then `python tools/package.py`. Set `VELDRYN_SHARP_PATH` if needed. `VELDRYN_PREVIEW_FONT` overrides the local preview font. The comparison previews use the existing original icons in this workspace.
