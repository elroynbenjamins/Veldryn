# Veldryn — Tier 1–4 equipment generation guide

> The filename is retained for compatibility. This is the authoritative guide for all Tier 1–4 equipment regeneration.

## Goal

Regenerate any Tier 1, 2, 3, or 4 equipment sheet as one coherent Veldryn family. A higher tier must read as the same class and named set made from rarer materials, never as artwork from a different renderer or game.

For an existing set, use its approved matching-class sheets and its catalog metadata as mandatory references. When regenerating Tier 1, preserve the intent of approved Tier 1 sheets for that class. For Tier 2, use that class's Tier 1 language as the baseline. For Tier 3 and Tier 4, use the matching class's approved T1/T2 sheets as the visual authority; do not copy the current T3/T4 rendering style when it is being replaced.

Example Ironwarden references:

- `apps/mobile/assets/equipment-t1-ironwarden/T1_001-oathbound-rampart-icon-sheet-legfix.webp`
- `apps/mobile/assets/equipment-t2-ironwarden/T2_001-ironbark-bulwark-icon-sheet-legfix.webp`
- `apps/mobile/src/content/equipment_catalog_t1_t9_v33.json`

## Non-negotiable visual rules

- **Medium:** premium painted fantasy inventory art, softly hand-painted and readable at 32–64 px.
- **Silhouette first:** broad, clear forms and quiet negative space; every slot must be recognizable at a glance.
- **Lighting:** one soft upper-left warm studio light, subdued cool occlusion, and gentle painted rim highlights. No photographic glare, hard black outline, HDR bloom, or dramatic scene lighting.
- **Materials:** practical metal, leather, cloth, and wood with visible brushwork. Avoid photoreal scratches, crisp micro-engraving, noisy filigree, plastic shine, and PBR realism.
- **Class continuity:** preserve the class palette, construction language, and silhouette family. Tiering comes from material quality and one or two deliberate motifs, never a different art style.
- **Accent, not flood fill:** a class color is a controlled accent in cloth, enamel, gem, binding, trim, or heraldry; it must not recolor the whole set.
- **Set uniqueness:** every named set has its own emblem, material story, weapon profile, sidearm/offhand profile, and helmet silhouette. Do not recycle a weapon, offhand, or helmet shape between alternate sets, including two sets of the same class and tier.
- **Transparency:** use a fully transparent background only—no card, scenery, pedestal, floor shadow, title, labels, watermark, border, or exterior glow.

## Tier treatment

| Tier | Material and motif | Detail ceiling |
| --- | --- | --- |
| T1 | Basic issue gear: plain iron, hide, simple cloth, weathered wood, utilitarian fastenings, and at most a tiny painted class-color trim. No repeated heraldry, glowing rune, decorative inlay, or premium metalwork. | The cleanest, most functional version of the class language; it must visibly read as a beginner's first usable set. |
| T2 | Better-fitted practical gear: improved steel/leather, clearer stitching or edging, one developed class/set motif, and the first modest use of heraldry or enamel. | Roughly 10% richer than T1; still deliberately simple. |
| T3 | Refined steel/iron, modest heraldic inlay, and one brighter class-color or pale-metal accent. | Roughly 15–20% richer than T2; retain the chunky painted read. |
| T4 | Region-inflected material such as rootbound bronze, frostiron, oathglass, or lanternsteel plus one legible regional motif. | Roughly 25–30% richer than T2; never add noisy ornament, realism, or VFX. |

T4 feels valuable through material selection, a stronger central emblem, and slightly richer trim—not through a new camera, contrast curve, texture renderer, or a pile of tiny details.

## Class identity contract

Use the listed accent exactly as a guide, while harmonizing it with the set name and its tier material. The weapon, offhand, and helmet rules establish the default family; each named set must still give them a distinct silhouette and motif.

