# Veldryn Guild PvE — Expeditions content and fairness V4

**Status:** design proposal only; not implemented, not deployed; drafted 2026-11-15.
**Source:** Guild PvE Expeditions Design v3 (2026-11-09; 21-sheet workbook).
**Design location:** `docs/roadmap/spreadsheets/` remains the workbook archive. This note is the reviewable v4 continuation, not a replacement for the v3 workbook or a gameplay feature flag.

## 1. Invariants carried forward from V3

- The existing **Guild > PvE / The Raid Gate** destination remains, with **Hunt | Expedition | History** inside; weekly Hunt is untouched.
- One global **42-day / six-week cycle**: **14 days active, 28 days downtime**. No daily expiring tasks. Guilds participate asynchronously.
- At launch, one handcrafted adventure, **The Broken Forge**, with **three chapters and 18 nodes**, two mandatory guardians and one final boss.
- **Scout / Veteran / Mythic** are difficulty modes distinguished principally by encounter mechanics. Do not simply scale raw HP aggressively.
- Each account across all its characters gets **8 Assault Seals** (4 at event start, 4 at Day 8) and **6 Exploration Orders** (3 + 3); no paid replenishment.
- Unlocked branches can receive simultaneous contributions without one guild officer locking the route. Supply costs are paid only from explicitly confirmed player inventory; never auto-spend Guild Bank items.
- All combat and rewards server authoritative; meaningful Tank and Support actions count, and no last-hit reward premium. Separate World Boss and Party Event currencies/states.
- Do not add client UI, database schema, scheduled actions, payouts or release gates until separately approved.

## 2. Campaign fantasy and chapter rhythm

A dormant stronghold known as **the Broken Forge** has begun producing unstable constructs. The expedition advances from the ruined outer defences through a volcanic production hall into the forge heart. **Mandatory corridor nodes progress the story; optional branches materially weaken future encounters, reveal paths, grant protective charges, or provide cosmetics.** No branch permanently excludes guildmates from the main story.

| Chapter | Purpose | Climax | Tactical dilemma |
| --- | --- | --- | --- |
| I — Outer Defenses | Establish the threat; learn how scouting and shared Assaults work | **Ironbound Gatekeeper** | Spend Orders finding the Watchtower, or rush the gate while Pressure is high |
| II — Molten Halls | Learn affliction/armour counters; rescue allies; select one limited boon | **Emberbound Seer** | Invest in the Armoury, captives, or fastest direct guardian progress |
| III — Heart of Forge | Combine previous countermeasures and an optional elite challenge | **The Hollow Warden** | Save Seals for final HP, or spend them on drums/wardens to make the kill safer |

Gameplay should show the direct result of every side objective on the final boss preview before the player spends anything.

## 3. Eighteen-node content pack

Symbols: **S** = one Assault Seal per committed battle, **O** = one Exploration Order per committed exploration action, **M** = explicitly donated materials, **—** = no Seal/Order required. Shared fight HP is persistent; one player's spend is not an individual node clear. Exact combat durability, exploration thresholds and recipes remain simulation inputs, NOT approved production numbers.

| ID | Node | Type / entry | Unlock | On clear / chapter effect |
| --- | --- | --- | --- | --- |
| C1-01 | Broken Camp | Start / — / required | Campaign opens | Reveal first chapter, tutorial on Orders vs Seals |
| C1-02 | Scout the Ruins | Explore / O / optional | C1-01 | Reveal C1-05 and show Gatekeeper's armour/telegraph clue |
| C1-03 | Supply Cache | Donate / M / optional | C1-01 | Chapter I supply boon at 50% and 100% contribution thresholds |
| C1-04 | Gate Patrol | Skirmish / S / required | C1-01 | Clear shared barricade and reveal the Gatekeeper |
| C1-05 | Watchtower Defenses | Explore / O / optional | C1-02 **or** C1-04 | Start Chapter II with reduced shared Pressure; non-permanent single-use advantage |
| C1-06 | Ironbound Gatekeeper | Guardian / S / required | C1-04 | Unlock Chapter II; halves final boss armour regeneration before any Armoury sabotage |
| C2-01 | Molten Corridor | Skirmish / S / required | C1-06 | Unlock Chapter II branches and introduce burn telegraph |
| C2-02 | Shattered Armoury | Explore / O / optional | C2-01 | Suppress the **remaining** final boss armour regeneration. Stacks cleanly with required Gatekeeper effect; never double-credits |
| C2-03 | Rescue Captives | Explore / O / optional | C2-01 | Add one capped protective Rally charge for future boss attempts |
| C2-04 | Shrine of Embers | Guild boon choice / — / optional | C2-01 | One winning choice from protection, cleansing, or exposed-core benefit; no exclusive-route lock |
| C2-05 | Forge Overseers | Skirmish / S / required | C2-01 | Break the Seer's ward and open its chamber |
| C2-06 | Emberbound Seer | Guardian / S / required | C2-05 | Unlock Chapter III; reduce the final boss's affliction frequency, not remove every affliction |
| C3-01 | Inner Lift | Skirmish / S / required | C2-06 | Open the final approach and optional final chapter preparations |
| C3-02 | Destroy War Drums | Tactical / S **or** O / optional | C3-01 | Reduce +Pressure applied by each final-boss Assault by **3** (v3); exactly one completion path/boon, no double benefit |
| C3-03 | Final Supplies | Donate / M / optional | C3-01 | Choose one capped offensive **or** defensive boss boon |
| C3-04 | Core Stabilizer | Explore / O / optional | C3-01 | Reduce Phase III explosion severity; does **not** erase the mechanic |
| C3-05 | Inner Wardens | Elite / S / optional | C3-01 | Optional one-time chest and extend exposed-core window by one scripted turn |
| C3-06 | The Hollow Warden | Final boss / S / required | C3-01, C1-06, C2-06 | Shared boss 0 HP ends expedition and grants eligible final-clear entitlement |

