# VELDRYN Classes & Skills 2.0 — Mobile UX and Combat Pass (v0.7)

**Status:** development-only draft PR #1377. UI preview is intentionally not routed or enabled in production. No live API, no production migration, no item conversion or gameplay release.

## Feature entry and navigation

- Players find **Builds & Skills** under Character, next to their class identity/equipment. Do **not** replace the existing global Skills tab (gathering/crafting) or existing two combat-discipline XP bars.
- One concise four-tab mobile hub: **Overview / Skills / Talents / Builds**. Tabs remain visible at the top of the scroll region; the game’s five-item navigation stays unchanged.
- Compact status header: class, level, one chosen specialization, resource name/cap, and a concise explanation of how it earns/spends. Resource displays 0/x during build editing; actual stacks are shown only in combat.
- All actions in the current React Native preview change **local draft state only**. A visible development-preview banner states this explicitly. Screen is not imported into live App navigation, and SKILLS_V2_PUBLIC_ENABLED=false.

## Screen 1 — Overview
- Two specialization cards: distinct playstyle description, selected state, Lv 10 lock, Lv 50 capstone preview.
- Three active slots from Lv 10 (two before), each displaying skill, selected variant and cooldown. Tapping a slot opens relevant skill detail. Changes made outside combat in final release.
- Separate read-only summary for the current pair of trained combat disciplines, preserving existing progression.
- A contextual gear-affinity explanation (recommended stats, never an enforced meta build) and one-line guide to class resource.

## Screen 2 — Skills
- Six compact skill cards per class. Collapsed overview: identity, availability, cooldown and Equipped/Locked.
- Expanding a card reveals **all three named variants with their actual design descriptions**, a visually selected radio-like state and a single action to equip into a chosen slot.
- Skill/variant locks: skill levels 1/1/10/20/30/40, variants require Lv 20. Keep locked content visible with why it is locked.
- Each touch target at least 44px. A separate selected-slot control avoids surprise replacements; no silent change to equipment, potions or companions.
- Future production comparison sheet: before/after cooldown, effect type, duration and damage/healing tradeoff based on server-owned numbers, not untrusted client predictions.

## Screen 3 — Talents
- Three clearly named branches × three visible nodes; compact sequential cards, not a sprawling canvas tree requiring zoom.
- Invested ranks 0–3; visible remaining point budget (1 point at Lv 10,15,...,50), prerequisite hints, plus/minus actions, and safe retraction without invalidating downstream prerequisites.
- Two selected **signature passive slots** unlock at Lv 30 and require invested nodes; slotting does not double the passive's power.
- Every node now has its actual draft effect description; missing implemented passive effects remain disabled by the server. Real Gold respec cost must be previewed and confirmed before a production reset.
- Avoid invisible lock-state and do not route to live account commands.

## Screen 4 — Builds
- Two preview presets ('Farming' and 'Dungeon'); explicit Save / Apply. Each preset is a local snapshot, not a replacement for existing gear + companion loadouts.
- Future server data model: stable character ID, versioned build schema, selected specialization/skill variants/passive ranks/signature slots, equipment instance references and optional contextual auto-cast priorities.
- Disallow build switches during active battles/dungeon phases; validate ownership, class compatibility, level gates and equipped items atomically; server returns human-readable errors for blocking changes.
- On final release, preserve existing saved gear/food/companion presets; offer a deliberate *link to existing preset* rather than silently overwriting them.

## Supporting screens
- **Combat HUD:** show a small class-resource meter near the player identity (3 or 5 pips), skill cast names/cooldowns, and brief gain/spend animations. Respect reduced-motion and never hide boss cast/interrupt telegraphs.
- **Gear inspection:** one collapsible 'Build synergy' row explaining skill-relevant affix rolls and exact set thresholds; role/class weapon restrictions shown before crafting/equipping. Avoid a falsely authoritative 'best build' recommendation.
- **Skill detail sheet:** three variant choices with a single selected state, explicit power/cooldown tradeoffs, condition/target labels, and an optional short help explanation rather than long flavor text.
- **Training:** existing two class disciplines remain separate from new talents and skill variants, including all current XP.

## Mobile UI/UX quality checklist
- Responsive at 320px, 375px and tablet widths; max content width around 720 on tablet; font scaling supported, text wrapping without clipping, tappable targets >=44px.
- Per-theme surface/contrast using useGameTheme (obsidian/ember/ivory), reserved accent for selected state, meaningful lock and success text rather than color alone.
- Screen reader role/selected/disabled/expanded states; clear focus order and live announcements for local draft changes, no gesture-only interactions.
- No fake persistent actions: client preview explicitly says nothing is saved, so no silent Gold charge, no live events, no combat validation bypass.
- Localize all copy into English, Spanish, German, Russian and Turkish before live exposure; concise copy, predictable numeric formats and user-visible cooldown seconds.
- Show "New" badge only on first visit in eventual release, not in permanently hidden preview.

## Combat 2.0 effect coverage as of this pass
- 9 class-resource meters, 54 skill IDs / 162 authored first-pass variants, 18 specialization stat profiles and 18 initial capstone runtime trigger paths.
- **50 of 81 passive nodes have authored calculation paths**: 25 base stat modifiers + 25 new deterministic per-skill rules.
- Remaining **31 reactive/conditional passives** are intentionally fail closed:
  - Ironwarden: Steady Guard, Last Bastion, Stand Together, Vengeful Rhythm.
  - Bastion: Immovability, Last Refuge, Seismic Guard, Unbroken Line.
  - Dreadguard: Pain Dividend, Scar Pact, Oppressive Gaze, Predator, Unbroken Will.
  - Wayfinder: Relentless Arrows, Trail Sense, Second Wind.
  - Ravager: Adrenaline, Relentless, Unchained, Kill Sustain.
  - Hexweaver: Thread Focus, Void Memory, Calm Mind.
  - Knife Dancer: Endless Dance, Critical Tempo, Countercraft, Exit Wound.
  - Dawnkeeper: Last Light, Grace.
  - Stonecaller: Echo Flow, Harmonic Circle.
- Skill-specific passives now cover marked-target critical damage, armor penetration, execution thresholds, duration bonuses, support buffs, and certain ward/evasion effects. No client value is trusted by the combat engine.

## Verification
- Draft PR: https://github.com/elroynbenjamins/Veldryn/pull/1377
- Dedicated workflow: .github/workflows/combat-v2-skills-validation.yml now contains backend compile, contract/set/resource/capstone/passive/skill tests and a separate mobile typecheck + source-isolation check.
- Current browser prototype has been manually interacted with at 440px and 320px widths: all nine classes available, six skills, nine talents, four sections, and local save/apply behavior. Browser prototype runs separately from the native preview and is not linked to production.
- GitHub CI has been **queued**. Do not claim source builds or regression suites pass before GitHub reports a success.
- Do not merge into main until these checks, authoritative item snapshot adapter, all 81 passive effects, exact variant mechanics, hidden-UI localization and Equipment/Enemies 2.0 integration are complete.

## Suggested next two passes
1. Implement the remaining 31 reactive passives with a single authoritative event hook layer (on damage, cast, shield, resource gain/spend, evade, interrupt, kill) and lock down caps, internal cooldowns and duplicate-event prevention.
2. Connect build persistence API and equipment/weapon restrictions to the existing character equipment preview, followed by enemy telegraph UI and integrated damage/healing calculations.
