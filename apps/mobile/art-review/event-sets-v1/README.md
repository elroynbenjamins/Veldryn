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

These are review concepts, not runtime exports. After visual approval, each
accepted board should be regenerated/exported as a dedicated transparent 5x2
equipment atlas plus separate 1024x1536 male and female front portraits.

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
