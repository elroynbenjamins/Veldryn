# Standard animated cosmetics — Wave 2
Status: owner-approved direction; production design pass, review only. No catalog additions, grants, commerce, release flags or live code changes in this pass.

## Baseline verified on main (26 November 2026)
The standard catalog currently contains Gloamward, Frostbound Chime, Amberglass Loop and Briarbound. Each SKU comprises one animated border, one effect and two independently equippable portraits. Checkout is disabled. The standard motion profiles use eight ornament glow anchors and five particle tracks per set; #1797 improved size, visibility and safe perimeter mapping and #1814 consolidated native motion lifecycle. #1817 provides ownership-gated quick equip. The V3 imported artwork registry remains empty on main; procedural effects and registered fallback borders are not proof of approved V3 artwork. Do not use premium or existing dungeon artwork as a substitute for new final frames.

## Set design matrix
| Set | Border | Effect | Portraits | Accent | Suggested loop |
|---|---|---|---|---|---|
| Tideborne | Tideborne Pearlframe | Tidal Reverie | Tideborne Siren / Tideborne Corsair | #94E4DD | 13.2 s |
| Clockwork Covenant | Clockwork Mechanism | Aetherwork Pulse | Covenant Artificer / Covenant Engineer | #86C3AD | 12.0 s |
| Stormforged | Stormforged Thunderframe | Static Surge | Stormforged Tempest / Stormforged Sentinel | #91BEFF | 10.8 s |
| Crimson Oath | Crimson Oathguard | Scarlet Reverence | Crimson Justicar / Crimson Knight | #D76381 | 13.2 s |

All names, IDs and timing values are design proposals, not released identifiers. Standard only: no dedicated animated background, pet, badge, title, blessing or stat bonus. Preserve mixed sets and independent selection. No standalone purchase changes. Account-wide ownership; use the existing equipped-field scope and canonical social portrait behavior, not a new save path.

## Shared production contract
- Match the actual standard frame aperture and segmented frame layout; calibrate from approved pixels, not guessed coordinates. Use restrained ornaments and preserve readable name, guild, badges, equipment and pet area. No opaque center, accidental backdrop tint or glow spill outside the stencil.
- Pixel-art matching existing Veldryn visual style. Native-sized portrait samples must be readable at 64dp and 96dp; same head scale, eye line, silhouette margins and pixel density. Transparent frame aperture and isolated transparent effect sprites; no baked name, character, labels, or background.
- At most eight border glow anchors and five effect tracks per standard set; a rotation or traveling edge highlight replaces an existing channel, rather than adding animated nodes without profiling. Reuse shared native timing, stable memo boundaries, noninteractive loops and foreground/viewport/reduced-motion policy. Static fallback while unknown/inactive; no JS per-frame timer, network polling, or new listener pair.
- Frame motion must remain visible when the effect is unequipped; effect-only use must be readable against different existing scenes. Peak opacity and sizes stay within the current standard envelope until device review. Seamless phase wrap, no flash on reentry, no full-screen flashing. Quality and thickness must remain below dedicated Ultra Luxe composition complexity, without reducing standard art craftsmanship.
- Verify rights/provenance and retain separate originals plus hashes. Import the exact reviewed assets with validated dimensions, alpha, path/reference completeness and no atlas overlap. Existing V3 importer is pinned to the original four-set archive; do not broaden or bypass its checksum. New import manifest must be independently versioned.

## Pass 1 — Tideborne production brief
Target: bright coastal sea magic, not deep-ocean eldritch luxury. Palette: deep ocean #123C50, turquoise #2AA9B0, seafoam #94E4DD, pearl #E1E8D8. Slim weathered silver/sea-glass rails, restrained shell ornaments in the corners, pearl centerpiece, curling wave engravings. No crown, tentacles, abyssal monsters or oversized ornaments. The sea-glass highlights should remain distinguishable from Frostbound's icy crystalline silhouette.
- Siren: sea-green travel attire, pearl clasp, windswept hair, shell ornament, confident expression; no fish tail required in bust portrait.
- Corsair: navy coastal coat, sea-glass buckle, weathered silver trim, nautical collar; matching palette and bust framing, not a recolored Siren.
- Border: eight proposed channels (four corner pearls, top/bottom center crests, two mid-edge sea-glass channels). Soft staggered pulses with a travelling rhythm; lock centers to actual authored ornaments after art review.
- Effect: five tracks, three bubbles rising near the outside edges, one curved seafoam mote, one subtle pearl glint. No broad overlay covering face or labels. Start with 13.2 s shared phase; vary per-track phase and direction. Make motion clearly different from upward Ember Motes using rounded bubble silhouettes, lateral sway and calmer pacing.
- Asset review gate: independent transparent frame, two portraits, reusable alpha-clean bubble/seafoam/glint sprites (or procedural equivalents), static representative effect and calibrated aperture/ornament manifest. A concept sheet is not a production asset.

## Pass 2 — Clockwork Covenant
Antique brass, dark oxidized bronze, mint-aether inlays. Compact corner cogs, riveted straight rails, small central dial. Artificer and Engineer have matching workshop tailoring and different readable silhouettes. Eight proposed motion channels include two low-speed corner gear rotations and six sequenced glows; do not add rotations to eight existing glows. Five sparse spark/aether tracks. If rotation is not affordable in native profiling, use light traveling around stationary gear teeth. Not a modern sci-fi HUD.

## Pass 3 — Stormforged
Gunmetal and stormsteel with electric blue and restrained pale-gold inlays. Angular corners and restrained lightning etching. Tempest and Sentinel have storm-weathered cloth/armor with distinct profiles. Eight channels use staggered edge flickers and crystal pulses, not aggressive strobing; five short spark tracks mostly near sides. No high-contrast full-screen flashes, large luminance changes or lightning over portrait. Reduced motion static.

## Pass 4 — Crimson Oath
Burgundy, silver, muted rose and deep ruby. Knightly engraved rails, restrained rubies and silver floral accents. Justicar and Knight in differentiated red-and-silver heraldic attire. Eight slow jewel/edge glows and five tracks of petals/glints; falling petal motion should not resemble Briarbound's green leaves. Avoid blood imagery, large crowns, and ultra-luxe-style full-stage effects.

## Integration and verification order
1. Approve Tideborne artwork and exact native frame/portrait geometry; record file dimensions, checksums, anchors and crop behavior.
2. Implement in a hidden/dev review surface first. Extend typed collection, effect/portrait IDs, runtime motion types and art asset registration consistently; no entries in visible shop, ownership grants or released catalog until explicitly approved. Add static fallback and mixed combinations; keep legacy IDs unchanged.
3. Audit store SKU/ownership projection, shared backend commerce allowlist and generated bundles, quick equip, social icon atlas, remote rendering, translations for all eight languages, collection totals and release fences before any catalog activation. No production migration unless required and separately approved.
4. Run focused runtime, geometry, visibility, commerce, quick-equip, portrait, localization and release-fence tests, then exact-head CI. Review screenshots at 260/340/480dp and portrait sizes 64/96dp; compare Android frame pacing, memory, input responsiveness, background/resume, reduced motion, and offscreen behavior against current standard sets. No measured performance claim before device testing.
5. Apply the same reviewed contract to Clockwork, Stormforged and Crimson Oath in that order. Compare all eight standards together before release, and keep Ultra Luxe separate.

## Current blockers
No production-ready new art has been imported, no new animation runtime has been integrated, and no native screenshot or performance QA has been performed. The original standard V3 registry is empty; legacy fallback rendering is not final-art verification. This document intentionally introduces no player-facing content.
