# Equipment and skin art direction

Use this brief for the T1-T9 equipment and skin production pass. The live roster
is `../apps/mobile/src/content/equipment_catalog_t1_t9_v33.json`; its set and
piece IDs, names, slots, class, path, region, and unlock data are authoritative.
The class-by-class, tier-by-tier set index and individual motif cues are in
`EQUIPMENT_SET_VISUAL_OVERVIEW_T1_T9.md`.
The master workbook (`sources/VELDRYN_Master_Design_Database_v5.6.xlsx`) provides
older gear profiles, materials, and motifs, but its `Equipment_Visuals` sheet
covers only seven of the current nine classes. Use those descriptions where
they match a live set. Do not replace live catalog names with workbook names.

## Production scope

There are nine classes and nine tiers. **Each class has three sets at every
tier**: Foundation, Specialist, and Alternate. That is 27 sets per class,
27 sets per tier, and **243 sets total**. Every set has ten pieces in the live
catalog, for **2,430 equipment icons**. A complete front-view skin pass adds
one male and one female portrait per set, or **486 portraits**. At one atlas
per set, the target is 243 atlases plus 486 portraits.

The three approved Ironwarden T1 sets are now tracked in the art-review
folders, marked accepted in the live catalog, and bound by the runtime asset
registries. The remaining T1-T9 sets have no accepted atlas or paired skin.
The 29 older
accepted atlases and skins described in `../apps/mobile/art-review/REVIEW_STATUS.md`
are technique and quality references. They do not satisfy the new T1-T9 roster.

## Starting weapons

Every new character already spawns with one equipped class weapon from
`../apps/mobile/src/content/classes.ts` and `../apps/mobile/src/core/game.ts`.
These nine items are separate from the craftable novice sets and from the
T1-T9 catalog. Their gameplay IDs and weapon slots must remain stable.
Character creation states that no armor or offhand is equipped at spawn.

| Class | Starting item ID | Starting weapon visual |
| --- | --- | --- |
| Ironwarden | `basic_sword` | Straight, plain iron sword with short crossguard and worn blue grip |
| Bastion | `basic_tower_shield` | Simple tall shield used as the primary weapon; broad slab, patched rim, small gold mark |
| Dreadguard | `basic_chained_weapon` | Short iron flail or chained mace with a clearly readable chain and dark handle |
| Wayfinder | `basic_bow` | Practical greenwood bow with plain wrap and unadorned limbs |
| Ravager | `basic_two_handed_weapon` | Heavy, rough two-handed iron breaker with a long haft and chipped edge |
| Hexweaver | `basic_wand` | Dark wood wand with one small violet rune or crystal tip |
| Knife Dancer | `basic_main_hand_blade` | Single slim blade with a short guard and simple wrapped grip; no second blade at spawn |
| Dawnkeeper | `basic_mace` | Compact iron and brass mace with a small sun mark, no radiant effect |
| Stonecaller | `basic_staff` | Plain wood staff with a bound stone head and one subdued teal mark |

Make these weapons visibly humble: rough iron, common wood, leather or cloth
wraps, small class accents, and no elaborate glow. Their silhouettes must be
recognizable at inventory size. The novice crafted weapon in
`../apps/mobile/src/content/novice-sets.ts` is the first visual upgrade; it
should look more deliberate and better constructed than the spawn weapon.

Each starter weapon needs a transparent inventory icon and an approved held
appearance that fits the neutral male and female starting mannequins. Front
and back views should agree on handedness, size, and attachment. Do not paint
the item onto a generic class skin that would imply armor or an offhand.
The current `../apps/mobile/src/theme/character-assets.ts` uses one shared
neutral portrait for all classes, and `../apps/mobile/src/theme/equipment-assets.ts`
has no registered replacement equipment art. Producing the visuals alone does
not make the starter weapon visible on the portrait; that requires a runtime
art binding after the images are accepted.

## Tier and region progression

