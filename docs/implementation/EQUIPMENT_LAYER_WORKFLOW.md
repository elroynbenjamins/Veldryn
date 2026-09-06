# Equipment layer workflow

## Runtime contract

- Canvas: 128×160 PNG with alpha.
- Views: front and back.
- Bodies: male and female.
- One file contains one equipment slot only.
- Keep body, skin, hair, shadows, glow, text, and scenery transparent.
- Front and back pairs are registered only after both pass alignment review.

## Production sequence

1. Start from the exact shared body for the requested body presentation and view.
2. Use the approved set art and an existing layer only as palette and material references.
3. Produce one slot at a time: legs, boots, chest, gloves, helmet, cape, weapon, offhand.
4. Resize with nearest-neighbor filtering to 128×160.
5. Composite on the shared body in runtime z-order.
6. Check waist, shoulder, hand, knee, ankle, and foot anchors at 4× scale.
7. Reject any layer containing body pixels or opaque background pixels.
8. Save corrections under a versioned directory and update the static source registry.

## Alignment lessons

- Generated leg layers commonly become too wide. Fit armor to the base-body hips and legs before registration.
- Boots must be anchored to the base feet, not the bottom of a generated leg silhouette.
- Do not combine greaves and boots when they belong to separate equipment slots.
- Keep source artwork unchanged; register a corrected versioned sibling.
