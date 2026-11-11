# Veldryn — World Bosses | Detailed Design v2 (Draft)
**Date:** 2026-11-10 · **Economy/shop amendment:** 2026-11-11 · **Status:** design only — no playable content, migrations, assets or backend changes
**Source of truth:** standalone World Bosses roadmap workbook in `docs/roadmap/spreadsheets/`. Preserve the November 9 v1 baseline; all **Proposed v2** values require balancing approval.

## 1. Design principles and approval status
> **Approved November 11, 2026 (design only):** maximum **100 World Sigils per event**, with two optional War Supplies donations worth **5 Sigils each**. The World Boss featured shop rotates **boss-specific cosmetics and pets** for Hollowroot, Sunscar and Frostmarch at identical prices. No live currency, pet, shop, or server migration is enabled.
**Confirmed from the user:** one World Boss event every **14 days**, active for **7 days**; **3 attacks per account per event** usable at any time; asynchronous PvE with **saved player loadouts/Echoes**; **server-wide cooperative War Supplies** rather than required individual preparations. These are not changed in v2.

**Retained v1 proposals, not yet final approval:** 1 Tank / 2 Damage / 1 Support (initiator + 3 Echoes), server-authoritative 12–15-round combat with 60–90s replay, global phase thresholds 70% and 30%, defeated-boss Echo fights, role-normalized World Impact, 3-boss rotation, World Sigils and v1 98-Sigil theoretical event ceiling (**superseded November 11 by an approved 100-Sigil target**), cosmetics-first shop.

**New draft choices in v2:** exact per-role score formulas, a small pre-fight tactic choice, a clear reward ledger, explicit account qualification, safeguards, boss ability timings, supply-bundle recipes and thresholds, technical schema, original pixel-art asset briefs and staged rollout. They are proposals for review, not announcements or active rewards.

The experience should feel like a cooperative, multi-day world threat. There is **no real-time lobby requirement**, no live party coordination, and no compulsory daily login.

## 2. Event calendar and full player journey
- **Cadence:** 7 days active + 7 days downtime; proposed start Monday **00:00 UTC**, with a single deterministic `event_id` and rotating boss. Set actual first launch epoch only at release.
- **Eligibility:** v1 proposed **character level 10**. v2 retains this for discussion because newer combat leveling may make the minimum inappropriate; recommended alternative is account progression unlock + combat power bracket, not a forced Level 25 Dungeon gate. One account shares three attempts across all its characters.
- **First-time onboarding:** a 3-step guided explanation of (1) collective HP and event timer, (2) the player's three one-time attempts and borrowed Echoes, (3) impact and war supplies. Subsequent visits show a compact dashboard.
- **Event flow:** Open World Boss → Overview (boss, phases, global HP, remaining time and attempts) → optional War Camp contribution → select character/loadout and one War Order → preview selected Echo roles → press Attack → server commits battle → real replay (normal, 2× or Skip) → result summary and claim buttons → World Impact milestones / shop.
- **Loadout:** capture/refresh the initiating character's chosen combat class, skills, crafted equipment, gems, relevant companion bonuses, faith/buffs that are valid for this mode. Exclude dungeon-only potions and food consumption in v1; display this in Preparation before confirming.
- **Interactivity:** before spending an attempt, choose exactly one War Order: **Break Armor** (modest shield/weak-point pressure), **Hold the Line** (modest team mitigation), or **Steady Assault** (balanced fallback). Recommended starting tuning: +5% relevant effectiveness, no direct 5% player power; server determines effects, all bonuses have caps. No misleading mid-fight decisions after a result is already calculated.
- **Attempts:** 3 account-wide; can be used together on Day 1 or spread over the week. Attempts are consumed only with a durable, authoritative battle result. Replays do not create new results or consume attempts.
- **After global defeat:** remaining attempts fight the boss's **Residual Echo**. Same personal base rewards and impact progression, but **0 additional global HP damage**, clearly labeled. Global milestone rewards do not trigger twice.
- **Event ending:** UTC deadline seals matchmaking and attack creation; finish in-flight results with a bounded grace period; issue earned rewards to Inbox with an event tab and permanent accounting; publish results summary, no leaderboards until that feature is actually implemented.

