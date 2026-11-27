# Fractured Eternity — frame artwork review
Both optimized transparent WebP candidates have been uploaded to GitHub:
- `fractured_eternity.webp`: 1020×615, 156,512 bytes, SHA-256 d8dae670e0b6600997a741c342eb0f8cd2ee1954e85f77c3c1e593bf2f911f90
- `fractured_eternity_standard.webp`: 1024×576, 148,942 bytes, SHA-256 bb012ba154a404d018f5c31ad8a5a715c4eca2f1c90f84dc2523d85689bd7d06

Uploaded sizes, dimensions and alpha flags verified. Review registry references both; SHA-256 checks run in focused CI. Live registration and grant changes remain closed.

The original generated artwork was fitted with premultiplied-alpha perimeter resampling. Decoded showcase alpha at 320/340/390/480 logical px: zero pixels above 32 in all nine protected boxes, maximum alpha 1. At a common 340×205 size, alpha>128 coverage 24.54% (Celestial V2 25.74%, Abyssal 20.18%). Median opaque side coverage 12px (Celestial 10, Abyssal 15); upper-rail sample coverage 24px (Celestial 30, Abyssal 12). Measures use identical sample windows; not actual rendered brightness. Static composition reviewed on two dark backdrops. Native mobile and standard segmented-layout QA still pending.

Hourglass crest, side crystals and lower dimensional seal are the ornament anchors for the Reality Rewritten effect. No animated badge, full-frame GIF, or distortion of readable content.


## Beyond the Veil background staging
Both background variants are uploaded, dimension-checked, and registered in the isolated review. CI verifies hashes:
- beyond_the_veil.webp — 1020×615, 111958 bytes, SHA-256 ad91d1ca0c97daf00e780d69df518905c9a0917232bee5a9f5c7fc457f0dc63d
- beyond_the_veil_square.webp — 512×512, 59352 bytes, SHA-256 bc87bf0371436bf02b559a9cf9e566be9af4340c84baddedc266fa79d9bf7052

Wide composition reviewed against the fitted frame; darker left side, right portal and platform. Square crop favors portal. New Aeon fox artwork, static crest-derived badge and local effect textures prepared for review; the scene now uses registered background/frame and caller-supplied pet/glint/aura/optional atlas. No live grant integration.


## Aeon and final local texture staging
Upload the eight WebP files from the pet review package only (not ZIP, preview or manifest):
- aeon_512.webp — 512×512, 100624 bytes
- aeon_96.webp — 96×96, 8064 bytes
- aeon_showcase.webp — 224×256, 27000 bytes
- aeon_idle_atlas.webp — 672×768, 214792 bytes
- beyond_existence_256.webp — 256×256, 19562 bytes
- beyond_existence_64.webp — 64×64, 2780 bytes
- paradox_aura.webp — 128×128, 1784 bytes
- paradox_glint.webp — 48×48, 484 bytes

Total 375090 bytes; all eight transparent. The provisional idle atlas uses localized tail deformation of one source, 36 cells at 12fps, three seconds per loop, minimum decoded cell padding 7 pixels; native playback uses the existing 24s clock. Static badge is derived from the actual frame crest, not animated or a separately generated emblem. Final visual/device QA and production grant integration remain pending.