| Tier | Catalog name | Region | Visual progression | Regional resource cues |
| --- | --- | --- | --- | --- |
| T1 | Fieldborn | Asterfall | Field-repaired, simple construction; little ornament | Copper, ironwood, greenleaf |
| T2 | Ironwood | Asterfall | Better fit, reinforced seams and fittings | Iron, ironwood, wolf pelt, briarleaf |
| T3 | Oathforged | Asterfall | Forged shapes, deliberate oath or rune marks | Dense iron, heartwood, echo quartz where accessible |
| T4 | Fallen | Asterfall | Procession and ruin motifs; controlled wear and stronger contrast | Rootbound fibers, lanternsteel, oathglass fragments where accessible |
| T5 | Glasswind | Sunscar | Sun protection, sand-worn surfaces, layered lightweight forms | Dunewood, sunstone, saffron reed where accessible |
| T6 | Sunscar Ascendant | Sunscar | Refined desert craft and more deliberate ceremonial detail | Amberglass, charbark, mirage bloom, astral script where accessible |
| T7 | Frostbound | Frostmarch | Winter protection, insulated joints and frosted fittings | Frostiron, whitepine, rime resin where accessible |
| T8 | Choirforged | Frostmarch | Resonance, bell or choir geometry; precise high-craft details | Rimeglass, choir bloom, bellfin scale where accessible |
| T9 | Wyrmspine | Frostmarch | Masterwork construction, wyrm and ice motifs, strongest silhouette | Frostiron, wyrm scale, rimeglass where accessible |

T1 is a starter kit, not a reduced version of a finished knight suit. Keep
armor coverage low: patched cloth or quilted padding, worn leather, a few
mismatched dull-iron plates, and rough wooden shields with only simple
fittings. Faces remain visible; weapons are plain and practical. Reserve
full breastplates, enclosed visors, polished matching plate, elaborate shield
rims, strong emblems, and ceremonial detail for later tiers. At T1, the three
paths differ through shield outline, cloth cut, and one or two construction
cues; they do not yet have their mature silhouettes or ornament.

Approved T1 visual benchmark: the Ironwarden three-path
[v2 concept board](../apps/mobile/art-review/t1-t9-visual-previews/ironwarden-t1-three-paths-concept-v2.png).
Use its humble equipment density and clear path differences as the T1
reference for other classes. This approves the visual direction, not a
runtime-ready skin or exact equipment sprite.

These tier descriptions are the art direction for the new pass, not a claim
that the catalog already supplies exact colors or motifs for every set. Do not
make higher tiers simply brighter or more saturated. Let construction, shape,
material quality, and ornament carry progression. Use the actual recipe and
set brief first; the resource cues above are visual vocabulary, not a new
ingredient requirement. Before depicting a rare resource as the main material,
check its region, source, and minimum level in
`../backend/src/server/equipment/equipment-resource-map-v25.ts`. The path
profiles in `../backend/src/server/equipment/equipment-material-profiles-v23.ts`
can suggest Foundation, Specialist, and Alternate materials when compatible
with the live set. Never turn an unavailable late resource into the apparent
material of an earlier set merely because it belongs to the same region.

## Visual standard

- Match the accepted rough pixel art in `../apps/mobile/art-review/full-equipment-v2-rough/` and the starter atlases in `../apps/mobile/art-review/beginner-sets-v1/equipment-ui/`. Use hard pixel clusters, stepped edges, a limited palette, and a silhouette readable at inventory size. Avoid smooth painting, antialiasing, gradients, vector-like polish, tiny inscriptions, and text.
- Use a consistent upper-left light, dark selective outline, and restrained highlights. Material should read from shape and pixel texture: metal has hard planes, leather has broad worn surfaces, fabric folds in stepped clusters, and crystal has few sharp facets. Effects must not hide item contours.
- Keep a shared silhouette language within each class while giving every set a distinct helmet or hood, chest/shoulder shape, and weapon or offhand profile. At equal tier, Foundation reads as the baseline class form; Specialist emphasizes its build focus and signature mechanism; Alternate changes one or more major contours. These are visual paths, not rarity grades. The three sets must be distinguishable in grayscale at small size: changing trim color or an emblem alone fails review.
- Equipment atlases use a transparent 5 x 2 grid in this fixed order: helmet, chest, gloves, legs, boots, weapon, offhand, cape, amulet, ring. Keep each item centered with clear spacing and a consistent viewing angle. Use the exact weapon and offhand types in the live piece records; never infer them from class alone.
- Character skins use the immutable Ironwarden pilot mannequin in `../apps/mobile/art-review/source-pack/VELDRYN_Character_Runtime_Assets_v1/source_references/ironwarden_pilot_reference.png`. Preserve face, hair, head size, anatomy, pose, ground line, pixel scale, and backdrop. Change clothing and equipment only. Produce male and female front views with helmet, weapon, and offhand visible, following `../apps/mobile/art-review/accepted-set-skins-front-v1/`.
- A set's icon atlas and skins must share silhouette details, materials, motif, and main color placements. At portrait scale, the small amulet and ring may be simplified, but the helmet, chest, cape, weapon, and offhand must agree with the atlas. Do not create a skin by recoloring another set.

## Class identity accents

