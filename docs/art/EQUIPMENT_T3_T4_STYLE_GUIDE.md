# Veldryn — Tier 1–6 equipment generation guide

> The filename is retained for compatibility. This is the authoritative guide for Tier 1–6 equipment generation and regeneration.

## Goal

Generate or regenerate any Tier 1–6 equipment sheet as one coherent Veldryn family. A higher tier must read as the same class and named set made from rarer materials, never as artwork from a different renderer or game. T5 and T6 must visibly exceed the approved prior tier and must make their actual in-game Sunscar resource artwork recognizable at inventory size.

For an existing set, use its approved matching-class sheets and its catalog metadata as mandatory references. When regenerating Tier 1, preserve the intent of approved Tier 1 sheets for that class. For Tier 2, use that class's Tier 1 language as the baseline. For Tier 3–6, use the matching class's approved T1/T2 sheets as the visual authority; do not copy the current higher-tier rendering style when it is being replaced. For T5/T6, also consult the set's `Notes`, the corresponding recipes, and the exact resource icons shipped by the app before choosing the visible resource cues. Supply those resource icons to the image generator as material references; do not rely on the resource name alone.

Example Ironwarden references:

- `apps/mobile/assets/equipment-t1-ironwarden/T1_001-oathbound-rampart-icon-sheet-legfix.webp`
- `apps/mobile/assets/equipment-t2-ironwarden/T2_001-ironbark-bulwark-icon-sheet-legfix.webp`
- `apps/mobile/src/content/equipment_catalog_t1_t9_v33.json`
- `backend/data/equipment_exact_recipes_v33.json`
- `backend/src/server/equipment/equipment-resource-map-v25.ts`
- `apps/mobile/src/theme/resource-assets.ts`
- `apps/mobile/src/theme/regional-resource-assets.ts`
- `apps/mobile/assets/regional-resources-v2.png`
- dedicated runtime icons under `apps/mobile/assets/ingredient-icons-v1/`

## Non-negotiable visual rules

- **Medium:** premium painted fantasy inventory art, softly hand-painted and readable at 32–64 px.
- **Silhouette first:** broad, clear forms and quiet negative space; every slot must be recognizable at a glance.
- **Lighting:** one soft upper-left warm studio light, subdued cool occlusion, and gentle painted rim highlights. No photographic glare, hard black outline, HDR bloom, or dramatic scene lighting.
- **Materials:** practical metal, leather, cloth, and wood with visible brushwork. Avoid photoreal scratches, crisp micro-engraving, noisy filigree, plastic shine, and PBR realism.
- **Class continuity:** preserve the class palette, construction language, and silhouette family. Tiering comes from material quality and one or two deliberate motifs, never a different art style.
- **Accent, not flood fill:** a class color is a controlled accent in cloth, enamel, gem, binding, trim, or heraldry; it must not recolor the whole set.
- **Set uniqueness:** every named set has its own emblem, material story, weapon profile, sidearm/offhand profile, and helmet silhouette. Do not recycle a weapon, offhand, or helmet shape between alternate sets, including two sets of the same class and tier.
- **Resource-icon fidelity:** when a T5/T6 set names or consumes a resource, match at least two of that resource icon's dominant traits—its hue/value, silhouette or facet/scale/petal shape, and surface pattern. Translate the resource into believable construction; never paste the raw ingredient onto the equipment or replace it with a generic same-color glow.
- **Transparency:** use a fully transparent background only—no card, scenery, pedestal, floor shadow, title, labels, watermark, border, or exterior glow.

## Tier treatment

