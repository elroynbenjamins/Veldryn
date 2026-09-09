# Accepted equipment set skins — front v1

This batch contains 29 accepted equipment appearances: all 27 regional
progression sets, Aster Iron, and Runespark Adept. Every set has one male front
portrait, one female front portrait, and its uncropped two-character source
strip. `review-contact-sheet.png` shows the complete batch.

## Production prompt set

Each generation used the accepted male and female base mannequins as immutable
identity references and one accepted 5×2 equipment atlas as the outfit authority.
The prompt required exactly two full-body front views, male left and female
right; identical neutral upright posture, stance, scale, and ground line; the
set helmet worn; the weapon held on viewer-left; and the offhand held on
viewer-right. It also required faithful armor, cape, accessory, and held-item
designs, hard square pixel rendering, the original dark vignette, and no back
view, action pose, effects, text, smooth painting, antialiasing, or 3D styling.

## Runtime policy

New equipment-set skins are front-only. The character renderer falls back to
the front portrait if an older caller requests a back view. Older beginner back
art remains available but is no longer required for new appearances.
