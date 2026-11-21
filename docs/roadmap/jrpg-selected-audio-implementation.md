# Selected JRPG music and crafting SFX (review branch)

November 21, 2026. This is **not cleared for release** and **must not be merged** until the assets and licensing are verified.

## Approved listening selections
- Asterfall: First Light, option 1 — `asterfall.ogg`, 21.099 seconds.
- Sunscar: Amber Dunes, option 1 — `sunscar.ogg`, 19.394 seconds.
- Frostmarch: Crystal Snow, option 1 — `frostmarch.ogg`, 23.415 seconds.
- Dungeon/Co-op: Forgotten Citadel, option 4 — `dungeon.ogg`, 16.552 seconds.

Those are the exact user-selected composition previews; **do not substitute** the older tracks that currently share the same runtime IDs.

## Ten quiet crafting sounds
`smith_hammer_1`, `smith_hammer_2`, `smelt_bellows`, `smelt_pour`, `forge_ignite`, `forge_quench`, `woodwork_plane`, `tailor_stitch`, `alchemy_bubble`, `cooking_sizzle`.

- UI uses `playCraftStarted(recipeId)` once after an accepted start, and `playForgeClaimed()` on claim.
- No sound on a rejected action, failed command, passive time tick, auto-queue item, or background state.
- 800 ms global cooldown, soft per-cue gain, and the existing Sound Effects Off/Low/Medium/High setting.
- SFX are procedurally generated original files, no third-party samples.

## November 22 implementation progress (review branch)
The ten crafting cues now have original procedural synthesis source in
`tools/audio/generate-game-audio.py`, confirmed-action trigger wiring, and
`apps/mobile/tests/game-audio.ts` coverage. A branch-scoped Actions workflow
(`.github/workflows/render-crafting-sfx-review.yml`) renders MP3s, updates the
Metro asset map and manifest, checks duration/budget, and commits its outputs.
Until its generated binary commit is verified, **do not claim the cues are packaged**.
These self-synthesized crafting cues use no third-party audio samples.

The earlier review ZIP is still the authoritative source for the **four exact
music selections**, not the older tracks under the same runtime IDs. Neither
an unverified ZIP nor the GPL-linked music preview should enter main/release.
The ZIP installer now replaces existing cue entries instead of duplicating them,
so a future reviewed source can be staged without breaking the asset map.

## Sample-free original replacements (November 22)

The generator `tools/audio/render-cleared-jrpg-music.py` now contains **four
new, sample-free compositions**, with exact eight-bar durations and muted
JRPG-style instrument synthesis:

| Scene | New arrangement | Tempo | Loop length |
| --- | --- | ---: | ---: |
| Asterfall | First Light | 91 bpm | 21.099 s |
| Sunscar | Amber Dunes | 99 bpm | 19.394 s |
| Frostmarch | Crystal Snow | 82 bpm | 23.415 s |
| Dungeon/Co-op | Forgotten Citadel | 116 bpm | 16.552 s |

No TimGM6mb data, pre-recorded SoundFonts, third-party samples, or proprietary
instrument recordings are required. The synthesis source was committed and the
review ZIP contains OGG, MP3 and WAV renderings and hash manifest. This is an
**original reinterpretation**, not a note-for-note reproduction of the
inaccessible older preview audio. In particular, the **older preview recordings
must remain excluded from release** because their licensing is unresolved.

The branch-scoped `render-crafting-sfx-review.yml` workflow now renders these
new tracks and ten crafting effects, then attempts to commit the resulting
packaged MP3 files, asset manifest and test updates to this **review branch**.
Until binary files and CI are confirmed, the feature remains **not build-ready**.
For Android audio QA, listen for loop clicks/gaps, balance, muted mode and
switching scenes; MP3 playback may require native loop-delay validation.

## Asset installation
The ChatGPT audio review ZIP includes four music OGGs and ten SFX MP3s with the required file names and SHA-256 provenance.

To stage those exact binaries into this branch locally:

```bash
git switch feature/selected-jrpg-music-crafting-audio
python3 tools/audio/install-selected-jrpg-audio.py /path/to/Veldryn_Music_and_Crafting_SFX_Integration_Review.zip --dry-run
python3 tools/audio/install-selected-jrpg-audio.py /path/to/Veldryn_Music_and_Crafting_SFX_Integration_Review.zip
```

Then commit the updated `assets/audio`, manifest, generated audio map, test contract and generator files. The installer removes replaced MP3s, adds their OGG replacements, updates the sound asset map and extends the audio manifest/test contract.

Run mobile typecheck and `apps/mobile/tests/game-audio.ts`; verify the four music scenes, one-shot crafting cues, mute, silent mode, resume and true gapless playback on an Android release build. These short loops should also be evaluated for repetition fatigue.

## Rights and release gate
The four preview files were rendered using TimGM6mb, distributed under GPL-2; this is **not CC0** and is **not a blanket commercial redistribution clearance**. They are explicitly marked `REVIEW_ONLY_PENDING_TIMGM6MB_GPL_REVIEW` in the staged manifest. Legal/license obligations for shipping the rendered music must be resolved, or the compositions recreated with appropriately cleared instruments, before release.

Do not release this draft, overwrite the marked provenance, or merge a pull request that references missing audio assets. See the draft pull request for tracking.