| Tier | Material and motif | Detail ceiling |
| --- | --- | --- |
| T1 | Basic issue gear: plain iron, hide, simple cloth, weathered wood, utilitarian fastenings, and at most a tiny painted class-color trim. No repeated heraldry, glowing rune, decorative inlay, or premium metalwork. | The cleanest, most functional version of the class language; it must visibly read as a beginner's first usable set. |
| T2 | Better-fitted practical gear: improved steel/leather, clearer stitching or edging, one developed class/set motif, and the first modest use of heraldry or enamel. | Roughly 10% richer than T1; still deliberately simple. |
| T3 | Refined steel/iron, modest heraldic inlay, and one brighter class-color or pale-metal accent. | Roughly 15–20% richer than T2; retain the chunky painted read. |
| T4 | Region-inflected material such as ancient timber, oathsilver, oathglass, or lanternsteel plus one legible regional motif. | Roughly 25–30% richer than T2; never add noisy ornament, realism, or VFX. |
| T5 | Early Sunscar masterwork: visibly processed Sunstone, pale Dunewood, Sunscale, woven Saffron Reed, or a set-specific Glasswind/Mirage cue selected from the set's source and recipe. | Must be clearly stronger and more regionally distinctive than approved T4 at 40 px. Use one dominant icon-faithful material as a broad structural feature, not tiny trim; retain the T1/T2 painted scale. |
| T6 | Later Sunscar masterwork: substantial cut Amberglass, pearl Glassfin lining, Mirage Bloom, Royal Chitin, or bound Astral Script according to the set's source and recipe. | Must be clearly stronger or more unique than T5 and unmistakably above T4. Use a dominant processed material plus one controlled secondary signature, with broader contrast and more resolved construction but no all-over gem plating or VFX. |

T4 feels valuable through material selection, a stronger central emblem, and slightly richer trim—not through a new camera, contrast curve, texture renderer, or a pile of tiny details.

### T5/T6 strength gate

- **T5 versus T4:** a side-by-side 40 px comparison must show an immediate material and construction upgrade. Carry the primary Sunscar resource across at least three large/readable slots—normally helmet or chest plus weapon, offhand, or cape—and echo it on two smaller slots. Use broad plates, faceted inserts, woven panels, scale fields, reinforced limbs, or structural rims; a new buckle color or a few thin highlights do not qualify.
- **T6 versus T5:** keep the class family, then add one more resolved construction layer and a controlled secondary resource signature. The primary resource remains dominant; the secondary appears on at least two readable slots. T6 must not be a recolored T5 or a T5 sheet with extra sparkles.
- **Progression is never scale:** T5 and T6 icons must use the same normalized cell occupancy as T1–T4. A larger helmet, shield, weapon, cape, ornament, glow, or shadow is not a valid tier upgrade. T5/T6 strength comes only from construction, material placement, silhouette refinement, and readable motifs inside the shared safe box.
- **Named-set uniqueness:** Foundation and Alternate remain sidegrades, but each must exceed its approved T4 parent. Their difference comes from their actual source material, processed form, emblem, weapon/offhand treatment, and helmet profile—not from one being visually weaker.
- **Reject near-duplicates:** if T5 can be mistaken for T4, or T6 for T5, when the sheets are viewed at 40 px per item, regenerate with broader material placement and a clearer construction change before adding detail.

## T5/T6 resource identity

Use the **actual set name, region source, recipe, and shipping resource icon** to select a primary visible resource for each sheet. A recipe ingredient does not have to appear literally on every piece, but the sheet must clearly show where its main gathered or processed material went. Preserve the class silhouette and accent; the resource is construction, not a new class color or a generic colored glow.

The shipping icon is the color-and-shape authority. `resourceIconSource()` prefers dedicated files over atlas cells, so use the dedicated Sunstone, Amberglass, Astral Script, Royal Chitin, Sunscale, and Scorpion Venom files when present. Use `regional-resources-v2.png` for Saffron Reed, Mirage Bloom, Dunewood, Oasis Carp, Glassfin, and Tyrant Seal. Do not sample the older Sunstone or Amberglass atlas cells when a dedicated runtime override exists.

Dedicated material references:

