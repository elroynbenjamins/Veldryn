# Final asset QA

63 assets passed export validation. The runtime library contains 756 PNG files including base, @2x, @3x and the separate pieces for 33 scalable assets. See `asset-validation.json` for per-asset results.

99 resizing cases passed: geometric minimum, larger dimensions, and exact source-pixel repetition when the stretch zones double. Protected corners, thin rails, binary alpha, density expansions, slice reconstruction, hashes and literal Metro references were checked.

All four contact pages were visually reviewed. Login and registration surfaces were refined after review. The final 390×844 login, registration and character assemblies and the resizing preview were inspected for readable content and intact borders. These are examples assembled from the delivered assets; no assets were cut out of the examples.

Input alignment revision (2026-09-12): login, registration, button and gender labels now center their measured glyph bounds in the padded content area. The three regenerated assemblies were visually inspected and all 99 resize cases passed again. The `PixelInput` example removes extra editor padding, centers single-line native text and grows for accessibility font scale. `PixelFrame`, `PixelInput` and the asset registry pass strict TypeScript checking against the mobile project's installed React/React Native types.

Native device rendering and application integration of these kit examples were not executed. Verify device sampling, font scaling, secure-text metrics and interaction behavior in the consuming app. Static assembly previews are not native-device screenshots.

`tools/package.py` checks archive CRCs, every member's SHA-256, entry coverage and path safety. Its final report and archive digest are written beside the ZIP. `CHECKSUMS.sha256` inside the ZIP covers the packaged files.
