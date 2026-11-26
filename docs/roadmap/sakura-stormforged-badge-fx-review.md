# Premium badge and FX artwork review

## Direwolf integration
Upload 3d21b395bd90a2175c96e291212f73ad58208688: four Direwolf WebP textures independently matched prior SHA-256, byte counts, VP8X dimensions and alpha flags. Both pets now in isolated exact-ID review registry. Integrity test pins all eight textures (712,942 bytes) and previously decoded 36-cell manifest bounds for each; no live imports. Original identical bytes had decoded alpha checks, not repeated by connector.

## Badge/FX candidate overlay (awaiting upload)
Generated a standalone two-emblem transparent source, separated halves and cleaned disconnected alpha noise. Matched ~90% occupied width; exported independent 256px and 64px static badges. Inspected on dark backgrounds at 256, 64 and 24px. No badge animation. Six procedural 64px FX textures: Sakura petal, Stormforged lightning arc, separate tinted crest glows and atmospheric haze per set. Bounded alpha with clear margins. These are textures for existing parent-clock motion, not new clocks, effects on badges, or completed native animations.

| Relative path under apps/mobile/assets/ascendant | Size | Bytes | SHA-256 |
|---|---:|---:|---|
| sakura/blossom_crest_256.webp | 256×256 | 33634 | 3ebc2ec2a51ec47064a5bfdc133de61a8ad0a2d3143aee2a94c49e587061547e |
| sakura/blossom_crest_64.webp | 64×64 | 4266 | d661e074fbab6823f52a22016dbaf8161d8f468b28313c2a11c2fbb2070f22d1 |
| stormforged/wolf_crest_256.webp | 256×256 | 30370 | 2a35b277495510cf264244a75d124161d7426dced31e42f8d98cff8b3260a122 |
| stormforged/wolf_crest_64.webp | 64×64 | 4018 | 5043fe0b7948193f176d587409a3853ea0533e45c232cbb61a5426e649c1c47d |
| sakura/petal.webp | 64×64 | 1412 | 8d1df2ec7e4ed843859973b8b685f162d189a179d7cf8ab21dff4721cea25a17 |
| sakura/crest_glow.webp | 64×64 | 1188 | 6d9a83cfc793f971846cc18e63c5bcb67114f67ee3308db02d3f2e9507d9a06b |
| sakura/ambient_haze.webp | 64×64 | 836 | 6ee3ef2093e912ae479db3d4063734f2a79212872fb28b28108772571c8d6760 |
| stormforged/lightning_arc.webp | 64×64 | 2552 | 9cf39eeaefa5fe4c5886167d497b830620907020df6f825c9e83e71783fdc140 |
| stormforged/crest_glow.webp | 64×64 | 1128 | 2f7d999e6b1d77177e85c94b6a97d42cb57d288a4b9851055ea8603496c71dd1 |
| stormforged/ambient_haze.webp | 64×64 | 808 | b61dc10ba97bdd68d21ffc7c138d90ffca475d5f376bc56188f5f19c16750541 |

Ten decoded RGBA textures, 80,212 bytes total (FX only 7,924 bytes), all alpha bounds have at least two transparent pixels of clearance. ZIP CRC validated. Exact paths/hashes and decoded bounds in premium-badge-fx-manifest.json. Offline overlay only; do not register until verified. No extra profile icon border.

## Native composition handoff
Use existing six/eight border nodes and six environment tracks; map particle artwork to petal/mote and perimeter rail tracks, crest glow to jewel highlights and soft light, haze to ambient haze. Atlas sprite on its own grounded pet slot. No new full-screen flash, badge animation, timer or unbounded particles. Static badge image must remain outside animation wrappers. Keep separate matching/alternate/no-pet modes, reduced-motion fallback, readable identity and guild slots, owner-only discovery, and public rendering only from authoritative equipped identity. Do not infer ownership from image availability. Final perceived thickness and pet/background/badge/FX parity with other four sets, actual native performance and full-set equip remain pending. No grants, activation, or merge.