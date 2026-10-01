# Guild / online community promotional artwork

Companion to the approved Veldryn promotional banner. This is illustrated promotional key art, not a screenshot or a promise of a controllable guild-hall lobby.

## Exports

- `exports/guild-community-1024x500.png` — Play Store feature-graphic dimensions.
- `exports/guild-community-2048x1000.png` — larger promotional image.
- `source/guild-community-key-art.png` — retained clean illustration without added copy.
- `compose-community.cjs` — editable logo and typography layout; run with Node from the repository root. Uses the same runtime dependencies and Windows fonts as `compose.cjs`.

Both final PNGs are checked for correct size, RGB color, and no alpha channel. Previous promotional images and screenshot exports are unchanged.

## Message

“Find your guild. Stay connected.”

“ONLINE · GUILDS · CHAT”

The local `GuildScreen` online mode includes Guild membership, shared activities and Chat. `ChatOverlay` has World and Guild chat channels. Copy is deliberately limited to those features: no player-count, always-online population, voice-chat, seamless-world, or real-time co-op combat claim. This check is evidence of implementation, not an end-to-end online release test; confirm the corresponding features are enabled in the release before publication.

## Art direction and provenance

Built-in image-generation tool, reference-guided generation (not CLI fallback). The image-generation skill guided visual-reference matching, inspection, and saving the final artwork into the project. The existing wordmark and exact copy are overlaid using deterministic canvas rendering. No generated chat conversation or fake game UI is shown.

References:

1. `source/promotional-key-art.png`: approved palette, pixel-art treatment, Ironwarden heroine.
2. `apps/mobile/assets/character-skins-t1-wayfinder/T1_012/male-front.png`: male Wayfinder design.
3. `apps/mobile/assets/character-skins-t1-dawnkeeper/T1_024/female-front.png`: female Dawnkeeper design.
4. `apps/mobile/assets/guild-customization/banners/banner_swordwing_blue.png`: existing guild banner motif.

## Final generation prompt

Use case: ads-marketing. Create a companion promotional key-art illustration for the fantasy online idle RPG VELDRYN, matching reference 1's refined high-detail pixel art, deep blue/teal shadows and warm golden lighting. This is illustrated marketing artwork, NOT a gameplay screenshot. References: image 1 is the previous approved Veldryn promo, use it for visual style and its blue-hooded Ironwarden heroine; image 2 is the actual male Wayfinder's identity, olive hood, leather armor and bow; image 3 is the actual female Dawnkeeper, white-and-gold sun robes and lantern, adapt its rendering to reference 1's pixel-art style; image 4 is the actual royal-blue silver-winged-sword guild banner, preserve that motif. Scene: a welcoming vaulted medieval guild hall at blue hour. On the RIGHT 55 percent of the canvas, these three adult adventurers gather around a carved wooden table, chatting warmly and planning their next journey over a parchment map lit by a small golden lantern. Faces visible in three-quarter views, friendly confident expressions, natural conversational gestures. The Ironwarden is nearest the center, the Wayfinder slightly behind, and the Dawnkeeper to the right. No fighting. A recognizable blue swordwing guild banner hangs behind the gathering. An arched window reveals a hint of the blue-crystal citadel outside. Cozy amber light on faces, richly textured wood and stone, atmospheric teal shadows, precise pixel clusters, premium detailed game key art. Wide landscape aspect ratio approximately 2.05:1, ideally 2048x1000. Keep the LEFT 42 percent quiet dark teal architectural shadow and soft atmosphere, free of characters and focal detail, reserved for our separate brand logo and copy. All important heads and banner emblem stay comfortably within the canvas; strong readable silhouettes at thumbnail size. No text, lettering, logos, speech bubbles, chat panels, interfaces, online counters, watermarks, modern technology or alcohol. No extra foreground characters. Do not imply a controllable 3D lobby. Emphasize fellowship and conversation, in the visual world of the supplied game assets.
