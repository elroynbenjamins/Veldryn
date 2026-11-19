# Event equipment concepts — v1

This review batch contains two groups:

- Harvestwake, the only live event currently implemented in the mobile runtime,
  with its nine already-named class rewards; and
- the eight-event LiveOps rotation from the master design database, represented
  by one event-wide equipment direction per event.

Each class concept overview contains a complete ten-piece set: helmet, chest,
gloves, legs, boots, weapon, offhand, cape, amulet, and ring.

All 17 concepts were accepted and converted into runtime exports on 2026-09-09.
The runtime atlases live in `assets/equipment-ui/`. The manifest and the
equipment contact sheet in `production/` are the final collection-wide visual
checks; redundant copies of the runtime PNGs are deliberately not kept there.

The eight LiveOps catalog concepts intentionally establish event identity before
class multiplication. They do not create new reward bindings or overwrite the
workbook's current cosmetic-only reward rules.

## Shared visual direction

Harvestwake uses worn dark iron, brown leather, amber-gold cloth, wheat and
field-spirit motifs, with deliberately rough square pixels and restrained glow.
Class silhouette and held items remain distinct while the seasonal identity is
shared.

## Production export contract

Each accepted class-specific set has one transparent `2000x800` PNG equipment
atlas using the fixed 5x2 layout: helmet, chest, gloves, legs, boots / weapon,
offhand, cape, amulet, ring. PNG remains mandatory for future sets. Do not use
JPEG, WebP, SVG, or a cropped concept board.

The eight LiveOps catalog sets are registered as production assets but
intentionally remain unbound until those event definitions and reward rules are
implemented.

## Repeatable workflow

1. Read the event definition and reward names before inventing art.
2. Create one concept overview with the complete ten-item set.
3. Check item count, order, silhouettes and rough-pixel treatment.
4. Obtain visual approval and make targeted corrections on the overview.
5. Generate the production atlas from the accepted overview.
6. Verify dimensions, transparency, item-cell padding and mobile-size
   readability.
7. Copy the approved atlas into `assets/equipment-ui/`, register it in the
   static asset maps, and bind its set ID to the event reward logic.