**Branch contract:** Optional nodes do not hard-gate C3-06. The C3-02 dual-path node commits the first successful completed method; a later near-simultaneous action on the other path is revalidated before debit and refunded if stale. Empty repeat objectives do not consume Orders. Nodes are always actionable from the newest server snapshot, never from client prediction.

## 4. Unique encounter mechanics and counterplay

### Ironbound Gatekeeper
- **100–60% HP — Iron Skin.** Heavy single-target slam every four boss actions. Tank/Guard mitigates the slam; Assault exposes armour seams.
- **60–20% — Gate Collapse.** Sunder stacks up to three; Support/Rally removes eligible dangerous stacks, Guard limits immediate incoming damage.
- **20–0% — Open Gate.** Brief exposed core with a visible charge-up. A successful clear unlocks Molten Halls and the guaranteed partial armour-regeneration suppression at the final boss.
- **Veteran:** armoured patrol adds and one additional predictable Sunder window.
- **Mythic:** linked-warden shields; coordinated sequence of break/cleanse/strike, but no random untelegraphed KO.

### Emberbound Seer
- **100–65% — Ash Veil.** Shared burn stacks; Rally consumes real stacks and gains impact only for actual cleanses.
- **65–30% — Curse Web.** Marked attacks amplify the following curse; Guard can intercept, Support can prevent spill-over.
- **30–0% — Emberfall.** One-action warning before an eruption; defensible via Guard, Rally charges, and prior side-objective preparation.
- **Veteran:** two overlapping burn sources with readable warnings.
- **Mythic:** one curse spread plus an additional eruption cycle; never permanent character debuffs.
- Defeating the Seer reduces final-boss affliction *frequency*, not all affliction risk.

### The Hollow Warden
- **100–70% — Armoured.** Plates mitigate damage. Mandatory Gatekeeper halves its armour regeneration; completing C2-02 disables what remains. Do not let armour mitigation reach 100%.
- **70–30% — Overload.** Pressure rises; charged slam plus burn. C1-05 gives a lower starting Pressure and C3-02 reduces further increases. Guard/Rally remain valuable even without those nodes.
- **30–0% — Exposed Core.** A visible explosion countdown and vulnerability window. C3-04 softens the blast; C3-05 extends the window by one scripted turn. Side objectives give meaningful choice without rendering the final fight trivial.
- **Scout:** one highlighted mechanic at a time and generous warning.
- **Veteran:** overlap at most two counterplay mechanics in a telegraphed sequence.
- **Mythic:** an ordered shield/cleanse/strike cycle, shorter warning, and controlled enrage; still beatable without a forced class roster.

**Phase and replay integrity:** Server commits HP, phase triggers, Pressure, charges, unlocks and the combat event reel atomically. An attack crossing two HP thresholds records the ordered transitions and applies each once. Replay never rolls again.

## 5. Participation, timing, and guild membership policy (V4 proposal)

