# Equipment visual pipeline — implementation and remaining art work

Ten refinements:

1. Typed layer registry keyed by class, body presentation, slot and item.
2. Approval, duplicate binding, item-slot and 128×160 canvas validation.
3. Equipment-driven resolver; removing gear removes its requested layer.
4. Separate front/back draw order, including cape order.
5. Helmet hair-hide behavior; no gear is hidden by this rule.
6. Native transparent-image compositor, shared by Character and Home.
7. Strict fallback when any required asset is missing; never draw a misleading partial stack.
8. Expandable missing-layer report for the current loadout.
9. Inventory/Bank try-on preview with before/after stats and no save mutation.
10. Regression coverage for bindings, order, missing assets, identity matching, hide rules and previews.

## Important status

This is rendering infrastructure, NOT completed per-piece artwork. The production layer registry is intentionally empty. The provided runtime archive contains complete character states only, with no neutral body, separate default hair or armor layers. Full-set appearances still work; mixed equipment still shows the labeled emblem. Test fixtures use symbolic image IDs, not runtime artwork. No images were generated, segmented or replaced in this batch.

## Asset contract

### Ironwarden extraction pilot (2026-09-04)

With user authorization for scripted pixel extraction/manual masks, produced six
review-only transparent 128x160 PNGs in
`apps/mobile/art-review/ironwarden/candidates`: male/female boots, front/back,
and male/female rear helmets. Originals remain untouched. Reproduce the assets
and review sheets using `apps/mobile/scripts/extract-ironwarden-layers.py`
(Python + Pillow). The script checks every selected RGBA pixel against the
source, transparent background, canvas size, and exact reconstruction by
replacing the extracted pixels. These checks are extraction checks, NOT a
full-set composition or artistic approval test.

All six comparison sheets were visually inspected. Starting and first-crafted
sprites do not share a skeleton: notably the male head heights and leg widths
differ. Boot-only overlays leave starting legs/feet visible outside the armor;
rear helmets do not consistently cover the starting hair/head. Original pixels
also include partial alpha, which is preserved rather than made opaque.
The source-minus-piece image has holes and is explicitly NOT a neutral body.

Candidates remain unapproved and are deliberately not imported into the mobile
bundle. Next art work is a crafted-pose neutral body with separate hair, front
helmet masks, remaining armor and weapon/offhand isolation, followed by actual
mixed-loadout occlusion and alignment tests. No live per-piece visual change is
claimed by this pilot.

For each class and male/female presentation, supply transparent, uncropped 128×160 PNGs on the same pose and origin:

- Neutral body/underlayer, without baked weapons, armor or hair.
- Default hair, separable so helmets can hide it.
- Front and back for each gameplay item in a visible slot: weapon, offhand, helmet, chest, gloves, legs, boots and cape.
- Amulet/ring are gameplay-only for this full-body renderer.

Preserve the supplied designs; use an art-production decomposition pass with visual approval. Do not register a cropped region or complete outfit as a slot layer. An isolated overlay must not contain unrelated equipped objects. Hidden anatomy must be reconstructed in the neutral body, not borrowed from an armored render.

Register approved image sources with static `require()` in `src/theme/equipment-layer-assets.ts`, then add matching LayerAsset metadata. Both views must exist; the entire composition must validate. Test combinations with one piece, full gear, removed helmet, swapped weapon, opposite view and both body presentations. The final composition should reproduce the approved full-set reference before promotion.

## Manual QA still required

Phone layout, modal navigation, actual PNG transparency/alignment, occlusion and visual fidelity need device/art review. Code tests verify resolver rules, not artistic correctness.
