# Validation — 2026-09-12

- PASS: full mobile TypeScript check after the final layout changes.
- PASS: final Android JavaScript Metro export, 1,307 modules, exit 0. Command: `expo export --platform android --no-bytecode --max-workers 2 --dump-assetmap --output-dir .expo-export-creation-check`, with CI and offline mode enabled.
- PASS: all nine canonical classes map to existing male and female illustrations (18 files).
- PASS: all 49 chrome asset families have base, @2x and @3x files (147 PNGs).
- PASS: carousel wrap boundaries for 2/3/4/9 classes and existing character-name validation checks.
- PASS: whitespace check on changed application source.
- PASS: separate browser visual-review captures at 390×844 and 320×740; reviewed class/role/body changes and no horizontal overflow. The compact header and responsive figure height were revised after initial captures. The final phone preview was visually inspected.

The browser review is a layout companion, not React Native running in a browser. Native touch gestures, keyboard behavior, secure storage/save flow, font scaling and accessibility should still be tested on Android/iOS devices. The JavaScript export checks bundling and asset resolution, not a native binary. Bytecode was disabled only for this check because the earlier task established that the local Windows environment denies running Expo's Hermes compiler. App production configuration was not changed.

No new equipment, classes, skins, rewards or character-creation grants were introduced. The existing neutral starting portrait and save/confirmation logic remain in the creation flow. No new hero image generation was needed; the carousel reuses the existing approved class artwork.

The handoff ZIP is checked by reading every member for CRC and SHA-256 agreement. Its verification report is beside the archive.

## Softer layout pass

The browser review was regenerated at 390×844 and 320×740 after removing the boxed visual treatment. The final 390 px viewport was visually inspected. Inputs keep zero internal padding and centered single-line text; outer padding and rounded controls provide spacing. The full application TypeScript and Android JavaScript export checks were repeated for this revision. Device typography, especially platform serif fonts, remains unverified.
