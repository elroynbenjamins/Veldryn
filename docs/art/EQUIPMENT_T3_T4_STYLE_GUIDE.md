# Veldryn — Tier 3–4 equipment generation guide

## Goal

Regenerate Tier 3 and Tier 4 equipment in the established Tier 1–2 visual language. The result must read as the **same class set, made from rarer materials**, not as a different rendering pipeline or a more realistic game.

Use the matching class's Tier 1 and Tier 2 sheets as the mandatory visual references. For example, Ironwarden references are:

- `apps/mobile/assets/equipment-t1-ironwarden/T1_001-oathbound-rampart-icon-sheet-legfix.webp`
- `apps/mobile/assets/equipment-t2-ironwarden/T2_001-ironbark-bulwark-icon-sheet-legfix.webp`

Do not use existing Tier 3–4 sheets as style references; they are the assets being normalized.

## Non-negotiable visual rules

- **Medium:** premium painted fantasy inventory art. Softly hand-painted, readable at 32–64 px, with restrained surface detail.
- **Silhouette first:** broad, clear shapes and uncluttered negative space. A player must identify each equipment slot immediately at small size.
- **Lighting:** one soft upper-left warm studio light; subdued cool occlusion; gentle painted rim highlights. No sharp photographic glare, hard black outline, HDR bloom, or dramatic environment light.
- **Materials:** aged practical metal, leather, cloth and wood with visible brushwork. Avoid photoreal scratches, overly crisp micro-engraving, noisy filigree, and physically-rendered plastic/metal shine.
- **Class language:** retain the class's established base palette and construction. Tiering is shown by richer material and one or two deliberate motifs—not by changing the silhouette language.
- **Blue cloth continuity:** preserve the muted deep-blue cloth accent where it exists in the T1/T2 reference. It ties sets together across the progression.
- **Transparency:** completely transparent background; no card, pedestal, scenery, cast floor shadow, title, numbers, labels, watermark, border, or glow outside the object alpha.
- **Spacing:** each item has roughly 8–10% safe transparent padding. No clipping at a cell edge.

## Tier treatment

| Tier | Material and motif | Detail ceiling |
| --- | --- | --- |
| T3 | Refined steel/iron, modest heraldic inlay, a single brighter blue or pale-metal accent. | About 15–20% more detail than T2; preserve the same chunky, painted read. |
| T4 | Region-inflected material such as rootbound bronze, frostiron, oathglass, or lanternsteel; one legible regional motif. | About 25–30% more detail than T2; no extra layers of tiny ornament, realism, or VFX. |

Tier 4 should feel more valuable through better material selection, a stronger central emblem, and slightly richer trim—not through a different camera, contrast curve, or texture renderer.

## Required sheet layout

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

Keep the same front/three-quarter inventory angle, scale, and cell rhythm as the matching Tier 1–2 sheet. Never add a character body, mannequin, hands holding the weapon, duplicated items, or decorative filler.

## Prompt template

Replace bracketed values for every set:

> Transparent two-row equipment icon sheet for Veldryn, matching the supplied Tier 1 and Tier 2 **[CLASS]** equipment sheets exactly in painterly mobile-RPG style, silhouette weight, soft upper-left studio lighting, muted blue cloth accents, safe padding, and inventory readability. Create the Tier **[3 OR 4]** **[SET NAME]** set: [HELMET], [CHEST], [GLOVES], [LEGS], [BOOTS], [WEAPON], [OFFHAND], [CAPE], [AMULET], [RING], in that exact left-to-right order across two rows. Class identity: **[CLASS IDENTITY]**. Material direction: **[TIER MATERIAL AND SINGLE REGIONAL MOTIF]**. Each piece is a clean isolated high-detail painted fantasy icon with broad readable forms, restrained age and wear, subtle hand-painted texture, and one coherent heraldic motif. Tier 3 is refined but practical; Tier 4 is richer in material and trim but still belongs to the same T1/T2 illustration family. Fully transparent background, no text, no UI, no labels, no scene, no card, no pedestal, no cast shadow, no character body, no photorealism, no hard outlines, no glossy 3D render, no excessive filigree, no clipping.

## Negative prompt / rejection criteria

Reject and regenerate if the output contains any of the following:

- photorealistic PBR/3D-rendered surfaces, sharp specular glare, or black keylines;
- excessive micro-detail that turns to noise at 40 px;
- a radically different palette, camera angle, proportions, or contrast from the class's T1/T2 sheet;
- background pixels, floor shadows, UI tiles, text, extra gear, missing slots, or cropped edges;
- magical particle effects that obscure the item silhouette;
- Tier 3/4 appearing like a different game's asset rather than a material upgrade of its Tier 1/2 parent.

## Acceptance check

Before wiring a new sheet:

1. Compare it beside the matching T1 and T2 sheet at native size and at 40 px per item.
2. Confirm all ten slots are present, ordered correctly, and visually separated.
3. Confirm the deepest shadows, outline weight, blue-cloth treatment, and light direction match T1/T2.
4. Confirm T3/T4 value is communicated by material and a single motif, not extra visual noise.
5. Export an optimized RGBA WebP, preserving real transparency, then validate it through the equipment artwork wiring tests.
