# Paradox Eternal — Ultra Luxe IV, private review
Existing catalogue names preserved: Fractured Eternity (frame), Beyond the Veil (background), Reality Rewritten (effect), Aeon, the Timeless (pet), Beyond Existence (static badge).

## Artwork direction
Obsidian/silver metal, violet crystalline fractures and pearlescent highlights. Strong sculpted perimeter matching the other three collections in visual weight without cloning their silhouettes. Dark, low-detail identity area on the left; dimensional gate and pet focal point on the right. Aeon should have a distinctive temporal creature silhouette, not a recolored dragon. Badge is a crisp static emblem; no halo/scale/opacity motion.

## Target deliverables
- Dedicated 1020×615 frame and wide background; 1024×576 standard frame and 512px square background.
- Static 64px badge (256px review source), 96px pet icon, 512px portrait, showcase pose and padded 12fps idle atlas (36–48 cells).
- Reusable small translucent rift light and mote textures. Six independent-border nodes; eight showcase border nodes. No GIF, full-card warping, flashing or movement of identity text.
- One 24-second showcase clock: early visible glints, temporal fold near 12s, luminous crest/rail convergence at 16s, calm reset. Static fallback for reduced motion and unsupported layout.
- Verify protected aperture at 320/340/390/480 logical px, animation paths and actual device performance. Use same quality baseline as Celestial, Draconic and Abyssal.
 
No art is uploaded yet. Foundation only, no live renderer, grant catalogue change, purchase, equip or release flag. Candidate IDs must be reviewed against server-owned grant projection before integration.


## Complete artwork registry and parity pass
All twelve WebP assets are present in the branch. The final eight uploaded files match the manifest byte lengths, WebP dimensions, transparency metadata, and independent SHA-256 readback. Review assets now resolve from a single registry; the review caller supplies only selection, trusted grant projection and identity UI, not arbitrary scene textures. CI requires all assets and the 1 MiB compressed budget (851,854 bytes total).
Aeon idle atlas and matching-only 1.3s tap reaction use the shared clock and existing non-reentrant one-shot hook. Badges remain static. No live profile navigation or production grant registration.
