# Premium frame parity — Sakura calibration and Stormforged V2

## Pass 1: Sakura V2 integration
Both uploaded files at d8219e8aa9e5138329d1461257da0c1a6aff4143 independently verified against the prior pinned SHA-256 values, lengths, VP8X dimensions, alpha flags, and visual image readback. Isolated review registry now selects V2 in both aspects. Integrity regression pins all six historical/current files and rejects V1 Sakura in the selected registry. No live import. Total retained review files 489,036 bytes.
Calibrated approximate source-pixel landmarks for Sakura jewels, crest and flowers separately for 1020×615 and 1024×576. Map to fitted image rectangle, not arbitrary stretched profile. Six standard/eight showcase nodes; two staggered rail tracks; existing native clock only. 59,136 equivalent numerical interpolated geometry/scale/opacity assertions on transformed source readback passed. Actual TypeScript-based regression appended to Mobile UX test; native visual and CI verification pending. No native renderer wiring or new animation clock.

## Pass 2: Stormforged V2 artwork
Standalone generated wolf crest, dark steel armor, angular silver relief, blue lightning channels and faceted gems. Source RGBA 1614×974; removed low-alpha haze, independently fitted five columns and three rows with preserved crest and corner widths for each aspect, encoded optimized WebP. No text or background. Candidate is offline, not yet uploaded or registered.

| Path under apps/mobile/assets/ascendant/stormforged/ | Dimensions | Bytes | SHA-256 |
|---|---|---|---|
| steel_crown_v2.webp | 1020×615 | 119716 | 3c2774af8bda91a3a7fbc3e6cb850bb397d34f61d7ad40a5becdc03a8f46492f |
| steel_crown_v2_standard.webp | 1024×576 | 116826 | 2216104f3aea5b35beedb7bab30fd8a2e425019c89a09b4010f36c6032b624de |

Decoded RGBA max alpha 0 in identity, guild and pet boxes at each of 320,340,390,480 logical-pixel widths (24 checks); combined 236542 bytes. Alpha>32 coverage 21.165% and 22.073%, versus Sakura V2 26.845% and 27.976%. Comparable range to previously reviewed Abyssal and Paradox candidate coverage (20.18%, 24.54% showcase), not a measure of relief, perceived thickness or rendered brightness. Equal-size 340×205 comparison shows Stormforged's narrower rails versus Sakura; native parity approval remains open, including adjustment if needed. Baked lightning is static art; native traveling highlights still require actual ornament calibration after upload. No production registry, grants, monetization, deployment or merge.

Next: verify Stormforged upload and register only in review, calibrate its separate native interpolation targets, review both frames at phone size against the four references; then dedicated backgrounds, pets and badge/FX textures.