# Ultra Luxe six-set moving player names

Visual catalogue shared across all six collections. The existing Celestial/Draconic verified private preset IDs and palettes are preserved. Abyssal/Paradox names and colors are new review candidates; Sakura/Stormforged colors are refined to keep the darker stop readable. These are player name styles, not animated titles or badges.

| Collection | Preset | Stops | Motion |
|---|---|---|---|
| Celestial | Astral Radiance | #F3C86F, #FFF4D9, #D6E8FF | starlight |
| Draconic | Ember Sovereignty | #FF9460, #FFE0A1, #EE6651 | ember |
| Abyssal | Abyssal Luminescence | #55C8C9, #D4FFF4, #70A9F2 | reverse tidal |
| Paradox | Eternal Refraction | #B9A0F9, #F4EDFF, #8FB5F9 | reverse temporal |
| Sakura | Sakura Radiance | #F5A6C8, #FFF5FA, #E58BB7 | broad petal |
| Stormforged | Stormborn Radiance | #63CFFF, #E0EAF5, #639AF8 | narrow storm |

Closed cubic-eased color paths (A→B→C→A), themed highlight widths and directions, 5,040ms cycle, shared existing 180ms ticker (28 updates/cycle). No per-name timer or extra continuous native loop. Existing reduced-motion/background gating and immediate static phase-zero rendering. Only matching ordered gradient palettes with flow animation use the cyclic renderer; other ordinary styles retain previous behavior. Palette matching is purely visual, not evidence of entitlement; manually matching ordinary Supporter colors may also use the visual algorithm. No entitlement expansion. No animation on badges or profile icons.

Readback numerical sampling: 55,638 glyph colors across all six palettes, 281 phases and four name lengths. Exact cycle endpoints, per-sample RGB channel step ≤3, minimum WCAG contrast against reference #15121E: Celestial 11.70, Draconic 5.85, Abyssal 7.59, Paradox 8.30, Sakura 7.66, Stormforged 6.60. These are numerical samples, not physical-device smoothness or contrast certification across arbitrary backgrounds. Actual ticker is 5.56Hz, unchanged from prior renderer; device QA should assess visible stepping and chat-list load before increasing cadence. Actual regression exercises shared color function, private preset gating and ordinary style fallback, registered in Mobile UX.

Current private picker and grant normalization still expose only the existing two IDs. Sakura/Stormforged review ownership adapter resolves the same shared palette via verified candidate grants and default-closed readiness. Abyssal/Paradox definitions are prepared for #1834 unified authority integration; their server grants, selected-ID persistence and picker exposure are not implemented here. No server, SQL, purchase, grants or deployment. Shared PlayerStyledName surfaces benefit when their verified style arrives; individual chat/profile/ranking callsites and native scrolling performance remain to verify. Branch only; no merge.