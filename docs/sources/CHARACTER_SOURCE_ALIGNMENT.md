# Character source alignment

The supplied Codex Pack v4 and backend foundation are treated as authoritative references for character creation and appearance.

Implemented in the mobile prototype:

- Male and female body presentations.
- Six skin-tone choices with normalized fallback values.
- Predefined hairstyle selection and approved hair-colour palette swapping.
- Horizontal class carousel with starting-gear previews.
- One class weapon at character creation.
- First-crafted set progression and equipment-layer rendering.
- Profile preview component reuse for equipped appearance.

Source constraints retained:

- Character artwork is sourced from the provided runtime asset set; no replacement art is generated when a supplied asset exists.
- Individual armor overlays remain additive only where an approved layer asset exists.
- Hairstyle assets remain predefined runtime assets; the UI marks unavailable styles instead of inventing artwork.
- Character and inventory canvas targets remain 128×128 and 64×64 respectively.

Backend compatibility targets:

- Character creation accepts guest/local progression now and can map to account creation later.
- Appearance is represented as body, skin tone, hairstyle, hair colour, equipment, and profile metadata.
- Visual ordering follows the backend front/back z-index contract.