These are the current class selection accents from
`../apps/mobile/src/theme/class-creation-art.ts`. Keep each class color clearly
visible across all three paths and all nine tiers. Put it on at least two
readable parts of the full-body silhouette, such as cloth panels, shield face,
weapon wrap, rune band, or shoulder marking. Repeat it in the matching atlas.
Regional materials may change the base color, but a player should still
identify the class at portrait size without reading a label. Use a darker or
lighter value of the same class hue when the exact UI hex would be too bright
for a material; preserve the hue identity.

The revised Bastion, Dreadguard, Dawnkeeper, Ravager, Knife Dancer, and
Stonecaller emblems live in `../apps/mobile/assets/class-emblems-v3-recolor/`.
Ironwarden, Wayfinder, and Hexweaver retain their v2 emblems. Use these
emblems and the accents below as the color references for new T1-T9 art;
older accepted skins remain references for technique and silhouette.

| Class | Accent | Visual cue |
| --- | --- | --- |
| Ironwarden | `#70BDFA` | Steel, shield, ward geometry |
| Bastion | `#C98342` | Copper-bronze, heavy plate, tower shield, fortification |
| Dreadguard | `#A4536C` | Burgundy, chains, dark iron, dread symbols |
| Dawnkeeper | `#F1DE75` | Pale sun-yellow, ivory, radiant relic |
| Wayfinder | `#9EC57F` | Layered leather, bow, trail motifs |
| Ravager | `#EB6A43` | Vermilion-orange, heavy two-handed weapon, broken steel |
| Hexweaver | `#C4A0FA` | Ritual cloth, violet runes, focus |
| Knife Dancer | `#E968AF` | Magenta-pink, light asymmetric armor, paired blades |
| Stonecaller | `#54C8BE` | Turquoise, stone, staff or totem, resonance rings |

The novice set accents in `../apps/mobile/src/content/novice-sets.ts` are more
muted and belong to those specific sets. The set panel colors in
`../apps/mobile/src/content/equipment-sets.ts` currently follow **tier**, not
class. Region and set theme may control the largest material areas, while the
class color remains a prominent, repeatable secondary color. Do not bury it in
one tiny gem, or let a regional blue, gold, or red erase the class identity.
Likewise, the class color cannot be the only difference among a tier's three
sets, since all three belong to the same class.

## Three-path distinction

For every class and tier, sketch the three sets side by side before producing
the full icons and skins. Give each path a different helmet/hood outline,
shoulder or chest construction, and weapon/offhand treatment. Use the live
`Build Focus` to choose the distinguishing shape: protection can widen the
shield or upper body, mobility can shorten and open the outline, and control
can concentrate symbols around a focus or restraint. Match actual piece types.
Carry each path's defining form forward through tiers so it improves rather
than resetting to an unrelated costume, while each new tier gets new regional
materials and at least one meaningful construction change. Compare adjacent
tiers of the same path as well as the three paths within a tier. If either
comparison reads as a recolor, revise the silhouette before final export.

## Class set designs

The table below defines the persistent silhouette for each of the 27 class
paths. Apply the tier and region progression above to these forms. The class
color stays visible on a substantial cloth, shield, plate, or magical surface
and repeats on the weapon or offhand; it is not a one-pixel accent. Materials
and secondary colors may shift with the region. The silhouettes and named
weapons must match the live catalog's piece types.

