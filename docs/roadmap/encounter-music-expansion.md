# Encounter soundtrack expansion (25 November 2026)

Keep all six selected original recordings from #1763. Town remains retired. Do not overwrite them. Regional alternatives A/B are not selected.

## Planned assignments

| Encounter | Track |
|---|---|
| Asterfall dungeon | dungeon (Midnight Machinery V9) |
| Sunscar dungeon | dungeon_A (Iron Cathedral) |
| Frostmarch dungeon | dungeon_B (Clockwork Descent) |
| Frostfall dungeon | frostfall_dungeon (Bells of the Frozen Citadel) |
| Regular bosses | boss (Break the Sigil V9), boss_A (Shatter the Crown), boss_B (No Retreat); assign by stable boss identity once all boss IDs are verified |
| Hollowroot (hollowroot) | world_boss (Eclipse Protocol V9) |
| Solbrand (sunscar) | world_boss_A (Heavenfall Engine) |
| Rimewarden (frostmarch) | world_boss_B (Last Light of Eternity) |

The three world-boss IDs are verified in world-boss-presentation.ts. Dungeon region assignments are proposed; use authoritative encounter/run identity, not current selected character region or difficulty tier. Event theme takes precedence over normal dungeon theme. No random restart on phase, node, tier or replay update. The new tracks should remain available for manual preview/selection without introducing new mute contexts. Separate music context IDs from track IDs; context mute and explicit track remaps win over encounter defaults. Maintain existing override stack and return to correct region on close.

## Rendering

`python3 tools/audio/render-encounter-music.py` renders into a staging-only directory. Original MIDI arrangements, same TimGM6mb instrumentation as the approved A/B previews. Winter track uses bells, celesta, guitar and strings. Three score cycles, middle cycle extracted, 12 ms raised-cosine seam correction, exact bar duration, stereo MP3 32kHz/96kbps. Decoded loop lengths checked and peak/seam checked. Prior local renders of all seven passed decode, peak and seam checks; 4.21 MB total. Actual Android gapless behavior and listening still require device QA. Existing six current recordings were not re-rendered.

TimGM6mb creator permission and caveat recorded in #1763; do not bundle SF2. New recordings use same bank; third-party GPL uncertainty remains, do not assert unconditional clearance.

## Merge gate

Render staging MP3s, verify byte identity or listen to any platform-render differences, move seven assets into apps/mobile/assets/audio/music, add manifest and static asset map, update budget to a measured limit (e.g. 10.5 MB for ~9.52 MB combined), extend preferences with separate track IDs, wire stable dungeon/boss encounter defaults, test legacy remaps/mute/overrides/preview/background and actual Android loops. No runtime wiring or game asset change in this source-only draft.
