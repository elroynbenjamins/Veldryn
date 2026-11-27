# Abyssal Majesty artwork staging (review only)

All thirteen WebP assets from the pass-3 archive are present. The supplied manifest contains their expected SHA-256 hashes, dimensions and alpha checks. The focused Abyssal CI test validates every file and the isolated typed asset registry.

| File | Dimensions |
| --- | --- |
| forgotten_abyss.webp | 1020×615 |
| forgotten_abyss_square.webp | 512×512 |
| crown_of_the_depths.webp | 1020×615 |
| crown_of_the_depths_standard.webp | 1024×576 |
| nhalzuun_showcase.webp | 224×256 |
| nhalzuun_idle_atlas.webp | 672×768 |
| nhalzuun_512.webp | 512×512 |
| nhalzuun_96.webp | 96×96 |
| monarch_of_the_deep_64.webp | 64×64 |
| monarch_of_the_deep_256.webp | 256×256 |
| abyssal_tide.webp | 128×256 |
| abyssal_mote.webp | 48×48 |
| abyssal_aura.webp | 128×128 |

No live imports or grant changes are authorized here. The review-only bundle is registered in `src/theme/abyssal-integration-assets.ts`; no live profile imports exist. Native appearance and decoded geometry still require device QA. The static badge is prepared for a synchronized native animation, not a separate animated GIF. The idle atlas is a provisional deformed pose, pending device review.
