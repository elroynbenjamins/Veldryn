# Frostfall 2026 Winter Hearth — original pixel art icon candidates

**Status:** 3 images generated for owner review. Do not merge their assets into the released mobile bundle until the owner explicitly approves their real in-game appearance and theme.

- `FROSTFALL_CHRISTMAS_LIGHTS_2026`: seasonal item icon, transparent 96×96 RGBA PNG, safe-margin artwork, no rarity framing.
- `FROSTFALL_WISP_GLOW_2026`: separate seasonal rare gathering-drop item icon, transparent 96×96 RGBA PNG, safe-margin artwork, no rarity framing.
- `winter_hearth_christmas_market_2026`: Guild Hall seasonal project icon, transparent 96×96 RGBA PNG, safe-margin artwork.

Artist's generated originals and the 96×96 exports were supplied as separate review artifacts in the associated ChatGPT conversation on 2026-11-23. The **binary PNGs are not yet committed to this branch**; this manifest intentionally makes no invalid Metro require/import. Expected eventual Android paths after approval:
- `apps/mobile/assets/events/frostfall_2026/christmas_lights_96.png`
- `apps/mobile/assets/events/frostfall_2026/wisp_glow_96.png`
- `apps/mobile/assets/events/frostfall_2026/christmas_market_96.png`

Before packaging: verify exported alpha, pixel alignment, Metro import, display at native 96px and 2× sizes, dark and light backgrounds, six-pixel safe zone, tiny 32px legibility, and asset-size budget. Rarity borders remain runtime-owned and separate.

Guild name color `name_frostfall_aurora_2026` is a separate owner-review item. The permanent entitlement ID can be granted server-side at 100% but the palette/color and visual effect must not be invented or registered without design review.
