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
The first pass addresses the reported Gloamward top bleed only, using a provisional screenshot-derived source-space calibration that scales with the existing segmented renderer. Background clipping itself does not move content. All full personal profile scenes use shared outer-card anchors, independent of border choice: pet right 46dp, guild left 46dp, both bottom 28dp; expanded customize stage pet bottom 31dp to preserve its compact composition. Pet size remains 58dp (legacy preview 56dp); guild width reserves the pet width and 8dp gap. The standard also applies without a border, so switching cosmetics never moves these anchors. Other asset IDs remain unchanged until their apertures can be audited.
Future asset standards: 768x432 transparent scene border with stable corners, center medallions and stretch-safe rails; explicit per-art aperture/rail calibration on all four sides. Existing asset IDs stay stable. Preserve current detailed fantasy artwork, not simplified placeholder UI.
Check all current border IDs including event catalog and guild surfaces before broader changes. Native screenshots at narrow and wide phone widths, expanded and collapsed customization, own/public profile, dark/light themes, and with long names are required before approving the new art.
Local animations only; honor reduced motion, pause offscreen/background, static small-list fallback as needed. New animation metadata is separate from ownership and purchases.

## Mandatory border envelope
Reference card: 340×205dp. Maximum inward depth: 18dp left/right rails, 24dp top/bottom rails, 30×30dp top corners, 40×40dp bottom corners. At widths below 300dp or heights below 205dp the ornament stencil scales down proportionally; it never scales up. The shared scene renderer clips static artwork to this non-overlapping perimeter envelope, preserving the existing segment mapping. Existing artwork must be checked against the stencil and regenerated/recalibrated if ornament details or rail continuity are lost. Standalone wardrobe thumbnails and guild-card borders are not changed by this personal-scene rule. Future border animation layers must use the identical clipping envelope; showcase effects belong below foreground content, within the backdrop aperture. No per-border positioning exceptions. At 768×432 authoring size, verify assets by rendering in the actual 340×205dp target (not by stretching a single pixel inset); also test 260×190 and 480×286. Do not activate a store asset until both static and animated extrema pass visual review.

## Passes
1. Gloamward top bleed candidate, geometry regression and native QA.
2. Audit every asset aperture and normalize rail metrics, then regenerate art only where needed.
3. Independent showcase effect storage, projection, server ownership checks and wardrobe UI.
4. Animation engine, themed assets and performance QA.
5. Hidden Cosmetics tab preview, then separately approved real store integration.
