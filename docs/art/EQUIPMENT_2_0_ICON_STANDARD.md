# Veldryn — Equipment 2.0 icon production standard (Style 4 selected)

**Production calibration companion:** [EQUIPMENT_2_0_GENERATION_PLAYBOOK.md](EQUIPMENT_2_0_GENERATION_PLAYBOOK.md) adds mandatory reference-kit, prompt-version, slot silhouette, light/shade, painterly edge and visual comparison gates. Do not begin batch generation until its approved reference kit is recorded in the generation queue and the first cross-material calibration batch is reviewed.

**Status:** authoring/QA contract only. No icons generated, replacement assets installed, 2.0 rewards issued, or release flags enabled by this document.

**Approved direction (19 November 2026): Style 4 — painterly dark-fantasy storybook equipment.** It supersedes the previous rough pixel-cluster renderer for *new* Equipment 2.0 art only. The user's fourth concept sets the visual direction; **production-grade reference assets are still pending**. See the definitive [Style 4 slot pose guide](EQUIPMENT_2_0_STYLE4_POSE_GUIDE.md) and [pose-lock JSON](equipment-2-0-pose-lock.json).

**Corrected production unit:** one **canonical item ID** / 192px icon, **not** one full ten-slot gear set. Equipment 2.0 drafted compact sets of 2, 3, or 4 pieces, and the art queue must match those exact memberships. The ten-item atlas was a legacy packaging scheme that I had incorrectly treated as a set requirement.

## Authority and scope

This standard governs **new Equipment/Crafting 2.0** crafted pieces, class/path sets, standalones, dungeon drops, Party Event chest gear, World Boss gathering gear, and future reward equipment. It is not permission to enable hidden systems. Source-of-truth identities, rarity, slots, material recipes, drop pools and tier eligibility must be read from their authoritative *current* code/manifest at generation time; never invent reward IDs, equipment slots, probability, or item sets to fill a visual grid.

Relevant existing sources:
- `apps/mobile/art-review/t1-t9-equipment-icons-v1/ART_DIRECTION.md` — established 5×2 runtime / class silhouettes / tier ladder.
- `apps/mobile/art-review/REVIEW_STATUS.md` — approved rough pixel-cluster reference family (including `full-equipment-v2-rough/` and beginner sets).
- `docs/art/EQUIPMENT_T3_T4_STYLE_GUIDE.md` — class accents, detailed regional resource fidelity and safe-bounds rules, **its painterly fantasy vocabulary can guide Style 4 material rendering, but the updated 2.0 pose guide overrides old orientation rules**.
- `apps/mobile/src/content/equipment_catalog_t1_t9_v33.json` and `backend/data/equipment_exact_recipes_v33.json` — legacy reference identities/material progression, *not* a substitute for 2.0 definitions.
- Hidden review PR #1382 (Equipment/Crafting 2.0), #1416 (Party / shared chest rewards), #1454 and upstream World Boss chest contracts. Re-verify those drafts after branch sync: their contents and counts may change.
- `apps/mobile/src/theme/resource-assets.ts`, `regional-resource-assets.ts`, and dedicated ingredient icons — actual shipped material-color/shape authority.

**Precedence:** actual item identity/recipe/entitlement contract > selected Style 4 painterly renderer and canonical Style 4 pose guide > approved same-slot Style 4 master > 2.0 geometry > authentic material icon > aesthetic improvisation. Previously accepted rough-pixel art is legacy reference only, not the new Style 4 master. Rarity/quality/glow/borders always come from the app.

## Immutable technical lock: `veldryn-eq2-storybook-v1`

| Property | Rule |
| --- | --- |
| Final item art | One RGBA icon per slot on a **192 × 192** transparent canvas; all tiers/sources use this canvas |
| Optional legacy-format atlas | **960 × 384** pixels, five 192px cells across and two rows; **NOT** evidence that an EQ2 set has ten pieces |
| Slots / indices (0-based) | helmet 0, chest 1, gloves 2, legs 3, boots 4 / weapon 5, offhand 6, cape 7, amulet 8, ring 9 |
| Safe rectangle | Absolute alpha bounds inside **x/y 26..165** inclusive within each cell; a **26px fully transparent gutter** on every side. This is stricter than the existing legacy 23px validator |
| Alpha | True transparency, no black/white/grey matte, halo, card, text, rarity border, floor or cast shadow |
| Runtime exports | Optimized RGBA **WebP**, target **≤250 KiB** per 10-item atlas; >350 KiB requires review; >500 KiB fails until redesigned/optimized; never auto-sacrifice icon clarity. Single icon exports have a proportional budget |
| Masters | Retain lossless **PNG** masters and generation notes in review/non-bundled folders, not the shipped asset folder |
| Resolution/downsample | Generate each actual canonical item as isolated transparent master (e.g. 1024px), verify intact source, preserve aspect ratio, then export its own 192px icon. Only assemble optional atlases if the renderer explicitly requires them |
| Visual checks | Compare at 32, **40**, 48, and 64px per icon; LANCZOS/actual mobile renderer previews on dark and light UI backgrounds |
| No upscaling | A 192px icon is not a crop from a tiny 32px source scaled up; design at source size then deliberately resolve clustered edges at final size |

