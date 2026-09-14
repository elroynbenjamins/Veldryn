# Integration validation — 2026-09-12

- PASS: `node node_modules/typescript/bin/tsc --noEmit` in `apps/mobile`.
- PASS: Android JavaScript Metro export with `CI=1 EXPO_OFFLINE=1`, `expo export --platform android --no-bytecode --max-workers 2 --dump-assetmap --output-dir .expo-export-class-icons-check`; exit 0, 1,254 modules.
- PASS: exported asset map includes all 18 class emblem families, each at scales `[1, 2, 3]`; see `bundle-assets.json`.
- PASS: all 54 installed PNG hashes match the delivery manifest; static registry and consumer mapping checks pass. See `installed.json`.
- PASS: PNG coverage, dimensions, binary alpha, transparent gutters, palette budget and exact density expansion; see `assets.json`.
- PASS: whitespace check on the changed existing source files.

Installed assets are under `apps/mobile/assets/class-emblems-v2`. `class-emblem-assets.ts` provides explicit Metro requires. The public `classArtwork` alias serves class selection; the Character screen uses `classIconArtwork` at its existing 62 dp size.

The export validates JavaScript and asset resolution. It is not a native Android build or device test. Bytecode was disabled for this verification because the earlier startup-art validation established that this Windows environment denies execution of Expo's bundled Hermes compiler; the app's production Hermes configuration was not changed. iOS/native device rendering remains untested. Check the responsive carousel and compact icons on representative phones before release.

Final ZIP validation checks CRC, every member SHA-256, duplicate names, and archive paths. The result is stored in `VELDRYN_Class_Icons_v2.verification.json` next to the archive.