- Sunstone Ore: `apps/mobile/assets/ingredient-icons-v1/sunstone_ore-v2_runtime.webp`
- Sunstone Ingot: `apps/mobile/assets/ingredient-icons-v1/sunstone_ingot.webp`
- Amberglass: `apps/mobile/assets/ingredient-icons-v1/amberglass-v2.webp`
- Astral Script: `apps/mobile/assets/ingredient-icons-v1/astral_script.webp`
- Royal Chitin: `apps/mobile/assets/ingredient-icons-v1/royal_chitin.webp`
- Sunscale: `apps/mobile/assets/ingredient-icons-v1/sunscale.webp`
- Scorpion Venom: `apps/mobile/assets/ingredient-icons-v1/scorpion_venom.webp`

Atlas-backed material references in `apps/mobile/assets/regional-resources-v2.png` use 256 px cells: Saffron Reed `(2,0)`, Mirage Bloom `(3,0)`, Dunewood `(4,0)`, Oasis Carp `(1,1)`, Glassfin `(2,1)`, and Tyrant Seal `(4,1)`.

For every T5/T6 generation, prepare and label this reference packet:

1. approved matching-class T1/T2 sheet for rendering style and class construction;
2. approved matching-class T4 sheet as the minimum strength/value baseline;
3. primary shipping resource icon as the exact color, shape, and surface authority;
4. secondary shipping resource icon when the set uses one;
5. approved matching-set T5 sheet as the direct lower bound when generating T6.

For an atlas-backed resource, crop only its 256 px cell into a temporary reference image before generation; do not give the generator the entire multi-resource atlas and expect it to infer the correct material. Label each input by role. Resource icons control material appearance only—the equipment sheets control style, lighting, proportions, layout, and class identity.

| Tier | Resource or processed form | Actual in-game icon signature | Translation into equipment |
| --- | --- | --- | --- |
| T5 | Dunewood / Dunewood Plank | Pale sun-bleached beige logs, warm tan growth rings, rough light bark, and thick brown rope binding. | Use pale layered planks, bundled rods, carved braces, bow/staff cores, shield ribs, or rigid armor inserts with visible tan end grain and rope/leather lashings. Do not render it as dark forest wood or generic honey-brown timber. |
| T5 | Sunstone Ore / Sunstone Alloy / Sunstone Ingot | Raw ore is dark ochre-brown rock split by intense orange-gold crystal seams. The ingot is saturated molten amber-orange with bright yellow-white edges and flowing internal swirls. | Use forged amber-orange alloy on weapon heads, substantial rims, shoulder/knee plates, rivets, and structural bands. Preserve darker ochre metal around a few broad bright seams or swirls. It must look hot and mineral-rich without emitting bloom or recoloring the whole set yellow. |
| T5/T6 tailoring | Sunscale | A layered orange-gold blossom made of many small overlapping scale-shaped petals, with bright yellow centers and muted olive-brown leaves. | Translate it into broad overlapping orange-gold scale leather, petal-scale collars, bracers, hems, and cape panels with a few yellow highlights and subdued olive backing. Do not turn it into a literal flower decoration on every slot. |
| T5 | Saffron Reed / Saffron Weave / Saffron Scale Lining | A tied fan-shaped bundle of saturated golden-orange grain heads and ribbed stalks backed by narrow olive-green leaves. | Use coarse golden ribbed weave, braided hems, layered straw-scale lining, wrapped grips, and fan-like stitched panels. Retain a little olive backing and visible bundle rhythm; do not substitute flat yellow cloth. |
| T5 | Glasswind Frame / Scorchwind Temper | These processed names have no standalone icon. Their canonical inputs are Sunstone plus pale Dunewood for the frame and yellow-green Scorpion Venom for the temper. | Build the frame from pale Dunewood members locked by amber-orange Sunstone alloy. If the temper must be visible, use only a restrained chartreuse-yellow treated edge or varnish on a few joins; never invent clear blue glass, floating shards, heat haze, or a full acid-green recolor. |
| T6 | Amberglass / Cut Amberglass / Astral Amber Matrix | A cluster of transparent honey-gold prismatic crystals with sharp triangular facets, orange edges, a bright yellow core, and small internal points of light. | Use a few large framed honey-gold facets on chest, helmet, weapon/offhand, focus, amulet, or ring. Keep the triangular crystal geometry and internal depth recognizable. Do not use opaque gold plate, red fire crystal, tiny jewel confetti, or an all-glass silhouette. |
| T6 | Glassfin / Glassfin Scale Leather / Glassfin Ascendant Lining | A pearl-white fish with pale ice-blue and lilac iridescent scales plus translucent white-blue fins. | Use overlapping pearl-white scale fields with soft lilac/ice-blue shifts and thin translucent fin-shaped ridges on collars, bracers, shield backs, cape borders, boot cuffs, or focus housings. Avoid saturated cyan armor and generic blue glow. |
| T6 | Mirage Bloom / Mirage Extract / Mirage Stabilizer | A large violet-lilac lotus with layered pointed petals, a pale lavender center, warm orange stamens, and a dark green leaf base. | Use layered violet petal plates or fabric joins, one pale center plane, tiny warm-saffron fastening points, and dark green backing. Keep a readable lotus/petal rhythm; do not replace it with blue shimmer, rainbow iridescence, or particles. |
| T6 | Royal Chitin / Royal Chitin Plate / Ascendant Chitin Frame | A compact tapered shell made from overlapping amber-bronze plates, deep brown recesses, bright gold edges, and raised pointed ridges. | Use fastened overlapping bronze-brown shell plates with gold edge catches, tapered points, and raised segmented ridges on large protective areas. Keep class-specific armor architecture visible; do not use pale ivory insect armor or cover every cloth/leather slot in shell. |
| T6 | Astral Script / Bound Astral Script | Rolled midnight-navy cloth or parchment covered in crisp white-silver constellations, crescents, orbit circles, and stars, tied with tan cord and small gold/blue star charms. | Use physical navy script bands, lining, or panels with one or two broad white-silver constellation diagrams and restrained gold star fittings. The marks may be stitched, painted, etched, or inlaid but must not become floating text, generic glowing runes, or all-over micro-writing. |

