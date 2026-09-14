# Art review

Reviewed all nine generated silhouettes, the final 256 px overview, the Ironwarden before/after comparison, and all nine compact exports at their actual 62 px size.

Accepted the stronger bevels, retained class color identities and symbols, complete silhouettes, and clear gaps in the arcane and nature emblems. Background-extraction edits were required for seven initial outputs; Hexweaver and Stonecaller required a second alpha extraction. Final exports have actual alpha, including internal gaps. All accepted source PNGs are included under `source/originals`.

Direct nearest-neighbor reduction of the large sources produced speckled highlights at 62 px. The accepted compact export uses a single Lanczos3 reduction, 128-color quantization without dithering, binary alpha, and then exact nearest-neighbor density expansion. `compact-export-review.png` documents that choice: left is the rejected nearest reduction; right is the accepted compact export. It is an export comparison, not a runtime asset.

Generation used the built-in ImageGen tool. `source/jobs.json` records original identity-reference prompts. `source/alpha-refinements.json` records first background extractions; the final two extraction prompts are in `source/results.json`. `source/refinement-history.json` retains initial result provenance. `asset-manifest.json` points to the included accepted sources, with final crop and export parameters.

These are static class emblems. Native device rendering remains to be checked at representative screen sizes and densities.
