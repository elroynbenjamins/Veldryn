# Stormforged — isolated artwork and native registry candidate

The dedicated Stormforged frame was generated successfully after earlier incorrect Clockwork image outputs were rejected. Standalone illustrated dark steel, silver bevels, blue crystal nodes, pale-gold accents and restrained lightning etchings. Two concept-derived portrait crops (Tempest, Sentinel) remove presentation labels and most outer trim; inspect at 64/96dp. Three hand-authored sprite textures and reduced-motion composite. No premium scene or extra animated layer.

Stormforged-native-integration-overlay.zip is provided separately; SHA-256 db624de21495f8f3ab04cbe157be266bac5fa70dbcd69470c90e44e7867593cf, 562806 bytes. Seven PNGs plus manifest in apps/mobile/assets/profile-cosmetics-wave2/stormforged/ and replacement combined registry. Registry based on Clockwork V2 blob 12aedcffba76af56cfb6b0c7e4c4f83f685b68a9; new registry Git blob 9dad4fef7ec4f137558b551d2df9dcb4d0fe9d20. Existing Tideborne and Clockwork art entries and all previous portrait requires preserved byte-for-byte. Check for intervening registry edits before replacing. Local zip CRC, seven SHA-256 hashes, actual registry glow/track equality and existing entries verified. Binary import not performed through connector.

Thunderframe PNG 768x432 RGBA, 217908 bytes, SHA-256 c524c9c86ec927588aba170d2bf37826bca7e9c94ac6689efbe68d0fea6918e8. Resampled the standalone source, removed low-alpha fringe, compressed outer bands toward edges (90% side, 86% horizontal depth) to preserve the central aperture. No opaque pixels in central test aperture. Simulated native segmented geometry (not on-device rendering):
| dp | Opaque pixels before stencil | clipped opaque pixels | visible single-fragment glows |
|---|---:|---:|---:|
|104x72|1248|11|8|
|260x174|7258|16|8|
|340x205|10821|0|8|
|480x270|19677|230|8|
Each of the 8 actual source rects is 20x20 and located on a strong opaque crystal highlight. Slightly smaller glow footprints than previous sets; check perceived brightness and thin dark side rails on real profile backgrounds. At largest size ~1.17% of pre-stencil opaque pixels are clipped; no art outside stencil. Five paths and staggered glow curves match existing committed authoring data exactly; 10.8s scene and 12s border clocks, peak .86, gradual non-strobe. Numerical parity passed previously at four sizes, not a device FPS or perceived-quality certification.

Clockwork V2 exact upload verified (registry blob above, manifest 555aa49728346eed4358021b1cfb6b9af9846f15, frame 9c95dc9287975ab6c6e04b96c7d60cfa45c8710a). Both existing sets still gated. Stormforged artwork and registry need exact import, full CI and native QA. Crimson Oath next. No readiness changes, production grants, merge or deployment. IScaredMeAHat receives normal permanent ownership only after final authenticated ownership, persistence, public projection and device review.
