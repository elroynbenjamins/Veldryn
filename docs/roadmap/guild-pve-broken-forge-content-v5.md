# Veldryn Guild PvE — The Broken Forge V5 content pack

**Date:** 2026-11-15  
**State:** Reviewable design/data only. **No live feature, API, migrations, content asset implementation, rewards or scheduler activation.**  
**Supersedes:** No existing live functionality. Builds on [Guild PvE V4](./guild-pve-expeditions-content-v4.md) and the retained V3 21-sheet workbook.

## Scope and verified source inputs

V5 adds a **three-guardian, nine-phase / 36-cue encounter library**, nine **proposed expedition-only enemy variants**, three consistent optional **chapter supply objectives**, content/UX rules, rollout checks, and outstanding balance questions. CSV packs:

- [36 authored encounter cues](./spreadsheets/guild-pve-broken-forge-encounter-cues-v5.csv)
- [9 proposed enemy variants](./spreadsheets/guild-pve-broken-forge-enemy-variants-v5.csv)
- [10 existing-named material candidates](./spreadsheets/guild-pve-broken-forge-supply-candidates-v5.csv)

**Read-only source verification:** The current mobile `GuildNavigation.tsx` provides the **PvE / Raid Gate** destination. `GuildScreen.tsx` currently exposes a Vanguard **Guild PvE contribution** skill and the ten item IDs listed in the material-candidate CSV. Those item IDs are observed in the guild-bank UI list, **not verified as reachable or sustainably farmable by each eligible guild cohort**, nor proven correctly categorized for expedition supplies. The existing guild QA document calls for 320/360/412dp testing and eight languages. The 2026-11-12 regional combat simulation reports nine current classes and real combat baselines, but it **does not simulate Guild Expeditions**. Therefore no V5 encounter damage, HP, supply rarity or Guild Token payout is claimed calibrated.

## 1. Preserve the V3/V4 expedition contract

- **Six-week (42-day) global cycle**, **14 active days**, 28-day downtime; Guild > PvE > **Hunt | Expedition | History**, leaving existing weekly Hunt untouched.
- **Three chapters, 18 nodes**, two mandatory guardians and a three-phase final boss. Side objectives are **optional**; no faction-voting route soft locks.
- **Three difficulties** (Scout, Veteran, Mythic), frozen once per guild cycle. Mechanics change more than raw HP.
- **8 Assault Seals** and **6 Exploration Orders** across all a player's characters, delivered **4+4 and 3+3** at T0 and T+7 days. No daily requirements, purchase or automatically consumed attempts.
- Server-calculated deterministic attack replays, versioned definitions, one account per guild run per cycle; no double payout or stale debits.
- Guild Bank untouched. Supplies consume only explicitly selected, legally owned, unreserved inventory materials.
- World Boss and Party Event activity, wallets, rosters and ranking remain independent.

## 2. The three chapter beats

### I — Outer Defenses

The raid reaches a smoking camp surrounded by sentries. **C1-04 Gate Patrol** has three optional difficulty-dependent enemy compositions: an **Ashforged Sentry** (armour/opening), a **Signal Keeper** (alarm and Pressure), and a **Cinder Skirmisher** (short burst). Their appearance is a *proposal*, not a claim that these monsters currently exist in Veldryn.

- C1-02 scouting identifies a weak gate seam and helps newcomers see why **Assault** benefits from the exposed opportunity. Scouting is useful without secretly granting a mandatory damage multiplier.
- C1-05 Watchtower disables one opening alarm/Pressure source in Chapter II. Preserve the earlier V4 rule: it is a limited benefit, not permanent raid invulnerability.
- **Ironbound Gatekeeper** features *Iron Skin* (100–60%), *Gate Collapse* (60–20%) and *Open Gate* (20–0%). Visible hammer telegraphs and three-stack Sunder cap.
- Its defeat reduces final Warden armour regeneration by **50%**, with the exact real magnitude still subject to simulation.

### II — Molten Halls

The guild crosses a dangerous furnace corridor and confronts the forge's overseers: **Furnace Hound** (burn), **Chainwright Overseer** (curse/mark) and **Coalbound Adept** (linked ward).

