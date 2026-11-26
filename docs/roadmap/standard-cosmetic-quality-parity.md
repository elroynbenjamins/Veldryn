# Standard animated quality parity — 26 November
Owner-approved visual hierarchy: static cosmetics -> Animated cosmetics -> Premium animated sets (Ascendant/Ultra Luxe). Static cosmetics retain high quality artwork; standard animated collections share a quality and motion envelope; premium distinction comes from additional synchronized layers, scenes, pets, exclusive static badges and dedicated composition, not artificially poor standard art.

## Implementation
- Normal wardrobe groups only existing visible rows into static, animated and premium sections; no new unlocks, rows or visibility exceptions. Matching static portraits are grouped by their set, not claimed to animate. Ordinary reward fallback IDs remain static. Sections appear only when relevant; labels localized in all eight languages.
- Correct the personal ProfileScenePreview to use the normal Wave 2 ownership and combined native art registry, as the public profile, stage and wardrobe already do. Preserve legacy tester visual resolution for existing content.
- Add standard parity regression to mobile core list, including exact imported asset hashes/dimensions, 8 visible glow positions and 5 tracks, 12s border clock, 10.8–13.2s effect cadence, .86 peak border opacity, bounded particles, comparison to standard reference range with 15% tolerance and exactly one clipped sprite fragment per glow. Ready sets must have an asset manifest. Future manifests must add actual motion profile support before passing. No new premium animations or gameplay changes.
- Current main has been reconciled and generated gameplay/co-op bundles committed in d1a0267. Remove temporary branch-only regeneration workflow. Exact-head CI must still pass; earlier generated-head workflows reported action_required, not success.

## Measured authored motion at 340x205 dp
| Set | Mean particle opacity | Mean glow opacity | Opacity-weighted particle bounding area (dp²) |
|---|---:|---:|---:|
| Gloamward | .297 | .326 | 174.0 |
| Frostbound Chime | .315 | .304 | 185.9 |
| Amberglass Loop | .309 | .395 | 147.3 |
| Briarbound | .300 | .456 | 165.3 |
| Tideborne | .313 | .394 | 187.4 |

Independent execution of read-back frame geometry and motion helpers (TypeScript annotations removed) plus actual manifest and registry anchors confirms parity envelope and eight single-fragment glows at 104x72,260x174,340x205,480x270. This is a numerical authoring proxy, not actual pixel-weighted luminance, visual quality, frame-time or device profiling. Tideborne is slightly above the baseline area at smaller sizes but within tolerance. No particle or glow intensity increase needed. Existing sets unchanged. Imported Tideborne PNGs verified earlier against all seven pinned hashes.

## Art approval still mandatory
Check all eight together on the same in-game profile/background/portrait layout at 104/260/340/480 widths, plus 64/96dp portraits. Compare perceived ornament thickness, rail continuity, pixel scale, silhouette, readable details, contrast, effects visible independently, no overlap with foreground, static reduced-motion fallback, and frame/memory/input performance on Android. No set-specific extra animated nodes without profiling. For Clockwork, gear motion replaces glow channels, not an extra layer. Stormforged avoids harsh flicker; Crimson Oath petals need a different motion silhouette than Briarbound. Premium scene complexity remains separate. Clockwork, Stormforged and Crimson Oath assets are not yet produced; no claim of visual equivalence to those sets. Tideborne is imported but not certified. Existing V3 legacy bitmap registry still empty; dedicated existing fallback/procedural art is the currently verified source baseline, not the missing approved V3 master.
WAVE2_READY_SET_IDS remains empty. IScaredMeAHat grant remains pending until each set passes actual normal wardrobe, server ownership/persistence, remote projection, CI and device readiness. No preview-only access, auto-equip, production grant, activation, main merge or deployment.
