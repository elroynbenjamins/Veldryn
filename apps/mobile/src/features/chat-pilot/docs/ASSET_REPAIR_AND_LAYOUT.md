# Chat-pilot asset repair and layout contract

## Completed repair work
The previous character and pet emote PNGs were made by dividing whole padded sheets into equal cells. The actual rows
have different offsets. This pass re-cuts the original sheets using measured row gutters and local column separation,
removes low-alpha outer residue, fits each result into a transparent 128×128 canvas with a six-pixel margin, and keeps IDs.
No faces, pet identities, clothing or expressions were re-generated. The contact sheet shows all 64 exported images.

The prior core-navigation cutouts still included miniature labeled cards. The pilot instead extracts actual icon glyphs
from the approved UI atlas. Its portraits are explicitly two sample fixed identities, not a repaired nine-class library.
The Featured Pet sample uses existing Petal Fox emote art; bind reviewed pet-profile art for the final game.

## Exact skin geometry
Button reference sheet was alpha-trimmed to its visible artwork and normalized to **480×168 px**. Slice lines are
**x: 0, 48, 432, 480** and **y: 0, 48, 120, 168**. The nine named PNG pieces have the measured dimensions in the manifest.
The native frame places these pieces explicitly, rather than relying on guessed `capInsets` from a 2000px concept export.
Corners retain a fixed UI size; only the straight strips and background change size. No icon, name or counter lives in a strip.

Recommended corners: **12dp for buttons/tabs; 16dp for a modal**. The browser preview follows those values; match native
`SkinFrame.cornerSize`. Larger source pixels are not evidence of newly created detail. The off/on/disabled treatments
are derived from the same source bounds so the button outline does not jump between states.

## Layout targets
| Element | Pilot contract |
|---|---|
| Header | 720×158 source; ~79–92dp visible height, existing brand title retained |
| Channel tabs | 4 equal-width tabs; 48dp minimum height; labels separate |
| Main actions / input | 48dp minimum touch/control height |
| Message avatar | 48dp square fixed portrait/frame |
| Message row | Variable height, not a fixed background image; 15–16dp text |
| Emote picker | 5 columns × 4 rows from the saved tray; 40–44dp image in ≥48dp touch cell |
| Inline emote | 28dp in rendered message; image preview in composer |
| Mini-profile | Portrait ~88–104dp; two-column actions; vertical scrolling when needed |
| Settings | 20-slot ordered draft + category catalog; save validation, cancel and reset |

The browser renderer is a review implementation, not React Native running in a browser. Both use the same TypeScript
controller and PNG files. Source file dimensions are not screen pixels. Native interpolation, safe area and text rendering
still require real device checks; do not promise that CSS `image-rendering: pixelated` applies to native Image.

## Release boundary
The selected pilot resources have been visually inspected in screenshots and a complete emote contact sheet. They are
`pilot_checked`, not blanket release approval for the entire master pack. Other legacy character/pet/frame files keep their
review flags. Screenshots under `qa/` show actual browser output and are not themselves runtime UI skins.
