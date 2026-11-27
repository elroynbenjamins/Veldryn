# Background asset parity — review pass

Petal Sanctuary upload at 2b13511732b02276d3b98a308ef9503b694a7e46: both independent SHA-256 and byte lengths match the previously pinned values; VP8 headers and dimensions checked, visual readback inspected. Separate review-only background registry resolves exact Sakura ID to wide or square art; unknown IDs fail closed. Regression pins both hashes, sizes and headers and rejects any production import. Prior head 315635f5ad08a5623fbc236124f3248dff978169 returned four successful CI workflows. New head pending.

## Thunderkeep artwork
Original standalone dark navy mountain fortress landscape generated at 1619×971, right-biased architecture, waterfalls, blue crystals and storm cloud lighting; dark left identity area. Fitted wide and right-biased square crops separately, WebP quality 88, verified decoded RGB dimensions and archive CRC. No frame, text or characters baked into the background.

| Path under apps/mobile/assets/ascendant/stormforged/ | Dimensions | Bytes | SHA-256 |
|---|---|---:|---|
| thunderkeep.webp | 1020×615 | 131590 | e8b3863aa02087021b6ce0514ee73d4a38cbabecbb439397b72029e5ecabc25a |
| thunderkeep_square.webp | 512×512 | 90198 | 941018f70014373392e86b243a26de65aadba2f37e6d40cbedce8b8ed473d82c |

Total 221,788 bytes; offline overlay awaits upload, not yet in asset registry. Both wide backgrounds composited locally with exact V2 frame artwork for same-scale static visual comparison. Measured decoded linear relative luminance in canonical identity box: Sakura mean .0508, p95 .1945; Stormforged mean .0304, p95 .0946. Both have isolated bright pixels, so dark identity plate and text readability still need native review. This is not a contrast-compliance certification or a native screenshot. Square crop remains static.

## Environment calibration
Approximate wide-stage landmark coordinates aligned to Sakura moon/water and Stormforged storm sky/water; six tracks each, existing 24s clock contract, no new timers. 76,032 equivalent interpolated bounds/opacity/rotation/scale assertions rerun on transformed source readback and fixed landmark assertions passed. Actual test added to CI. Native lifecycle, effects textures, pet art/animation, badge art, ownership and equip remain outstanding. Final premium parity requires native comparison with existing four sets; neither activated or merged.
