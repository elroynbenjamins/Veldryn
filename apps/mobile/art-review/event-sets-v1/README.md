# Event equipment and skin concepts — v1

This review batch contains two groups:

- Harvestwake, the only live event currently implemented in the mobile runtime,
  with its nine already-named class rewards; and
- the eight-event LiveOps rotation from the master design database, represented
  by one event-wide equipment and skin direction per event.

Each class concept overview contains:

- the accepted male and female mannequin in matching front-only posture;
- the event helmet worn on both figures;
- the class weapon on viewer-left and the class offhand on viewer-right; and
- a complete ten-piece set: helmet, chest, gloves, legs, boots, weapon,
  offhand, cape, amulet, and ring.

All 17 concepts were accepted and converted into runtime exports on 2026-09-09.
The runtime files live in `assets/equipment-ui/` and
`assets/character-runtime/events-v1/`. The manifest and two contact sheets in
`production/` are the final collection-wide visual checks; redundant copies of
the runtime PNGs are deliberately not kept there.

The eight LiveOps catalog concepts intentionally establish event identity before
class multiplication. They do not create new reward bindings or overwrite the
workbook's current cosmetic-only reward rules.

## Shared visual direction

Harvestwake uses worn dark iron, brown leather, amber-gold cloth, wheat and
field-spirit motifs, with deliberately rough square pixels and restrained glow.
Class silhouette and held items remain distinct while the seasonal identity is
shared.

## Generation prompt

The built-in image-generation workflow received the accepted male and female
base mannequins, an accepted rough-pixel equipment atlas, the relevant beginner
class atlas, and the Harvestwake background as references. Each prompt required
one landscape concept board with two front-only full-body mannequins and one
complete ten-item equipment grid. It prohibited text, extra items, back views,
action poses, smooth painting, antialiasing, 3D rendering, gradients, and vector
polish.

## Production export contract

Each accepted class-specific set has three production PNG files:

1. One transparent `2000x800` equipment atlas using the fixed 5x2 layout:
   helmet, chest, gloves, legs, boots / weapon, offhand, cape, amulet, ring.
2. One `1024x1536` male front portrait using the immutable male mannequin pose,
   with helmet, weapon, and offhand visible.
3. One `1024x1536` female front portrait using the immutable female mannequin
   pose, with helmet, weapon, and offhand visible.

PNG remains mandatory for future sets. Do not use JPEG, WebP, SVG, or a cropped
concept board. Generate the production atlas and portraits from the accepted
overview so edges, padding, transparency, mannequin scale, and held-item
placement can be validated independently.

Harvestwake's nine class skins are registered and bound to their existing
10,000-reputation event rewards. The eight LiveOps catalog sets are registered
as production assets but intentionally remain unbound until those event
definitions and reward rules are implemented.

## Repeatable workflow

1. Read the event definition and reward names before inventing art.
2. Create one concept overview with the two front mannequins and complete ten-item
   set.
3. Check helmet, weapon, offhand, anatomy, head height, item count, order, and
   rough-pixel treatment.
4. Obtain visual approval and make targeted corrections on the overview.
5. Generate the three production PNGs from the accepted overview.
6. Verify dimensions, transparency, item-cell padding, mannequin posture, and
   mobile-size readability.
7. Copy approved exports into `assets/equipment-ui/` and
   `assets/character-runtime/`, register them in the static asset maps, and bind
   their set and skin IDs to the event reward logic.
