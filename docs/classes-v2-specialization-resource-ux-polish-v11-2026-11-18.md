# VELDRYN Classes & Skills 2.0 — Two refinement passes (v1.1)

**18 November 2026 · Development branch only · Draft PR #1377 · NOT LIVE**

## Development pass — give every class an early resource loop
Before this pass, nine distinct resource meters existed but several classes could not spend stacks using their first two unlocked abilities. That delayed class identity until high level.

The server compiler now attaches a 1-stack optional spender to one of the first two skills for each class. All spends occur before resolving the selected skill, require earned stacks, are strictly bounded, and apply a conservative first-pass coefficient bonus.

| Class | Role | Resource | Early (Lv 1) spender |
|---|---|---|---|
| Ironwarden | Tank | Guard Marks (3) | Rune Challenge |
| Bastion | Tank | Barrier Layers (3) | Layered Fortress |
| Dreadguard | Tank | Dread (5) | Grim Resolve |
| Wayfinder | Damage | Focus (3) | Windshot |
| Ravager | Damage | Fury (5) | Crush Guard |
| Hexweaver | Damage | Threads (5) | Black Thread |
| Knife Dancer | Damage | Rhythm (5) | Scarlet Loop |
| Dawnkeeper | Support | Radiance (5) | Dawn Mend |
| Stonecaller | Support | Resonance (5) | Resonant Armor |

Later skills retain their stronger, previously authored multi-stack finishers. No skill unlock, class role, weapon restrictions or existing trained XP is changed.

## Refinement pass 1 — 18 distinct specialization mechanics
New `backend/src/server/combat/v2/specialization-styles.ts` is an isolated server-only, class-and-spec-ID-validated transform applied **after** variant and passive compilation. Each specialization has one signature technique modification beyond the existing stat profile:

| Class | Specialization A | Specialization B |
|---|---|---|
| Ironwarden | Sentinel: Oathwall stronger shield | Warlord: Rune Challenge weakens enemy offense |
| Bastion | Fortress: Layered Fortress more shield | Guardian: wards a threatened low-HP ally |
| Dreadguard | Bloodbound: Grim Resolve heals more | Harbinger: Dread Challenge suppresses enemy damage |
| Wayfinder | Deadeye: Perfect Quarry critical multiplier | Pathfinder: Windshot shorter cooldown |
| Ravager | Executioner: Crush Guard higher damage | Berserker: Titan Swing grants temporary Haste |
| Hexweaver | Cursebinder: Black Thread stronger DoT | Voidcaller: Null Script stronger direct hit |
| Knife Dancer | Bladedancer: Scarlet Loop shorter cooldown | Shadowblade: Feintstep grants bonus Evasion |
| Dawnkeeper | Lightbringer: Dawn Mend stronger heal | Sunwarden: Sunthread buffs affected allies |
| Stonecaller | Earthwarden: Resonant Armor stronger shield | Runeshaper: River Stone grants ally Haste |

All modifiers are **provisional**, capped and only apply to the relevant server-compiled ability. If a variant deliberately removes the modified effect (e.g., Rupture replaces a DoT), the specialization does not reintroduce the removed effect. Another class/spec cannot obtain that modifier by spoofing IDs.

**Verification added:**
- `class-identity-v2.ts` verifies all nine classes have a real early spender, both class specializations match canonical IDs, all 18 style transforms are non-mutating, and each style differentiates its actual compiled early ability.
- No changes to existing live combat actor definitions.
- The class-specific role remains unchanged: 3 Tank classes / 4 Damage classes / 2 Support classes.

## Refinement pass 2 — UI clarity, safety, and role telemetry

**Native preview**
- Class and role visibly labeled; current resource shown as 3 or 5 pips.
- Each specialization card gives its role fantasy, **provisional early skill difference**, and level-50 capstone.
- Resource summary explains precisely which class actions generate stacks and which level-one skill can spend one.
- Cooldowns are labeled **base cooldowns**: UI does not claim variant/spec cooldowns are final numerical calculations.
- New accessible, read-only `ClassResourceMeterV2` accepts only server-derived meter values. Invalid values display unavailable rather than an invented stack count; a separate pure projector can map ordered server resource replay events into the view. No client-side stack generation.
- Preview draft resets on a character/class/level change; existing two training disciplines, two local-only preset examples, 44px touch targets and all 162 variants remain intact.

**Deterministic tests**
- `specialization-matrix.ts` exercises all **18 specs**, records synthetic damage/healing/taken/resource and capstone counts, checks exact replays, role coverage and bounds, and limits runaway event generation.
- It deliberately does **not** impose guessed Tank/Damage/Support DPS targets before the full Equipment+Enemies 2.0 curve is integrated.
- Both new test files and mobile resource meter/typecheck are part of the dedicated Combat 2.0 validation workflow.

## Release blockers (unchanged)
1. GitHub Actions remains unconfirmed green; tests are authored and committed, NOT proven passed.
2. Authenticated profile/build APIs and transaction-level activity locks are not connected to live routes; private SQL migration remains unapplied.
3. Equipment 2.0 still needs final approved tier/quality/rarity base resolution, six advanced affixes, real set bonus combat stats and cross-class gear compatibility fixtures.
4. Enemies/Bosses 2.0 is an early hidden adapter, not finalized boss telegraphs, phases and counterplay.
5. Remaining deep class ability fidelity (e.g. advanced redirects/totems/threat steering), UI localization, server-derived skill numerical detail, comprehensive dungeon/world-boss tests and rollback validation.
6. Single coordinated 2.0 launch; no public 2.0 feature flag or gameplay release in this PR.

**PR:** https://github.com/elroynbenjamins/Veldryn/pull/1377
