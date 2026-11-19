# World Boss V59 — art and audio production briefs

**Date:** 19 November 2026. **Status:** commissioning briefs; nothing here is generated or shipped yet. The hidden fight screen (`WorldBossBattleStage`) already plays real recorded fights with a framed placeholder where the boss art goes. Its `bossArt` prop is the drop-in slot for the first commissioned sprite.

## Art: three bosses

Match the existing Veldryn pixel-art style used by the guild bosses (`assets/guild-bosses/*.webp`, 384×480 RGBA): high-contrast silhouettes, clean pixel clusters, limited palettes, transparent background. No text, borders or rarity frames baked into the art. The party is shown with class emblems, so no character figures are needed.

| Boss (display / ID) | Silhouette | Palette | Phase overlays (armored → exposed → enraged) | Signature specials (wind-up + impact frames) |
| --- | --- | --- | --- | --- |
| **Hollowroot** / `hollowroot` | Colossal asymmetrical trunk-and-branch shoulders, cracked warm-amber core, moss, tangled root legs | forest green `#365746`, bark `#6A5643`, amber heart `#F3B45C` | thick bark plate → glowing exposed core → red-orange splitting roots | `ROOT_SLAM`, `SPOREBURST`, `SPLINTERSTORM` |
| **Solbrand** / `sunscar` | Side-curled plated desert wyrm facing forward, wide obsidian jaws, copper sand plates with ember seams | rust `#B65F38`, sand `#D9AA68`, obsidian `#352F35`, ember `#F3A147` | sand armor → bright exposed seams → storm-blown fury | `SANDBREAKER`, `BURNING_TEMPEST`, `SOLAR_COLLAPSE` |
| **Rimewarden** / `frostmarch` | Hollow ancient ice sentinel with an off-centre luminous eye, giant runic shield, crystalline pauldrons, trailing glacial cloth | ice cyan `#7AC9E2`, steel blue `#496A91`, night navy `#253B58`, cold white `#DFF5F7` | solid aegis → fractured shield → whiteout rage | `ICE_SPEAR`, `FREEZING_CHAINS`, `WHITEOUT` |

### Deliverables per boss
| File | Size | Use on screen |
| --- | --- | --- |
| `master.webp` | 768×640, transparent | Boss frame idle (`bossArt`). |
| `phase-armored.webp`, `phase-exposed.webp`, `phase-enraged.webp` | same canvas as master | Overlay chosen from the fight's frozen phase. |
| `windup-<ability>.webp` (×3) | same canvas | Shown during that ability's telegraph beat. |
| `impact-<ability>.webp` (×3) | same canvas | Shown on the arena-wide special beat, alongside shake, flash and haptics. |
| `portrait.webp` | 384×480 | Overview, notifications and the Sigil shop. |

Path: `apps/mobile/assets/world-bosses/<id>/`. That is 11 images per boss and 33 in total. Keep each file under about 120 KB (WebP), so the full set stays under about 4 MB of app size.

### Acceptance
- Readable at phone width, with the boss frame at roughly 78% of screen width.
- Phase and attack frames align pixel for pixel with `master`, so swapping frames never jitters.
- Light and dark themes both read well against the region backdrop (`SCENE_BACKGROUNDS.forest`).
- Reviewed in the dev-only Feature Preview with "Watch a recorded World Boss fight".

## Audio

**Update:** a first full pass of original synthesized music and effects is implemented. See [game audio v1](game-audio-v1.md). The table below remains the brief for commissioned replacements, which drop in at the same file paths.

| Piece | Scope |
| --- | --- |
| Engine | Add `expo-audio` (a native dependency, so it needs a new store build, like `expo-haptics`). Load it lazily and guard every call, like `storage/haptics.ts`. |
| Settings | Device-local Music and Sound volume (0–100%), plus mute when the app is backgrounded; follow the haptics preference pattern. Respect the phone's silent mode. |
| Music | One battle theme per boss with an intro, a loop and a climax layer, keyed to the replay's `act` (opening, onslaught, climax), so intensity rises without revealing length. One shared victory sting. |
| Sound effects | Telegraph warning, special impact (one per boss), guard break, role moments (guard, cleanse, interrupt), character down, world HP drop, threshold crossing, killing blow. Map them 1:1 to replay beats; never trigger a sound for an event the log doesn't contain. |
| Budget | About 1.5 MB per theme (AAC/OGG, mono or narrow stereo) and about 25 effects at under 40 KB each. Roughly 6 MB in total. |
| Licensing | Original commissioned or properly licensed audio only, with the license files kept in the repo. |

**Recommended order:** commission Hollowroot art first, the first boss in the rotation, and review it on the real fight screen. Then the other two bosses. Audio runs in parallel as its own project.
