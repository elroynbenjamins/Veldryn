# Crimson Oath complete isolated artwork candidate

The owner-uploaded borderless cleanup overlay is verified: all four portrait blobs and three manifests match exact local archive Git hashes. The combined registry remains unchanged at 9dad4fef7ec4f137558b551d2df9dcb4d0fe9d20. Three of five CI workflows on cleanup upload 04a45b954f2c723b1c8b44757cfb7957a7b445d4 succeeded; Mobile Core and Mobile UX were still running at verification.

Crimson's two dedicated portrait busts were generated successfully in a transparent, unframed two-sprite sheet. Split into 256x256 RGBA Justicar and Knight with edge alpha cleanup. Unlike earlier cropped painted-background portraits, both have transparent silhouettes matching the original standard portrait atlas. No icon-border slot, trim, text or frame. Separate scene frame remains independent. Portrait readability at 64/96dp simulated; no actual device verification.

Crimson Oath V2 candidate: refined illustrated crimson/silver rose-and-ruby frame, with edge-depth compression factors .83 horizontal and .85 vertical. Same 768x432 dimensions; transparent central aperture. Repositioned all eight glows onto strong opaque ornament pixels, exactly one clipped fragment each in all four simulations. Five existing authored paths, 12s border/13.2s scene clock, and three particle sprites plus static reduced-motion effect. Same animation node budget.

Updated nearest-neighbor geometry sampling of V1 and V2 (opaque alpha >=128, pixel-center mapping):
| dp | V1 opaque pixels clipped before stencil | V2 clipped | V2 total opaque |
|---|---:|---:|---:|
|104x72|6|0|1109|
|260x174|22|0|6397|
|340x205|18|0|9269|
|480x270|1013|158|16564|
Different simulation sampler from the earlier V1 review; compare within this table only. Largest width V2 clipping 0.95%. Stencil still prevents all exterior overflow. Frame appears slightly thinner than V1; validate perceived weight and ornament depth together with other sets on device.

Import separately supplied Crimson-Oath-native-integration-overlay.zip (SHA-256 cda1815940403a035f6b413aa09ed87bad0e6f743a53bd04425ade541e42f381, 435199 bytes) on this branch, not main. Contains 7 PNGs + manifest under apps/mobile/assets/profile-cosmetics-wave2/crimson-oath/ and combined native registry replacing the verified Stormforged version. New registry Git blob 36651716e7a08836a5a88278e9dffbf7744eb3d8; preserves all prior set entries and portraits. Frame SHA-256 425584736eea36e83f413655c0df0558c64cd8b07f009a84bf766f321753882e. ZIP CRC and local asset manifests verified. Check for concurrent registry edits before import. Full CI requires actual uploaded bytes. No activation, production grant, merge, or deployment in this pass. All four must complete native visual quality, regular wardrobe access, authenticated persistence, public projection and device performance review before readiness and permanent ownership grants to IScaredMeAHat.