**Equipment 2.0 item-first export is mandatory:** the actual hidden catalog defines **15 compact T1–T4 crafted sets, each 2–4 items**, plus 24 standalone items and 52 class weapon/offhand templates (total 118), NOT any ten-piece class sets. Every actual crafted piece and every Party Event, World Boss or dungeon reward item receives a **192×192 transparent WebP keyed by canonical item ID**. The 960×384 legacy five-by-two format is retained **only as optional packaging for a renderer that needs it**, not as a rule to fill ten slots. Never invent nonexistent set pieces or duplicate graphics to fill the atlas. Any future atlas binding requires an explicit manifest of real IDs to positions and correct sparse-asset handling.

**Important:** Normalize *each separate source icon*, not an already-cropped multi-item canvas that may hide an off-edge tip. Source-boundary inspection precedes any crop. Avoid the historic pipeline's risk of filling a cell by stretching a narrow weapon: use aspect-preserving `contain` only. Do not consider successful normalization proof that an originally cropped source was complete.

## Immutable visual/camera lock

- **Rendering:** grounded hand-painted dark-fantasy **storybook inventory illustration** matching the user's fourth example: crisp readable contours, modest natural brush texture, authentic scratches/stitching, believable matte metal/leather/cloth and gently graduated shadows. Reject rough pixel-cluster output, flat vectors, hyperreal PBR, airbrushed blur, and noisy micro-ornament.
- **Viewpoint:** product camera about 10–15° elevated, **slot- and weapon-family-specific** near-front three-quarter view; capes show the rear, rings tilt, and bows/axes/staves each use their own pose. No camera changes by tier within one slot family and no floor plane. Left/right always mean *viewer left/right*.
- **Lighting:** one steady **warm neutral key at upper-left (about 10 o'clock)**, top-left edge highlights and broad left-facing planes; subdued cool reflected fill to the lower-right, darkest occlusion at underside/inside joints. No extra spotlights, opposite-side rim swaps, HDR bloom, hard cast shadow or random colored mood lighting.
- **Scale:** same slot-family visual mass throughout tiers; helmet/chest/boots cannot become progressively larger. Weapon length, horns, banners, fur and cape must stay wholly inside the same safe rectangle. Progression must be construction/material, not occupancy.
- **Palette:** controlled storybook shadow edges, distinct major light/mid/dark material planes, textured transitional strokes and small localized class accents. No thick uniform pixel-outline or whole-piece class recoloring.
- **Texture:** big material planes first, stitches/seams/scratches second, tiny brush marks last. No high-frequency pixel noise, floating dust, motion lines, blurred outlines or stray sparkles.

### Slot direction and canonical silhouettes

**Definitive orientation and family-based facing:** [EQUIPMENT_2_0_STYLE4_POSE_GUIDE.md](EQUIPMENT_2_0_STYLE4_POSE_GUIDE.md) and [equipment-2-0-pose-lock.json](equipment-2-0-pose-lock.json). The following overrides the previous draft:
- Helmet, chest, shield: nearly frontal, with subtle viewer-right side and top reveal
- Gloves: exactly two, fingertips mostly down-left; legs: two legs hanging vertically with no boots
- Boots: exactly two, both toes toward image-left, fixed small pair offset
- Straight swords/daggers: **hilt upper-right → blade tip lower-left**; axes/maces: **head upper-left → handle lower-right**; staff/spear: upright top-right; bow: arc image-left/string image-right
- Cape: collar up and **back panel** toward camera, hem down; jewelry: centered pendant and three-quarter open elliptical ring
- All poses: no mirroring, no random tilt, no wearer, no cut tips, no new orientation from one tier to the next

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
5. Fixed `styleLock`: `veldryn-eq2-storybook-v1`; `light`: `upper-left-10oclock`; `camera`: `slot-specific-product-three-quarter`; `canvas`: `192x192`; `safeInset`: `26px`; `slot`: exactly one approved slot.
6. Candidate ID, generator/source, reviewer, visual QA, automated QA, runtime mapping check and status transition evidence. Keep generated masters and prompt versions traceable.

**Reference priority:** supply a **labelled image of an approved corresponding slot** to lock rendering; provide approved matching-class prior-tier piece to lock progression; provide a *cropped* current resource icon to lock material; provide source motif reference if needed. Do not feed a whole atlas without specifying the exact cell. If the generator returns a board instead of a transparent item, treat it as a concept only.

### Exact prompt skeleton (replace every bracket)

> Veldryn EQ2 equipment **single-item** production icon, styleLock veldryn-eq2-storybook-v1. Draw ONLY [ITEM ID / NAME], the [SLOT] for [CLASS / PATH OR UNIVERSAL], [TIER], acquired from [CANONICAL SOURCE]. Reproduce **selected Style 4 hand-painted dark-fantasy storybook gear**: controlled warm 10-o'clock upper-left key light, crisp outlined shape with softly painted weathering/metal/fabric, subtle cool lower-right occlusion and slot/family-specific view from EQUIPMENT_2_0_STYLE4_POSE_GUIDE.md. Match [APPROVED SAME-SLOT REFERENCE] scale and orientation; use exactly the same 192×192 transparent output canvas, subject entirely within x/y 26..165 with no crop. Construction [TIER-APPROPRIATE CRAFT / MATERIAL PLAN]. Main material [RESOURCE NAME] must match the provided actual in-game icon's [HUE / SHAPE / SURFACE] as [STRUCTURAL COMPONENT]. Controlled class accent [COLOR], localized [LOCATION]. Distinctive set motif [ONE LEGIBLE FEATURE]. Relative to [PRIOR-TIER / PEER], this gear is [CONSTRUCTION DELTA], NOT bigger or brighter. No character, mannequin, ground, frame, words, border, baked-in rarity, particles, glow cloud, second item, coarse pixel clusters, blurry airbrush, photoreal PBR, hard floor shadow, cropped piece, or different lighting.

For each *actual compact set*, use one shared design identity packet for only its defined members (2–4 in the present T1–T4 draft), without inventing missing slots. Individually render and approve each real ID; runtime packaging is a separate step.

### Negative prompt / immediate rejection

Wrong sword hilt/tip direction, backwards boot toes, wrong bow/axe/staff family, back/front error, mirrored directional highlights, coarse pixel-cluster output, soft blurred/airbrushed rendering, photorealism, tiny engraving, stray detached sparks, colored halo, floor shadows, opaque/checkered background, card framing, text, duplicated equipment, multiple weapons in one slot, bare hands in gloves, footwear in legs, weapon blade cropped, replacement of real material by generic colored magic, enlarged upper-tier icon, source cell touching an edge, or missing unique reward identity.

## QA, approvals and deployment fence

**Automated:** run `python tools/validate-equipment-v2-art.py <atlas.webp> --kind atlas` or `python tools/validate-equipment-v2-art.py <icon.webp> --kind icon` with Pillow installed. This strict 2.0 validator checks exact dimensions, real transparency, nonempty items, 26px gutters and byte budget. Optional `--reference` checks per-slot footprint parity. Also retain current production `tools/validate-equipment-atlas.mjs` for the normal legacy atlas contract. No validator can prove artistic sameness, correct item identity, correct 3D orientation, or that a source was previously cropped: these require **visual review**.

**Human/mobile:** compare actual catalogued tier and slot peers (T1–T4 for the current crafting foundation; higher tiers only when defined) at the same 40px size, inspect hand-painted silhouette/texture at 100% and 300%, align on dark/light UI, compare resource silhouettes against the shipped ingredient icons, inspect alternate path side-by-side and inspect every generated source for pre-normalization clipping. Check actual Android inventory, crafting preview, chest result, shop and equipment comparison UI. Reject any mismatch; regenerate the single faulty slot rather than distorting the whole sheet.

**Art production states:** `identified → brief_ready → generating → candidate → visual_approved → normalized → tech_verified → mapped → device_verified`. Each step records evidence; unknown/unverified remains incomplete. `mapped` does **not** mean shipped. Release remains blocked until Equipment 2.0 physical item custody, approved drop tables, explicit go/no-go and corresponding gameplay release gate are complete.

## Naming / safe repository handoff

Review-only source: `docs/art/equipment-2-0-masters/<source>/<item-id>/<candidate-id>.png` (outside the mobile app folder; for large originals consider dedicated art storage/LFS).
Validated standalone export: `apps/mobile/assets/equipment-2-0/<source>/<item-id>.webp`.
Optional renderer-only atlas export (if later required): `apps/mobile/assets/equipment-2-0/atlases/<layout-id>-atlas.webp` with an exact item-ID→cell map. **Not** one ten-piece image per EQ2 compact set.
Use lowercase file-safe slugs while retaining exact uppercase/case-sensitive gameplay item IDs in metadata. Never overwrite approved legacy art merely because names sound similar. Keep only production-optimized exports under `assets/` after the art and runtime mapping checks pass. Do not duplicate masters at multiple density variants.

**Visual direction selected, production references pending.** The fourth sample remains a design example from this conversation, not approved transparent production source material. Archive the original in non-runtime reference storage and approve the ten real slot masters before bulk generation.

**Initial queue tracking:** populate the accompanying manifest with real **piece IDs** from the latest synchronized Equipment 2.0, Party Event, World Boss and dungeon contracts. PR #1382 documents a hidden 118-template T1–T4 foundation; #1429 documents 8 Party sets / 20 pieces, and the World Boss draft documents boss-specific gathering rewards. These are *draft counts*, not an audited final inventory. Do not claim 100% coverage until a code-derived item-by-item audit is complete.

## Asset storage, compression and mobile size budget

**Mandatory for every approved EQ2 icon.** The generator produces a lossless, transparent master PNG which is kept **outside `apps/mobile/`** (normally `docs/art/equipment-2-0-masters/`, or approved large-file art storage). Only one approved final **RGBA WebP** copy goes into `apps/mobile/assets/equipment-2-0/` when the item is ready to be statically wired. The PNG/oversized source, intermediate candidates, prompt reference images, QA contact sheets, and unapproved 2.0 gear must not be copied into the mobile runtime asset folder.

Use `tools/pack-equipment-v2-atlas.py icon --slot <actual-slot> --input <approved-master> --out <canonical-item-id>.webp` for **every** actual EQ2 item by default. Its optional `atlas` mode can compose a 960×384 sheet **only** for renderer-specific use; no compact set should be forced into it. It now automatically invokes `tools/equipment_v2_image_optimization.py`:

1. Normalize invisible RGB pixels to a clean transparent matte for more efficient encoding, without changing visible alpha.
2. Try **lossless WebP** first and then lossy candidates at quality 80/84/88/92/96 (or stricter caller minimum).
3. Decode every candidate and require **pixel-identical alpha**, exact dimensions, native visible-area RGB MAE ≤3.5, and **each individual 192px cell** resized to 40px with visible-area RGB MAE ≤2.0 on both light and dark backgrounds.
4. Select the smallest passing candidate. Keep **lossless** if lossy saves less than 5%, protecting fine storybook painted edges from pointless loss.
5. Fail hard over **500 KiB per ten-slot atlas** or **70 KiB per standalone icon** rather than drop compression quality below acceptance. Simplify overly noisy artwork and review the source in that case. Preferred targets are **250 KiB per atlas** and **32 KiB per icon**, not guarantees.
6. Optionally emit a machine-readable report outside the mobile assets using `--report` (saved bytes relative to a same-size optimized PNG baseline, codec chosen and color-error metrics); keep this evidence for reviewer approval.

For example, a tested local production command (once approved PNG masters exist):

```bash
python tools/pack-equipment-v2-atlas.py icon --slot helmet --input docs/art/equipment-2-0-masters/EQ2_FIELDBORN_GUARD_HELMET.png --out docs/art/equipment-2-0-review-exports/EQ2_FIELDBORN_GUARD_HELMET.webp --report docs/art/equipment-2-0-review-exports/EQ2_FIELDBORN_GUARD_HELMET-qa.json
python tools/validate-equipment-v2-art.py docs/art/equipment-2-0-review-exports/EQ2_FIELDBORN_GUARD_HELMET.webp --kind icon
python tools/audit-equipment-v2-bundle.py
```

After visual and device approval, copy the **single** validated WebP to its canonical runtime path and bind its canonical ID. Do not ship the review export as a second file. **No redundant @2x/@3x**, no alternative PNG runtime asset, no duplicated set atlas and standalone icon containing the same pixels unless the actual runtime cannot use a shared asset and its cost is reviewed.

The CI bundle auditor checks all future files under `apps/mobile/assets/equipment-2-0/`: WebP-only, dimensions, alpha, duplicate binary files, forbidden master/density variants and cumulative tracked bytes. Its initial **12 MiB warning / 20 MiB hard limit** applies only to NEW EQ2 runtime assets; revisit with measured inventory and product build budgets rather than assuming it is the final game-wide ceiling. These are **checked-in asset byte totals**, not measured Android App Bundle (AAB) or installed-device savings. Validate real release AAB sizes separately.

**Do not assume hiding content at runtime reduces bundled MB.** Statically required images may still ship in the app even if their feature flag is OFF. Keep unapproved 2.0 art outside runtime `assets/` until it is actually scheduled for a release. Once approved, a loader maps item IDs to the **same shared asset** in Inventory, Forge, dungeon rewards, Party Event chests, World Boss chests and item comparison UI; do not copy the pixels into each screen's folder.
