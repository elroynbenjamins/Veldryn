# Party Events V90 — four distinct boss trait/phase profiles for Combat / Equipment 2.0

**21 November 2026 · REVIEW / DEVELOPMENT ONLY · not merged to main, not a live boss update.**

## Answer to the balance question

The existing Party Event Day 8 boss in `weekly-party-boss-v2.ts` has the provisional **V4** tier scale:

- Tier-1 HP: `partySize × 5400 × max(0.045, party median level/25) × difficulty`
- Higher-tier HP multiplier: `1.42^(tier-1)`; Attack: `1.20^(tier-1)`; Defense: `1.16^(tier-1)`
- Difficulty multiplier: Standard ×1, Veteran ×1.20, Heroic ×1.40
- 12 escalations of up to 90s each, generic Slam and AoE Pulse, one 35% HP Enrage.

These are **provisional calibration for old verified loadout snapshots**, not real balance against the new Equipment/Classes 2.0 source-owned affixes and procs. `weekly-party-event-combat-v59.ts` compiles Party-set effects in isolation and is not imported by the actual Day 8 boss or the combined Combat 2.0 encounter. There is **no measured 17-affix × 28-trait Party boss balance or verified new-item/character snapshot**.

Separate current draft statuses (21 Nov 2026):

- EQ2 design PR #1555 proposes **17 affixes** and **28 signature traits**, including Basic Attack Damage%, Ability Damage%, Reflection, Tenacity, Sword Dance, Deep Cut, Hardened Resolve, Frostbound Guard, Mending Echo and other conditional effects. All numeric bands and trait sources await owner approval. Normal crafted gear does **not** get random signature traits; at most **two** unique combat traits are active per build.
- Hidden Combat 2.0 PRs #1558–1559 execute a limited set of five selected **player** trait hooks and verified reflections in an **unreleased solo** engine with 108 class/spec/regional-boss simulations. That success is *not* Party Event balance or player-derived win rates. The Party boss does not consume the new trait authority.
- Player Reflection and Thornbound Riposte share a total output cap of **0.1% boss max HP per 5 seconds across defenders** in the reviewed system. Boss cast/phase hits are *not* reflectable. Do not implement an uncapped boss reflect aura: it would cause feedback loops with these player traits.

## V90 proposed authored bosses

This pass adds only `backend/src/server/party/weekly-party-boss-traits-v90.ts`, an explicit QA-only **optional alternate boss kit** with existing deterministic engine effects. It does not replace the actual Party boss factory, boss rewards, event state, client UI or live encounters. The starter boss's HP/Attack/Defense and tier curve are preserved, rather than inflating enemy stats to compensate for unapproved gear.

| Family and boss | Signature identity | 70% HP phase | 35% HP phase | Counterplay / EQ2 affinity |
| --- | --- | --- | --- | --- |
| Broken Caravan — **Roadbreaker Captain** | **Roadbreaker Rally**: physical cleave and short removable exposure (+4% damage taken), plus direct Reinforced Swing | Formation shield, **2.8% boss max HP** | Capped **5.5–10% temporary outgoing damage** rally | Physical mitigation, shielder, heal support, interrupts; no mandatory rare/party trait |
| Nightfall Hunt — **Nightfall Alpha** | **Nightfall Rend**: bounded physical bleed (6s) and Lunge with +12% damage to target below 30% *pre-hit* HP | Shroud shield, **2.5% max HP** | Capped brief damage buff | Physical mitigation, healing, ordinary dispellable cleanse; not bypassing unremovable boss mechanics |
| Broken Wards — **The Unbound Guardian** | **Runebound Ward**: interruptible arcane storm with short damage-dealt suppression, plus a timed small shield | Ward ignition shield **3.5% max HP** | Fracture exposes boss to +7% damage taken for 6.5s | Elemental Ward, interrupts, direct-burst windows, shields are separate from armor (Penetration must not bypass shields) |
| Lost Reliquary — **Reliquary Sentinel** | **Reliquary Mirror**: shadow echo, short nonstacking shadow DoT and an interruptible Mirror Veil shield | Reflection-themed **3.5% max HP shield only**, explicitly NO reflected damage | Exposed fractured mirror, +8% damage taken for 6.5s | Elemental Ward, support/sustain, interrupts; reflect aura awaits an independently audited no-loop rule |

