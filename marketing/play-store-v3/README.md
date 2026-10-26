# VELDRYN Play feature graphic · v3

The new forest-dungeon key art pairs the existing Ironwarden heroine with the Silverbrook Sprite. It replaces the castle-overlook composition for an evergreen promotional image. The wordmark is the actual in-game branding asset, added after generation; the image contains no generated text or simulated game interface.

- Upload to Google Play: `exports/feature-graphic-1024x500.png`
- Larger promotional version: `exports/promotional-banner-2048x1000.png`
- Editable key art: `source/forest-dungeon-key-art.png`

Both exports are opaque 24-bit RGB PNGs. Google Play requires a [1024 × 500 JPEG or 24-bit PNG feature graphic](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en). This pack has not been uploaded to Play Console.

To rebuild from the repository root, run `node marketing/play-store-v3/compose.cjs`. The script uses the same Codex canvas/sharp runtime as the earlier store pack; `VELDRYN_ART_NODE_MODULES` can point to another compatible Node modules directory.

Art method: built-in image generation, reference-guided. References were the actual `T1_003` Ironwarden heroine, Silverbrook Sprite companion, and Ironwood Forest world art. Final prompt: “Create a fresh wide VELDRYN key-art scene in the game's refined pixel-art style: the Ironwarden heroine and Silverbrook Sprite at an ancient forest dungeon entrance at dusk, with a dark blue-green left-center area for the existing wordmark; inviting teal shadows and warm torchlight; no castle, text, UI, extra characters, or store badges.”

For screenshots, the current set is in `../play-store-v2/exports/`. Before uploading it, compare every panel with the final Android build. The seasonal screenshot should show the active event, and the matchmaking screenshot should match the released online flow.
