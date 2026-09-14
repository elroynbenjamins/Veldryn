# Integration verification

- PASS: all nine new assets and three reused logo density files (30 runtime PNGs total) decoded and passed export checks.
- PASS: all 30 installed PNGs match the handoff exports by SHA-256.
- PASS: mobile TypeScript compilation with `tsc --noEmit`.
- PASS: Android Metro JavaScript export with `expo export --platform android --no-bytecode --max-workers 2 --dump-assetmap`; 1,244 modules bundled.
- Visual review: three 360×780 assembled startup screens and three event-border overlays over existing profile backgrounds. All nine alternative phone crops rendered successfully.

The normal Android export reached Hermes bytecode compilation, but Windows denied execution of the local `hermesc.exe`. The successful fallback checks JavaScript and asset bundling only; no production configuration was changed to disable Hermes. Native bytecode, installation and physical-device rendering were not verified.

Random selection is initialized once with component state. Existing online/local loading conditions and recovery branches control when the image is displayed. No timing, authentication, save settlement or reward-economy logic was added or replaced.
