# Veldryn Equipment × Combat 2.0 — physical damage types and catalogue v1
**23 November 2026 · HIDDEN REVIEW ONLY · NOT merged, not live, not UI approved**

## Status and provenance
This pass ADDS physical type **review metadata** to the existing Equipment 2.0 catalogue, without changing canonical IDs, names, craft recipes, tier gates, item snapshots, rarity/quality scaling, the existing 13 Combat V2 affixes, active spells or the Player Market. It is not an active damage-system implementation. The source-linked catalogue covers **169 existing pinned hidden Forge items**, **204 separate proposed T1–T4 48-set members**, plus **10 proposed rare T5 Citadel/Bloodsteel members**. T5 set identities and innate stats are copied unchanged from the earlier rare-set review; the expanded 204 remain nonissuable. The 74 expanded-member candidate links are NOT promoted into already existing item identities.

## Foundational principles
1. Damage **channel** (physical / elemental / shadow / true, as authored by actual Combat V2) is separate from physical **subtype** (blunt / slashing / piercing). Existing physical mitigation and generic penetration must be applied ONCE. Elemental and true damage must never receive subtype modifiers. Physical without an approved subtype stays generic physical, especially for legacy/V1.
2. A weapon has server-authored physical strike weights; they do not create extra hits. An ability may explicitly inherit the verified weapon profile or override it by authenticated effect ID (e.g. sword pommel strike -> blunt, shield bash -> blunt). Missing or mismatched authoring fails closed to generic physical; no client-supplied subtype allowed.
3. A damage subtype never automatically grants Bleed, Stagger, critical hits, armor penetration, interruption, or vulnerability. Those require source-authored effects, caps, immunity/counter rules and real status events.
4. Armor material in the catalogue is a **candidate visual taxonomy**, NOT an automatically granted weakness/resistance. Crafted steel, mail, leather and cloth do not inherently cause hidden player penalties; real resistance requires verified enemy kits, gear effects or approved affixes.
5. Create NO new damage rolls in the existing 13-affix mint policy yet. Only after a new fully versioned Forge/Combat rollout can subtype affixes/innate stats be authorized; existing T5 rare innate stats stay exactly as authored. Do not alter frozen exact item snapshots retroactively.

## Suggested starter weapon subtype catalogue
| Forge class/family | Source-authored weapon basic/explicit physical strike | Exception |
|---|---|---|
| Ironwarden sword | 100% Slashing | Pommel/Shield Bash can be authored Blunt |
| Bastion current shieldblade draft | 100% Slashing | Sword + shield visual redesign pending; preserve ID/name until resolved |
| Dreadguard chained scourge | 70% Blunt + 30% Slashing | Confirm scourge weapon art before final |
| Wayfinder bow | 100% Piercing | Traps/elemental arrows separately authored |
| Ravager greatblade | 100% Slashing | Specific crushing strike can override |
| Hexweaver wand | No automatic physical subtype | Magic/shadow effects keep existing authored damage |
| Knife Dancer paired blades | 60% Piercing + 40% Slashing | Skill overrides can use either |
| Dawnkeeper mace | 100% Blunt | Heals/radiance remain nonphysical |
| Stonecaller staff | 100% Blunt only for explicitly authored staff melee strikes | Spells/effects do not become Blunt |
All nine profiles apply to the four pinned tiers T1–T4, totaling 36 verified weapon IDs. Twelve shield offhand IDs are candidates to enable Blunt **only** through an authenticated Shield Bash effect; the Hexweaver focus is not a shield.

## Resolution order, numerical candidate policy
For a verified authored attack: baseline P from class + exact-copy item + ability coefficient; existing hit/evasion, crit, generic modifiers and physical mitigation/penetration are preserved. For physical subtype split weights w_i summing to 1, only after normal physical defense resolution, candidate final pre-barrier damage is:

    D = RoundOnce( PhysicalPostMitigation * Sum_i[ w_i * (1 + CappedOutgoingSubtypeBonus_i) * (1 - CappedIncomingSubtypeResistance_i) ] )

