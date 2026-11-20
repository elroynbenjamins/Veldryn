# Selected Veldryn Town and Asterfall music — original-synthesis review

**Date:** 20 November 2026. **Status:** separate review PR; not merged/released.

Two of the seven selected concept MP3s were rendered with original synthesized voices,
not with a third-party SoundFont or external instrument samples. The accompanying
composition source and README are in the user's Veldryn concept archive,
`veldryn_alternative_music_concepts.zip`, from the November 20 music review.

| Runtime ID | Song | Duration | BPM | SHA-256 of staged MP3 |
| --- | --- | ---: | ---: | --- |
| `town` | Lanterns at Hearth | 44.10 sec | 88 | `a9f8db961ba798e3e8ccdf30204357f83d10e8065a36c35a8bc02f95c8429537` |
| `asterfall` | First Light | 38.09 sec | 102 | `5627d558c2dcefd16c28c809272fcccee8e86703b87b3e38095fddf910839324` |

The two audio files are copied directly from the already staged PR #1489 using
Git object SHA references, so the approved audio bits are identical.
They are at the existing Metro asset paths and require no routing changes.

## Playback and release checks

- Run `apps/mobile/tests/game-audio.ts` and export-size validation.
- Listen for loop transitions on real Android headphones and speakers; a waveform
  crossfade is not sufficient to guarantee gapless MP3 playback in every player.
- Verify settings Off/Low/Medium/High, app background pause/resume, and transitions.
- Confirm source-to-render provenance and approval of final masters.
- Do not merge this PR until CI and listening checks are completed.

## Other selected tracks

Sunscar V3, Frostmarch V2 and all three V9 battle themes remain in the distinct
rights-review draft PR #1489. Their TimGM6mb sample rights must be verified separately.
