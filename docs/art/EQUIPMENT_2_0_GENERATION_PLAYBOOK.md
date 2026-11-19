# Veldryn EQ2 — Uniform generation playbook and calibration protocol

**Companion to:** [EQUIPMENT_2_0_ICON_STANDARD.md](EQUIPMENT_2_0_ICON_STANDARD.md). This playbook freezes the *look* of every production icon, not merely its file dimensions.

## Why the extra controls exist

A text prompt mentioning "pixel art" and "upper-left lighting" is not enough to prevent style drift across different models, sessions, classes, rewards or artists. Every batch must use **approved visual anchors, locked shape/composition, reproducible prompt/reference metadata, staged QA and explicit approvals**. These safeguards improve consistency; AI generation is stochastic, and perfect pixel-identical style cannot be guaranteed solely by a prompt.

**Style lock:** `veldryn-eq2-storybook-v1`. **Selected direction:** Style 4 (2026-11-19). **Reference kit:** `veldryn-eq2-refkit-style4-v1` remains `not_approved` pending archival of the exact selected example and production slot masters. **Do not reuse** the prior rough-cluster reference kit or prompt lock.

## A. Freeze one reference kit before production

Maintain an **approved, versioned EQ2 art reference kit**, e.g. `veldryn-eq2-refkit-v1`. Do not claim the kit is approved until an artist visually signs off its sampled *actual active* Veldryn assets.

Each reference kit contains:

| Component | What to lock | How used |
| --- | --- | --- |
| Style master | User-selected Style 4 direction; archived chosen illustration, then *approved painterly* T1 production source | Painterly silhouette, wear, warm highlights, authentic materials and controlled brush texture |
| Slot masters ×10 | One accepted icon for helmet, chest, gloves, legs, boots, main weapon, offhand, cape, amulet, ring | Angle, bounds, placement, silhouette density, pair spacing |
| Class identity ×9 | Current approved class/path armor examples with class accents | Family crest, armor type, cloth construction, weapon/offhand silhouette |
| Tier ladder | Approved same-class/path T1/T2/T3/T4 plus progressively approved later tier | Demonstrable material upgrade at constant footprint |
| Regional material kit | Crop of *active runtime* resource icons, with path and SHA256 | Exact color family, facets, scales, weaving and surface pattern |
| Reward motif kit | Boss/event/biome source art approved for that reward collection | Distinct reward identity without changing renderer |
| Dark/light UI proof | Real 32/40/48/64px in-app inventory backgrounds | Readability, alpha edges and color harmony |

The per-slot **Style 4 painterly** master is mandatory for ALL new icons, including standalone drops. The same-class/path prior tier is mandatory for normal tier advancement. A new class/path should first have its **T1 master** approved, followed by one representative T5/T6 counterpart before bulk generation. The *style* master is shared across the entire game.

**Asset lock:** Store each reference's repo path, SHA256 of source bytes, crop coordinates (if sourced from an atlas), status (`approved`), owner, approval date and kit version. If a source changes, bump the reference-kit version and review dependent assets; silently replacing the reference is forbidden. Crop reference icons before handing them to the generator, not just a list of filenames.

**Do not promote** older unapproved smooth-painted concept art or rough experimental drafts as authoritative. Review the accepted current mobile runtime sheet first. Explicitly annotate when a material reference is used only for hue/texture, not style or lighting.

## B. Freeze the camera and each slot's placement

Use the **slot-specific Style 4 pose lock** in [EQUIPMENT_2_0_STYLE4_POSE_GUIDE.md](EQUIPMENT_2_0_STYLE4_POSE_GUIDE.md) and [equipment-2-0-pose-lock.json](equipment-2-0-pose-lock.json), not a universal front-three-quarter camera. For every item, compare with its approved same-slot master: same lean, pitch, facing, shadow side, vertical center and perceived footprint.

**Single source of truth:** the [Style 4 pose guide](EQUIPMENT_2_0_STYLE4_POSE_GUIDE.md) and [JSON pose contract](equipment-2-0-pose-lock.json) control helmet/chest/glove/leg/boot/cape/jewelry direction, plus each weapon or offhand family. Do not maintain a competing abbreviated slot table here: one changed exception could otherwise silently drift.

The visual review must compare same-slot pose and orientation with the signed-off reference at 40px. **Sword hilt upper-right, tip lower-left; boots toes image-left; cape viewed from behind.** Staff/spear, bow, axe/mace/hammer and shield/book/focus/dagger explicitly have different poses and their own reference anchors. These are image-space directions, not anatomical left/right. The 10–15° camera elevation is a *human-reviewed visual target*, not a property recoverable from PNG metadata.