### Calendar
- **T−72h to T−24h:** Scout/Veteran/Mythic ballot for eligible guild members; show difficulty mechanics and suggested effort, never falsely guaranteed rewards.
- **T−24h:** freeze eligible roster/scale using the V3 candidate rule: member tenure **at least 72h** and meaningful activity on **two different days** in the previous 14. Count distinct accounts, not characters. For ballot settlement, count only still-eligible voters.
- **T0 / Monday 00:00 UTC:** open the chosen tier and issue **4 Seals + 3 Orders**.
- **T+7 days:** issue the second **4 Seals + 3 Orders** once, without expiring existing allowances.
- **T+14 days:** close new action submissions, settle already accepted commits, finalize reward entitlements and history. **T+14 to T+42:** downtime.

**Ballot policy proposal:** Majority of valid votes; a tie goes to the *lower* difficulty among tied options. No valid votes defaults to Scout. Officers can recommend but cannot veto another eligible member's participation. One immutable difficulty per guild per cycle.

### Late entrants and guild moves
- Guilds with 1–3 participants may enter. Keep V3's scaling floor of **4 counted accounts**, acknowledging that partial milestones may be the realistic outcome.
- A member who joins after the locked roster does **not** enlarge the boss or supply requirement mid-cycle. Wait for their 72-hour membership tenure before permitting campaign actions.
- Late join **before T+7:** issue a smaller allowance of **2 Seals + 2 Orders**, then **+2 Seals + 1 Order** on Day 8.
- Late join **at or after T+7:** issue **2 Seals + 1 Order**; no retroactive first-week allocation. These are provisional numbers for playtesting, not V3-approved values.
- Bind each account to **one guild's expedition per global cycle** on its first committed action or first entitlement. Leave-and-return to that guild retains balances; moving to another guild cannot reset Seals, farm milestones, or claim a second set.
- No retroactive claims for milestones unlocked before late-join eligibility. New entrants can earn participation and later milestones with meaningful actions.

### Reward eligibility
- At least **two distinct meaningful committed actions**, with at least **one valid Assault or Exploration**.
- Supply donations can count as the second action only when a genuinely accepted donation advances an unfinished objective; splitting one donation or making no-op donations does not create extra qualifying actions.
- A fully legitimate Guard or Rally action can count without doing DPS. Credited prevention, healing and cleansing are bounded by real effects; valid tactical contributions must not demand an arbitrary damage threshold.
- A member who joins after a chapter is cleared cannot claim that prior milestone; all final-clear rewards require an active eligible role in this guild run. Unclaimed earned entitlements go through an idempotent Inbox outbox.

## 6. How difficulty changes, not merely HP

| Design feature | Scout | Veteran | Mythic |
| --- | --- | --- | --- |
| Expected nominal effort | V3 draft 58% of roster Seal ceiling | 68% | 78% |
| Telegraphs | Long and separated | Moderate, up to two interacting effects | Short but readable, coordinated sequence |
| Sunder/burn/curse | One main threat at once | Limited controlled overlap | Linked mechanics, never RNG one-shots |
| Optional node value | Helpful | Valuable tactical tradeoff | Often decisive to simplify a complex fight |
| End reward | 1.25 × weekly Guild Hunt payout H | 1.60 × H | 2.00 × H |
| Validation | Real roster class/gears tests required | Same | Same; no paid advantage |

Those ratios and token multipliers are **existing V3 placeholders**, not simulated or production-verified. First clear should be feasible for roughly 65–75% active participation in Scout; validate with 4, 8, 12 and 20-person guilds and real nine-class equipment/companion fixtures, not a raw attack-count spreadsheet alone.

## 7. Operations and limits

- **Assault:** direct progress, +15 raw Pressure less 4 automatic decay per committed attempt (V3 example). Damage only credits boss HP actually removed.
- **Guard:** lower raw Pressure by 12 before decay and provide a finite protection charge. Credit only prevented incoming damage in subsequent eligible battles.
- **Rally:** lower raw Pressure by 8 before decay, cleanse real afflictions and create finite support charges; credit only actual benefit.
- All stances selectable by any class; Tank/Support classes have affinity advantages, no mandatory role quota. No autonomous idle combat that spends Seals without explicit permission.
- No victim-blaming shared Pressure: hard cap 0–100, visible warnings, automatic decay, and no silent lethal retaliation against later players.
- For supplies retain V3's conservative starting model: **40 supply points per frozen counted account per chapter**, **minimum roster scale 4**, difficulty multipliers 1.00/1.25/1.50, rare ≤20%, Gold substitution ≤10%, per-member supply ≤150% nominal share. These are *optional preparation objectives*, **not** final-boss gates. Must be economy audited against actual resource drops / inventory.
- Direct supply combat boon stacking ≤12% until battle-calibrated, plus stronger **mechanic-specific** benefits that do not accidentally double-stack.
- Gear/class/companion snapshots are server resolved; no client-submitted stats, false combat frames, or gear-swap rerolls.

