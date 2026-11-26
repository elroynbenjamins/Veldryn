# First transparent frame candidates — Sakura / Stormforged

Candidate overlay uploaded and verified in GitHub at commit 237db1294b387e607658dc4d323f9aff4f250a6e. All four exact SHA-256 values, byte sizes, RIFF/WEBP containers, VP8X dimensions and alpha flags match independent readback. The generated marketing/concept sheets are visual references only, not production assets. The four candidate textures use precisely drawn ornament geometry, gradients and clear apertures. This is the first art pass, not final Ultra Luxe quality approval.

| Asset path (under apps/mobile/assets/ascendant/) | Dimensions | Bytes | Alpha >32 coverage | SHA-256 |
|---|---:|---:|---:|---|
| sakura/blossom_crown.webp | 1020 × 615 | 49848 | 20.974% | f783df154c2366a125cdfa358563ff5bafb8e8b71541d3fb79a96b64e4bfb330 |
| sakura/blossom_crown_standard.webp | 1024 × 576 | 48290 | 21.157% | dbb03de1e6084f1f827e6037b71438955c221fa686c96fc14b870b18c47c6b83 |
| stormforged/steel_crown.webp | 1020 × 615 | 39618 | 19.391% | 0ba01e95a188035d73ab284dfdde931d032ca7a08cb3df67ced1bf0dbf27467c |
| stormforged/steel_crown_standard.webp | 1024 × 576 | 37986 | 19.224% | d957eecc1fe2ba01e474db84cb200133eb89b7d7da795c2745d4bf4e0f935608 |

All four decoded as RGBA; max alpha 0 in mirrored identity, guild and pet protected boxes at display widths 320, 340, 390 and 480px (48 asset/size/box combinations). Total 175742 bytes of WebP (171.6 KiB). Coverage measures occupancy, not visual quality or rendered brightness. Sakura and Stormforged still require richer sculpted relief, stronger thematic corner/crest detail (especially Stormforged's wolf motif), comparison against actual existing premium frames, independent aspect-fit review and ornament anchoring.

Review-only registry now points to the exact static WebP files, with separate standard and showcase sources. CI verifies hashes, metadata and absence of production imports. Pixel alpha checks were performed on the original identical bytes, not repeated by the GitHub connector. No live registration until visual parity approval. No production imports, grants, release flags or gameplay changes. Previous exact head c359e3a7b43bb9384b43d855645bb9ed73ddb9d4 returned four green PR workflows including Mobile UX and Mobile core; this document commit is a new head.