Supporting source motifs must also follow their icons when the catalog explicitly names them: Oasis Carp contributes teal-green scales with a warm yellow belly; Scorpion Venom contributes yellow-chartreuse treated seams plus dark bronze scorpion hardware; Tyrant Seal contributes a round sun-gold medallion with a raised scorpion and pointed sun rim. These are secondary cues only unless the set name or recipe makes one primary.

The catalog's **Foundation** and **Alternate** sets are sidegrades, not a simple visual rarity ladder. On T5 Foundation sheets, emphasize caravan materials such as Dunewood, Sunstone, and reed work. On T5 Alternate sheets, let the named Mirage, Oasis, Glasswind, or shard source shape a different material treatment; preserve the recipe's common Sunscar construction. On T6 Foundation sheets, emphasize Amberglass Crossing craft and Glassfin details. On T6 Alternate sheets, choose the catalog's Bloom, royal hunt, chitin, or astral source as the distinguishing motif. Do not apply all T5 or T6 resources to every set.

Before generating a sheet, write a one-line material plan: **`[SET ID] [SET NAME]: primary [CANONICAL RESOURCE / PROCESSED FORM], icon signature [TWO OR THREE COLORS/SHAPES], translated as [CONSTRUCTION], visible on [THREE LARGE/READABLE SLOTS]; secondary [RESOURCE + ICON SIGNATURE] on [TWO SUPPORTING SLOTS]; source motif [CATALOG SOURCE]; prior-tier delta [WHY THIS IS CLEARLY STRONGER OR MORE UNIQUE THAN APPROVED T4/T5]`**. Verify the named resources against the T5/T6 recipe, resource map, and runtime icon source. This prevents a set named for Dunewood, Amberglass, Glassfin, Mirage Bloom, or Royal Chitin from looking like generic steel with unrelated colored trim.

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