- Proposed net incoming subtype resistance: clamp to **-20% vulnerability through +30% resistance**; not a global armor default. These limits are initial PvE proposals, awaiting simulation.
- Proposed total outgoing subtype-specific bonus: **maximum +15% per subtype** (shared verified gear + eligible skill/set bonuses), with no multiplicative duplicate application of an existing generic physical bonus. Calibrate across all tiers and class builds.
- Candidate tier progression for a SINGLE eligible rare physical-type damage affix (percentage points, not free gear stats): T1 1–2%, T2 1.5–3%, T3 2–4%, T4 2.5–5%, T5 3–6%, T6–T9 4–8%; upper tiers require separate source/rarity evaluation. Never add these to all ordinary gear or the existing 13-affix pool without final authorization.
- Proposed type resistance roll: 1–3% on specifically eligible defensive items, no innate material bonus, and combined with other sources under the same 30% cap. Type resistances on player equipment must be balanced against physical defense and elemental ward budget, not added as free survivability.
- Split mixed-damage output proportionally; no second attack or additional crit roll. Round once at the end, preserve the combat engine's 0/miss semantics and tick ordering.
- Keep generic Penetration **separate** from Piercing subtype. No Piercing bypass by default. Bleed, Stagger and Armor Break are typed statuses or skill effects with explicit proc, cooldown and immunity policies.

## Enemy profiles and boss counterplay — illustrative, NOT implemented
| Profile | Slashing | Piercing | Blunt | Alternative counterplay |
|---|---:|---:|---:|---|
| Armored construct | 10% resist | 15% resist | 15% vulnerable | Armor reduction, elemental skill, vulnerability-window burst |
| Exposed beast | 10% vulnerable | neutral | neutral | Debuffs/DoTs, shield break, sustain |
| Skeletal sentinel | 10% resist | 20% resist | 15% vulnerable | Holy/magic, phase interrupt, ally support |
| Burrowed hide creature | 15% resist | 10% vulnerable | neutral | Mark weak point, cleanse, damage-over-time |
Individual bosses must reveal/cue counterplay through readable tooltips/telegraphs, not secret class requirements. Multiple approaches must remain viable at equal CP; report type-specific performance, not just total DPS.

## Skills, statuses, mixed attacks, and edge safety
- Weapon source and skill source are explicit separate fields in server-resolved combat events. A hit may inherit subtype weights if the skill specifically opts in; otherwise retain current authenticated skill channel. A shield bash needs equipped shield custody and the authored ability, not merely an offhand item.
- Physical direct hits can have a single base crit/accuracy result before subtype allocation. On reflect, DoT and proc recursions, source and cap checks must prevent double modifiers or unintended extra ticks.
- Summons, companions and enemy attacks need their own authored source types; never infer from a player's weapon. Tank aggro/taunts, mitigations, shields, ward, sustain, buffs and debuffs should retain their separate execution order.
- For PvE first. PvP, market resale, modified item templates, item tooltips and combat replays remain gated until dedicated verification. No client-controlled subtype, weight, resistance, gem, or affix claim.
- Level-independent Smithing/Tailoring, tradeable signature drops, item provenance and old-vs-new market restrictions are unchanged. A new subtype is not a new tradable property by itself and must not make old items market-eligible.

## Rare T5 sets and authored percentage rolls
The owner-approved Frostmarch Citadel (6) and Bloodsteel (4) set members are retained as **rare-set scarcity** proposals. Their original crafted innate maximum HP, Defense, Tenacity, Ward, Attack and Ability Damage bonuses remain untouched. Any subtype protection or damage on these sets would be an ADDITIONAL authored, approved, budgeted feature requiring its own source-specific item/version change; NEVER silently insert it into the accepted T5 set bonus table.

## Future implementation and approval stages
1. Review exact weapon profiles/exception skills and material presentation, including existing Bastion shieldblade identity and weapon art.
2. Finalize explicit physical-event source schema, subtype split and resist formulas in hidden Combat 2.0 branch; keep V1 generic physical behavior unchanged. Version the contract and protect server-authenticated provenance.
3. Implement typed enemy/boss physical profiles and status opportunities; simulate against multiple viable builds at equal CP, across 9 classes / 18 specs / T1–T5 plus eventual T6–T9.
4. Balance authorized new random stat rolls and authored rare set traits against existing 13 affixes, rarity and quality, no double scaling; preserve exact original item custody, crafted receipts and market restrictions.
5. QA replay determinism, status ordering, animation/tooltip translations, mobile layouts/theme approval, offline bosses and dungeons, equipment swap behavior and performance on smaller phones.
6. Run full strict TS/isolated EQ2 source tests, adversarial item/skill forgery tests, actual PG17 reward/claim verification and coordinated 2.0 release gates before any main merge, app UI implementation or production deployment.

The sibling hidden Combat / Equipment branches are not automatically reconciled by this review. This file and its subtype catalogue grant **NO live authority**.
