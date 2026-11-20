# Selected Veldryn soundtrack — staging integration (20 November 2026)

> **DRAFT / NOT CLEARED FOR RELEASE.** These recordings are staged exclusively for internal review.
> Do **not** merge this PR into `main`, distribute the resulting APK/AAB, or run production builds
> containing these recordings until all sample and SoundFont rights are reviewed and approved.

## Approved compositions / filenames

| Runtime music ID | Selected composition | Approx. duration |
| --- | --- | ---: |
| `town` | Lanterns at Hearth | 44 s |
| `asterfall` | First Light | 38 s |
| `sunscar` | Evening Oasis V3 | 47 s |
| `frostmarch` | Soft Snowfall V2 | 50 s |
| `dungeon` | Midnight Machinery (original V9 instrumentation, extended) | 105 s |
| `boss` | Break the Sigil (original V9 instrumentation, extended) | 103 s |
| `world_boss` | Eclipse Protocol (original V9 instrumentation, extended) | 100 s |

The original selected concept MP3 performances were used, **not** the later sample-free
alternate synth performances. Tracks were normalized only if the audio signal exceeded
0.96 peak, encoded at 32 kHz stereo / 96 kbps MP3, and prepared with a 1.5 s
boundary crossfade. Output filenames are identical to the existing Metro `require`
asset map. Consequently, the existing music preference, region selection, base music,
and boss-override code do not change. Existing sound effects are unchanged.

## QA before release

1. Verify all tracks on an actual Android device with headphones and phone speakers,
   including silent-mode, background pause/resume, and music Off/Low/Medium/High.
2. Check loop boundaries in the Expo player (MP3 encoder padding can still cause
   small clicks/gaps; a waveform crossfade alone does not guarantee a gapless loop).
3. Confirm dungeon/boss/world-boss music overrides resume the previous music as intended.
4. Run `apps/mobile/tests/game-audio.ts` and the mobile audio-size/export checks.
5. Have the responsible maintainer establish explicit commercial reuse/redistribution
   rights for the instrument samples used in **all seven tracks**. The V9 concept
   recordings used the TimGM6mb SoundFont (GPL-2.0); re-encoding, extending or
   crossfading that audio does **not** waive licensing obligations. Seek appropriate
   legal/licensing review, a supplier permission or a verified commercially cleared
   re-render before merging and shipping.

## Maintaining this selection

`tools/audio/generate-game-audio.py` now stops before overwriting selected music.
`--only sfx` can still rebuild effects safely. Deliberately restoring the old
procedural default music requires `--replace-selected-music` to prevent accidental
loss of these approved compositions. Do not use that override casually.