- C2-02 Shattered Armoury disables the **remaining** Warden armour regeneration after the Gatekeeper effect. Zero minimum: no negative regeneration or double reward.
- C2-03 Rescue Captives generates a finite, shared Rally protection charge, never an infinitely repeating passive buff.
- **C2-04 Shrine of Embers** keeps its **free three-option guild vote**. V5 adds a *separate optional donation track on the same node*, so the original three-chapter supply economy fits the existing **18-node map** without adding a nineteenth node.
- The vote selects **one** capped boon: **Warding Ash** (limited protection), **Cleansing Flame** (one enhanced cleanse charge), or **Searing Insight** (brief exposed-weakpoint benefit). Voting never requires donated materials.
- The shrine's materials grant at 50% a limited charge and at 100% improve its duration or reliability; **do not multiply the chosen buff additively** beyond the existing combined direct stat cap.
- **Emberbound Seer** has *Ash Veil* (100–65%), *Curse Web* (65–30%) and *Emberfall* (30–0%). Its defeat reduces the Warden's burn/curse frequency without removing all counterplay.

### III — Heart of Forge

The guild ascends the lift, faces optional elite wardens and reaches the core.

- **Vault Reclaimer** at Inner Lift, optional **Molten Spear Warden** and **Corebound Remnant** at C3-05 supply new enemy cues.
- C3-02 War Drums: **exactly one** of Assault or Exploration can complete the objective. The accepted path grants −3 raw Pressure generated per future final-boss Assault (V3), capped and no double application.
- C3-04 Core Stabilizer reduces final explosion severity but **never removes the detonation warning/resolve**.
- C3-05 Inner Wardens: optional shared elite HP challenge; extends the final core-exposure opportunity by **one scripted turn** and unlocks a one-time chest, not an unlimited resource farm.
- **Hollow Warden** moves through *Armoured* (100–70%), *Overload* (70–30%) and *Exposed Core* (30–0%).

## 3. Deterministic encounter script contract

The [cue CSV](./spreadsheets/guild-pve-broken-forge-encounter-cues-v5.csv) contains **4 ordered beats for each of 9 phases = 36 authored cue rows**. Fields include boss ID, phase, HP band, ordinal, cue ID, player-facing English line, event kind, suggested role counter, and phase-safe constraint.

**Key model distinction:** These are **phase-local repeating templates**, not 36 world-clock moves or guaranteed 36 total turns. A committed Assault Seal resolves a bounded deterministic combat simulation using the **frozen server-side character + gear + skills + set/stat/effect gem + valid companion** loadout and the latest authoritative guild/boss state. Phase templates may repeat within that one attempt and across later attempts. If an attempt crosses phase thresholds, the server changes phase **in order and once only**; transition-safe warning rules prevent jumping directly into a new phase's untelegraphed lethal resolution.

**No invented animation damage:** First commit actual HP/status/Pressure/boon consumption and save the event reel; then play or skip the reel. A closed app resumes that saved result without rerunning combat. A stale target cleared before acceptance returns without losing a Seal. If an attack was already validly committed while another attack later defeats the boss, return its saved result and idempotent appropriate credit—never a speculative refund or duplicated damage.

**Presentation rule:** The role suggested in the cue is guidance, never a hard class lock. Everyone can use Assault, Guard or Rally; Tank/Support affinities still affect actual benefit. No result may claim cleanse/protection impact without actual affliction removal or damage prevented.

## 4. Difficulty overlay and seeded replayability

| Layer | Scout | Veteran | Mythic |
| --- | --- | --- | --- |
| Guard/cleanse introduction | One dangerous active mechanic at a time | Telegraphed two-mechanic overlap | Ordered shield/cleanse/strike chains |
| Variants | Base encounter variant | Base + second variant where applicable | Linked or additional third variant |
| Warnings | Long and explicit | Moderate | Shorter, never hidden instant KO |
| Optional routes | Helpful and clear | Materially improve survivability/efficiency | Often useful countermeasures, not absolute gates |
| Rewards | V3 proposed 1.25× H | V3 proposed 1.60× H | V3 proposed 2.00× H |

Here **H** means a verified *full weekly Guild Hunt Guild Token payout*; it must be measured before amounts are committed. Those V3 multiples are illustrative *cycle budgets*, not rewards already available.

For future cycles, pick **one deterministic expedition-seed variant per guild run** from a reviewed whitelist (enemy entry order, telegraph flavour, optional chest item type). Variant changes must not invalidate prerequisites, alter the frozen tier, increase paid pressure, add new mandatory objectives, or reroll after every login/preview. Every active guild in a cycle should have comparable nominal cost envelopes by tier; randomness cannot force disproportionate rare materials.

