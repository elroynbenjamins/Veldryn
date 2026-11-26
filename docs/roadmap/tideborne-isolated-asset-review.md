# Tideborne — isolated asset review 1
Status: concept-derived, not approved, not imported. Review-only companion archive: Tideborne-review-assets.zip (SHA-256 018f649b639f09069004aeb47dddda099e182f2cccdbc48b078eee8b227ba3df). The archive is provided separately, not stored in this commit.

Seven individual RGBA PNGs, a manifest and readme:
| Filename | Dimensions | SHA-256 |
|---|---|---|
| pearlframe.png | 768×432 | a2742f1fc813795fd73eeaeb5c6098f8df6fe91e07625835e39e76f1bca07e1c |
| siren.png | 256×256 | 1682ceff2051d3dc58bcec37bb328afc034bba329e2b5e988a89045798c048bd |
| corsair.png | 256×256 | 4a256705d8217c6cf405f8ee2d9cfd0adbc0de129f866c93eb29392b906c835b |
| bubble.png | 64×64 | bc804bb36952b7b4fb36600c82fc9cc8b7ca66324387282329a4af8e66750045 |
| seafoam.png | 64×64 | 71933470baa03976194ec798ba0ef1c5972839c6629483a662caec434c5b7e42 |
| pearl-glint.png | 64×64 | 3bd3899c5344616b29eb691026527be3bda5364cf86b4deaac33ae2811a8977b |
| static-effect.png | 768×432 | fb099f52bbabacd789740d922c4dca8a5e3d1290261ad582602ab170c1862b7c |

Frame and portraits are extracted from the generated concept sheet; the three independent effect sprites are hand-authored pixel shapes. Frame background was keyed out, stretched ornament fragments cleaned, and ornament-bearing pieces reduced separately to fit the fixed logical-pixel safe perimeter. The static effect is an isolated transparent composite. Portraits retain their dark painted background, without a presentation frame or text.

Checks performed locally: all seven PNGs decode as RGBA at specified sizes; frame center has zero alpha; eight provisional glow anchors snapped to nearby opaque art; five effect tracks; simulation of scene-safe frame clipping at 260×150, 340×190 and 480×270 shows no alpha outside stencil. First simulation showed visibly clipped crest; revised artwork reduces crest and rail thickness. The simulation is a Python reproduction of current geometry, not native UI execution. The refined frame is relatively thin and some rail stretching remains visible; compare it with the existing standards and refine art again before final approval. No Android screenshot, performance measurement or animation runtime verification yet.

Provisional anchors (normalized x,y):
top pearl .50065,.09049; upper right .95828,.06032; right pearl .97262,.529; lower right .95567,.93968; bottom pearl .50065,.96984; lower left .04433,.93968; left pearl .02347,.529; upper left .04433,.06032.
Manifest carries phases, durations, sizes and particle paths. Keep native glow clock at 12s and effect at 13.2s. These are design inputs, not wired runtime. No extra nodes, grants, catalogue rows, purchases, flags, or production writes.

Next: refine narrow rails and side ornament shapes, review 64/96dp portraits, then import exact approved bytes to a dedicated review-only asset path. Do not add to the pinned original V3 import archive or set artworkReady until final art and runtime are validated.
