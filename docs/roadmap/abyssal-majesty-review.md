# Ultra Luxe III — Abyssal Majesty (review only)

## Identity
Existing premium catalogue names are retained. Dedicated ascendant IDs in the isolated layout module are provisional until an ownership and migration audit. No changes to the private grant registry, tester aliases, store, wardrobe, production entitlements, gameplay blessings, or release flags.

| Piece | Art direction |
| --- | --- |
| The Forgotten Abyss | Deep ocean trench, submerged ancient temple, obsidian arches, soft shafts of cyan light; dim left identity zone and a clear right-side pet chamber |
| Crown of the Depths | Dark carved obsidian, oxidized silver, aquamarine gemstones, flowing tentacle filigree; elegant, open center |
| Nhal'Zuun, the Abyssborn | Miniature ancient spectral leviathan; distinctive swept fins, curved body, luminous turquoise eyes and bioluminescent markings; no dragon reuse |
| Call of the Deep | Slow tidal currents, rising bubbles and rune illumination; a coordinated 24s surge at 16s |
| Monarch of the Deep | Crown-shaped abyssal crest around a luminous turquoise pearl; title text and exact verified title ID to be approved separately |

## Asset pass
Author a dedicated wide scene and matching standard square background; two frame exports for showcase and responsive segmented renderer; transparent pet pose, 96px and 512px pet art, optional closed idle atlas, tide/particle/aura sprites, 64px badge. Match Celestial/Draconic's visual quality, not their shapes. No baked-in UI or characters in background; no baked-in text. Verify alpha, aperture, identity contrast, device-safe crops, compression and atlas memory before integration.

## Animation pass
One 24-second native clock, no frame-driven React updates. Early visible pulse by 5s, gradual tide gathering, peak at 16s and seamless decay. Pet swims gently in place; maximum 3dp lift at design size. Full-set signature only for verified equipped matching pieces, independently equipped nonmatching effects stay visible. Individual pieces work without matching pet; alternative pets retain their own identity; no pet means no pet art. Respect system and in-game reduced motion, active scene, foreground and narrow/large-font fallback. Budget: 3 ambient, 2 rail and 3 pet motes maximum, <=12fps and <=48 pet atlas frames; native benchmark before release.

## Review sequence
1. Approve visual identity and artwork concepts; compare to existing luxe sets.
2. Prepare and validate dedicated binary assets and responsive aperture.
3. Implement isolated native preview, verify signature and mixed-piece rendering.
4. Audit private discovery, server-authoritative grants and existing premium IDs; no automatic access changes.
5. Test low-end Android, accessibility and lifecycle; require exact-head CI and explicit approval before live integration.

Foundation only: no renderer import, no binary artwork, no actual animation loop or entitlement wiring yet.


## Premium frame parity review — 26 November 2026
Compared the actual repository showcase assets, not promotional mockups. All use the same 340:205 design aspect ratio. Celestial source 340×205 (9,878 bytes), Draconic 680×410 (94,854 bytes), Abyssal 1020×615 (137,782 bytes). Visually Celestial uses a slender gold rail with delicate wing ornaments; Draconic has the deepest upper wing ornaments and broad molten rails; Abyssal has substantial sculpted side rails and crest/pearl anchors. Abyssal is in the same broad weight class as Draconic; Celestial remains visibly finer. Source resolution is not a substitute for perceptual quality or measured rail thickness.

Quality target for future premium art revisions: 680×410 minimum authored showcase resolution (1020×615 preferred), readable theme-specific silhouette at 320 logical pixels, transparent interior and no significant opaque artwork in the relevant protected boxes at 320/340/390/480px, distinct crest/rail awakening, matching pet idle atlas and accessible reduced-motion fallback. Don't enlarge frame rails indiscriminately or stretch low-resolution art to claim new detail. Retain the celestial gold/wing identity while planning a higher-resolution authored Celestial refresh separately. Paradox has no dedicated final showcase yet and cannot be judged as equal. This is a review criterion, not a live asset or entitlement change.

Uploaded Abyssal art: all thirteen files are present, header dimensions, alpha flags and sizes agree with manifest (909,304 bytes total). Dedicated typed review bundle references every asset; hash verification is now included in the actual focused CI suite. No live renderer imports or private entitlement changes. Device visual/performance comparison remains necessary.
