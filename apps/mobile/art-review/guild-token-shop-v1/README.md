# Guild Token Shop — Source Art Review

This is a source-only visual set for the permanent Guild Token Shop. Nothing in this folder is imported by the mobile app or bundled into closed testing.

## Reward mapping

| Source file | Shop catalog mapping | Purpose |
| --- | --- | --- |
| `guild-token-source.png` | Guild Token currency | Balance, price, and earnable-token UI |
| `GUILD_PET_001-stormwatch-fox-source.png` | `GUILD_PET_001` · Stormwatch Fox | Shop and collection portrait |
| `GUILD_PET_002-oathwood-wyrmling-source.png` | `GUILD_PET_002` · Oathwood Wyrmling | Shop and collection portrait |
| `GUILD_UNIT_001-stormwatch-sentinel-v2-source.png` | `GUILD_UNIT_001` · Stormwatch Sentinel | Runtime source: stone gargoyle guardian |
| `GUILD_UNIT_002-oathbound-seeker-v2-source.png` | `GUILD_UNIT_002` · Oathbound Seeker | Runtime source: lynx scout |
| `GUILD_UNIT_003-dawncall-herald-v2-source.png` | `GUILD_UNIT_003` · Dawncall Herald | Runtime source: songbird spirit |
| `guild-stormwatch-crest-source.png` | `guild:stormwatch-crest` | Profile icon |
| `guild-border-silver-source.png` | `guild-border-silver` · Fellowship Silver | Profile border |
| `guild-border-emerald-source.png` | `guild-border-emerald` · Verdant Covenant | Profile border |
| `guild-border-royal-source.png` | `guild-border-royal` · Royal Concord | Profile border |

## Art direction

The collection uses the existing Veldryn collectible language: compact creature/construct silhouettes, crisp dark edges, painterly pixel shading, and enough material detail to survive a 96px portrait. Blue guild cloth, antique gold, silver, warm lantern light, and the four-point compass tie every piece to the permanent Guild Token Shop. The earlier humanoid companion exploration files remain here for provenance but are not runtime sources.

## Still required before release

1. Art-direction approval and any requested paintovers.
2. Export and visually QA target-size runtime variants, including transparent centers for every profile border.
3. Add runtime asset mappings for `GUILD_PET_*`, `GUILD_UNIT_*`, `guild:stormwatch-crest`, and the three border IDs.
4. Update `OnlineGuildTokenShopPanel` to render the mapped currency and reward artwork on shop cards.
5. Enable only the rewards whose entitlement wiring, staging tests, and release approval are complete.

The three emote packs already map to existing authored pet-emote artwork, so no new emote visuals are included here.