## C. Lock the illumination and shading hierarchy

- Single key light from **viewer upper-left**, approximately `10 o'clock`; brighter on upper-left-facing surfaces and top planes.
- Shade direction fixed: **viewer lower-right** and interior folds are darkest. Avoid switching highlights to the other side when the weapon is diagonally oriented.
- Material-specific response: metals have narrow clustered highlights; leather has broader muted planes; wood has warm grain and modest end highlights; cloth has broader softer tone groups; crystal has a *few* bold angular specular facets.
- **Exactly one global light source**. A gem/rune may have subtle *contained local emission*, but must not recolor the item, move its shadow direction, or spawn bloom/particles.
- Do not let regional source art (desert sunlight, glacier glare, event fire) introduce a different light direction. Source themes belong to materials/motifs.

### Practical style-calibration rules

Before batch generation, measure the approved slot references and **record a calibrated range** for each of these; no arbitrary universal hard number is safe until anchors are visually inspected:
1. Outline darkness compared to local material shadow (avoid pure black keylines).
2. Painterly edge quality at 192px and 40px, controlled textured brushstrokes without blurring or storybook-painted clustering.
3. Large/medium/small shape balance; broad silhouettes must be visible at 40px.
4. Saturation of large surfaces vs tiny accents.
5. Nontransparent footprint, center of mass and per-slot pair spacing.
6. Highlight-to-midplane ratio under the same top-left key; inspect grayscale and silhouette-only thumbnails.
7. Lossy WebP encoding artifacts and alpha-fringing on real dark/light backgrounds.

Do **not** automatically fail an icon simply because grayscale/HSV histogram differs from a material-specific peer. A pale Cloth Dawnkeeper and dark-iron Dreadguard legitimately differ. These measurements act as drift flags for human review.

## D. Control the palette / material grammar

1. **Primary material** defines most of the structure (plate, scale, wood, cloth, bone, chitin, etc.). **Secondary material** explains believable joins, bindings and reinforcements. **Class accent** remains a small motif, never full recolor.
2. Use a compact set of intentional shade groups per material; no random high-frequency noise, dirt cloud, sprayed engraving or mixed photo texture. Compare detail at 40px first.
3. Reference active *runtime* ingredient icon, not the resource name or a search-result image. Preserve at least two actual visual traits of the icon (e.g. hue + angular facets; hue + overlapping scales; weave + backing).
4. Prefer broad construction elements over micro-motifs. The player's progression should be **felt through craftsmanship**—solid joints, durable construction, fit, finish and unique source material—before adding ornate patterns.
5. Keep metals matte to satin at low tier. T1 is scuffed beginner iron, NOT pristine glowing mithril; T9 can be sophisticated, but not brighter than every UI effect.
6. Keep each reward source recognizable without turning every reward into a tiny portrait of the boss. Theme is one material treatment plus one simple emblem or geometry motif.

**Visual upgrades are not gameplay rarity grades**: rarity, rolled quality, enchantments, stat gems, and affixes should not require independent item pictures. They use existing UI borders, badges, sockets and effects. Only a genuinely different canonical item form gets a different base art asset. No rank-specific glow baked into RGBA.

## E. Freeze the design vocabulary across whole sets

Each **named set** gets a one-page identity sheet: unique iconographic emblem, 1–2 source materials, specific helmet crown, weapon head/blade profile, offhand profile, fastener motif, and defined cape/cloth language. Every piece repeats that identity subtly—not a large emblem on all ten slots.

**Two visual differences must exist between same-class same-tier alternate paths** (at minimum helmet profile AND weapon/offhand geometry). For reward collections, require a source-specific motif but do not invent a new class identity or force partial reward sets to contain ten gear slots.

Maintain an explicit **anti-clone review**: show similar same-class and same-tier pieces side by side. A recolor or gem pasted on a reused helmet/weapon does not pass; neither does a completely different rendering style. No mirroring a previous item to pass uniqueness.

## F. Stable prompt and generation settings

Store a **locked prompt** made from:
- unchanged global style paragraph + immutable slot/camera/light instructions;
- unchanged negative prompt;
- same approved style master;
- slot-specific silhouette/camera reference;
- canonical source/item/recipe specifics in a separate *editable content block*;
- prior-tier and actual resource-crop references.

Do not improvise global style instructions in each batch. Keep prompt in source control with a semantic version; a change in the common prompt needs a one-class calibration run before broad use.

Record **model/tool name, model version where exposed, generation date, prompt version, reference kit version, input reference file hashes, any supported seed, generation parameters that the tool actually exposes, candidate ID, manual edits and approval outcome**. A seed is *traceability metadata*, not a promise of identical images across model updates.

