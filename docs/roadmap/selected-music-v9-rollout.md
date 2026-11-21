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


## Rights resolution plan (20 November 2026)

The musical *compositions* can be preserved. The release blocker concerns the sampled
instrument recordings embedded in the MP3 exports, not the MIDI note data.

### Route A: keep the currently staged recordings (preferred for sound fidelity)

1. Identify the exact SoundFont and any other sample libraries used for **each of the seven**
   source mixes; store source/version/checksum and a copy of the license notices.
2. Review TimGM6mb GPL-2.0 and its embedded sample provenance. The bank credits
   Tim Brechbill (2004) and David Bolton (2010), and its historical notes indicate
   some sampled instruments came from other GPL/public-domain sources. The GPL is not
   a blanket commercial-use prohibition, but it also does not automatically prove
   the rendered sample-based recordings can be shipped without obligations.
3. Obtain written permission from all rights holders whose permission is necessary,
   **or** obtain legal approval of a compliant release path under existing licenses.
   Written permission should specifically cover sample-derived rendered audio in a
   proprietary/commercial mobile game, App Store / Google Play distribution, territories,
   updates, looping, processing, monetization, attribution, and any required notices.
4. Store approval evidence and attribution instructions with this PR. A verbal assurance,
   minor remaster, re-encoding, track extension or MP3 crossfade is not clearance.

### Route B: commercially cleared re-render (fallback)

1. Keep the same selected MIDI/score, tempo, structure, notes and recognizable motifs.
2. Choose a documented audio-source bank with clear commercial recording rights.
   FluidR3Mono is a candidate with a published MIT license; obtain the exact official
   archive and preserve its license/attribution. GeneralUser GS permits commercial music
   under its own license, but explicitly documents uncertainty about some sample origins,
   so it is less desirable without follow-up review.
3. Render and master all seven tracks with the chosen instruments; compare rhythm,
   bass, guitar/brass character, loudness, loops and transitions against the currently
   approved recordings. No substitute may silently replace an approved mix.
4. Obtain explicit listening approval before swapping any staged binary assets.

### Release gate

- [ ] All seven track sources and relevant sample licenses inventoried
- [ ] Written rights evidence or documented professional legal clearance
- [ ] Required notices/credits packaged in the app if necessary
- [ ] Final approved audible mixes rendered, verified and linked to source assets
- [ ] Device playback, loop behavior, export size and CI tests pass
- [ ] User explicitly authorizes release of the final master recordings
- [ ] Only then mark PR ready / merge to main

References:
- TimGM6mb package/license: https://github.com/arbruijn/TimGM6mb
- MuseScore SoundFont documentation: https://musescore.org/en/handbook/2/soundfonts-and-sfz-files
- FluidR3Mono published license: https://github.com/musescore/MuseScore/blob/main/share/sound/FluidR3Mono_License.md
- GeneralUser GS license: https://github.com/ROCKNIX/generaluser-gs/blob/main/LICENSE.txt
