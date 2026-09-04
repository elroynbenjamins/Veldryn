# Shared base bodies v1

One male and one female identity, front/back, shared by every class. These
supersede class-specific anatomy for new layered artwork. Existing full-outfit
sprites are not replaced until their equipment overlays are ready.

## Files and reproducibility

`apps/mobile/assets/shared-body-v1/` contains the generated source sheet, four
128x160 RGBA sprites under male/female, and a dark-background inspection preview.
Rebuild with `apps/mobile/scripts/prepare-shared-bodies.py` (Python + Pillow).
The built-in image generator produced RGB with a baked checkerboard; the script
removes edge-connected bright neutral background pixels and normalizes each
figure with nearest-neighbor scaling. No source/class assets are overwritten.

All four have head top y=6 and foot baseline y=154, centered at x approximately
64. Bodies are bald and wear plain neutral underclothes; hair, footwear and all
equipment must be separate. Equal height does not prove joint-by-joint armor
alignment: male and female overlays need fitting to their own view's contours.
Do not stretch old complete-outfit images over these bodies.

The source references are the user's Bastion, Sunlamp Acolyte, Breaksteel
Marauder, Runespark Adept and hairstyle sheets. Their labels are reference
information, not evidence that exported sprites already exist or fit.

## Runtime status

Shared bodies are registered. Missing hair or equipped item layers still cause
the existing honest fallback. This is not completed per-piece armor rendering.
The hairstyle library's 12 styles/eight colors and the supplied armor sheets
have not yet been converted to fitted runtime overlays. Next: separate hair,
then fit one complete Bastion set, checking helmet removal and each armor slot
individually on both bodies and views before expanding to other classes.

Validation: RGBA transparency, dimensions/baseline assertions, dark-background
visual inspection, TypeScript check and equipment-layer regression tests.

## Generation method and prompt

Built-in imagegen, with the three class sheets and hairstyle library as style
references. Final prompt:

Use case: stylized-concept. Create a production-oriented Veldryn shared BASE BODY sprite sheet, not a decorative presentation board. The attached Veldryn sheets are STYLE REFERENCES only, especially the small base underlayer figures in Breaksteel Marauder. Exactly FOUR full-body figures in a single horizontal row: adult male front, same male back, adult female front, same female back. These are the only two base body identities used by ALL classes. Detailed fantasy pixel art matching references, warm shaded skin, dark crisp outlines, grounded heroic proportions, readable faces, not chibi, not photographic or 3D. Both bodies BALD, NO HAIR because the attached hairstyle library will become separate overlays. Both wear plain close-fitting neutral brown linen sleeveless undershirt and short fitted underlayer shorts, barefoot, bare arms, no belt or decorative hardware. Neutral symmetrical standing pose, feet apart, arms slightly separated from torso, empty relaxed hands at upper thigh, equal front/back joint heights and silhouettes per identity. Same figure height and ground line across all four, no perspective foreshortening. Each figure centered within its own equal-width cell, generous empty separation, entire head and feet visible. GENUINELY TRANSPARENT alpha background, no ground shadows, no backdrop, no checkerboard drawn into image, no labels, no text, no grid, no frames, no logo, no equipment, no weapons. This sheet will be split into four equal cells and normalized to a common 128x160 runtime canvas; prioritize precisely consistent anatomy and fixed pose over ornament. Preserve reference visual style without copying the reference sheet layout.