## 3. Squad, matchmaking, snapshots
**Draft squad:** four fighters — one Tank, two Damage, one Support. The **initiating player** occupies their class-combat role; fill remaining slots from independently saved, consenting player Echo snapshots. A borrowed Echo gives its owner **no attack cost and no World Sigils** (optional social usage count only).

Match first for missing role → compatible power bracket → snapshot validity → fair rotation → friends/guild soft preference. Never always select only the strongest. If population is insufficient, fill with **balanced NPC Echoes** marked as such; their power should be based on the initiator's bracket and capped. No duplicate snapshot of one player in the same squad.

Recommended power brackets: five adjustable server-defined quantiles based on calibrated effective combat power, not arbitrary character level; avoid hard power cliffs or forced waiting. Hold a short list of eligible snapshots per role server-side. A snapshot records equipment **resolved stats**, class techniques, rune/gem effects, valid companion/faith contributions, version, hash, owner account ID and updated timestamp. Do not reference mutable live inventory during playback.

Only future matches consume refreshed snapshots. Old issued battle results and their seeded replay remain immutable. Stale/missing/disqualified snapshots are excluded; never accept a client-supplied “power” number as authoritative. An Echo is **not** a separate full login, does not act on behalf of its owner, and does not mint a transaction.

## 4. Combat simulation and boss phases
- **12–15 server-authoritative combat rounds**; target replay duration 60–90 seconds on normal speed. Actual duration is presentation-only; result is computed before replay, using the shared 2D/stat combat engine when feasible.
- Every damage, heal, shield, absorb, cleanse, crit, down and boss phase event shown must originate from the committed event log. **No fake damage animations or provisional hit numbers.**
- Boss event phase is snapshotted at **battle start** based on global HP: Phase I (100–70%) **Armored**, Phase II (70–30%) **Exposed**, Phase III (30–0%) **Enraged**. A personal battle does not switch global phases halfway through; this avoids replay inconsistency from concurrent players.
- Boss abilities should create distinct *readable* role opportunities: Tank mitigates/covers targeted spikes; Support heals/shields/cleanses real damage; Damage breaks barriers/weak points; all damage counts toward collective HP.
- Limit one major dangerous boss action per 2–3 rounds; boss telegraph appears in the event timeline and matches the actual server decision. Use simple HUD status chips, not walls of narration.
- Global HP deducts **committed effective squad damage once**, capped by remaining HP and the configured per-attack damage ceiling. A squad in Residual Echo mode deducts zero. Players may view a log of which battle actually changed global HP.
- The initiating character's **World Impact** is separately role-normalized: it must not simply credit all four borrowed Echo players' damage to one player. Echo owners are never rewarded merely because they were sampled.
- Combat failure still consumes an attempt if the authoritative battle completed (proposed base payout 5 vs 10 Sigils), but **server error / timeout before commit costs nothing**. An interrupted connection recovers the same committed result and replay.

