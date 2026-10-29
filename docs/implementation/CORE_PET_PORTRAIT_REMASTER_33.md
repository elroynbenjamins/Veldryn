# Core pet portrait remaster — identity-preserving art contract

**Status: NOT GENERATED.** This is a precise production art brief for remastering the 33 canonical core pet portraits. The promotional composite concepts must **not** be shipped as game assets: their creatures and names do not match the original Veldryn roster. The existing `runtime_96` sprites are the source-of-truth for creature silhouettes and colors.

## Visual target

- Match the **actual released Veilbreak event-pet illustrations** in `apps/mobile/assets/event_collectibles/veilbreak/pets/`: premium 2D fantasy creature illustration, believable layered materials/fur/scales, soft luminous accents, polished lighting, expressive chibi proportions, crisp silhouette. This is **not** a generic 3D render or a blown-up pixel sprite.
- Make a separate **1024 × 1024 transparent RGBA PNG** for every pet, with one whole creature centered in a 3/4 pose that tracks the existing 96px design. No title text, UI frame, scenic backdrop, floor card, or extra creatures. Preserve recognizable shape, anatomy/material, signature colors and expression. Leave safe transparent room around the figure.
- Each approved source is exported to an **optimized 768 × 768 or 1024 × 1024 WebP portrait** (visual QA and Android decode), loaded **only in expanded Collections details**. Continue using existing `runtime_96` WebPs for thumbnails, chat/profile miniature, etc., to control AAB size. Keep 33 IDs, names, owner/save state, drops, rarity, region and bonus definitions untouched.
- Filename convention `apps/mobile/assets/master_roster/pets/portraits/PET_001_Pebblemole.webp` etc. A separate detail-art registry maps each stable pet ID to its portrait. **Do not switch an ID to a new invented creature.**
- Before marking a pet complete: side-by-side check against its original 96px source and a Veilbreak event portrait; alpha transparent, no text, no clipped anatomy, no off-model color changes; verify at 56px grid thumbnail and 200pt detail on 2×/3× Android displays.

## 33 identity targets

| ID | Existing pet name | Region | Must preserve from original sprite |
| --- | --- | --- | --- |
| PET_001 | Pebblemole | Asterfall | Round brown mole, small grey pointed snout, short paws, compact silhouette; no fox ears |
| PET_002 | Cinderchip | Asterfall | Small dark segmented armored beetle/construct with bright cyan runic joints and glow |
| PET_003 | Twiglet | Asterfall | Round tan woody bulb body, two vivid green leaves sprouting from the crown, little root limbs |
| PET_004 | Mossback Pup | Asterfall | Cream-and-grey wolf puppy, upright ears and soft fur with green moss patches |
| PET_005 | Silverfin | Asterfall | Tiny pale-blue silvery round fish, clear blue aquatic aura and flowing fins |
| PET_006 | Lantern Carp Fry | Asterfall | Little gold-and-turquoise baby carp, warm lantern-colored scales and ornate fins |
| PET_007 | Briarbud | Asterfall | Pink/red flower-bud creature with green thorny leaves and tiny feet |
| PET_008 | Gloamcap | Asterfall | Lilac glowing mushroom creature, purple speckled cap, soft blue-lavender body |
| PET_009 | Tusklet | Asterfall | Warm brown round baby boar, small snout, little ivory tusks and sparse bristled top |
| PET_010 | Redfeather Chick | Asterfall | Small cream-and-copper bird, vivid red crest and red-orange wing feathers |
| PET_011 | Forge Spark | Asterfall | Round charcoal miniature forge/furnace construct, orange molten core and little fire sparks |
| PET_012 | Mini Wretch | Asterfall | Small pale-yellow mischievous lantern-like imp, warm glow and dark-gold decorative headpiece |
| PET_013 | Mapwing | Asterfall | Cream and tan owlish winged creature, broad tan feathered wings and map/parchment-like plumage |
| PET_014 | Pack Mimic | Asterfall | Small brown wooden-and-leather treasure chest mimic, lid-like face, clasp and tiny feet |
| PET_015 | Coinmouse | Asterfall | Warm brown mouse with rounded pink ears, curled tail, holding a large golden coin |
| PET_016 | Echo Wisp | Asterfall | Tiny glowing icy-blue spirit with deep-violet curling flame tail and bright eyes |
| PET_017 | Campfox | Asterfall | Orange fox cub with white chest, big upright ears, small leaf/pack accessory |
| PET_018 | Oathling | Asterfall | Tiny ornate blue/silver armored knight spirit, bright cobalt blue magical flame around armor |
| PET_019 | Duneling | Sunscar | Golden-sand small mammal with long pointed ears and soft desert-colored wrappings |
| PET_020 | Mirage Minnow | Sunscar | Round turquoise-and-gold minnow with wide ornate fins, aqua shimmer |
| PET_021 | Sunscarab | Sunscar | Small gold-and-teal armored scarab beetle with symmetrical plated carapace |
| PET_022 | Tiny Sphinx | Sunscar | Golden lion/cat cub, striped blue-gold Egyptian-inspired crest and ornate collar |
| PET_023 | Tyrant Larva | Sunscar | Compact golden larva creature, dark horn/crest points and segmented pale-gold lower body |
| PET_024 | Snowpuff Hare | Frostmarch | White fluffy baby hare, tall ears edged pale blue, icy blue accents on paws |
| PET_025 | Rimecap | Frostmarch | Pale-blue mushroom creature with frost-rimmed cap and short soft icy body |
| PET_026 | Bellfin Fry | Frostmarch | Bright blue round baby fish with prominent crystalline flowing fins and frosty highlights |
| PET_027 | Choir Pebble | Frostmarch | Round blue-white rocky spirit, expressive face and jagged little icy stone tufts |
| PET_028 | Wyrmling Flake | Frostmarch | Small fluffy white ice-dragon cub, blue crystalline spines and ear-like ice fins |
| PET_029 | Coalbug | Ashlands | Low squat black obsidian bug, angular armor plates with glowing lava-red seams |
| PET_030 | Sootling | Ashlands | Round shaggy charcoal/ash spirit with bright orange ember flecks and two tiny eyes |
| PET_031 | Ember Eel Fry | Ashlands | Small curled orange-red eel/fish, dark scales and bright flame-like dorsal fins |
| PET_032 | Forge Imp | Ashlands | Tiny mischievous red-orange horned imp, charcoal armor and forge-tool/hammer silhouette |
| PET_033 | Cinder Crownling | Ashlands | Small black-and-orange crowned fire critter, ridged regal crest, intense golden molten glow |

## Delivery and release checks

- Art must be delivered as **33 distinct files**, not a single labeled infographic or collage. Cropping a generic 33-pet collection illustration is not sufficient to prove each ID matches its source character.
- Keep the original 96px runtime icons unchanged; wire higher-resolution art through the `petDetailArtSource` path added in the collection-art PR, and add an explicit 33/33 portrait registry coverage assertion when all sources are committed.
- Confirm any added WebP formats decode on Android, visual appearance with dark/light themes, and app size impact. No backend migration or character-data conversion is necessary.

**Provenance:** repo `apps/mobile/src/content/core-pets.ts` (canonical names/IDs) and the matching `assets/master_roster/pets/runtime_96` source sprites. This document does not claim the artwork has already been made.
