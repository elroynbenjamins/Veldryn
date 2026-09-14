# VELDRYN Visual Polish v4
Implemented in the shared mobile workspace on 12 September 2026.

## Completed
1. Home: compact identity, active activity and collection first, one next-step guide, optional encounter and reserve details.
2. Skills: six dedicated transparent illustrated icons, responsive card columns and readable native typography.
3. Crafting: eight new material/food illustrations, artwork for all 402 recipe outputs, expandable illustrated requirements, catalogue search, level ordering and incremental recipe rendering.
4. Combat: regional encounter scenery, consistent portrait presentation, dedicated boss introduction and an explicit distinction between illustrative timing and settled game state.
5. Social: class emblems and transparent role markers, clearer recruitment and party rows, shared guild marks, compact filter disclosure. Unknown classes and missing portraits retain neutral identity.
6. Navigation: existing high-quality v2 art, stronger inactive contrast, 12dp labels, wrapped text and Android gesture clearance.
7. Native QA: real React Native components exercised in Expo Go on Android 35 at 360dp and 390dp, plus 320dp with 150% system text. Found and repaired recipe text-node warning, excessive recipe mounting, crowded large-text skill columns, footer clearance, and login background coverage.

## Validation
- Full mobile TypeScript check: passed after final runtime edits.
- Ten relevant compiled test suites: passed (see tests.json).
- Recipe artwork audit: 402 recipes / 402 distinct outputs resolve to artwork.
- All 14 generation masters have genuine alpha; 60 runtime density PNGs exported.
- Production Android export: passed with EXPO_PUBLIC_VISUAL_QA=0 and --no-bytecode. This is a Metro production export, not a signed APK or store release.
- Native screenshot review and QA details: NATIVE_QA.md and review.html.
- Archive CRC and individual SHA-256 verification: archive-integrity.json alongside the ZIP.

## Boundaries
This ZIP is an update for the current VELDRYN repository, not a standalone replacement for the earlier asset kits. Current App.tsx navigation wiring is documented in VELDRYN_UI_ASSET_SPEC.md rather than bundled as a replacement for concurrent account/gameplay work.
Twenty uncommon recipe ingredients still use a neutral inventory marker; their names and counts remain visible. Existing representative equipment mappings remain identified as such in recipe-art-audit.json.
No real account creation, reward claims, guild mutations or saved-game writes were used during UI review. Network workflows and physical iOS/Android devices were not exercised. Native QA uses actual components with memory fixtures, not an end-to-end test of production account/server integration.