| Class | Accent | Construction and motif language | Weapon + offhand identity | Helmet identity |
| --- | --- | --- | --- | --- |
| Ironwarden | ice blue `#70BDFA` | Runic defender plate, deep-blue cloth, ward sigils. | One-handed sword with a round/ward shield. | Closed visor or crested guard helm. |
| Bastion | burnished amber `#C98342` | Blocky citadel plate, masonry seams, fortress marks. | Mace or hammer with a signature tower shield. | Square, slab-like, or bucket helm. |
| Dreadguard | muted crimson `#A4536C` | Aggressive blood-iron, chains, hooks, restrained barbs. | Chained weapon with a hooked buckler or ward. | Menacing angular helm. |
| Wayfinder | moss green `#9EC57F` | Practical leather, weathered wood, leaf/feather trail motifs. | Bow with a quiver, scout charm, or compact ranged offhand. | Open hood or forester helm. |
| Ravager | ember orange `#EB6A43` | Brutal heavy gear, trophy bindings, impact scars. | Two-handed axe or maul; use a forearm guard/trophy as the side identity, never a second main weapon. | Horned or open-faced war helm. |
| Hexweaver | pale violet `#C4A0FA` | Layered cloth/leather, muted arcane glyphs, restrained luminous inlay. | Wand with an orb, tome, or focus. | Veiled cowl, half-mask, or scholar helm. |
| Knife Dancer | rose magenta `#E968AF` | Lean leather, coil/briar motifs, elegant concealed hardware. | Main dagger with a distinct parrying dagger or throwing-knife offhand. | Sleek half-mask or hood. |
| Dawnkeeper | solar gold `#F1DE75` | Cream/white cloth, gold trim, sun and protection emblems. | Mace with a sunward, tome, or lantern offhand. | Radiant open visor or circlet helm. |
| Stonecaller | teal `#54C8BE` | Earth, stone, bronze, storm glyphs, carved facets. | Staff with a carved totem or geomantic focus. | Stone-brow or hooded geode helm. |

## Required sheet layout and clean-boundary rules

Create one transparent two-row sheet of ten isolated equipment icons in this exact order:

1. helmet
2. chest
3. gloves
4. legs
5. boots
6. weapon
7. offhand/shield
8. cape
9. amulet
10. ring

Match the existing target sheet dimensions, two-row cell rhythm, front/three-quarter inventory angle, and scale of the matching approved sheet. Never add a character body, mannequin, hands, duplicate gear, or decorative filler.

- Keep a minimum 10–12% transparent safe margin inside every cell; reserve extra lengthwise room for swords, bows, staffs, capes, and chains.
- Every opaque and semi-transparent pixel must remain inside its own cell. Nothing may cross a cell boundary, touch the sheet edge, or overlap a neighboring icon.
- Render with overscan, then crop each icon against its own safe bounds. Do not rely on a final global crop.
- Keep thin objects, amulets, rings, horns, weapon tips, cape corners, and shield edges fully intact; do not clip them to make scale fit.
- Use real alpha, with no black/white matte fringe. Check the result on both dark and light backgrounds.

## Mobile asset-size budget and optimization

Artwork must be clean at inventory scale without inflating the mobile bundle. Generate at the target sheet dimensions used by the app; do not retain an oversized source canvas in `apps/mobile/assets` merely to preserve detail that will never be displayed.

- Export the shipping sheet as lossily optimized **RGBA WebP**. Preserve alpha; do not convert transparent sheets to JPEG or flatten them onto a background.
- Target **250 KB or less per 10-icon sheet**. A sheet above **350 KB** needs a visible-quality justification; a sheet above **500 KB** must be reworked or explicitly approved before wiring it in.
- Prefer reducing imperceptible texture noise, tiny particles, and unused transparent canvas before lowering the quality of the item silhouette, class accent, or readable material edges.
- Remove opaque pixels and semi-transparent haze outside the item bounds. Transparent padding is required, but hidden matte pixels, oversized empty canvas, and full-sheet glow are not.
- Keep only the optimized shipping WebP in the mobile asset folder. Store high-resolution source artwork outside the application bundle.
- Do not create @2x/@3x duplicates for these fixed sheets unless the asset loader is deliberately changed to select them; duplicate static files directly increase the app size.
- Check the final encoded file size, dimensions, alpha, and small-size readability after optimization. Never judge size from the uncompressed working image alone.

