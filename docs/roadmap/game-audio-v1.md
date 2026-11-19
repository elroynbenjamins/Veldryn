# Game audio v1

**Date:** 19 November 2026. **Status:** implemented on the working branch. Sound needs a new store build because `expo-audio` is a native module. Current builds stay silent without errors.

## What players get
- **Music:** seven original looping themes:
  - **town:** Home, menus and character creation.
  - **asterfall, sunscar, frostmarch:** the current region's theme in World, Combat and Skills.
  - **dungeon:** dungeons, co-op runs, the Arena and the Ashlands.
  - **boss:** story boss and guild raid fights.
  - **world_boss:** the World Boss fight.

  Tracks crossfade when the place changes.
- **Sound effects:** 39 effects for the moments that matter:

  | Moment | Sounds |
  | --- | --- |
  | Interface | button taps |
  | Rewards | coin collect, character level-up fanfare, skill-level fanfare, exceptional loot, unlocks |
  | Combat | eight impact kinds on every combat screen (hit, crit, heal, shield, interrupt, phase, cast, down), victory and defeat stingers, soft hits while hunting |
  | Crafting | forge claim, enhancement success and failure |
| Rarity reveals | an escalating stinger for Epic, Legendary and Mythic equipment: on the reward screen, the Forge result and the Claim-all summary. It plays once the rarity is on screen (about half a second in, right away with reduced motion, after the fanfare when you also level up). Epic+ gear you auto-sold does not trigger it. |
  | Gathering | pick and axe swings timed to the animation, fishing splash, a pop on every real yield |
  | World Boss | entrance, tonic, telegraph, special, guard break, role moment, world HP drop, killing blow, honors |
- **Settings → Sound:** Music and Sound effects, each Off / Low / Medium / High. Stored on the device, defaulting to Medium, and translated into all languages.

## Rules
- Sound plays only while the app is open, follows the phone's silent mode, mixes with other apps' audio, and never records.
- The microphone permission is explicitly disabled in the `expo-audio` config plugin. The only Android permission added is `MODIFY_AUDIO_SETTINGS`, which players never see.
- Every sound belongs to a real event. A combat sound plays for a logged hit, never as decoration, and plays even with reduced motion on.
- The same effect retriggered within 70 ms is dropped, so bursts of hits don't stack into noise.
- Music never starts before saved preferences load, so a player who turned music off never hears it on launch.

## How it's built
| Part | File |
| --- | --- |
| Generator (original synthesis, deterministic, no samples) | `tools/audio/generate-game-audio.py`: numpy plus ffmpeg. Effects are mono 22 kHz / 64 kbps; music is mono 32 kHz / 80 kbps with seamless loops. |
| Assets and manifest | `apps/mobile/assets/audio/{sfx,music}/*.mp3`, `assets/audio/manifest.json` |
| Asset map (generated) | `apps/mobile/src/theme/audio-assets.ts` |
| Engine | `apps/mobile/src/storage/audio.ts`: lazy and guarded; `playSound`, `setBaseMusic`, `useMusicOverride`, preferences |
| Music choice | `apps/mobile/src/core/music-context.ts` |
| Tests | `tests/game-audio.ts`: files, asset map, budgets, wiring, music choice, preferences. `tests/world-boss-battle-stage-ui.cjs` checks the fight's sounds and theme. |

To change a sound, edit its function in the generator and run `python3 tools/audio/generate-game-audio.py`. Effects, music, the manifest and the asset map are all rewritten, byte-identical on re-runs.

## Budget
About 0.23 MB of effects and 2.4 MB of music; the Android export grows by about 2.7 MiB of assets.

## Next steps
- Listen-test on real phones and adjust per-effect volumes in the generator.
- Commissioned boss themes can replace `boss.mp3` and `world_boss.mp3` at the same paths without code changes; see the [V59 briefs](world-boss-art-and-audio-briefs-v59.md).
- Optional: ambient region beds (wind, birds) and per-class attack voices.
