# Artwork selection record

`surface-refinements.json` records the final login and registration surface cleanup. The original dark surface shading produced distracting patches at phone scale; the selected revisions simplify the navy interiors.

An intermediate registration revision was rejected because it returned an RGB image with a drawn checkerboard instead of alpha. The accepted registration source has actual transparency; the rejected image is not a delivery asset. Final exports use a maximum of 256 colors per sprite, with dithering disabled.

`directional-refinement.json` records the final Next glyph refinement, matched to the solid gold Back glyph for a consistent directional pair.

The 60 initial generation requests are recorded in `generation-jobs.json` and their exact submitted prompts and source paths in `generation-results.json`. `refinements.json` records two state refinements plus the additional top-right, bottom-left and bottom-right corner fittings. Each was a separate built-in ImageGen request.

The original disabled button retained too much bright gold/blue. Its accepted `-r2` source uses dark pewter and grey rivets. The selected icon housing received a more visible blue face and cyan selection rim. The deeper blue primary variation is assigned to the normal state and the darker variation to pressed. The export script records these selections explicitly; earlier files may remain under `originals` as provenance and must not be used at runtime.

Delivery dimensions are normalized by the export script. All blank icon housings use 48×48 to fit the 32 px starter glyphs. Slice margins protect the actual corner/terminal ornaments; they are deliberately larger than the nominal rail thickness. Input fields use separate horizontal/vertical caps and retain enough vertical padding for live 16 dp text.

The PNG exporter uses generated alpha for trimming and hard pixel silhouettes; no screenshot extraction or color-based background removal is used. Density variants and slices are technical derivatives of the individual accepted art. Runtime files are the `file` and `files` entries in `asset-manifest.json`.
