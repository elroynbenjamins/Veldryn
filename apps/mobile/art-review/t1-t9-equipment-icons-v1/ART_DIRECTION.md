# Equipment atlas direction

Every equipment set is a compact 5 × 2 atlas in this fixed order: helmet,
chest, gloves, legs, boots, weapon, off-hand, cape, amulet, ring. The art must
remain readable at the 48–64 dp inventory size; fine engraving, tiny text and
large empty canvases do not add value.

## Atlas contract

Every tier uses the same `960 × 384` atlas: five `192 × 192` cells across
and two rows. This fills the same in-game box at every tier while providing
three times the native detail needed by a 64 dp equipment tile. Tier
progression belongs in the item design, never in the image dimensions.

Use WebP for runtime atlases. Preserve transparent pixels when the source has
them. Each object must retain at least 12% empty padding on every cell edge;
no pixel may cross into a neighboring cell. Every atlas is checked cell by
cell before it is bound into the app, so clipping and bleed cannot reach the
inventory renderer.

## Canonical class accents

The accent must match the corresponding class emblem icon, not a tier palette:

| Class | Accent |
| --- | --- |
| Ironwarden | `#70BDFA` blue |
| Bastion | `#C98342` copper |
| Dreadguard | `#A4536C` muted crimson |
| Dawnkeeper | `#F1DE75` sun-gold |
| Wayfinder | `#9EC57F` leaf green |
| Ravager | `#EB6A43` ember orange |
| Hexweaver | `#C4A0FA` violet |
| Knife Dancer | `#E968AF` rose |
| Stonecaller | `#54C8BE` teal |

The accent is a cloth panel, cord, gem, enamel mark, feather, or small rune.
It is not a full glow, a metallic recolor, or a background effect.

## Shared rendering language

Use the approved dark-fantasy painted icon language: clear dark contours,
simple material groups, readable chunky silhouettes, and restrained highlights.
Each item must be understandable in a 48 dp inventory tile. Do not use
characters, mannequins, text, frames, grid lines, ambient scenery, ground
shadows, or full-cell magical bursts. Every icon remains isolated on a
transparent background and wholly inside its cell.

## Tier progression

Visual power rises through construction, not by making every sheet brighter or
larger. The class color stays recognizable at all tiers.

| Tier | Name | Material and upgrade cue |
| --- | --- | --- |
| T1 | Fieldborn | Worn cloth, leather, wood, dull iron; beginner construction. |
| T2 | Ironwood | Better fittings, reinforced seams, ironwood or regional hide. |
| T3 | Oathforged | Small oathsteel reinforcements, cleaner tailoring, one restrained motif. |
| T4 | Fallen | Weathered relic fragments and damaged ceremonial detail. |
| T5 | Glasswind | Sunscar stone, glass, dry leather, wind-carved shapes. |
| T6 | Sunscar Ascendant | Refined sunmetal or amberglass components; contained warm highlights. |
| T7 | Frostbound | Frostiron, fur, winter cloth, cool material contrast. |
| T8 | Choirforged | Rimeglass and resonant detail; a few precise luminous facets only. |
| T9 | Wyrmspine | Wyrm-scale, blackglass, and capstone craftsmanship; strong silhouette without legendary visual noise. |

## Two build identities per class

Each class must keep its two remaining paths visibly distinct at every tier.
Keep those anchors while materials progress from T1 to T9.

| Class | Foundation anchor | Alternate anchor |
| --- | --- | --- |
| Ironwarden | closed helm, straight sword, broad round shield | open brow helm, mace, tall kite shield |
| Bastion | square greathelm, tower shield, blunt hammer | ridged helm, hooked hammer, compact barricade shield |
| Dreadguard | chain cowl, flanged mace, chain-rim shield | skull visor, hooked blade, rectangular grave shield |
| Dawnkeeper | hooded circlet, healing staff, sun-lantern relic | narrow helm, mace, warding book or reliquary |
| Wayfinder | falcon-brow hood, longbow, feather quiver | split hood, recurve bow, compact tracker quiver |
| Ravager | jaw helm, heavy cleaver or axe, tooth charm | horned brow, wedge breaker maul, plate-breaking charm |
| Hexweaver | pointed hood, crooked wand, rune tome | veil mask, ritual dagger, floating focus or crystal |
| Knife Dancer | half mask, paired curved daggers, light sash | high collar hood, stiletto pair, coiled belt or throwing sheath |
| Stonecaller | stone circlet, carved staff, rooted totem | lantern hood, tuning rod, resonant bell or shard focus |

Foundation and Alternate must differ in weapon type and head silhouette first.
Cape shape, off-hand, and trim repeat that distinction; color alone is never
enough to identify a set.

Knife Dancer weapons occupy separate cells: cell 6 is one main-hand dagger and
cell 7 is one off-hand dagger. Never place both daggers in one icon or replace
the off-hand dagger with a sheath, scarf, or other accessory.

### Slot boundaries

Leg icons are greaves, trousers, or leggings only: they stop cleanly above the
ankle and never include feet, soles, or boot toes. Boots are the only slot that
shows feet and footwear. This keeps each equipped item visually distinct in its
inventory cell.
For Ironwarden and Bastion, prefer armored trousers with restrained knee
reinforcement over full shin plates, so the legs slot remains distinct from
the boots and does not overpower lighter-class leg silhouettes.

Glove icons are closed gloves or gauntlets: no bare fingers or exposed skin.
This keeps the hand slot clean at mobile size and avoids a mixed glove style
between classes and tiers.
Render the pair with fingertips pointing downward, matching the existing
equipment-atlas orientation.

## Required atlas QA

Every generated sheet must be normalized with
`tools/normalize-equipment-atlas.mjs` and then pass
`tools/validate-equipment-atlas.mjs` before it is mapped into the app. The
normalizer reads only the inner source-cell area and removes tiny detached
specks before fitting each icon into the fixed runtime cell. This prevents
adjacent-cell overhangs, clipping, and stray fragments from reaching the game.

Review the normalized sheet on a light, opaque background as well as on
transparency. Confirm that each tier has visible material and construction
progression, without changing the class silhouette or making the next tier
look like a different art style.

