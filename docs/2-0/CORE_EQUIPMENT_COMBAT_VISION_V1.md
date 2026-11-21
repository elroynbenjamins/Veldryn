# Veldryn 2.0 — Equipment × Combat shared vision and rules contract (review v1)

**21 November 2026 — DESIGN REVIEW, NOT OWNER-APPROVED BALANCE.**
**Private branch only. Do not merge into `main`, activate release flags, alter 1.0.11, touch SQL/player records, deploy Edge functions, generate production rewards, or implement any new UI/themes before actual visual approval.**

## Purpose, scope and authority

Treat Equipment 2.0, Classes/Skills 2.0 and Enemy/Boss Combat 2.0 as **one game system** so subsequent balancing of Dungeons, World Bosses, Party Events, Guild PvE, companions, Stat/Effect Gems, Forge and Player Market has a stable reference. This document consolidates already-developed hidden directions; it **does not** replace versioned server policies or imply the pieces from separate draft branches are already integrated.

Status labels in this document:
- **Established direction** = user vision or already-authored private-system boundary to preserve.
- **Candidate balance target** = a *starting simulation envelope*, not a final number, loot rate or enabled feature.
- **Integration gate** = source/persistence/cross-branch work still to be demonstrated.

Reference work: draft PRs [#1377](https://github.com/elroynbenjamins/Veldryn/pull/1377) (Combat/Classes/Skills), [#1382](https://github.com/elroynbenjamins/Veldryn/pull/1382) (Forge/Crafting), [#1555](https://github.com/elroynbenjamins/Veldryn/pull/1555) (17 affixes/28 traits), [#1559](https://github.com/elroynbenjamins/Veldryn/pull/1559) (real engine trait adapter), [#1569](https://github.com/elroynbenjamins/Veldryn/pull/1569) (Dungeon rewards), [#1549](https://github.com/elroynbenjamins/Veldryn/pull/1549) (signature drops/crafts), [#1551](https://github.com/elroynbenjamins/Veldryn/pull/1551) (skill refinements). These have **different branch parents**; no shared fully integrated, release-ready codebase exists.

## 1. Non-negotiable player experience

1. **Meaningful loot without mandatory perfection.** Tier, base stats, rarity, quality and frozen random affixes all matter. Strong high-quality Rare can contend with a weaker Epic; Mythic improves possibilities but does not auto-win all builds. A player can reach intended content without a perfect roll or exclusive event item.
2. **Build decisions over raw CP.** Same-tier gear offers offensive, defensive, speed and utility trade-offs. CP is an explanatory estimate, not the combat formula or a reason to silently multiply damage.
3. **Readable idle combat.** Server-authoritative, replayable combat with clear skills, elemental/status feedback, cast tells and boss phases. No invisible proc spam, animation-time combat advantage, mid-run client RNG or unavoidable mechanic bypass through Evasion/cleanses.
4. **Nine relevant classes with two distinct paths each.** Damage classes clear faster, while Tanks and Supports remain viable for solo training and bring measurable party value. Co-op Dungeon composition is 1 Tank / 2 Damage / 1 Support; Party Events remain flexible rather than artificially forcing that composition.
5. **Equipment progression drives the economy.** Processing gathered resources should be convenient for skill XP; assembling a strong finished piece remains demanding, with combat drops, rare recipe discoveries, and optional Fishing/Dungeon signature materials. Keep rare dungeon/party/world exclusive chest gear distinguishable from craftable gear.
6. **Existing progress is sacred.** Legacy exact pieces, enhancements, gems, rarity, quality, copies, bank transfers, equipped state and in-flight encounters must preserve value/identity. Versioned compatibility or explicit compensation requires review; no silent reroll or global stat rename.
7. **One coordinated future major 2.0 release**, not parts of this system slipped into 1.0.x. Gameplay UI/themes are a separate appearance-approval gate.

## 2. Canonical Equipment 2.0 model

### 2.1 Item identity and sources

Server-minted immutable instance has: `instanceId`, catalogue/ruleset version, account+character origin, item/template ID, tier, slot/family/handness, quality 0–100, rarity, already-frozen primary stats, rolled affix ID/value/unit, sockets and their receipt revisions, potential **authored** signature trait ID, binding/trade permissions, acquisition provenance, and custody/ownership version. Changes to equip, bank, upgrade, socket or market escrow must update authenticated custody and invalidate affected selected loadout receipt.

Ten slots remain: helmet, chest, legs, boots, gloves, cape, ring, amulet, weapon and offhand. The active weapon-family allowlist may span classes; skill ownership does **not** transfer with a weapon. Two-handed/dual-hand configurations consume the offhand budget and cannot double count an offhand.

**Do not conflate catalogues:** hidden Crafting foundations progressed from 118/236 to 122/244 to a separate 169 ordinary templates/338 recipe-route analysis. The Combat branch also has its own set/gear assumptions. These counts are snapshots from different branch revisions, **not additive item pools**. Reconcile to one signed template manifest and only then pin launch counts.

### 2.2 Progression/tier assumptions

**Candidate T1–T4 launch reference:** T1 level 2+, T2 12+, T3 26+, T4 40+; actual level/region/recipe/market thresholds must be reconciled against the authoritative game policy before enabling. Nine equipment tiers T1–T9 remain the longer-term frame; do **not** fabricate T5–T9 formulas, loot tables or recipes before T1–T4 tuning. Higher-tier standard armor should usually beat much lower-tier items in baseline survivability, but special traits can justify situational swaps; avoid a permanent low-tier best-in-slot proc.

### 2.3 Resolve one immutable piece exactly once

```text
server-authorized template, tier, rarity, 0..100 quality
    -> item primary Attack / Defense / HP frozen at mint/claim
    -> equip eligibility + hand/slot/custody proof
    -> class/level-only actor + equipped primary stats
    -> valid, actually owned set thresholds
    -> approved, versioned frozen affix values (unit conversion ONCE)
    -> enhancement + Stat Gem + Effect Gem effects (own signed receipts)
    -> skills/spec/passive/companion contributions and encounter buffs
    -> derived combat state + verified selected active signatures
    -> locked versioned encounter snapshot + deterministic server event stream
```

Q0 = 0.75×, Q50 = 1.00×, Q100 = 1.25× of new authored primary gear stats; quality is **not** a multiplier on procs, affixes, gem values, set thresholds, crafting XP or a receipt already frozen with quality+rarity. Rarity ladder is versioned/server-owned: do not import synthetic test multipliers as a live rarity policy.

Directional power budget *for benchmarking, not an additive live CP equation*: ~17% class/level base, ~45% gear primary stats, ~14% rarity+quality difference, ~14% affixes/sets/gems/enhancements, ~10% companions and other sources. Equipment-related ~73% is the desired feeling of progression, **not** license to apply four independent 73% multipliers. Compare real damage/survival, not CP alone.

### 2.4 Stat language — preserve the entire 17-channel proposal

**13 established Combat V2 channels:** Attack%, Defense%, Max HP%, Haste (+percentage points), Crit Rate (+pp), Crit Damage%, Accuracy (+pp), Evasion (+pp), Armor Penetration (+pp), Elemental Ward (+pp), Shield Strength%, Class Healing Power%, Hex/DoT Potency% (shadow/arcane/nature, **not physical Bleed**).

**Four extension channels:** Tenacity (+pp ordinary debuff-duration resistance); direct Class Ability Damage% (not DoT, heal or basic); Basic Attack Damage% (not class skills/procs); Reflect Damage% (percentage of actual HP damage taken from eligible original enemy direct hit, bound by shared damage budgets).

Preserve the [17-stat draft per-tier bands/eligible slots/equipment-only caps](https://github.com/elroynbenjamins/Veldryn/blob/design/eq2-combat-affix-traits-review-20261121/docs/equipment-2-0/EQUIPMENT_COMBAT_2_AFFIX_TRAIT_REVIEW_V1.md) as the **single current review proposal**, not 17 new arbitrary tables. T4 examples: Attack +1.5–2.6%/item (equipment-only ceiling 12%); HP +2.5–4.5%/item (24%); direct Class Ability +2.5–5%/item (22%); Basic Attack +2.2–4.5%/item (19%); Reflect +0.9–1.8%/item (8%). All must be tested against every legal slot combination and not silently clamp legitimate items.

Stored percentage `2.0` is **not** `2.0` as a fractional multiplier; explicitly translate `2.0%` -> `0.02`, and `+2 pp` -> `+0.02` probability. Existing Forge names (`armor`, `ward`, `potency`, `abilityDamage`, etc.) are **not** 1:1 Combat V2 IDs; specifically, generic old `potency` cannot be silently remapped. Preserve frozen instances and implement a versioned semantic migration/projection, not a text replacement.

Current proposed frozen affix counts, without rerolling existing pieces: T1–T2 Common through Epic **1**, Legendary/Mythic **2**; T3–T4 Common through Rare **1**, Epic/Legendary **2**, Mythic **3**. No repeat affix type on the same item. Rarity must matter through meaningful but bounded quality/roll interactions; it cannot bypass the source or tier gate.

### 2.5 Set bonuses, signature traits and gems are different systems

Set bonuses are authored by actual available pieces. Favor meaningful **2/3/4/6-piece** effects on sets whose catalogue truly supports that many pieces; do not award a 6-piece threshold on a 3-piece set. The legacy 2/4/6/8/10 set ladder remains unchanged for 1.0.x. **Candidate** balance direction: early thresholds grant dependable small stats/sustain, later thresholds add playstyle identity or bounded event effects; avoid set bonuses that multiply all other bonuses again. Match real 15 partial-set catalogue before final numbers.

Normal crafted gear—including Mythic—gets **no random combat proc trait**. Signature traits belong to one authored special item, acquired through approved rare-blueprint craft, eligible dungeon/party chest or special World Boss source. Worldwalker remains a non-combat gathering utility. No chest-exclusive gear quietly becomes craftable, sellable by shops or minted through Mark conversion.

**Established hidden policy:** at most **two distinct active combat traits** selected from actually equipped, owned exact item instances per saved build; extra worn special pieces retain normal stats but their traits remain dormant. Same trait cannot activate twice. **Recommended new tuning hypothesis** (not approved): test both unrestricted two-trait combinations and a *one offensive + one defense/support* limit in party+solo benchmarks; decide based on observed dominance, not aesthetics. Do not impose the extra role pairing retroactively without a user decision.

Maintain the 28 proposed trait identities: 9 Tank (Bastion Heart, Hardened Resolve, Thornbound Riposte, Bulwark Oath, Frostbound Guard, Unshaken, Guardian Aegis, Vital Reserve, Counterbalance); 9 Damage (First Light, Ruthless Edge, Quickened Focus, Echoing Strike, Hunter’s Precision, Sword Dance, Spell Fang, Deep Cut, Armor Breaker); 9 Support (Graceful Mend, Warding Hands, Soothing Light, Mending Echo, Resonant Barrier, Restorative Bloom, Fortified Prayer, Swift Recovery, Beacon of Courage); 1 World Boss gathering utility (Worldwalker). These are **possibilities**, not 28 implemented real procs or 28 published items. The current real hidden engine supports a subset (Sword Dance, Echoing Strike, Mending Echo, Restorative Bloom, Thornbound Riposte and opt-in damage/reflect channels), with only specific signed authority paths. All remaining traits fail closed until individually integrated.

Stat Gems and Effect Gems stay separate from random affixes. Exactly one debit/receipt for each socket replacement; no gem dupes, client authority, “free gem” conversions or gem->trait->gem chains. Existing Effect Gem family/equipped-count restrictions remain their own policy. Enchanting progression remains valuable, but a low-grade gem should not outweigh an entire tier of equipment baseline.

## 3. Canonical Combat 2.0 contract

### 3.1 Class identities and specializations

```text
Tank:    Ironwarden [Sentinel / Warlord]
         Bastion [Fortress / Guardian]
         Dreadguard [Bloodbound / Harbinger]
Damage:  Wayfinder [Deadeye / Pathfinder]
         Ravager [Executioner / Berserker]
         Hexweaver [Cursebinder / Voidcaller]
         Knife Dancer [Bladedancer / Shadowblade]
Support: Dawnkeeper [Lightbringer / Sunwarden]
         Stonecaller [Earthwarden / Runeshaper]
```

Preserve the hidden foundation's 54 active skills, 162 candidate variants, 81 passive paths and 18 specialization identities as the **working catalogue**, not as already final power coefficients. Specs must change action choices/utility as well as damage color. No class can unlock another class's abilities by equipping its weapon.

Combat design by role: Tanks build reliable threat, mitigate big direct hits and have bounded counter damage; Damage classes specialize in basic/ability, burst/DoT or precision play; Supports actively heal/shield/dispel/sustain while still training solo. Skills, variants, class passives and gear all use the *same original event tags*; class resource gain must never be generated by periodic/projected trait echoes.

### 3.2 Deterministic action and resolution order

Every new encounter is an immutable server-authorized tuple of `rulesetVersion`, `encounterId`, seed, actor/owner, locked exact equipment IDs and revisions, selected skills/spec/trait IDs, pets/companions, enemy kit digest, mode, HP/resource state and timestamped event cursor. Do not re-read mutable current gear mid-hit. Swaps may take effect only at explicitly defined safe snapshot boundaries, while allowed legacy weapon comparison never mutates the locked simulation.

**One canonical event pipeline (proposed design contract, implementation needs audit):**

1. Select legal ready action (ability cooldown/resource/target, or basic). Boss authored cast/phase/counter rule has priority.
2. Label original actor/source/action-use/hit index, damage family (physical/elemental/true), kind (basic/direct class/DoT/heal/shield/companion/secondary), and avoidable/interruptible/reflectable flags.
3. For eligible original direct hits resolve hit vs accuracy/evasion (guaranteed boss mechanics are not an accuracy roll), crit and owned base skill coefficient. Use seeded server RNG, not frame time or client state.
4. Apply base Attack and authored skill effects, then **one** appropriate damage channel: basic **or** ability. Crit, penetration, enemy Defense/ward, active timed defense, shield absorption and actual HP loss use a documented, reproducible order.
5. Apply credited effective heal or shield with overheal/over-shield accounting. Class Healing/Shield Strength modify **class-generated eligible amounts**, not tonics, passive leech or trait echoes by default.
6. Commit original damage/health/resource/phase change and boss counterplay. Trigger only eligible source-tagged signature/class/boon/Effect Gem events, using cooldowns and global budgets.
7. Resolve any bounded secondary damage/healing/reflect/status ticks with `secondary=true`: **cannot critically strike, leech, award resources, re-enter procs or reroll the originating action**.
8. Run death/wipe/end conditions; settle rewards **once**, only on a verified authoritative encounter completion receipt. Animation and reconnects replay results, not recompute with a fresh seed.

**Formula discipline:** adopt a single tier/level-aware Defense-to-mitigation curve with diminishing returns; record the real constants only after benchmark simulation, rather than guessing a flat universal percent. Penetration affects eligible Defense, not true damage, phase immunity or shields. Elemental Ward protects the nonphysical eligible damage family; true damage bypasses normal armor/Ward, but is **not** permission for bosses to one-shot without a counter. Tier damage budgets must come from actual ability and gear numbers, never fake CP-derived enemies.

### 3.3 Shared status budgets and anti-loop restrictions

- Bleed = **physical DoT**; Hex Potency = shadow/arcane/nature DoT only. Same source identity refreshes its own periodic effect, rather than multiplying infinitely; independent casters retain distinct sources. Existing Enemy 2.0 candidate max three stacks per source and ordinary 3–6 second debuff windows need one coherent status policy with skill versions.
- Original crit/hit/actual HP loss/actual effective heal/shield event is the ONLY proc eligibility source unless an effect explicitly defines a narrower source. Direct enemy cast tags distinguish basic hits from nonreflectable boss telegraphs.
- One actor-level 1-second equipment proc interval, individual trait cooldown, deterministic tie-break by selected trait slot; no proc recursion and no generated crit/leech/extra cast.
- Reflect Damage% + Thornbound Riposte + future Thornbound Aegis share **one per-target 5-second output ledger across all defenders**: maximum 1.5% defender Max HP per eligible original hit, 0.2% target Max HP per 5s (0.1% for regional bosses). Only original direct enemy attacks that actually reduce defender HP after all shields/mitigation, defender remains alive; no true/phase/DoT/environment/self/companion/echo source, no boss special cast until specifically classified. Never reflect a reflected hit.
- Enemy boss phases at 70% and 35%, their authored cast tells, unavoidable hits, interrupts/fallback counterplay and immunities must not be erased by Tenacity, Evasion, generic cleanse, freeze, stun or proc damage. Periodic damage must still respect phase thresholds/locks.
- A 3% Glassfin direct mitigation signature is **post-defense** and does not mitigate true/DoT/environment; T4 Riftfang Bleed 10%/24% physical hit over 4 sec, boss half, 10-sec cooldown is still a **proposed unmounted signature** and must be integrated into the same engine/status ledger before release.

### 3.4 Modes share one engine, not one reward or pacing table

**Solo/World:** one owned character, optionally one companion depending on ruleset, normal/elite encounter budgets, fast but stable offline action calculation. Avoid 0-damage low-level monsters, permanent untouchable evasion or infinite fights. Enemy 2.0 tier-normal up to one eligible trait; elites up to two; T1 curated teaching abilities instead of random traits.

**Dungeons:** server-owned 4-character snapshot with 1 Tank/2 Damage/1 Support, group threat/healing/shield and defined potion/tonic limit (one healing potion + one buff tonic per run in current rules), eight-second votes where applicable, 4–7 nodes, one of two authored regional bosses per region. Endurance, Q-Mode, disconnected/idle players and party Echoes must share explicit receipt/version ownership, but not assume solo trait verification grants can run in Live group mode.

**World Boss:** 5 preparation days, two weekend battle days, three attempts per event, each eligible character can act; rank/contribution rewards one authoritative account/character receipt policy. High HP is not license for unlimited reflect, self-heal or percent-of-boss-HP effects. All attacks, attempts, phase changes and reward caps require server settlement.

**Party Events:** flexible composition, seven-day encounter activity, preparation/donations, saved loadout and dynamic boss scaling; do not hard require Dungeon 1/2/1. Scale on durable team capabilities/damage history with explicit bounds, not one large overheal/shield proc loop.

**Guild PvE:** bounded guild contribution, one server-authorized reward ledger and approved scaling. Same hit/status/trait mechanics; different participation, leaderboard, and reward rules.

**Dungeon 2.0 room boons/artifacts:** 16 boons and 14 artifacts proposed (retain existing nine active/eight artifact identities). Choices are one room award from three source-bound offers, never counterfeit grants. Six reactive hooks are private/implemented (Bloodthirst, Last Stand, Crippling Blows, Burst Window, Temporal Echo, Glacial Crown). Wardweave, Thornbound Aegis, Soul Lantern await party/shared-budget implementation. All must share core defense/crit/haste/DoT/reflect ceilings and cannot mint additional original actions.

## 4. Balancing strategy: choose real outputs before enemy scaling

The **first target is fully composed player power** across real representative T1–T4 loadouts, not an arbitrary new boss HP multiplier. Use the matrix in `CORE_BALANCE_ACCEPTANCE_V1.md`.

- **Normalized baseline**: for each tier and realistic level/skills, compare Common/median Rare/high-quality Rare/Epic/Mythic gear with none, one and two selected signatures; with and without legitimate sets, Stat+Effect Gems, companion, active boons.
- **Class parity candidate**: same-role median solo TTK within ~±12% of role median at equal investment (a diagnosis threshold, not homogenization). Tanks and Supports should train without painful slowness; their median solo clear pacing may be ~75–90% of similarly invested Damage role, compensated by clear survival/party utility. Test real enemy patterns and escapes, not DPS alone.
- **Affix/trait target**: two active traits should feel different, not double encounter DPS. Candidate single-trait average contribution ~1–4% in its intended eligible scenario, with niche larger momentary saves/counters; treat synthetic numbers as smoke tests only. Offensive vs defensive traits compare *total encounter success and uptime*, not raw damage.
- **Gear rarity**: avoid mandatory max-rarity for normal same-tier progression; quantify the real delta for matched quality and the overlap between high-quality Rare and weak Epic. Cumulative stat channels may be strong individually but must not compound into near-invulnerability or permanent 100% crit/haste.
- **Bosses/enemies tuned last**: six handcrafted regional bosses should exercise telegraph reaction, interrupt/fallback, shielding, DoT resistance, phase/trait interactions. Avoid defeating a Tank solely with true damage to negate its build, or invalidating Damage types with blanket immunity.
- **Economy follows pacing**: measure actual kills per hour, tier-relevant material source eligibility, T4 scarce tail risk, crafting XP/hour and Player Market circulation. Current proposed normal enemy common drops 14/10/7/5% and scarce 4/1.5/0.6/0.25% by T1–T4 are review numbers **before source scaling**; do not release them from this document.

## 5. Known gaps and implementation ordering

1. **Source of truth/branch reconciliation:** agree a single canonical item/recipe/set/roll manifest (169 vs earlier counts), Combat skill/ability head, Enemy 2.0 kits and gems. Do not cherry-pick into `main`.
2. **Affix semantic bridge:** 12 Forge roll IDs vs 13 existing Combat channels vs 17 proposed channels; frozen percent/pp handling, ambiguous generic `potency`, complete legal maximum sum and legacy receipts. Every legal minted build must remain usable; forged roll/cap claims fail closed.
3. **Authoritative per-instance ledger:** exact Bank/Inventory/Pouch/Market ownership, one account CAS, selected loadouts, skill/enemy/gear snapshots and independent server DB verify; synthetic callbacks are NOT production authentication.
4. **Complete executable trait/status surface:** implement/test each currently unimplemented signature/boon, shield/DoT/reflect common ledgers, phase invariants, and party healing. No supported=false trait offered in reward rolls.
5. **Full source-integrated benchmarks:** nine classes × two specs × real tier loadouts × archetypes/bosses × modes, not only synthetic stat tables; publish percentile diagnostic outputs with replay seeds and ruleset hashes.
6. **Rewards/economy:** exact run and drop receipts; resolve existing `SUNSTONE_INGOT` recipe ID collision, unverified Glassbound Dust sources, tier-entry monster level mismatches, Fishing/Dungeon signature catalyst rules and marketplace escrow.
7. **User visual approval:** preview actual mobile Equipment/Build/Combat/Forge/boon UI in several themes and small phones before implementation; pixel-art hierarchy and existing Samsung larger-phone layout preserved.
8. **Coordinated staging acceptance:** real transactional migrations only on authorized staging, full anti-dupe/rollback/reconnect/concurrency, QA on Android, fresh exact-head CI, production-release signoff and rollback plan. No piecemeal 2.0 deployment.

## 6. Decisions to explicitly review with the owner

The underlying direction (gear matters, two active combat traits, 17 candidate stats, 28 trait choices, all nine classes, full 2.0 release) is already coherent. **Still needs explicit approval before balance changes:** (a) final 17 stat roll bands and aggregate buffs; (b) two-trait free pairing vs max-one-offense; (c) role parity and tier pacing target; (d) 2/3/4/6 set effect magnitudes and which pieces belong; (e) rarity multiplier policy; (f) signature catalysts/drop rates and T1–T4 material IDs; (g) complete visual mockups/themes. Nothing in this review constitutes that approval.

**Companion document:** [balance matrix and evidence gates](./CORE_BALANCE_ACCEPTANCE_V1.md).