## Prompt template

Replace every bracketed value for every named set:

> Transparent two-row equipment icon sheet for Veldryn, matching the supplied approved **[REFERENCE TIER] [CLASS]** equipment sheets exactly in painterly mobile-RPG style, silhouette weight, soft upper-left studio lighting, cell rhythm, and inventory readability. Create the Tier **[1 OR 2 OR 3 OR 4]** **[SET NAME]** set: helmet, chest, gloves, legs, boots, weapon, offhand, cape, amulet, ring, in that exact left-to-right order across two rows. Class contract: **[CLASS ACCENT COLOR]** as a restrained accent; **[CLASS CONSTRUCTION/MOTIF]**; unique set motif **[SET-SPECIFIC EMBLEM OR MATERIAL STORY]**. Required weapon identity: **[UNIQUE NAMED WEAPON SHAPE]**. Required offhand/sidearm identity: **[UNIQUE NAMED OFFHAND SHAPE]**. Required helmet identity: **[UNIQUE HELMET PROFILE]**. Material direction: **[TIER MATERIAL AND SINGLE REGIONAL MOTIF]**. Make all ten pieces clean isolated high-detail painted fantasy icons with broad readable forms, restrained age and wear, subtle hand-painted texture, and no silhouette reuse from another set. Keep 10–12% transparent safe padding inside every cell; no item, glow, shadow, chain, cape, or weapon tip crosses a cell boundary. Fully transparent background, real alpha, no text, UI, labels, scene, card, pedestal, cast shadow, character body, photorealism, hard outlines, glossy 3D render, excessive filigree, duplicated items, or clipping.

For T1, use unmistakably basic starter materials, simple construction, and only a minimal class-color trim—no repeated rune/emblem program or polished ceremonial finish. For T2, enhance fit and craft and introduce the first modest set motif without changing the class language. For T3, use refined practical material and one heraldic motif. For T4, increase material rarity and trim while staying in the same painted T1/T2 illustration family.

## Negative prompt / rejection criteria

Reject and regenerate when the result contains any of the following:

- photorealistic/PBR/3D-rendered surfaces, sharp specular glare, hard black keylines, or a different lighting pipeline;
- excessive micro-detail that turns to noise at 40 px;
- a palette, camera angle, proportions, or contrast curve that departs from the approved class references;
- the wrong class weapon, offhand, or helmet family, or a generic weapon/offhand/helmet reused from another named set;
- T1 gear that looks ceremonial, elite, heavily runed, polished, jewel-encrusted, or visually comparable to T2;
- class color used as a full recolor rather than a controlled accent;
- background pixels, floor shadows, UI tiles, text, extra gear, missing slots, duplicate items, or a character/mannequin;
- a weapon tip, chain, cape, ring, glow, or shadow crossing a cell boundary or being cropped;
- magical particles or VFX that obscure item silhouettes;
- T2–T4 looking like a different game's assets instead of a crafted material evolution of its parent.

## Acceptance check

Before wiring a new sheet:

1. Compare it beside the approved matching-class reference at native size and at 32 px, 40 px, and 48 px per item.
2. Confirm all ten slots are present, in order, separated into their own cells, and instantly identifiable.
3. Confirm the class color, construction language, weapon, offhand, and helmet match the class contract.
4. Confirm the named set's weapon, offhand, helmet, emblem, and material story differ from every alternate set for that class.
5. Confirm the deepest shadows, outline weight, cloth treatment, and light direction match the approved reference family.
6. Inspect alpha bounds on dark and light backgrounds: no matte fringe, crossed boundaries, cropped tips, cut cape corners, or cell contamination.
7. Confirm tier value comes from material and one clear motif, not extra visual noise.
8. Confirm the shipped RGBA WebP meets the 250 KB target (or documents why it cannot), retains real alpha, and contains no redundant density variants.
9. Run the equipment artwork wiring tests before connecting the asset.