Create one transparent atlas with **exactly five equal square cells across and two equal square cells down**. It contains ten isolated equipment icons in this exact order:

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

Match the existing target sheet dimensions, front/three-quarter inventory angle, and scale of the matching approved sheet. Never add a character body, mannequin, hands, duplicate gear, or decorative filler.

- Every icon must fit completely inside the **central 74%** of its own cell: at least **13% fully transparent padding on the left, right, top, and bottom** after normalization. This same occupancy applies to every tier, including T5 and T6.
- The 74% limit includes every visible pixel: weapon tips, shield rims, horns, feathers, handles, straps, chains, ribbons, book pages, lantern handles, cape corners, particles, shadows, and semi-transparent antialiasing. Paired gloves, boots, and legs must fit together inside one safe box.
- Long or asymmetric pieces do not receive a larger allowance. Rotate or redesign swords, bows, staffs, capes, chains, and shields so the complete object fits inside the shared safe box while remaining readable.
- Every opaque and semi-transparent pixel must remain inside its own cell. Nothing may cross a cell boundary, touch the sheet edge, or overlap a neighboring icon.
- Render with overscan, then crop each icon against its own safe bounds. Do not rely on a final global crop.
- Keep thin objects, amulets, rings, horns, weapon tips, cape corners, and shield edges fully intact; do not clip them to make scale fit.
- Use real alpha, with no black/white matte fringe. Check the result on both dark and light backgrounds.

### Mandatory T5/T6 geometry gate

Prompted padding is not accepted as proof of correct geometry. Before a T5 or T6 sheet can be reviewed or wired into the app:

1. Split the generated image into five proportional columns and two proportional rows so every source cell is isolated before any resizing.
2. Reject the generation if the main icon component touches a source-cell edge. Normalization can shrink complete artwork, but it cannot restore a tip, horn, cape, shield, or handle that was already generated off-canvas.
3. Remove disconnected background fragments, matte pixels, particles, and contamination from neighboring cells.
4. Fit the complete surviving icon into the central 74% safe box and center it in an exact square output cell.
5. Recompose an exact 5×2 atlas with real alpha and validate at least 13% transparent padding on all four sides of every cell.
6. Compare T4, T5, and T6 at the same rendered box size. Reject any progression that depends on T5/T6 occupying more pixels than the lower tier.

Use `tools/normalize-equipment-atlas.ps1` for the deterministic isolation, cleanup, centering, and safe-area pass. T5/T6 batches must run it with `-FailOnSourceEdge`; this deletes rejected normalized outputs and returns a failing exit so they cannot be mistaken for review candidates. Keep the unnormalized source outside the shipping asset directory; only the validated result may proceed to mobile WebP optimization.

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

