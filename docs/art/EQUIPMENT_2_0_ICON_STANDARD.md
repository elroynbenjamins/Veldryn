# Veldryn — Equipment 2.0 icon production standard (draft v1)

**Production calibration companion:** [EQUIPMENT_2_0_GENERATION_PLAYBOOK.md](EQUIPMENT_2_0_GENERATION_PLAYBOOK.md) adds mandatory reference-kit, prompt-version, slot silhouette, light/shade, pixel-cluster and visual comparison gates. Do not begin batch generation until its approved reference kit is recorded in the generation queue and the first cross-material calibration batch is reviewed.\n\n**Status:** authoring/QA contract only. No icons generated, replacement assets installed, 2.0 rewards issued, or release flags enabled by this document.

## Authority and scope

This standard governs **new Equipment/Crafting 2.0** crafted pieces, class/path sets, standalones, dungeon drops, Party Event chest gear, World Boss gathering gear, and future reward equipment. It is not permission to enable hidden systems. Source-of-truth identities, rarity, slots, material recipes, drop pools and tier eligibility must be read from their authoritative *current* code/manifest at generation time; never invent reward IDs, equipment slots, probability, or item sets to fill a visual grid.

Relevant existing sources:
- `apps/mobile/art-review/t1-t9-equipment-icons-v1/ART_DIRECTION.md` — established 5×2 runtime / class silhouettes / tier ladder.
- `apps/mobile/art-review/REVIEW_STATUS.md` — approved rough pixel-cluster reference family (including `full-equipment-v2-rough/` and beginner sets).
- `docs/art/EQUIPMENT_T3_T4_STYLE_GUIDE.md` — class accents, detailed regional resource fidelity and safe-bounds rules, **but its soft-painted renderer wording is legacy and must not override the approved rough-pixel style for NEW 2.0 art**.
- `apps/mobile/src/content/equipment_catalog_t1_t9_v33.json` and `backend/data/equipment_exact_recipes_v33.json` — legacy reference identities/material progression, *not* a substitute for 2.0 definitions.
- Hidden review PR #1382 (Equipment/Crafting 2.0), #1416 (Party / shared chest rewards), #1454 and upstream World Boss chest contracts. Re-verify those drafts after branch sync: their contents and counts may change.
- `apps/mobile/src/theme/resource-assets.ts`, `regional-resource-assets.ts`, and dedicated ingredient icons — actual shipped material-color/shape authority.

**Precedence:** actual item identity/recipe/entitlement contract > approved matching class/slot art reference > this 2.0 render/geometry lock > material icon > aesthetic improvisation. Art does not alter gameplay contracts. If references disagree on renderer, use approved rough pixel-cluster art as the 2.0 visual authority, not older smooth painted concept boards. Rarity frames, quality, glow effects and UI backgrounds are always rendered by the application.

## Immutable technical lock: `veldryn-eq2-icon-v1`

| Property | Rule |
| --- | --- |
| Final item art | One RGBA icon per slot on a **192 × 192** transparent canvas; all tiers/sources use this canvas |
| Set atlas | **960 × 384** pixels, exactly five 192px cells across and two rows |
| Slots / indices (0-based) | helmet 0, chest 1, gloves 2, legs 3, boots 4 / weapon 5, offhand 6, cape 7, amulet 8, ring 9 |
| Safe rectangle | Absolute alpha bounds inside **x/y 26..165** inclusive within each cell; a **26px fully transparent gutter** on every side. This is stricter than the existing legacy 23px validator |
| Alpha | True transparency, no black/white/grey matte, halo, card, text, rarity border, floor or cast shadow |
| Runtime exports | Optimized RGBA **WebP**, target **≤250 KiB** per 10-item atlas; >350 KiB requires review; >500 KiB fails without an explicitly recorded waiver. Single icon exports have a proportional budget |
| Masters | Retain lossless **PNG** masters and generation notes in review/non-bundled folders, not the shipped asset folder |
| Resolution/downsample | Generate individual isolated masters at convenient square source size (e.g. 1024px), confirm intact silhouette and alpha, preserve aspect ratio, center within safe bounds, then export exact 192px icon. Assemble 10 approved icons into the final atlas. Do not enlarge one tier relative to another |
| Visual checks | Compare at 32, **40**, 48, and 64px per icon; nearest-neighbor/actual mobile renderer previews on dark and light UI backgrounds |
| No upscaling | A 192px icon is not a crop from a tiny 32px source scaled up; design at source size then deliberately resolve clustered edges at final size |

