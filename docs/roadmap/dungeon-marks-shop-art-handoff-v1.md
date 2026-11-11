# Dungeon Marks Shop — Pixel-art handoff (hidden; assets not produced)
**Date:** 2026-11-11 · **Status:** source-ready art briefs, no shipped artwork.

## Shared style
Veldryn's native fantasy pixel art: hand-clustered pixels, strong silhouettes, controlled palette, crisp edges, transparent alpha for icons/pets/borders. All rarity borders are **runtime** UI, not baked into artwork. No labels, UI chrome, drop shadows touching the canvas edge, photo textures, AI-smoothed gradients or unreadably tiny symbols.
Deliver optimized 64×64 or 96×96 runtime pet WebP plus 512×512 lossless master; 128×128 transparent icon master and runtime WebP; square-border assets aligned to profile-safe area; backgrounds preferably 1024×512 (allow crop from center to profile preview), 2–4 subtle frame variants only when performance permits. Include a static frame for reduced-motion. Verify 1× display on a small phone.

## Asterfall
- **Warden's Lantern** — Rare profile icon; a single brass lantern with a small oathglass flame, not a human portrait. 128×128 transparency.
- **Briarbound Frame** — Epic border; intertwined green/umber briars and two small amber runes, open center for character icon. +2% equipped Gathering Yield / +0.50% owned.
- **Rootbound Sanctuary** — Epic profile background; an ancient vault entrance with thick roots, moss-covered arch and light reflected from brass lanterns. Deep verdant shadows but a readable center for the profile. +2% equipped Maximum HP / +0.50% owned.
- **Oathroot Seedling** — Epic pet; squat, friendly sprout guardian with root feet and a tiny oathglass glow. Different silhouette from Hollowroot's future Heartwood Sprout World Boss pet (small seed pod/lantern stem rather than tree guardian). +3% equipped Healing Effectiveness / +0.50% owned.

## Sunscar
- **Solar Vault Key** — Rare icon; sunstone-and-bronze astrolabe glyph.
- **Amberglass Loop** — Epic border; angled amber glass shards framing an old observatory dial.
- **Buried Observatory** — Epic background; sandstone vault, broken astronomical instrument, luminous amber slit of sunlight; subtle airborne dust.
- **Vaultscarab** — Epic pet; glossy glass-backed dune scarab with visible tiny legs, compact readable eye/glow, not a Sunscar dragon.
  Bonus families: border Crafting Speed +2% active; background Skill XP +2% active; pet ordinary Drop Chance +3% active. Each +0.50% owned in its family.

## Frostmarch
- **Resonant Bell** — Rare icon; clear frosted silver bell with blue runes.
- **Frostbound Chime** — Epic border; ice-crystal stave with suspended silver bells; ensure not cluttered at tiny scale.
- **Shiverlake Reflections** — Epic background; blue ice cavern and distant choir bell tower reflecting over frozen water, low-contrast snow drifting only in optional animation.
- **Choirbell Sprite** — Epic pet; hovering spectral bell spirit with a little cloak-like snow tail, **not** the icy World Boss Rimebound Wisp.
  Bonus families: border Fishing Speed +2% active; background Defense +2% active; pet Action Speed +3% active. Each +0.50% owned.

## Account and release wiring
Reward IDs and item prices are defined in `backend/src/server/expeditions/dungeon-shop-catalog-v1.ts`, and dormant buff metadata in `apps/mobile/src/content/dungeon-shop-collectibles-v1.ts`.
Do not add entries to shipped `profile-icon-assets.ts`, `profile-background-assets.ts`, `pet-art.ts`, or activate the collectible release flag until **each actual unique asset exists** in an optimized runtime format and the profile preview renders without blank fallback. The shop UI may show neutral preview glyphs in **developer builds only**.
Any later art may adjust visual names without changing owned reward IDs (migration-safe).
