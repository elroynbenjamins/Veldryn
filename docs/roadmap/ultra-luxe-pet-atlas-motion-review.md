# Ultra Luxe pet atlas review — 27 November 2026

All six actual bundled WebP atlases were visually inspected on the animation-quality branch. The current sprite poses differ only slightly at atlas scale, especially dragon, fox and wolf. Existing atlases are not accepted as meeting the new premium artwork bar. The runtime body reactions and posture accents are an incremental improvement only.

| Pet | Actual atlas | Artwork required for next pass |
| --- | --- | --- |
| Vharaxis | 768×720, 36 cells of 128×120 | Distinct folded-to-raised wing silhouettes, head lift/jaw and tail-tip motion; grounded feet, no full-body rubber stretching. |
| Aetherion | 896×954, 48 cells of 112×159 | Celestial **stag**, not winged angel: head turn, antler light, flowing mane/tail; preserve platform and silhouette. |
| Nhal'Zuun | 672×768, 36 cells of 112×128 | Curved fin and tail undulation, head movement, visible water flow; no rigid translation as substitute. |
| Aeon | 672×768, 36 cells of 112×128 | Distinct mane/ethereal tail and localized shard motion; hover remains independent of pose. |
| Sakura Spirit Fox | 768×768, 36 cells of 128×128 | Tail sweep, ear turn, blink and subtle head tilt; paws stay anchored. |
| Stormforged Direwolf | 768×768, 36 cells of 128×128 | Neck and head raise, ear rotation, chest breathing and tail/coat movement; paws stay anchored. |

## Artwork acceptance
- Begin with Vharaxis, then Aetherion, Nhal'Zuun, Aeon, fox and wolf individually. Approve representative pose keyframes first, then interpolate and inspect the whole loop at actual 74–99 design-pixel showcase size. Preserve the current artwork style, colors, identity, pose direction and transparent background.
- Keep current atlas cell dimensions, count and 12 fps target unless a reviewed format change is necessary. A frame's silhouette and alpha edges must fit its cell, with no neighboring pixels, seam jump, clipped antlers/wings or moving baked ground. Validate the first/last transition and the frame-to-frame motion at native scale. Use static fallback when reduced motion is enabled.
- Independently inspect animated body parts, ambient effects, tap reaction and signature. Do not count simple whole-image lifting or opacity as completion of the authored local pose requirement.
- No new live artwork, asset mapping or grants in this pass. New atlas candidates require actual asset generation, alpha/silhouette checks, file-size review, side-by-side in-game recordings and owner acceptance before release.

## Runtime pass
Celestial, Draconic, Abyssal and Paradox now have bounded matching-pet body movement on the existing tap reaction value, in addition to their localized light response. Sakura and Stormforged have distinct posture accents on their parent clock and an earlier signature accent. All preserve the existing static fallback and no additional ambient loop. These changes do not replace the required art pass.