| Class and loadout | Foundation | Specialist | Alternate |
| --- | --- | --- | --- |
| Ironwarden: sword + shield | Rounded helm and broad layered chest; full, steady shield face with blue ward bands. | Angular marshal visor, linked shoulder plates, and a taller chain-edged shield; blue lines connect the armor and sword guard. | Open, forward-sloped helm, asymmetric striking shoulder, and cutaway shield; blue runs along the sword edge and counterstrike marks. |
| Bastion: war hammer + tower shield | Squared helm, monolithic chest and the widest plain tower shield; copper-bronze plates reinforce the shield face. | Sigil-crowned helm, concentric barrier plates, ring-shaped hammer head, and inscribed tower shield; copper rings mark the barrier focus. | Raised rescue collar, segmented impact armor, stepped shield rim and hooked hammer; copper rescue marks break up the dark plate. |
| Dreadguard: chained mace + dread shield | Low helm, layered dark iron and broad chain drape; burgundy cloth shows under the armor and across the shield field. | Sharp forward visor, exposed chain arcs and narrow striking shoulders; burgundy on the hooked mace head and shield gashes. | Closed face mask, high rigid collar and blunt, enclosing dread shield; burgundy on the mask slit, shield core and chain binding. |
| Wayfinder: bow + quiver | Falcon-brow hood, balanced leather layers and a compact cloak; green on scarf, quiver and bow wrap. | Short split cloak, open arms and swept bow limbs for a fast outline; green movement bands run across hood and bow. | Long pointed hood, narrow sight-line mask and longer precision bow; green track marks repeat on quiver and limb tips. |
| Ravager: two-handed weapon + war charm | Broad horned shoulders, weighty torso and greatblade; orange on a large waist cloth and weapon binding. | Vented, lighter upper armor, ragged motion hems and greataxe where the set calls for it; orange follows the swinging edge and charm. | Dense breaker shoulders, wedge-shaped armor and a thick armor-splitting blade; orange fracture lines mark the weapon and chest. |
| Hexweaver: wand + focus | Asymmetric curse robe, one raised shoulder and a compact hex focus; violet cloth panel and rune trail anchor the class. | Tall starburst collar, layered ritual sleeves, upright wand and faceted focus; violet is concentrated on a broad central robe panel and focus. | Narrow hood, slit-like eye line, forked wand and pierced circular focus; violet cuts through dark cloth as long sharp marks. |
| Knife Dancer: dual blades + sheath charm | Short split hems, light hood and blades that spread outward; pink panels on scarf, hem and blade grips. | Crescent collar, close-fitting torso and paired curved blades for a finisher outline; pink crescents repeat on the charm and gloves. | Coiled mask, overlapping scale-like panels and forward-pointed twin blades; pink winding marks cross torso and sheath charm. |
| Dawnkeeper: mace + relic | Open round collar, soft layered healing robes and a compact sun mace; pale yellow on broad stole and relic face. | Tall beacon collar, vertical robe panels and an upright guiding relic; yellow light bands climb mace, chest and relic. | Structured ward shoulders, enclosing mantle and broad guarded mace head; yellow forms a clear shield-like chest and relic symbol. |
| Stonecaller: staff + totem | Layered stone over cloth, rounded shoulder stones and ring-headed staff; turquoise on a visible sash and totem rings. | Rooted, slab-like shoulders, grounded stance and blocky barrier totem; turquoise runs through stone seams and staff binding. | Ripple-edged mantle, narrow vertical stones, tuning-fork staff top and resonant totem; turquoise wave bands cross cape and focus. |

Preserve each path's outline as it develops. A T1 Ironwarden Foundation shield
is plain and repaired; by T5 its broad face can use Sunscar wood or stone
reinforcement, and by T9 it can carry worked Frostmarch scale or ice-facing
plates while remaining the broad Foundation shield. The Specialist shield
remains taller and linked; the Alternate shield remains cut away for attack.
Apply the same logic to the other classes: upgrade their existing forms with
better joints, layering, material transitions, and regional motifs. Do not
inflate every path into the same heavy armor at T9, and do not replace a
class's weapon type to create variety.

## Production files

Use PNG. The established production export contract in
`../apps/mobile/art-review/event-sets-v1/README.md` is one transparent
`2000x800` atlas and two `1024x1536` front portraits per set. Keep the atlas
alpha clean; portrait backdrop and ground line must match the mannequin
reference. Do not export a cropped concept board as a final asset. Use the
stable live set ID in review records and filenames so a repeated set name
cannot cause an asset collision.

Generation prompts should include the set ID and name, class, tier, region,
path, build focus, ten item names and types, chosen material/motif, class
accent, the matching mannequin views, and a nearest accepted art reference.
Supply the accepted atlas technique reference separately from the mannequin
reference: the former controls pixel treatment and item layout; the latter
controls character anatomy and framing. State the exact three output files
and prohibit extra items, labels, scenic additions, soft painting, and
unrequested pose changes.

## Batch checklist

1. Resolve set ID, name, class, region, tier, path, build focus, ten pieces, and weapon/offhand types from the live catalog. Record a one-sentence silhouette, material, motif, and color brief before generation.
2. Compare the nearest accepted atlas and skin, the other two sets for the same class and tier, and adjacent tiers of the same path. Check class-color visibility, regional materials, and grayscale silhouettes at thumbnail size.
3. Review the ten-piece atlas and paired front skins together. Check every icon at inventory size and both skins at in-game portrait size. Correct specific failures before exporting production PNGs.
4. Verify dimensions, atlas transparency, exact slot order, padding, no clipped items, mannequin identity and ground line, held-item placement, and matching color/material details across all three outputs.
5. Register only accepted files against the live set and skin IDs. Track generated, reviewed, accepted, and runtime-bound status independently; an accepted older reference does not mark a T1-T9 set complete.