## 5. Supplies and the repaired Chapter II objective

All three chapter objectives remain **optional** and avoid automatically spending from Guild Bank.

| Chapter | Node | Theme | 50% milestone | 100% milestone |
| --- | --- | --- | --- | --- |
| I | C1-03 Supply Cache | Camp fortification and access | One small early protective preparation | Full capped chapter-I preparation |
| II | **C2-04 Shrine side-track** | Ember-ward fuel | A finite extra selected-boon charge | Better reliability/duration within cap |
| III | C3-03 Final Supplies | Core breach tools | Limited boss damage or protection boon | Complete selected limited benefit |

**Provisional points:** common=1, refined=3, rare=12; chapter goal=**40 × max(4, frozen active-account count) × tier multiplier**; Scout 1.0 / Veteran 1.25 / Mythic 1.5. **Rare contributions <=20%** and **Gold substitution <=10%** of each chapter objective. Per-account objective contribution <=150% of nominal counted-member share (V3). Server clamps the actual item count consumed and points credited; no 101% overpayment. Higher-category items remain optional; every Scout objective requires a reachable low-tier substitute.

[Material candidates CSV](./spreadsheets/guild-pve-broken-forge-supply-candidates-v5.csv) uses ten **existing code-named** item IDs rather than inventing new player inventory SKUs. The candidate categories (including `OATHGLASS_SHARD` and `OATHSTONE_INGOT`) are **not confirmed loot rarity, market availability, crafting progression or acquisition time**. Do not ship these ingredient assignments without comparing actual inventory and drop tables, especially because current regional combat work flags unresolved Sunscar/Frostmarch tier-material mapping.

**Small guild implication:** A one-member guild under the min-4 scale and the per-member 150% supply cap cannot personally fill a whole chapter supply bar. This is intentional under V3's anti-whale protections; supplies are optional and participation/partial clear rewards still matter. During simulation, review whether offering a minor personal preparation action (without changing shared supply quotas) is better UX for one-to-three-member guilds.

## 6. Contribution fairness, progression and reward controls

- **Effective Assault HP damage** credited only to actual shared HP removed, not overkill.
- **Guard:** Pressure decrease and protection charges are useful, but Impact credit only for consumed protection and actual future damage prevention; capping at safe combat is not a farming loophole.
- **Rally:** actual recovery/cleanse and used charges; no free Impact for no-op cures.
- **Exploration:** accepted unlocks, clues or valid objective progress; each milestone once.
- **Supply:** accepted materials contribute to guild objectives but cannot alone satisfy the two-action eligibility rule.
- **Rewards:** preserve V3 milestone split 15% participation, 20% Chapter I, 20% Chapter II, 35% final boss and 10% optional; eligibility and payout rely on meaningful contributions, *not* an unbalanced damage ranking.
- Guild XP awarded **once per shared milestone**; each account can claim its entitlement once via verified ledger/Inbox fallback. No last-hit reward and no alt-character double claims.
- Optional chest rewards/cosmetics should be non-power or narrowly budgeted; suggested first-clear assets: **Broken Forge guild banner**, **Ember-Touched profile border**, **Hollow Core icon**, and **Forgebreaker trophy**. No new currency at launch.
- Existing **Vanguard Guild PvE contribution** upgrade must be audited for live effect before simulation; never silently stack old weekly Hunt weighting with an expedition-specific multiplier.
- Current weekly Hunt remains completely separate and regression-tested.

## 7. Art and localization brief

Use existing Veldryn pixel-art enemy icon line weight, pixel grid, silhouette readability, contrast and rarity-border rules; **do not invent a new soft-shaded or painterly icon style**. Produce one guardian illustration per boss (Gatekeeper, Seer, Warden) and nine optional enemy variants listed in CSV, plus reusable small icons for **start / skirmish / scout / donation / vote / guardian / elite / final boss**. Derive exact sprite resolution, padding, backgrounds and export naming from existing game art assets *before* generation. Combat glow and phase warnings can be lightweight native overlays, not nine multiplied images per difficulty.