**Two delivery modes:** Full ten-slot sets receive a ten-cell atlas. Partial/standalone chest rewards get **individual** 192px icons keyed by the canonical item ID; a twenty-piece Party collection is *not* forced into two invented ten-piece sets. World Boss gathering pieces likewise follow their actual item/slot map, not a fictional armor set. If runtime mapping later needs an atlas, use explicit approved slots and transparent empty slots in a separate format; never pass a sparse sheet to the legacy ten-slot validator.

**Important:** Normalize *each separate source icon*, not an already-cropped multi-item canvas that may hide an off-edge tip. Source-boundary inspection precedes any crop. Avoid the historic pipeline's risk of filling a cell by stretching a narrow weapon: use aspect-preserving `contain` only. Do not consider successful normalization proof that an originally cropped source was complete.

## Immutable visual/camera lock

- **Rendering:** premium dark-fantasy **rough pixel-cluster** inventory art; deliberate angular groups, hard stair-step contour transitions and compact readable material planes. Modest within-cluster painted shading is allowed. Reject smooth airbrush, glossy 3D/PBR, noisy mini-engraving, overly cartoon-flat vector work and faux pixelation from low-resolution enlargement.
- **Viewpoint:** single, stable near-front **three-quarter inventory view**, slight top visibility, eye level consistent across a slot family. No perspective changes by tier, no floor plane. All left/right directions below refer to the *viewer*.
- **Lighting:** one steady **warm neutral key at upper-left (about 10 o'clock)**, top-left edge highlights and broad left-facing planes; subdued cool reflected fill to the lower-right, darkest occlusion at underside/inside joints. No extra spotlights, opposite-side rim swaps, HDR bloom, hard cast shadow or random colored mood lighting.
- **Scale:** same slot-family visual mass throughout tiers; helmet/chest/boots cannot become progressively larger. Weapon length, horns, banners, fur and cape must stay wholly inside the same safe rectangle. Progression must be construction/material, not occupancy.
- **Palette:** close dark outlines from material shadow (not uniform black), 2–4 readable shade planes per major material, class accent on a *small* controlled location, material-specific accent in structural features. Never flood every piece with the class color.
- **Texture:** big groups first (metal plate / hide / cloth / wood / stone / crystal), medium-scale seams second, sparse highlight pixels last. No dust, motion lines or random sparkles that survive as floating components.

### Slot direction and canonical silhouettes

| Slot | Stable composition for a single icon |
| --- | --- |
| Helmet | Front opening/visor faces viewer, slight three-quarter turn showing **viewer-right** side; same crown height and brow line within a class/path |
| Chest | Upright torso-shaped piece with shoulders visible, no arms or mannequin; same three-quarter turn; clasps centerline |
| Gloves | Two **closed** gloves/gauntlets, separated, fingertips pointing down; no skin/hands |
| Legs | Paired trousers/greaves stop **above ankles**; no soles/feet; upright and symmetric visual weight |
| Boots | Two boots as a pair, toes tipped slightly toward viewer-right; soles contained |
| Weapon | One main-hand implement per icon; default handle low-left / point or head upper-right. Preserve class-specific bow/staff profiles and match approved path reference instead of rotating all items identically |
| Offhand | One shield/focus/tome or **one separate offhand dagger** as class requires; shields show front and a little viewer-right edge. Do not duplicate the main weapon |
| Cape | One hanging cloak, near rear/three-quarter cloth view, collar upper center, hem down; no floating shoulders or scene |
| Amulet | One centered pendant with clearly visible chain/cord; simpler and smaller visual mass than chest/helmet |
| Ring | One band at stable three-quarter tilt; smaller visual mass than major gear; prominent center stone only when justified by set materials |

**Class/path difference is mandatory:** same-class Foundation versus Alternate must differ in helmet/head profile, main weapon geometry and offhand identity (not just hue). Consult the specific approved class/path examples in `ART_DIRECTION.md`. Knife Dancer must use one dagger in weapon cell and one distinct dagger in offhand cell. The nine class accents are fixed there and in `docs/art/EQUIPMENT_T3_T4_STYLE_GUIDE.md`.

## Progression: humble adventurer → earned mastery

Tier is not a rarity filter or an excuse for constant gold, giant spikes, or a glow explosion. Compare every new tier with its **same-class, same-path prior tier** at 40px; put materially different construction in large visible areas and preserve the protagonist's grounded adventurer origin.

| Tier | Readable gear story | Allowed visual additions | Forbidden shortcut |
| --- | --- | --- | --- |
| T1 | New adventurer: patched cloak, basic iron/hide, plain straps, worn soft wood | One modest class cue, practical fastening | Gold trim, polished ceremony, gems, glowing runes |
| T2 | Experienced traveler: maintained equipment, ironwood, reinforced leather and stitching | Slightly better fit, one structural band | Recolor-only upgrade |
| T3 | Proven craftsperson: stronger steel, carefully shaped plates and a modest oath motif | One readable emblem and small upgraded attachment | Unreadable filigree |
| T4 | Veteran of the region: repaired relic, rare materials, weathered heraldic hardware | Selective large inlay / material differentiation | Suddenly pristine royal armor or increased icon size |
| T5 | Sunscar artisan: pale Dunewood, ochre Sunstone, scale/reed craft | Clear processed desert resource covering broad structure | Flat orange recolor or generic sand glow |
| T6 | Ascendant artisan: amberglass facets, pearl Glassfin, violet Mirage Bloom, bronze Royal Chitin or navy Astral Script **as actually sourced** | Dominant main resource + one secondary, high-confidence construction | All materials on every set, transparent PBR, particles |
| T7 | Frostmarch veteran: layered winter protection, frostiron, fur and tough cold-weather fittings | Silhouette shaping through fur/collar/plate design | Giant icicles / icy filter |
| T8 | Master rune-smith: choirforge/rimeglass/resonance craft | A few large intentional facets or sealed glyph panels | All-over cyan bloom / micro-runes |
| T9 | Endgame wyrmcraft: blackglass and wyrm-scale techniques, unmistakably engineered silhouette | Best construction and unique material interlocks | Oversized items or full-body VFX |

For T5/T6, follow the **specific resource icon traits** already documented for Sunstone, Dunewood, Sunscale, Saffron Reed, Amberglass, Glassfin, Mirage Bloom, Royal Chitin and Astral Script. For T7–T9, first inspect the current shipping Frostmarch resource icons; no palette guesses based only on words. A named drop reward must visibly reflect its real **source biome/boss/event** while staying in the class/slot/camera lock. A World Boss gathering piece may be distinctive and utilitarian rather than visually stronger than every same-tier crafted weapon.

## Mandatory generation packet — one item at a time

Before generating any icon, record in the art manifest:
1. Canonical `itemId`, `setId` if any, `slot`, `tier`, `classId` or `universal`, `path` if applicable.
2. `sourceType`: `craft`, `dungeon`, `party_event_chest`, `world_boss_chest`, or another named source; exact reward/drop table and status. A design-only item is **not** marked wired.
3. Approved **same-slot same-class/path** style reference + accepted immediately preceding tier + actual primary and secondary resource icon crops. For a unique reward, include canonical boss/event motif reference.
4. Fixed **design brief:** helmet/weapon/offhand signature, dominant material, 2–3 icon-faithful colors/shapes, major construction placements, how this differs from the nearest existing item.
5. Fixed `styleLock`: `veldryn-eq2-icon-v1`; `light`: `upper-left-10oclock`; `camera`: `front-three-quarter-viewer-right`; `canvas`: `192x192`; `safeInset`: `26px`; `slot`: exactly one approved slot.
6. Candidate ID, generator/source, reviewer, visual QA, automated QA, runtime mapping check and status transition evidence. Keep generated masters and prompt versions traceable.

**Reference priority:** supply a **labelled image of an approved corresponding slot** to lock rendering; provide approved matching-class prior-tier piece to lock progression; provide a *cropped* current resource icon to lock material; provide source motif reference if needed. Do not feed a whole atlas without specifying the exact cell. If the generator returns a board instead of a transparent item, treat it as a concept only.

### Exact prompt skeleton (replace every bracket)

> Veldryn EQ2 equipment **single-item** production icon, styleLock veldryn-eq2-icon-v1. Draw ONLY [ITEM ID / NAME], the [SLOT] for [CLASS / PATH OR UNIVERSAL], [TIER], acquired from [CANONICAL SOURCE]. Reproduce the supplied approved Veldryn rough pixel-cluster dark fantasy icon style, cluster density, dark contour weight, 10-o'clock upper-left warm-neutral key light, cool lower-right occlusion and fixed front-three-quarter viewer-right inventory camera. Match [APPROVED SAME-SLOT REFERENCE] scale and orientation; use exactly the same 192×192 transparent output canvas, subject entirely within x/y 26..165 with no crop. Construction [TIER-APPROPRIATE CRAFT / MATERIAL PLAN]. Main material [RESOURCE NAME] must match the provided actual in-game icon's [HUE / SHAPE / SURFACE] as [STRUCTURAL COMPONENT]. Controlled class accent [COLOR], localized [LOCATION]. Distinctive set motif [ONE LEGIBLE FEATURE]. Relative to [PRIOR-TIER / PEER], this gear is [CONSTRUCTION DELTA], NOT bigger or brighter. No character, mannequin, ground, frame, words, border, baked-in rarity, particles, glow cloud, second item, low-resolution upscale, PBR, smooth rendering, hard floor shadow, cropped piece, or different lighting.

For a ten-item set, make each slot from the **same immutable packet**; never reroll camera, lighting, stroke or palette on each call. Assemble after individual approvals using the fixed slot order.

### Negative prompt / immediate rejection

Different point of view, flipped directional highlights, soft blurred/airbrushed rendering, photorealism, tiny engraving, stray detached sparks, colored halo, floor shadows, opaque/checkered background, card framing, text, duplicated equipment, multiple weapons in one slot, bare hands in gloves, footwear in legs, weapon blade cropped, replacement of real material by generic colored magic, enlarged upper-tier icon, source cell touching an edge, or missing unique reward identity.

## QA, approvals and deployment fence

**Automated:** run `python tools/validate-equipment-v2-art.py <atlas.webp> --kind atlas` or `python tools/validate-equipment-v2-art.py <icon.webp> --kind icon` with Pillow installed. This strict 2.0 validator checks exact dimensions, real transparency, nonempty items, 26px gutters and byte budget. Optional `--reference` checks per-slot footprint parity. Also retain current production `tools/validate-equipment-atlas.mjs` for the normal legacy atlas contract. No validator can prove artistic sameness, correct item identity, correct 3D orientation, or that a source was previously cropped: these require **visual review**.

**Human/mobile:** compare the full class/slot progression T1→T9 at the same 40px size, inspect hard pixel clusters at 100% and 300%, align on dark/light UI, compare resource silhouettes against the shipped ingredient icons, inspect alternate path side-by-side and inspect every generated source for pre-normalization clipping. Check actual Android inventory, crafting preview, chest result, shop and equipment comparison UI. Reject any mismatch; regenerate the single faulty slot rather than distorting the whole sheet.

**Art production states:** `identified → brief_ready → generating → candidate → visual_approved → normalized → tech_verified → mapped → device_verified`. Each step records evidence; unknown/unverified remains incomplete. `mapped` does **not** mean shipped. Release remains blocked until Equipment 2.0 physical item custody, approved drop tables, explicit go/no-go and corresponding gameplay release gate are complete.

## Naming / safe repository handoff

Review-only source: `apps/mobile/art-review/equipment-2-0/<source>/<item-id>/<candidate-id>.png`.
Validated standalone export: `apps/mobile/assets/equipment-2-0/<source>/<item-id>.webp`.
Validated full set export: `apps/mobile/assets/equipment-2-0/sets/<set-id>-atlas.webp`.
Use lowercase file-safe slugs while retaining exact uppercase/case-sensitive gameplay item IDs in metadata. Never overwrite approved legacy art merely because names sound similar. Keep only production-optimized exports under `assets/` after the art and runtime mapping checks pass. Do not duplicate masters at multiple density variants.

**Initial queue tracking:** populate the accompanying manifest with real IDs from the latest synchronized Equipment 2.0, Party Event, World Boss and dungeon contracts. PR #1382 documents a hidden 118-template T1–T4 foundation; #1429 documents 8 Party sets / 20 pieces, and the World Boss draft documents boss-specific gathering rewards. These are *draft counts*, not an audited final inventory. Do not claim 100% coverage until a code-derived item-by-item audit is complete.
