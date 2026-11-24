# Profile cosmetics refresh — staged design and rendering contract

Status: first rendering pass, review only. No store purchases, grants, live migration or new ownership fields enabled.

## Cosmetic families
- Existing profileBorderId continues to mean the full scene border. Rename the player-facing category from Frames to Borders when the cosmetics refresh is implemented. Preserve every existing ID, acquisition rule and equipped selection.
- No separate avatar frame: preserve the unobstructed existing character portrait (approved visual direction).
- Profile border: independent full-scene segmented ornament, with localized rail/gem animation.
- Showcase effect: independent optional scene layer (snow, embers, magical wisps, stars), clipped to the artwork aperture; never cover identity, badges, pet or guild labels. Equip None independently.
- Account-wide ownership, per-character equipped choice consistent with the current profile border. Future commerce must validate ownership server-side; preview never grants or equips unowned items.
- Store tab 2: Cosmetics (reuse hidden Collections concept). Offer a matching two-piece set (animated profile border + showcase effect) or individual cosmetics, with transparent component ownership and no duplicate charges; existing event/dungeon/guild exclusives remain exclusive. No premium currency or gameplay benefit. Prices, catalog and purchase flows not approved here.

## Rendering / art
The first pass addresses the reported Gloamward top bleed only, using a provisional screenshot-derived source-space calibration that scales with the existing segmented renderer. Background clipping itself does not move content. Gloamward additionally reserves horizontal corner clearance: pet moves 16dp left and guild tag 8dp right, without changing vertical anchors or sizes. Other borders retain defaults until reviewed. Other asset IDs remain unchanged until their apertures can be audited.
Future asset standards: 768x432 transparent scene border with stable corners, center medallions and stretch-safe rails; explicit per-art aperture/rail calibration on all four sides. Existing asset IDs stay stable. Preserve current detailed fantasy artwork, not simplified placeholder UI.
Check all current border IDs including event catalog and guild surfaces before broader changes. Native screenshots at narrow and wide phone widths, expanded and collapsed customization, own/public profile, dark/light themes, and with long names are required before approving the new art.
Local animations only; honor reduced motion, pause offscreen/background, static small-list fallback as needed. New animation metadata is separate from ownership and purchases.

## Passes
1. Gloamward top bleed candidate, geometry regression and native QA.
2. Audit every asset aperture and normalize rail metrics, then regenerate art only where needed.
3. Independent showcase effect storage, projection, server ownership checks and wardrobe UI.
4. Animation engine, themed assets and performance QA.
5. Hidden Cosmetics tab preview, then separately approved real store integration.