> Transparent equipment atlas for Veldryn with exactly five equal square cells across and two equal square cells down, matching the supplied approved **[REFERENCE TIER] [CLASS]** equipment sheets exactly in painterly mobile-RPG style, silhouette weight, soft upper-left studio lighting, cell rhythm, and inventory readability. Create the Tier **[1–6]** **[SET ID] [SET NAME]** set: helmet, chest, gloves, legs, boots, weapon, offhand, cape, amulet, ring, in that exact left-to-right order across two rows. Class contract: **[CLASS ACCENT COLOR]** as a restrained accent; **[CLASS CONSTRUCTION/MOTIF]**; unique set motif **[SET-SPECIFIC EMBLEM OR MATERIAL STORY]**. Required weapon identity: **[UNIQUE NAMED WEAPON SHAPE]**. Required offhand/sidearm identity: **[UNIQUE NAMED OFFHAND SHAPE]**. Required helmet identity: **[UNIQUE HELMET PROFILE]**. Material direction: **[TIER MATERIAL AND SINGLE REGIONAL MOTIF]**. For T5/T6, use the supplied shipping icon for **[PRIMARY RECIPE RESOURCE / PROCESSED FORM]** as the material authority: preserve its **[DOMINANT COLORS]**, **[FACET/SCALE/PETAL/GRAIN SHAPE]**, and **[SURFACE PATTERN]**, translated into **[BELIEVABLE EQUIPMENT CONSTRUCTION]** across **[THREE LARGE/READABLE SLOTS]**. Use **[SECONDARY RESOURCE + ICON SIGNATURE]** on **[TWO SUPPORTING SLOTS]**; match **[CATALOG REGION SOURCE]**. Make the result visibly stronger or more unique than **[APPROVED PRIOR-TIER SHEET]** at 40 px through **[BROAD MATERIAL/CONSTRUCTION DELTA]**, never by making the T5/T6 icon larger. Make all ten pieces clean isolated high-detail painted fantasy icons with broad readable forms, restrained age and wear, subtle hand-painted texture, and no silhouette reuse from another set. Every complete icon—including all tips, handles, chains, ribbons, cape corners, shadows, glow, and antialiasing—must fit inside the central 74% of its own cell, leaving at least 13% fully transparent padding on the left, right, top, and bottom. Paired wearables fit together inside one safe box. Nothing crosses or touches a cell boundary. Fully transparent background, real alpha, no text, UI, labels, scene, card, pedestal, cast shadow, character body, photorealism, hard outlines, glossy 3D render, excessive filigree, duplicated items, detached fragments, or clipping.

For T1, use unmistakably basic starter materials, simple construction, and only a minimal class-color trim—no repeated rune/emblem program or polished ceremonial finish. For T2, enhance fit and craft and introduce the first modest set motif without changing the class language. For T3, use refined practical material and one heraldic motif. For T4, increase material rarity and trim while staying in the same painted T1/T2 illustration family. For T5/T6, include the actual shipping resource icons as labeled material-reference images, increase their visible identity and processed construction, and state the specific prior-tier delta while retaining that same painted family and cell-safe scale.

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
- any T5/T6 icon whose complete alpha bounds exceed the central 74% safe box, whose padding is below 13% on any side, or whose perceived upgrade comes from greater cell occupancy;
- any main component touching its source-cell edge before normalization, even if the normalized preview appears to have padding;
- magical particles or VFX that obscure item silhouettes;
- T2–T6 looking like a different game's assets instead of a crafted material evolution of its parent;
- T5/T6 that are near-duplicates of the approved prior tier at 40 px, or whose stronger read comes only from brightness, glow, particles, or extra micro-detail;
- T5/T6 where the chosen primary resource cannot be identified on the larger pieces at 40 px, where fewer than two dominant icon traits survive, or where an unlisted material/glow replaces the set's catalog source;
- Sunstone rendered as dull bronze, Dunewood as dark forest timber, Saffron Reed as flat yellow cloth, Glassfin as saturated cyan, Mirage Bloom as generic blue/rainbow magic, Royal Chitin as ivory plate, or Astral Script as floating emissive runes.

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
10. For T5/T6, compare the one-line material plan with the catalog, recipe, runtime mapping, and shipping resource icon. At 40 px, identify the primary resource by at least two of its icon traits on three large/readable slots and the secondary cue on two supporting slots.
11. Compare T5 directly with the approved matching-class T4 and T6 directly with both T5 and T4 at 40 px. Confirm the new tier is immediately stronger or more unique through broad material placement and construction, while the class silhouette remains intact.
12. Run the mandatory cell-isolation and 74% normalization pass. Confirm every cell has at least 13% transparent padding on all four sides and that no main source component touched an edge before normalization.
13. Compare T4/T5/T6 in the actual phone crafting boxes at one shared UI scale. Confirm T5/T6 progression survives without a larger rendered footprint and that long weapons, offhands, helmets, capes, and paired wearables remain fully visible.
