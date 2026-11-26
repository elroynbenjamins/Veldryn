# Stormforged Direwolf — standalone pet artwork and atlas

## Sakura integration
Upload d2f6afc2e5f8c5969ac284e40b62c671d52b658d: all four Sakura WebP files independently verified against pinned SHA-256, byte sizes, VP8X dimensions and alpha flags. Five CI workflows passed on the upload commit. Review-only exact-ID pet registry selects Sakura portrait, icon, showcase and atlas. Missing IDs return undefined. Added CI integrity test for all four files, pinned manifest atlas bounds, and no production imports. No runtime decoder in CI; original identical bytes had 36/36 decoded-cell checks.

## Stormforged export
Standalone original RGBA 1254×1254 illustration, facing left toward identity. Main connected silhouette retained, noise removed, square grounded fit to same occupied area as fox. 36 pose atlas generated through premultiplied localized tail and head deformation with no baked electrical aura or platform, not independently drawn poses.

| Path under apps/mobile/assets/ascendant/stormforged/ | Dimensions | Bytes | SHA-256 |
|---|---|---|---|
| direwolf_512.webp | 512×512 | 75950 | 49fd4863e8dfdf9e32d2ce4267c4f14a4af12fa246bc42c78519efc7fc9f6699 |
| direwolf_showcase.webp | 256×256 | 26832 | d83657c454da197c84187462cacfd276901d0fa58dcf68cf3c69004e3bb95b51 |
| direwolf_96.webp | 96×96 | 6244 | bfd70c6a6c1d8a0d5229d71589d3e8bd5105a5475da5cef3845f43ab8814d8de |
| direwolf_idle_atlas.webp | 768×768 | 236688 | f2551859deeca2001f211c62b213c0ae676c8d49c2c3e4d88bd1ae1b43f55188 |

Total 345714 bytes; offline archive CRC validated. Decoded 36 unique RGBA cells, all alpha>0 bounds within six-pixel padding; x0=11, y0=12–13, x1=118–120, y1=119. 6×6, 128×128 cells, 12fps, 3s cycle. Comparison preview at equal 256/96/74px sizes prepared with actual Sakura texture. Static review only; actual native motion and comparison with four existing pets pending. Wolf exports not yet uploaded or registered.

Badge generation returned a promotional board, rejected as runtime art. Actual static badge assets, FX textures, complete native showcase, ownership/equip, final parity and device testing outstanding. No grants or production changes. Keep draft.