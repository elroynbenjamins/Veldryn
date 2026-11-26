# Fractured Eternity — frame artwork review
Both optimized transparent WebP candidates have been uploaded to GitHub:
- `fractured_eternity.webp`: 1020×615, 156,512 bytes, SHA-256 d8dae670e0b6600997a741c342eb0f8cd2ee1954e85f77c3c1e593bf2f911f90
- `fractured_eternity_standard.webp`: 1024×576, 148,942 bytes, SHA-256 bb012ba154a404d018f5c31ad8a5a715c4eca2f1c90f84dc2523d85689bd7d06

Uploaded sizes, dimensions and alpha flags verified. Review registry references both; SHA-256 checks run in focused CI. Live registration and grant changes remain closed.

The original generated artwork was fitted with premultiplied-alpha perimeter resampling. Decoded showcase alpha at 320/340/390/480 logical px: zero pixels above 32 in all nine protected boxes, maximum alpha 1. At a common 340×205 size, alpha>128 coverage 24.54% (Celestial V2 25.74%, Abyssal 20.18%). Median opaque side coverage 12px (Celestial 10, Abyssal 15); upper-rail sample coverage 24px (Celestial 30, Abyssal 12). Measures use identical sample windows; not actual rendered brightness. Static composition reviewed on two dark backdrops. Native mobile and standard segmented-layout QA still pending.

Hourglass crest, side crystals and lower dimensional seal are the ornament anchors for the Reality Rewritten effect. No animated badge, full-frame GIF, or distortion of readable content.


## Beyond the Veil background staging
Upload these two new WebP candidates (not the preview or ZIP):
- beyond_the_veil.webp — 1020×615, 111958 bytes, SHA-256 ad91d1ca0c97daf00e780d69df518905c9a0917232bee5a9f5c7fc457f0dc63d
- beyond_the_veil_square.webp — 512×512, 59352 bytes, SHA-256 bc87bf0371436bf02b559a9cf9e566be9af4340c84baddedc266fa79d9bf7052

Wide composition reviewed against the fitted frame; darker left side, right portal and platform. Square crop favors portal. Pet asset generation returned a duplicate frame instead of standalone artwork and was discarded. Native review scene currently accepts caller-supplied background/pet/glint/aura textures; no finished pet, atlas, static badge or live grant integration yet.