All 4 families receive **two distinct HP phases** (70% and 35%) instead of stacking the old generic Enrage. Special AoE casts have at least 1.4-second telegraphs (the current long-cast attacks are interruptible); every added cast is interruptible and no direct cast uses true damage. No authored phase shield exceeds **4% boss max HP** in one application. Boss cast/phase reflection is *deliberately absent*. Values are provisional illustrative parameters, **not approved damage coefficients**.

The unique boss trait is **not** a player Equipment trait copied onto the enemy and is not rolled randomly: the boss is explicitly selected by its server-frozen Party family. Neither enemy generic random traits nor two boss kits can stack on the same encounter.

## Built safety gate and tests

- `preparePartyEventBossTraitKitV90(boss,family,tier,true)` returns the four prototype kits only if the supplied enemy is the canonical `PARTY_EVENT_BOSS` with the expected family name, original generic V2 ability IDs, exactly one generic Enrage, valid tier 1–12 and no prior enemy/boss V2 tags. The default (without opt-in) returns the original boss object unchanged.
- `PARTY_EVENT_BOSS_TRAITS_V90_RELEASED=false`; production-mode composition throws even when QA opt-in is passed.
- `weekly-party-boss-traits-v90.ts` tests all four families, 70/35% phase triggers, owner-approved kit identity, capped shields, interruptibility, no generic double-Enrage and no boss reflected-damage loop; 16 seeded `simulateCombat` smoke scenarios check deterministic replay across representative tiers. **These smoke scenarios are not an equipment, class or win-rate balance verdict**.
- Strict TypeScript and the new V90 test are registered in the *hidden* chest workflow; **passing exact-head CI has not been established**.

## Next integration/balance pass — do not skip

1. Consolidate Equipment 2.0 #1555, executable trait tokens #1558/#1559, Class/Enemy 2.0 #1377 and Party Day 8 V2 into one authoritative **server-frozen NEW-run-only** encounter contract. Verify equipped exact-item IDs, revisions, rarity/quality once, stat/affix units, selected two traits, gem/companion/setup, party roster, equipment entitlement and source-owned status. No client-selected boss profiles or post-fight rerolls.
2. Enable only approved source-tagged player hooks (basic / class-hit / heal / shield / reflect), enforce no-proc recursion, global 1-second trait interval, source caps, boss immune/dispellable tags, shared 0.1% boss/5s player reflection and no boss-cast reflection. Existing Party V59 set bonuses must not be double counted.
3. Replace generic Party boss kit *only* in the separately approved **new 2.0 Party Event ruleset**, with persisted version/seed/digest. Day 8 replay/claim must read the frozen exact fight, never rebuild from current equipment or change legacy event history.
4. Run class/spec/level/tier/difficulty/party-size/equipment build simulations: all **9 classes × 2 specs × 4 event families × 3 difficulties × 2/3/4 players**, at representative tier 1/4/8/12 and new gear T1–T4; compare no-trait, common, strong affix and two-signature-trait builds. Record P50/P95 clear time, 90s timeouts, boss damage, class contributions (damage/heal/shield/interrupt/absorb), and any phase burst/reflect/DoT > budget. Adjust all tiers from measured data, not fixed CP guesses. Preserve no mandatory class or signature trait.
5. Explicitly approve visual boss phase indicators, telegraph positioning, compact Android layouts, colorblind signals, 8-language text and new UI/theme mockups **before UI runtime changes**. New art/preview is a separate approval gate.

**RELEASE: HOLD.** V90 has no live import, change to existing Party boss, public endpoint, SQL migration, reward entitlement, economic write, mobile UI or deployment. All flags remain OFF.