**Candidate process:** produce multiple candidate variations *only when a slot needs them*, choose one design based on the shared anchor, and iterate by preserving the same approved reference kit. Reject candidates with a wrong material form, camera/light direction, or item silhouette; do not try to rescue them with arbitrary color grading or stretching.

## G. Never allow post-processing to hide a generation error

- Generate one isolated complete item per source file with real alpha; source pixels touching the edge are **hard rejection**.
- Trim only transparent bounds. Preserve width/height ratio when resizing. Never do independent X/Y scaling.
- Export each 192px icon in the same sRGB interpretation, removing accidental embedded color profile mismatches, unwanted metadata and matte; verify alpha all the way through PNG→WebP.
- No color overlays in the asset packer. Palette consistency is an art-authoring decision, not a destructive global filter.
- Composite the ten approved slots into 5×2, following canonical indices; do not auto-fill missing items with similar legacy art.
- If a standalone reward is 1 of 20 pieces, export it as its own **canonical item ID**; do not force a ten-piece atlas for convenience.
- Keep source PNGs outside the shipped mobile bundle. Runtime exports are optimized WebP only; optimize without blurred edges, compression halos or corrupted transparency.

## H. Four gates for every item

**Gate 1 — Source and identity:** canonical item ID/source/slot/class/recipe + unique set motif validated against code. No unknown item IDs or invented drop reward data.

**Gate 2 — Visual:** approved reference kit; same cluster style and direction; recognizable material; same class/path identity; readable grayscale silhouette at 32/40/48/64px; meaningful T1→T9 progression; peer anti-clone comparison.

**Gate 3 — Technical:** source unclipped; exact canvas; 26px transparent edges; alpha intact; aspect ratio preserved; export within size budgets; no wrong slot in atlas. Run `tools/validate-equipment-v2-art.py` (and reference parity); do not treat `PASS` as visual approval.

**Gate 4 — In-app and release:** compare on real phone in Inventory, Forge, equipment compare, chest reward screen and any shop where item is shown. Confirm no UI sizing jitter, washed-out pixels or missing lazy-load asset. Mapping only occurs after art approval; hidden 2.0 gameplay/reward flags stay OFF until the distinct release sign-off.

**Rule of thumb:** an item is not approved because it looks impressive in a 1024px isolated preview. It must pass the **40px same-class lineup** and have the same Style 4 painterly renderer, approved slot-specific camera, shadow side, source material and UI footprint as its neighbors.

## Batch acceptance matrix / failure codes

| Code | Condition | Required response |
| --- | --- | --- |
| `REF_MISSING` | Approved matching-slot reference or source icon missing | Stop generation / obtain actual reference |
| `STYLE_DRIFT` | Smooth/PBR/vector style, wrong cluster structure | Regenerate from approved style master |
| `VIEW_MISMATCH` | Different camera, mirror, facing, pitch or pair orientation | Regenerate slot using locked slot anchor |
| `LIGHT_MISMATCH` | Right-side key / shadow reversed / inconsistent emission | Regenerate or targeted redraw without scene lighting |
| `MATERIAL_MISMATCH` | Generic same-color gear without actual resource traits | Redesign material placement using shipping resource crop |
| `TIER_JUMP` | Starter looks elite or upgrade is only size/glow/filigree | Simplify or redesign tier construction |
| `CLONE_COLLISION` | Same helmet/weapon silhouette reused without distinct identity | Redesign meaningful geometry |
| `SCALE_DRIFT` | Different footprint or paired item spacing at 40px | Return to same-slot scale reference |
| `CROP_ALPHA` | Any source tip cut or source edges touched / matte contamination | Reject source, regenerate; never normalize into false passing state |
| `RUNTIME_FAIL` | Export fails sizing, asset load, UI crop or app fidelity | Fix exporter/mapping then rerun full checks |
| `MAPPING_UNKNOWN` | 2.0 item ID/slot/source not in authoritative reward/crafting manifest | Do not bind or ship |
| `GATE_DISABLED` | Item source exists only in hidden WIP code | Keep as approved artwork, but **do not enable gameplay** |

## First controlled calibration batch

Start with **one full T1 class foundation set**, then its matching T5 (or earliest class-equivalent advanced tier) with real approved resource icon crops. Compare weapon, helmet, chest, gloves, boots, cape, amulet and ring at the same 40px size. If the reference kit is coherent and the exporter has clean alpha, approve a second class with a very different material language (e.g. a cloth class), *then* freeze v1 and bulk-generate. This verifies cross-material consistency, not just one armored class.

A change to global renderer or lighting after approval is **a new styleLock version**, never a silent edit to old art.