Story callouts for localization (English master; then NL/DE/ES/IT/FR/RU/TR):
- **Camp:** “Ash rises beyond the broken gate.”
- **Scouting:** “Tracks reveal an opening in the armour.”
- **Gatekeeper warning:** “The hammer rises. Brace for impact.”
- **Shrine:** “Choose one ember blessing for the guild.”
- **Seer warning:** “The furnace vents begin to roar.”
- **Core:** “The exposed heart is close to collapse.”
- **Result:** “Your action weakened the forge for everyone.”
- **Refund:** “This encounter was already cleared. No Seal was spent.”

## 8. UI wireframe contract (320dp first)

```text
Guild  >  PvE
[ Hunt | Expedition | History ]
Broken Forge       6d 14h left
[ Chapter I | Chapter II | Chapter III ]
Seals  3/8      Orders  2/6
  [ Gate Patrol ] -- [ Gatekeeper ]
       |                 |
  [ Scout Ruins ]    Chapter II
       |
  [ Watchtower ]
Selected: Gatekeeper
HP       62%       Pressure 24
[What this changes] Warden armour regen -50%
[Assault] [Guard] [Rally]
[Preview]       [Spend 1 Seal]
```

*The numbers above are placeholders for layout only; the client displays only real server values.* Keep activity bar and competing screen controls consistent with the current Dungeon flow. One stable combat screen should display the boss phase, a single-line readable cast telegraph (not a jumping modal), phase warning, the player's loadout, and replay/skip. On slower devices, show **Preparing battle** until the true replay arrives. Node panels have accessible back/close, 44dp targets, one clearly labeled currency/attempt cost and precise boon descriptions.

## 9. Simulation and QA plan (no invented pass claims)

1. **Schema/graph checks:** exactly 18 node IDs, every required node reachable, C2-04 has two independent activities without duplicate node, optional nodes never required to reach final, no cycles.
2. **Cue checks:** exactly 3 bosses × 3 phases × 4 ordered cues, distinct IDs, warning precedes serious resolves; phase-boundary thresholds and zero-HP once.
3. **Role parity:** all nine classes and class-compatible companions at multiple actual gear quality/tier paths; all-Damage, all-Tank, all-Support account groups must have viable progression.
4. **Guild sizes:** frozen rosters 1/2/3/4/8/12/20 and active participation 50/65/70/75/90%; test Seal usage distribution rather than assuming every participating account spends all eight.
5. **Power:** real gear/stat/effect gem, buff/companion, difficulty and region XP baselines, max Vanguard skill, 0 and 100% preparation; distinguish per-attempt survival from completion.
6. **Economy:** item ID and genuine acquisition-source verification, 50%/100% supply milestone reachability and caps, resource/gold sunk vs six-week Guild Tokens/XP earned; no rare bottleneck.
7. **Concurrency:** 20 simultaneous commits, guardian death with pending attacks, crossing 70%/30% thresholds, dual-method War Drums, simultaneous Chapter II donation and ballot result, stale/duplicate claim/refund, crash and network retries.
8. **UI & permissions:** all eight locales, TalkBack, reduced motion, font 200%, 320/360/412dp devices, alt-character switching, guild leaving/returning, weekly Hunt and Guild Projects unchanged; hidden feature flag denies public access and grants.
9. **Telemetry:** completion by guild size/tier, Guard/Rally meaningful impact, sealed attempts spent, refund rate, case-insensitive duplicate claims, P95 fight preparation cost and actual material consumption.
10. **Approval gate:** proposed HP, action coefficients, supply item valuations, loot amounts, schedule anchor and late-join allocations cannot be interpreted as production values until calibration passes and owner explicitly approves an implementation rollout.

## 10. Decision register / next technical phase

| Item | V5 outcome | Remaining evidence |
| --- | --- | --- |
| Node count and story | Fixed 18; repaired Chapter II optional supplies within C2-04 | Verify with content graph test |
| Three bosses | 9 phases / 36 documented cues | Integrate into disabled prototype and test authoritative engine |
| New enemies | 9 art/content candidates | Check existing icon taxonomy, sprites and actual class damage affinities |
| Materials | Ten observed UI item IDs, provisional weights | Inventory/loot/economy audit |
| Combat values | **Not set** | Source-derived multi-class real-gear simulation |
| Rewards | V3 budget preserved; no extra currency | Current weekly Guild Hunt payout and token inflation checks |
| Mobile | UX behavior and microcopy documented | No public code or Android QA yet |
| Release | **Hidden / design only** | Backend staging, security tests and separate explicit approval |
