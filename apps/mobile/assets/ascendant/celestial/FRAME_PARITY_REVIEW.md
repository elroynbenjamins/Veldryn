# Celestial Sovereign frame parity — review only

The currently shipped celestial_border.webp is 340×205. The new authored candidate is 1020×615, transparent WebP (179,738 bytes), with the same showcase aspect and more substantial sculpted gold, silver wings, navy inlays and star ornaments.

The new art is not a simple upscale. The candidate was fitted to the original Celestial profile aperture with premultiplied alpha resampling. On decoded output at 300, 320, 340, 390 and 480 logical pixels, all sampled identity plate, guild, matching and alternate pet boxes contained zero pixels above alpha 32 (max alpha 1).

At 340×205, the candidate covers 25.7% of the card at alpha >128, versus 20.2% for the uploaded Abyssal pass-3 frame. Median opaque side rail coverage is 10px vs 15px; upper rail away from center crest is 26px vs 12px. These are opaque-pixel coverage measures, not exact structural thickness. Different distribution is intentional: Celestial's wings carry more top weight, Abyssal's tentacles more side weight. Do not force identical silhouettes.

## Upload / review
Upload only celestial_border_v2.webp from the review package to this directory. Keep celestial_border.webp unchanged. Verify expected dimensions, transparency, hash, and the current animation anchors before any import switch. Compare actual native scenes at 300–480px and reduced-motion/large-font fallback. Retain the existing private grant IDs, selection logic, pet, background and badge.

No live registry switch, release gate, grant changes or migrations in this review branch.
