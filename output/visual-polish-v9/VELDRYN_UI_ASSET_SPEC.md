# VELDRYN profile wardrobe v9

The wardrobe reuses existing profile backgrounds, profile borders, event companions, regional art, and the approved character portrait. No new bitmap or font dependency is introduced.

Cosmetic tiles are 160dp wide, with an 88dp clipped artwork area and room for a two-line native name. Status appears in a compact pill over the artwork. Selected tiles use a crystal outline and surface, while the status changes to Previewing. Locked event items remain selectable for preview but cannot be applied; preserve that distinction between preview and ownership.

Transparent profile borders should be rendered over a muted scene with absolute 100% width and height and `contain`. Do not display them against an empty transparent checkerboard or stretch them. ProfileScenePreview remains the authoritative full composition.

Wardrobe tabs form one horizontally scrollable tab list. Each tab is at least 44dp tall and exposes selected state. The selected surface is dark blue with a 3dp gold underline. Keep long tab labels native and horizontally scrollable.

Earlier versioned specifications cover source masters, transparency, density siblings, startup scenes, event themes, and the larger UI kit.
