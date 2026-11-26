# Tideborne review V2 — rail and motion pass
Review-only. The V2 asset archive is supplied separately, not committed. SHA-256: 0f0ae0245beda20bd3c2ed39eb530303121097de23cccd906e652ad1086f3e63. Seven RGBA PNGs; archive CRC and each manifest SHA verified. New pearlframe.png SHA-256: 3081cea90fc8f32376accf937786fc9f67fe119bc04f510bcf399c8490a4705f; 768x432, 74,721 bytes. Other images unchanged. Keep the existing V1 review archive separate.

Rebuilt the stretched connecting rails from existing cross-sections, with mirrored repeats and short premultiplied-alpha transitions. Retained pearl crest/corner designs and transparent central aperture. This is a concept-derived review refinement, not an approved production master.
| simulated card dp | top rail V1→V2 opaque pixels at sample column | opaque frame area V1→V2 | pre-stencil clipped pixels V1→V2 |
|---|---|---|---|
| 260x150 | 6→8 | 5290→6049 | 29→36 |
| 340x190 | 9→11 | 8681→9948 | 40→38 |
| 480x270 | 12→16 | 17065→21099 | 539→27 |
Python simulation of current segmented geometry, not actual Android rendering. Slightly more pre-stencil clipping at smallest size; fixed stencil masks it. Side rail sampled width at 340x190 decreases from 12 to 10 pixels; top rail increases at every tested width. No central aperture alpha. Visual comparison shows cleaner and more consistent rails, but small ornamental details are still restrained. Do not claim equal quality to all existing standard sets without native comparison.

Added standalone src/dev/tideborne-motion-review.ts and tests/tideborne-motion-review.ts. They are NOT imported by any live surface or registered as a catalog/runtime entry. Fixture uses the existing phase, particle sampler and artwork-space glow geometry helpers; 8 anchors, 5 tracks, 12s glow and 13.2s effect clocks, static reduced motion, no work on invalid/hidden geometry. Regression assertions passed on all four widths (104x72, 260x150, 340x190, 480x270) by executing the read-back source and its two real dependency modules after removing TypeScript-only annotations in a JavaScript isolate. This is not TypeScript compiler, native animation, or CI verification. The focused test is not yet registered in CI. No device FPS or memory claim.

Next: import actual review binary assets in a dedicated path, create an explicit dev-only render surface using native shared motion lifecycle, run actual TypeScript/mobile tests and device screenshots including portrait sizes, and compare to existing standard sets. Keep release flags, ownership, purchases and live render registry unchanged until approved. No main merge or production deployment.
