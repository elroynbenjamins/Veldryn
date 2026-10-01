# Card backgrounds and profile borders — 2026-09-28

## Shipped in source
Updated landscape/portrait assets and ratio selection are documented in [Responsive card artwork](RESPONSIVE_CARD_ART_2026_09_28.md). The original dimensions/provenance below describe the initial implementation.
- Guild backgrounds: Plain (existing look), Guild Plaza (default), Forest Sanctum (guild level 10).
- Every illustrated guild background has both wide and square art. CardBackground selects square below a 1.45 width/height ratio and uses cover, never distortion.
- Existing personal backgrounds retain their ownership rules. The two matching personal backgrounds also reuse the variants; other personal art retains cover cropping.
- Guild borders and personal borders render around the actual perimeter. Personal profile editor preview, public profile, and border gallery share ProfileFrameOverlay.
- Compact guild banners stay unframed, full-height, and uncropped. No nameplate is reintroduced.
- Online and offline appearance selectors use the same picker. Offline has level-1 entitlements; online uses authoritative guild level. Save normalization preserves the selected ID.
- Guild cards use a dark scrim and theme-independent readable copy over scenic art.

## Artwork provenance
Built-in image-generation tool, edit mode, two separate calls. Existing wide art is reused without duplicating files:
- Wide Guild Plaza: apps/mobile/assets/profile-backgrounds/bg_merchant_guild.png (320 × 180)
- Square Guild Plaza: apps/mobile/assets/card-backgrounds/guild_plaza_square.png (1254 × 1254)
- Wide Forest Sanctum: apps/mobile/assets/profile-backgrounds/bg_forest_sanctum.png (320 × 180)
- Square Forest Sanctum: apps/mobile/assets/card-backgrounds/forest_sanctum_square.png (1254 × 1254)

Original generated outputs remain in C:/Users/elroy/.codex/generated_images/01a0e226-23ee-7680-8dd5-fffb26669f19/.
Guild Plaza: exec-a0714d47-0401-49e1-959e-9fe41ccd9d48.png.
Forest Sanctum: exec-2969d9fc-a225-4d97-a546-844ca8c445a8.png.

Exact prompts:
### guild_plaza
Create a SQUARE 1:1 game card background variant of the supplied Guild Plaza landscape artwork. Faithfully preserve its detailed pixel-art style, palette, architecture, atmosphere and location identity. Recompose the scene for a square card: expand vertical environment and reposition peripheral details naturally rather than stretching or simply cropping off the scene. Keep the central area comparatively quiet for a game banner and text drawn by the app. Full-bleed opaque artwork, no frame, no UI, no typography, no characters, no logo, no watermark. It must look like the same game location. Save the result under C:/Users/elroy/.codex/generated_images/ as guild_plaza_square.png.

### forest_sanctum
Create a SQUARE 1:1 game card background variant of the supplied Forest Sanctum landscape artwork. Faithfully preserve its detailed pixel-art style, palette, architecture, atmosphere and location identity. Recompose the scene for a square card: expand vertical environment and reposition peripheral details naturally rather than stretching or simply cropping off the scene. Keep the central area comparatively quiet for a game banner and text drawn by the app. Full-bleed opaque artwork, no frame, no UI, no typography, no characters, no logo, no watermark. It must look like the same game location. Save the result under C:/Users/elroy/.codex/generated_images/ as forest_sanctum_square.png.

## Backend rollout
Migration: backend/supabase/migrations/20260928200007_guild_card_backgrounds.sql.
**Not applied to a live Supabase project.** Apply this migration before using the new online appearance save.
The new RPC wraps the established six-argument validator in one transaction, checks authenticated guild membership and leader/officer role, locks membership and guild rows, validates background ID and level, and increments revision once. Existing clients preserve the background when writing older appearance fields.
Existing guild-directory reads fall back if the new column is not deployed; the background picker stays disabled with an update notice. Plain-background saves can use the old RPC during rollout. Scenic saves are never silently downgraded. Saves never claim success without a returned row.

## Verification
- Mobile TypeScript noEmit.
- apps/mobile/tests/card-appearance.cjs, guild-heraldry.cjs and guild-background-client.cjs.
- Guild customization, social identity presentation, and profile social identity core tests.
- Real migration and actual existing RPC bodies executed in an isolated in-memory PGlite PostgreSQL engine using tools/test-guild-background-db.mjs.
- Test cases: save/readback, level-10 boundary, invalid/null IDs, rejected-write atomicity, revision, older clients, other cosmetic entitlement checks, leader/officer/member/outsider/anonymous access and execution grants.
- Local Docker daemon was unavailable. Isolated tests use minimal existing-schema/auth fixtures, not a full Supabase stack or live deployment.
- Browser checks use actual React Native Web components at 400px and 288px widths via the memory-only guild-identity fixture. No real account or chat actions.
- Native Android/iOS rendering remains unverified.

Run the isolated test with PGLITE_MODULE set to the installed @electric-sql/pglite/dist/index.js absolute path, then:
`node tools/test-guild-background-db.mjs`.