## 5. World Impact: fair contribution across roles
Each committed battle stores a per-member raw metric vector. For the initiating player, derive **impact per attempt** using same-role, same-power-bracket reference profiles from controlled simulation (do not compare a healer's raw damage directly with DPS).

Suggested preliminary score before clamp, using normalized ratios where 1.0 represents benchmark play:
- **Tank:** 35% own meaningful damage + 40% damage really mitigated/absorbed + 15% real ally-protection actions + 10% survival / round participation.
- **Damage:** 80% meaningful boss damage + 20% verified weak-point / barrier-break contribution.
- **Support:** 25% meaningful damage + 40% **effective** healing (not overheal) + 25% shields actually consumed + 10% cleanses/real amplification.
- Clamp credited impact to **0–1.4 per attack**, round consistently, and expose a simple breakdown rather than the underlying reference math. Caps prevent infinitely farming mitigation or heals via intentional damage soaking.
- **Milestones (draft):** cumulative 0.8 / 1.8 / 3.0 Impact → 5 / 10 / 15 Sigils, awarded once per event. Target one/two/three prepared attempts; benchmark simulations must show Tank/Damage/Support have similar access.
- No reward for unused shields, overheal, predicted attacks that never hit, unspent War Orders or damage to an already-dead HP pool. World Impact is not the same number as the public boss HP damage.
- Save detailed role metrics for future leaderboards, but **do not display a leaderboard UI** until the independent Leaderboards feature launches.

## 6. Three original World Bosses (rotation every six weeks)
All three have three global phases but must feel mechanically different. Abilities listed are authored encounter-design intentions, not implemented code.

| Boss / World | Silhouette and gameplay identity | P1 100–70% | P2 70–30% | P3 30–0% | Role counterplay |
| --- | --- | --- | --- | --- | --- |
| **Hollowroot Colossus** / ancient forest | Giant walking bark-and-root guardian; exposed amber heart, enormous asymmetrical branch arms; **attrition + regrowth** | Bark Mantle reduces damage; Root Slam cleaves front line every 3 rounds | Entangling Vines locks one ally for one round; Sporeburst applies a cleanseable decay; Regrowth channels and can be interrupted / reduced by weak-point damage | Splinterstorm: high-pressure alternating blows; heart weak point pulses | Tank counters Root Slam; Support cleanses/real healing; Damage forces the amber-heart exposure |
| **Sunscar Devourer** / desert | Sand-serpent / plated wyrm with obsidian maw and hot copper fractures; **burn + weak points** | Sandbreaker targets Tank; Scorch Mark creates a timed burn | Burning Tempest strikes multiple teammates; breakable Solar Plates open a weak point | Desert Fury adds a marked high-damage strike every 3 rounds | Tank soaks marked hits, Support removes/mitigates burns, Damage breaks plates while exposed |
| **Frostmarch Warden** / glacial citadel | Ancient runic ice sentinel with hollow cobalt armor, vast crystal shield and one luminous cyan eye; **barrier + control** | Icebound Aegis gives a real shield; a visible barrier gauge can be broken | Deep Freeze roots one target; Shardstorm hits the group; support utility prevents follow-up damage | Winter's Grasp accelerates unavoidable chip damage, with shorter barrier windows | Tank protects frozen ally; Support shields and cleanses; Damage breaks aegis to avoid attrition |

**Per-round boss telegraph examples:** Root Slam winds up → next round cleave; Solar Plates fracture → 2-round weak point; Icebound Aegis rises → barrier HP visible. Telegraphs must be meaningful even when a player watches replay after the result is known.

**Future modifiers deferred:** Reinforced Armor, Raging Tempest, Unstable Magic. Do not launch with them; first validate the base three-boss rotation. No additional boss roster until all three feel unique.

## 7. Shared War Camp and resource sinks
A single **community progress board** has three tracks. Donations are optional and affect *all subsequent* event battles only; they never secretly mutate a completed saved fight:
- **Fortifications** — timber, ores, metal bars. Tier I: **5% less boss damage**; Tier II: **additional 5%** (10% total).
- **Field Provisions** — herbs, fish, cooked food. Tier I: **+5% starting squad HP**; Tier II: **+5% effective healing**.
- **Siegecraft** — refined metals and crafted materials. Tier I: **+5% barrier break**; Tier II: **+5% weak-point damage**.
- **Account donation cap: 2 bundles / event**, *shared across all tracks*; either two on one track or one each, never six. Each bundle grants **5 World Sigils** after validated consumption; **10 total per event** (two bundles). This increases the former maximum event reward by 2.
- **Early bracket example bundle:** 40–80 common raw resources **plus** 5–15 processed items; higher tiers use matching later-region materials and should cost similar relative AFK gathering time. Do not hard-code this as final without checking live T1–T4 economies. No unique, event-only or unusually rare crafting materials required.
- Proposed community goals: set counts at event start using predicted **participating eligible accounts × expected bundles**, with a floor for low population. For each track, Tier I at ~25% and Tier II at ~50% of that track's predicted full-contribution capacity, adjusted so **two Tier I** upgrades are attainable under moderate engagement. Never secretly increase a goal during the week.
- If a track reaches Tier II, additional donations may be redirected to other tracks until the account cap; still no extra Sigils per donation. War Camp buff snapshot/version is included at battle start and shown on the results screen.
- All submitted material consumption is **transactional**, server validated and idempotent. Count material donations as real economic sinks rather than cosmetic counters. Keep material IDs and class availability aligned with the evolving Tier 2–4 recipe tables.

## 8. Detailed World Sigil reward ledger (November 11 economy amendment; design only)
| Source | Draft payout | One-time rule |
| --- | ---: | --- |
| Completed successful personal attack | 10 Sigils × up to 3 | Battle commit, once per attempt |
| Completed lost personal attack | 5 Sigils × up to 3 | Cannot replay for a different result |
| Cumulative Impact milestone 0.8 | 5 | Once per event |
| Cumulative Impact milestone 1.8 | 10 | Once per event |
| Cumulative Impact milestone 3.0 | 15 | Once per event |
| Global HP reaches 70% | 5 | Qualified participant only |
| Global HP reaches 30% | 10 | Qualified participant only |
| Global HP reaches 0% | 15 | Qualified participant only; no award when boss survives |
| Two War Supplies donations | 5 + 5 | Real resources consumed; two-bundle event cap |

**Theoretical maximum:** 3 × 10 + (5+10+15) + (5+10+15) + 2 × 5 = **100 World Sigils** per event (formerly 98). A lost attempt pays 5 instead of 10, so its attainable total is lower. **100 is a maximum, not a guaranteed payout.**

**Qualification proposal:** at least one completed personal battle by event end for global milestone currency; donating alone still advances community buffs and earns its 5-Sigil contribution but does not unlock the full collective boss-kill package. Resolve participation against authoritative receipts, not client timestamps. Event-completion rewards can be claimed from Inbox later.

**No pay-to-win:** World Sigils are account-wide, untradeable and persist across events; no Sigils sold for real money and no extra attacks for currency. Cosmetics-first economy; capped progression bundles never grant exclusive permanent combat bonuses.

## 9. Rotating boss-themed World Sigil shop (approved design November 11; not live)
There is **one account-wide, nontradeable World Sigil wallet** shared across every boss. Sigils persist through rotations. The shop consists of a **permanent utility shelf** and a **featured cosmetic/pet collection that changes with the World Boss**, rather than separate currencies or prices.

**Rotation:** Hollowroot Colossus → Sunscar Devourer → Frostmarch Warden. The current boss's collection remains purchasable for the **7-day active event plus the following 7-day downtime**, so players have the full **14 days** to decide. The next boss theme replaces it at the following event start. Each boss returns every **42 days / 6 weeks**. Missed items can be bought on their next rotation; permanently owned items never disappear. Display the next featured-set change date and an Archive/Owned Collection for previewing previous and upcoming sets.

**Permanent utility shelf** (independent of current boss; normal event purchase caps):
- **Basic consumable/material choice:** **15 Sigils**, up to 2 per event; an existing processed-resource crate with bracket choice.
- **Advanced resource choice:** **35 Sigils**, up to 1 per event; modest T2/T3 crafting materials with no exclusive market bypass.
- **Companion Essence / Bondstones choice:** **50–60 Sigils**, small amount with hard event limits; no large mastery acceleration.

**Rotating cosmetic and pet set: identical cost for each boss, but a distinct reward per theme.**
| Item | Sigils | Hollowroot Colossus (forest) | Sunscar Devourer (desert) | Frostmarch Warden (ice) |
| --- | ---: | --- | --- | --- |
| Profile icon | **120** | Glowing amber heartwood core | Ember-eyed desert wyrm sigil | Frost-blue rune and sentinel eye |
| Rare / animated border | **180** | Living roots and amber sparks | Bronze plates and sunfire embers | Glacial runes and drifting frost |
| Pixel-art profile background | **240** | Ancient overgrown grove | Sunscar dunes beneath a blazing sky | Silent frozen citadel |
| Exclusive themed pet | **360** | **Heartwood Sprout**, miniature forest guardian | **Sunscale Hatchling**, small armored desert wyrmling | **Rimebound Wisp**, floating ice sentinel |

The three proposed pet names and exact artwork are **provisional**; the **common prices 120 / 180 / 240 / 360 are retained**. Each boss has four separately owned item IDs. All rewards are account-wide, purchases are one-time per account for cosmetic/pet entitlements and ownership persists across seasons. Previously purchased cosmetics remain equippable even while that boss theme is not featured.

**Accepted provisional rarity/buff design (2026-11-11; not live):** All three World Boss **pets, backgrounds, borders, and profile icons are Epic**. Icons are cosmetic only. Bonuses follow the ordinary Veldryn collectible formula; the owned bonus is permanent and account-wide, while the active bonus requires equipping the item in its corresponding slot.

| Boss | Epic pet (360 Sigils) | Epic background (240 Sigils) | Epic border (180 Sigils) | Epic icon (120 Sigils) |
| --- | --- | --- | --- | --- |
| Hollowroot | **Heartwood Sprout**: +3% Healing Effectiveness active; +0.50% owned | **Heartwood Sanctuary**: +2% Gathering Yield active; +0.50% owned | Living roots: +2% Herbalism Speed active; +0.50% owned | Amber-heartwood icon; no buff |
| Sunscar | **Sunscale Hatchling**: +3% Attack active; +0.50% owned | **Scorched Dominion**: +2% ordinary combat Gold active; +0.50% owned | Bronze-and-ember border: +2% Crafting Speed active; +0.50% owned | Desert wyrm icon; no buff |
| Frostmarch | **Rimebound Wisp**: +3% Defense active; +0.50% owned | **Frozen Citadel**: +2% Action Speed active; +0.50% owned | Ice-rune border: +2% Fishing Speed active; +0.50% owned | Frost-rune icon; no buff |

The +0.50% owned bonus in each row applies to the **same stat as its active bonus**, irrespective of whether the reward is selected. Only one selected pet, background, and border can contribute their equipped active bonus. Pet bonuses use +3% active rather than a new stronger World Boss tier; backgrounds and borders use +2% active. Existing collectible-family deduplication and target caps must govern all ownership and active bonuses; no bypass, extra stack, or separate World Boss bonus multiplier. Profile icons provide **zero passive and zero active buffs**.

**Background art direction:** Heartwood Sanctuary is a glowing amber forest grove with gentle spore movement; Scorched Dominion is a desert ruin with shifting embers; Frozen Citadel is a snow-covered, glacial stronghold. Subtle motion is optional and must support a static reduced-motion fallback. All three backgrounds remain **profile cosmetics**, not combat scenes. Names and art are provisional; this is approval to record and later implement the design, not activation of currency, shop, assets, or buffs.

**Pet balance:** use the existing active/passive pet bonus budget, with no stronger permanent stats than comparable pets. Equip only one active pet; multiple World Boss pets must not stack their power. Their distinction is visual. **Prestige cosmetics** remain deferred at **480–600 Sigils**, pending telemetry. Never sell Sigils or extra attempts for real money; do not make the exclusive pet a random loot box.

**Shop UI and backend rules:** featured boss art, all four previews and prices, balance, ownership indicators, rotation countdown, permanent utility shelf, and Archive; server-authoritative wallet debits, unique account entitlement grants, catalog price/version and active-window checks, event purchase limits for utilities, and replay-safe idempotent transaction receipts. A past theme is preview-only until it returns. No FOMO confiscation.

An engaged sample account with 2 successful attacks, two personal impact milestones, two donations and the global 70%/30% milestones earns **20 + 15 + 10 + 15 = 60 Sigils**, instead of the former 58. Validate actual earnings against server data before release.

## 10. Boss HP, participation and event economics
**Set boss HP once at event creation**, after measuring eligible power-bracket distribution. Suggested provisional formula:

`HP = max(minHP, round_to_1000(N_eligible × p_active × attacks_per_active × median_effective_squad_damage × difficulty_factor))`

Example: 200 eligible accounts × 70% active × 2.0 attacks × 28,000 effective squad damage × 0.88 difficulty factor = **6,899,200 global HP** (round to 6,899,000), calibrated so active communities can succeed without every player spending all three attempts. This is an illustration, not final HP.

- Cap/review extreme contribution from a single account; match power bracket before simulating reference damage; inspect high-percentile outliers.
- The event must be capable of **genuine defeat**. Show projected pace and “at current pace” estimate with clear uncertainty; do not rubber-band HP down mid-event or guarantee victory.
- For very small populations, apply a published **minimum viable health / participant floor** at creation (or choose shared world shard grouping explicitly) to avoid unwinnable communities. No silent NPC attacks against collective HP.
- Simulator inputs to validate: eligible 40 / 200 / 1,000, participation 40–85%, 1.2–2.8 attacks per active account, role mixes, supply uptake 20–80%, failure rate, early boss-kill and all-week inactivity.
- Compare expected earnings 40–80 Sigils per engaged account to shop prices and resource sink capacity; monitor event victory rates, pass-through at phase thresholds and role Impact milestone reachability.
- No trading World Sigils through the future Player Market.

## 11. Mobile UI and UX
**World Bosses get their own full screen**, not a permanent Dungeon tab. A compact seasonal World event invitation and an Account quick-entry may link to it; do not reintroduce the deleted World/Dungeon mixed tabs. When inactive, show “Next Awakening”, the **World Sigil shop** featuring the previous boss's collection through the downtime week, owned cosmetics and personal results; when active, show the current boss. The shop shows account Sigil balance, featured theme, previews/owned state, Archive and the next rotation time.

**Overview hierarchy:** pixel-art boss portrait → global HP/phase → UTC deadline → attempts (0–3) → prominent **Attack** → secondary War Camp / Rewards / Details. The entire entry panel must fit comfortably on a small phone without a dozen large cards.

**War Camp:** 3 compact lanes with icon, current Tier, resource contribution requirements, personal inventory count and one Donate modal. After donation, show its *actual* community upgrade contribution and Sigil receipt.

**Preparation:** role and power bracket, loadout capture timestamp, 1 initiator + 3 real/NPC Echo slots, one War Order, applicable buffs + explicit excluded dungeon-only potions. No player has to arrange a synchronous party.

**Replay:** boss top; four player portraits lower row; compact phase/barrier telegraph; visible hit-by-hit HP changes from logged events. Normal / 2× / Skip when committed replay ready. “Results” accessible from overlay, not a tiny top-right X.

**Results:** effective boss damage, saved World Impact, class-role breakdown, global HP before/after (or Residual Echo label), Sigils earned, and milestone progress. Buttons: **Claim & Return**, **Attack Again** (only if attempts remain). If boss fell during another person's battle, show final global state without altering this committed result.

**Accessibility & performance:** runtime localized text (never baked into artwork); 44dp minimum touch targets; reduced-motion replay; compact readable damage and color+icon indications; no mandatory animation wait; sprite atlases and thumbnails kept small, transparent art with no borders/text.

## 12. Original artwork direction / production briefs
Match Veldryn's existing **polished fantasy pixel-art**, high-contrast silhouettes, clean pixel clusters, purposeful limited palettes and 2D mobile presentation. No real-time 3D, no generic painterly illustrations, no photo effects, no text/labels embedded in sprites, no baked rarity UI borders. Reuse existing combat HUD grammar; all boss art must feel *larger than ordinary monsters*, with strong original shapes.

**Hollowroot Colossus:** asymmetrical colossal trunk/branch shoulders, cracked warm-amber core, moss and tangled root legs. Palette deep forest green `#365746`, desaturated bark `#6A5643`, amber heart `#F3B45C`. Phase overlays: thick bark plate → illuminated core → red-orange splitting roots. Pixel telegraph: ground root cracks + green leaf/spore glyphs.

**Sunscar Devourer:** distinctive side-curled desert wurm torso facing forward, wide obsidian jaws, bronze/copper segmented sand plates and ember seams. Palette rust `#B65F38`, sand `#D9AA68`, obsidian `#352F35`, ember `#F3A147`. Phase overlays: sand armor → bright exposed seams → storm-blown furious orange. Pixel telegraph: 2–3-frame rising dust and white-hot plate lines.

**Frostmarch Warden:** hollow ancient humanoid ice sentinel with off-centre luminous eye, giant runic shield, heavy crystalline pauldrons and trailing glacial cloth. Palette ice cyan `#7AC9E2`, steel blue `#496A91`, night navy `#253B58`, cold white `#DFF5F7`. Phase overlays: solid aegis → fractured shield → aurora/cold vapor. Pixel telegraph: angular frost sigils and shield crack tiles.

**Asset handoff (proposed per boss):** 512×640 front-facing **master full-body sprite** transparent PNG; 256×256 portrait/icon PNG/WebP; one environment backdrop at ~1024×512 (separate parallax layers optional); tiny 2D idle, attack, impact, defeat and phase-overlay spritesheets (4–8 frames per primary action, avoid unnecessary fully redrawing each phase); 256×256 ability icons per signature mechanic; 256×256 boss-themed sigil/cosmetic resource icons. Native in-game runtime converts or optimizes to WebP as with existing Veldryn assets.

Art files named consistently, e.g. `apps/mobile/assets/world-bosses/hollowroot_colossus/{master.png,portrait.webp,idle.webp,root_slam.webp,...}`. **Art is not generated/implemented by this design document.** Pixel size and color palette should be checked against existing monsters before production. World Boss pets reuse Veldryn's existing pet visual dimensions and passive-bonus rules.

## 13. Suggested backend architecture and integrity checks
Proposed services / data objects (implementation names can change):
- `world_boss_rotations`: boss ID, event ID, start/end, snapshot HP, start-time bracket calibration, phase and status.
- `world_boss_events`: immutable boss definition version, health, war camp goals/levels, close+grace timestamps.
- `world_boss_echo_loadouts`: account owner, character ID, combat role, power bracket, normalized resolved loadout, snapshot hash, content version, update date; never trust values submitted for damage.
- `world_boss_attempts`: account/event + ordinal (1..3), request idempotency key, owner loadout hash, 3 Echo snapshot IDs, war camp snapshot, boss phase at start, deterministic RNG seed, authoritative combat event log, global HP delta, role Impact and Sigil receipts.
- `world_boss_supply_receipts`: event/account, bundle no. (1..2), track, material IDs/quantities, consumed-at, reward receipt.
- `world_boss_player_progress`: cumulative Impact, milestone claim bits, participation and claimed account-wide Sigils.
- `world_boss_shop_receipts`: account ID, boss theme/item ID, catalog price/version, event purchase-limit scope, unique permanent ownership entitlement and idempotent currency transaction ID; preserve pet/cosmetic ownership across rotations.

**Atomic battle transaction:** check event still active, account-level attempt slots and request UUID → validate resolved loadout and selected War Order → select eligible Echoes/NPC fallbacks → calculate *once* with seeded engine → transactionally lock event HP → commit delta, metrics, attempt and reward receipts → replay exact log, independently of network reconnects. No double spend or double global damage with two simultaneous devices. Account switching characters cannot create more attempts.

Use verified game state and server credentials for rewarded operations; client-side preview is for display only. Material donation must debit the same authoritative resource ledger as crafting and prevent inventory desynchronization. Limit event snapshot fields, log/event retention, and network payload; compress replay events where possible. Client polls or subscribes to a **throttled** global boss snapshot rather than fetching on every frame.

**Security/testing:** simulate duplicate requests, simultaneous devices, account character swap, Echo owner changes equipment, disconnected replay, threshold race, final-boss overkill, donation refund exploit, unclaimed reward after UTC end, absent eligible Echo and changed boss definition after a patch. Verify that exactly one result and one Sigil grant exist for each durable battle ID.

## 14. Development passes, no activation yet
1. **v2 design review:** confirm level/unlock, tactic effects, reward values and world HP formula; compare actual T1–T4 resource acquisition times. Run population and role-normalization simulations from existing gameplay data.
2. **Technical foundation (dark launch):** versioned server data, event clock, receipt/account constraints, snapshot schema, calculated combat event logs, War Camp ledger. Hidden UI and no open player access.
3. **Combat variety:** implement and test original abilities for all 3 bosses, phases, real hit/heal/shield events and Echo matching/fallback. Balance Tank/Damage/Support Impact against identical simulated brackets.
4. **Player-facing screens and pixel art:** art production + performance optimization, guided onboarding, compact War Camp, Replay and Results, shop and localized strings.
5. **Staging season:** controlled accounts, artificial concurrency, 7-day time travel, server bundle parity, data retention, adverse network/low-pop stress, actual reward math.
6. **Launch gate:** explicit approval → deploy verified migrations/Edge functions → release Android build → enable feature flag for first announced UTC date. Keep future leaderboards and boss modifiers hidden.

**Explicitly not implemented in this pass:** server routes, database changes, app UI screens, boss assets, World Sigil currency, achievements, public leaderboards and any live event schedule.