## 8. Reward package and guild/social experience

Keep V3's full-clear budget split **15% participation + 20% Chapter I + 20% Chapter II + 35% final boss + 10% optional objectives**. No exclusive last-hit chest. A partly completed guild receives only achieved milestones; participation is still useful.

- **Guild-wide:** Guild XP once per shared milestone, not once per participating character; a campaign-history banner with best tier and clear speed for bragging rights.
- **Account-wide:** Guild Tokens scaled to the player's earned milestone shares, tier-appropriate choice rewards (Gold/materials or Essence/Bondstones where balanced), and first-clear cosmetics. No separate expedition currency at launch.
- **Cosmetics:** Broken Forge banner, ember-touched frame, icon, and cosmetic trophy ideas only; none alter combat power. Validate art and duplicate ownership before reward finalization.
- **Guild feed:** short factual entries for guardian defeats, important discoveries and final victory. Do not flood system chat with individual attack spam.
- **Contributions:** compact top-five plus expanded list, filters for Damage / Protection / Support / Exploration / Supplies. Make it clear rankings are **recognition, not payout multipliers**.
- **Recovery:** results can be reopened from history after a crash; pending requests reuse idempotency keys, and attempts made against an already-cleared target before commit cost nothing.

## 9. Compact mobile presentation

- Guild > PvE > Expedition: **chapter title, 14-day countdown, guild progress, Seals x/8, Orders x/6**, and one obvious **View Map** control.
- Map: chapter paging instead of a giant scrolling canvas; required path centered, optional branches side-linked; icons indicate **Locked / Ready / In Progress / Cleared**, with labels not only colours.
- Node modal: icon, 1–2 sentence story, mechanic preview, boss/target HP, exact action cost, **What this changes** effect and participation. Tap **Preview** before a final confirm button labeled **Spend 1 Seal** / **Spend 1 Order**.
- Battle: server-calculated reel, accurate telegraph, actual damage and finite counters; compact stable result, Replay / 2× / Skip. While calculating show **Preparing battle** only, not fictitious damage.
- Post-action: damage prevented/healed/removed, Pressure difference, real boss progress, newly unlocked path and contribution credit.
- History: past six campaigns, tier, highest chapter, guardian kills, personal impact, unclaimed reward status.
- 320/360/412dp Android; 200% text, keyboard-safe, reduced-motion, 44dp targets and all eight supported locales. No screen jumping when boss cast text appears.

## 10. Nonnegotiable edge-case / QA additions

Add these to the V3 forty-case QA matrix before any staging implementation:

1. Ballot ties favor lower tier; no valid ballot defaults to Scout; eligibility recalculated at freeze.
2. Eligible-roster freeze excludes alt characters and avoids mid-campaign boss resizing.
3. Late join before/after Day 8 never exceeds the provisional allowance; joining at Day 8 has deterministic bucket treatment.
4. Account switches guild mid-cycle, leaves, returns, or cycles characters without gaining bonus attempts or retroactive chest claims.
5. Simultaneous C3-02 Assault/Explore resolutions grant exactly one boon; losing stale action refunds uncommitted resource.
6. Mandatory Gatekeeper armour debuff plus optional Armoury suppression results in zero remaining regeneration, never negative or double rewards.
7. Optional final-core countermeasures reduce specific dangers but never fully erase the boss fight.
8. Guard and Rally zero-effect actions do not inflate Impact; meaningful class contributions qualify without DPS threshold.
9. Unclaimed reward + concurrent claim + Inbox retry gives exactly one reward.
10. Offline background/crash during requested resolution returns one actual replay, never fake client-only combat.
11. Real T1–T4 gear, all nine classes, 4/8/12/20-member mixed cohorts; weak guild Scout can earn reachable partial milestones.
12. Existing Guild Hunt and Guild Projects continue unmodified; no expedition table or feature route publicly active when flag is off.

## 11. Design gates before implementation

**Freeze narrative first**, then run a real combat/loot/economy audit. The hardest open numeric issues are per-node shared HP, action duration, late-join allowances, class parity, chapter supply conversions, tier accessibility and overall Guild Token inflation.

Next authoring pack after this note: exact **per-node enemy variants and telegraph scripts**, **server-compatible content manifest**, **real-gear roster simulations**, **item-specific supply sink recipes**, **reward/cosmetic art inventory**, and **first-run tutorial microcopy**. These require separate review; the present note does not authorize live code, migrations, UI exposure or reward issuance.
