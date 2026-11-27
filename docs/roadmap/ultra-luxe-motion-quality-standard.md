# Ultra Luxe motion quality standard — six collections

Owner feedback, 27 November 2026: Draconic public showcase appears nearly static. This is a proposed acceptance gate for all six sets, not evidence that native rendering has passed.

## Required experience
- Motion visibly starts in the first two seconds after the supported profile stage is measured and active, with motion permitted. Aim for continuous distinguishable idle motion, not only a pulse near the end of a 24-second signature.
- Each showcase has independently recognizable ambient movement, authored perimeter motion, a genuinely animated matching pet and a synchronized themed signature. Pet pose atlas must visibly change body parts rather than just shifting the entire image. A matching pet tap provides a finite theme-specific reaction; no tap required for ambient animation.
- Paired background/frame remains visibly animated with no pet or an alternate pet. Full set enhances the signature but does not gate baseline motion. Separate nonmatching effects and verified ownership remain authoritative.
- Public inspection, own profile and expanded wardrobe should have equivalent choreography. Small/large-text fallback and reduced motion remain legible; distinguish fallback limitations in QA, not as evidence of animated quality.
- Keep the name, title, guild and stats readable and stationary, preserve static badges, and respect safe apertures. No full-screen flashing, distracting glow over identity, or abrupt loop seams.

## Theme-specific acceptance
| Set | Ambient and perimeter | Matching pet and signature |
| --- | --- | --- |
| Celestial Sovereign | Drifting stars, orbiting starlight, crest alignment | Clearly visible floating stag head, antler and tail motion; constellation alignment |
| Draconic Dominion | Rising embers, molten rail light and wing glow | Visible breathing/wing movement, flame flare and awakening |
| Abyssal Majesty | Tidal glow, rising bubbles, crystal currents | Leviathan body/fin undulation and deep surge |
| Paradox Eternal | Opposing temporal glints, violet rift pulses | Aeon hovering/pose changes and a smooth time-fold signature |
| Sakura Enchantment | Drifting petals, lantern light, blooming ornament cascade | Fox ear/tail and posture changes; blossom signature |
| Stormforged Sovereign | Moving sparks, charged crest and localized thunder pulses | Direwolf breathing/posture changes; charge and discharge |
 
## Technical constraints
Keep existing shared native scene clock and theme-specific closed tracks; speed subcycles with derived phase rather than additional timers. Keep current per-renderer node budgets, no extra texture decodes or per-frame React state. Stop while covered, closed or backgrounded; honor OS and game reduced motion. No ownership, grants, store, economy or server changes. New authored assets only when existing pose sequences cannot meet visual acceptance, with separate size/performance review.

## Mandatory verification before release
1. Compare a 24-second screen recording for each set on an S24-class Android and a smaller supported device (or record the static fallback explicitly). Inspect first two seconds, first five seconds, peak and seam. Require visible ambient/perimeter movement and distinguishable pet pose changes at normal viewing size. Compare against standard animated cosmetics; do not approve based on source coefficients alone.
2. Repeat public other-player inspection and self inspection, expanded wardrobe, matching/alternate/no pet, full and partial set, open/close/reopen, app background/resume, reduced motion and pet tap. Verify text legibility and clipping. Do not rely on a screenshot to prove an animation is running.
3. Run existing Mobile UX regressions and typecheck. Compare performance with current release under identical conditions: target stable device refresh, no sustained dropped frames, no new timers/listeners/leaks, no meaningful memory or startup regression. Record evidence and device details for each set.
4. Retain draft until CI and visual acceptance are reviewed. If stronger coefficients are not sufficient, revise pose atlas/artwork and native composition in another review pass.

## Current change scope
Early envelope strength for Celestial, Draconic, Abyssal and Paradox; more visible moving particles for Celestial/Draconic and Sakura/Stormforged; stronger existing pet-side glow for Abyssal/Paradox; Draconic flame and lift tuning. No claim that body-part animation, signature distinctness or cross-device performance now meets the complete standard.
