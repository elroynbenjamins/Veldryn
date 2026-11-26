# Selected Veldryn soundtrack integration — 25 November 2026

Preserve the six approved regional and battle compositions. The separate Town track is retired per maintainer direction: regular screens continue playing the current region, and stale Town preferences fall back to the relevant region/activity. Import the five original performances from PR #1489 without changing the six remaining music IDs, context routing, or sound effects.

| Context | Recording | Seconds |
|---|---|---:|
| asterfall | First Light | 38.09 |
| boss | Break the Sigil V9 — extended original instruments | 102.92 |
| dungeon | Midnight Machinery V9 — extended original instruments | 105.26 |
| frostmarch | Soft Snowfall V2 | 50.04 |
| sunscar | Evening Oasis V3 | 46.51 |
| world_boss | Eclipse Protocol V9 — extended original instruments | 99.79 |

Original masters were previously prepared as 32 kHz stereo / 96 kbps MP3 with 1.5-second boundary crossfades. Combined six-track set approximately 5.31 MB; budget 7 MB total and 1.5 MB per loop. Existing generator lock prevents overwriting selected music. No SF2 asset is added.

Permission and attribution: [sample-rights evidence](selected-music-sample-rights-evidence.md). Owner accepts use as-is; this does not constitute a blanket third-party GPL waiver.

QA: run mobile audio tests and export checks; listen on Android with headphones/speakers, test loop seams, silent mode, background/resume, volume settings, context overrides and return to prior music. No new native module or production deployment is required for source integration; a new app build is needed to deliver bundled music to players.
