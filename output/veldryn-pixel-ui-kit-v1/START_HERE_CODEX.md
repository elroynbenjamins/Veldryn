# VELDRYN Pixel UI Kit v1

1. Read `VELDRYN_UI_ASSET_SPEC.md`, then `instructions/ASSET_INVENTORY.md`.
2. Open `preview/index.html` to inspect every asset at native scale on dark, light and checker backgrounds. Review the contact, stretch and assembly images.
3. Use the individual PNGs under `ui`, `icons` and `branding`. Density variants and pre-cut pieces are included. `source/originals` are provenance, not runtime art.
4. Keep the pack's folder structure when copying into an Expo project. `implementation/assets.ts` supplies literal Metro requires, `PixelFrame.tsx` supplies a cross-platform slice renderer, and `PixelInput.tsx` demonstrates a vertically centered single-line editor with focus/error/disabled states. Apply frame padding only once; keep text live.
5. Reuse existing game routes, account flow, classes, gender labels and character artwork. Add live text, accessibility, input semantics and state around the artwork. Preserve existing gameplay and backend behavior.
6. Test narrow phone widths, long translated text, large text, keyboard avoidance, touch areas and physical-device pixel rendering before integrating into release screens.

The ZIP is an asset library, not a replacement VELDRYN repository. The pack itself does not modify the running game. See `qa` for the actual automated checks and their limits.

To rebuild from included sources: install Node with `sharp`, run `node tools/build.mjs`, `node tools/preview.mjs`, `node tools/verify.mjs`, then `python tools/package.py`. If `sharp` is stored outside normal package resolution, set `VELDRYN_SHARP_PATH` to its absolute JavaScript entry file. Preview text uses a system font; set `VELDRYN_PREVIEW_FONT` to a font file if the script cannot locate one. Packaging uses only the Python standard library.
