# Veldryn — Party Events v2: Encounter, fairness and release design

**Date:** 10 November 2026  
**Status:** Expanded DESIGN DRAFT / recommendations; **NOT LIVE, NOT DEPLOYED**  
**Workbook:** `Veldryn_Party_Events_Design_v2_2026-11-10.xlsx` (one standalone Party Events workbook, versioned under `docs/roadmap/spreadsheets/`)  
**Supersedes:** [Party Events v1 design](./party-events-design-v1.md), while retaining its approved choices.  
**Prototype evidence:** `backend/src/server/party/weekly-party-{events,event-runtime,boss,rewards,leaderboards}-v2.ts` on `main`; the merged-but-disabled [PR #958](https://github.com/elroynbenjamins/Veldryn/pull/958).  
**Boundary:** This is **documentation and spreadsheet modeling only**. No private gate, cron, SQL migration, live combat balance, player navigation, reward delivery or leaderboards have been activated by this revision.

## 1. Executive gameplay contract

Party Events are a **small-party, asynchronous, three-stage adventure** with a large but attainable resource sink, a saved-loadout Day 8 boss, and one player-chosen reward cache. Their identity must remain separate from weekly Guild PvE and server-wide World Bosses.

| Dimension | Preserved baseline | v2 recommendation / correction | Status |
| --- | --- | --- | --- |
| Cycle | 7 days active + 14 days off, repeat every 21 days; UTC Monday close | Day 8 is the **first rest day**; one-hour settlement grace only processes pre-close receipts | Approved + clarified |
| Roster | 2–4 persistent party members, any class, no dungeon gate | Snapshot event roster at enrollment; do not lock normal Party social actions | Existing hidden model + proposed lifecycle |
| Progress | 100/135/170 EP for 2/3/4 players; 25%/50%/25% stage increments | 4 unique, verified, 5-EP special actions/member; never a daily check-in | Targets in prototype; special emitters proposed |
| Resource use | Required 90/120/150 and optional 45/60/75 gather-equivalent min/member at Standard/Veteran/Heroic | Verify **real** server acquisition rates; show units/owned/needed, alternatives only pre-enrollment | Hidden model + prelaunch calibration |
| Votes | Stages 2/3, one ballot/member; six-hour majority/timeout | **Open on entering stage**, not only after all stage gates; auto-resolve on active-week close | Proposed fix |
| Finale | Day 8 server-verified frozen loadouts, 12 escalating tiers, ≤90 seconds each | True statistical median for even rosters; canonical difficulty multipliers and explicit readiness/settlement states | Existing prototype + proposed fix |
| Rewards | 0–4 EP none; 5–14 participation Gold; 15+ choose Warrior/Artisan/Companion on a fully eligible completed event | Partial-event participation policy, no full-cache exploitation, atomic account-wide grant | Hidden rewards model + proposed completion policy |
| Rankings | Server-only metrics, independent public Leaderboards gate | Keep hidden, partition by event/difficulty/party size, do not use raw DPS for rewards | Existing privacy rule |

### Four gaps confirmed by reading the code

1. **Boss median for two players:** `levels[Math.floor((levels.length-1)/2)]` selects the *lower* level for a two-person roster; this enables low-level anchoring. Use the **mean of the two central sorted levels**, rounded, for even sizes. Boss difficulty must remain independent of equipment so improved gear still matters. Mixed-level pairs (1+100, 15+70, 30+50) need explicit fairness tests.
2. **Difficulty multiplier drift:** `weeklyPartyBudget` stores `finalePowerMultiplier` as **1.00 / 1.25 / 1.50**, while `tierBoss()` currently uses **1.00 / 1.20 / 1.40**. Choose **1.00 / 1.20 / 1.40 as the v2 proposal**, keep rewards at their separate 1.00 / 1.20 / 1.35, and define a single authoritative table in implementation. This document does not modify either constant.
3. **Stage III circular completion:** `evaluateWeeklyPartyStage` requires `finaleCleared` to complete Stage 3, while the finale is run on Day 8. A stage may be `ready_for_finale` before close, but must not be `completed` or paid until an actual authoritative Day 8 result is committed. Recommend `finaleSettled` with a stored outcome, not a synthetic victory flag.
4. **Vote timing:** stage evaluation checks EP and supply gates before `voteResolved`; opening a ballot late can deadlock preparation near the Sunday cutoff. Open each vote on stage entry, let supplies and EP progress while votes run, and resolve deterministic default at the earlier of six-hour expiry and event close. Do not permit post-close client ballots.

## 2. Playable seven-day adventure: exact design flow

**Stage 1 — Expedition (25% cumulative EP, 40% required materials).** At enrollment the server snapshots the eligible roster and initial legal combat loadouts. The event selects one family and one of its three variations. The party can fill wood/ore/herb orders and earn verified activity EP. A member may independently finish **Scout Route (+5 EP)**: a short, once-only deterministic scouting challenge with a noncombat alternative. When EP and mandatory supply thresholds are met, automatically advance to Stage 2, even if this happens on Day 1. No leader confirmation is required to advance; members receive one compact state update.

**Stage 2 — Confrontation (75% cumulative EP, second 40% required materials).** Open a **two-way six-hour vote immediately** on entering Stage 2. Options choose a distinct environmental hazard counter, not a permanent raw DPS advantage. The party chooses/auto-resolves the route, completes an asynchronous skirmish or equivalent logistics defense, and can earn two once-only objectives: **Secure the Approach (+5 EP)** and **Support the Expedition (+5 EP)**. Optional Reinforced / Provisions / Specialist supply orders are available; they never block stage progression. Stage completes only when its EP and required supplies are met *and* its vote is resolved.

**Stage 3 — Final Preparations (100% cumulative EP, final 20% required materials).** On entry open the second two-way six-hour vote. Party members finish the last supply orders, choose **Prepare the Finale (+5 EP)** by confirming a valid server-owned loadout, and inspect the resulting support bonuses. Members may replace their own legal snapshot until the Sunday close. When EP/orders/vote are ready, show **Ready for finale**—**not** a fabricated boss victory or a premature reward claim. No daily reset is involved.

**Sunday 23:59:59 UTC close → Day 8.** No new EP, votes, supplies, changes of difficulty, replacements or loadout writes after the seven-day window. Process only already-authorized pre-close activity receipts during the existing one-hour settlement grace. Freeze the immutable event roster/snapshot/choice/order ledger. A private worker calculates the boss once, writes the verified result (including a wipe), derives eligible entitlements, and marks the event `settled`. Do not show a real-time battle or fake progress percentages; render a recorded encounter timeline. The result can be viewed during both rest weeks.

### Four unique personal special actions (proposal; 20 EP cap)

| Action | Stage | Amount | Server-proof requirement | Noncombat / accessibility alternative |
| --- | --- | ---: | --- | --- |
| Scout Route | 1 | +5 EP | Unique per-event/account scout encounter receipt with valid roster/time | Select and complete one route survey node |
| Secure Approach | 2 | +5 EP | Server-resolved small combat encounter or valid alternate objective | Stabilize a supply route by a server-verified skill challenge |
| Support Expedition | 2 | +5 EP | One server-resolved repair/ward/escort action receipt | Any class may choose a defense, sustain or logistics action; no healer requirement |
| Prepare Finale | 3 | +5 EP | Verified owned loadout saved and frozen-stage acknowledgement | No additional required rare materials or second character |

Every action has one immutable `(event_id,account_id,objective_id)` receipt, stage eligibility and a distinct source event ID. Clients can **request** an action, not credit their own EP. A retry returns the same receipt and never increases EP. Optional action effects are separate from the existing **verified material consumption** rules; performing an objective is not a hidden way to mint refunded items. **These emitters do not exist yet.**

### Party viability math (before real engine simulation)

| Players | EP goal | Maximum activity EP | Maximum special EP | Absolute maximum | Minimum activity EP with all specials | Average activity time/member at that minimum |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 100 | 80 | 40 | 120 | 60 | **7.5h** during the whole week |
| 3 | 135 | 120 | 60 | 180 | 75 | **6.25h** during the whole week |
| 4 | 170 | 160 | 80 | 240 | 90 | **5.625h** during the whole week |

At 1 activity EP per 15 verified minutes, those are **total background activity time spread over seven days**, not continuous manual play or a daily mandate. Two-player parties have less slack than four-player parties; QA must include a member who only plays a few hours or misses several days. **Do not quietly lower approved targets**; make partial results fair and validate the four special actions first.

## 3. Four event families: distinct stages, mechanics, counterplay

All hazards below are **new authored proposals** requiring server-side scripting; the hidden boss currently has a generic Slam, Rising Threat and 35%-HP enrage. Do not treat these as implemented encounter skills. A three-variation family changes presentation and a bounded cue pattern, not the reward pool or boss HP lottery.

| Family / boss | Stage 1 | Stage 2 vote (both valid) | Stage 3 vote (both valid) | Finale mechanic & role-neutral response |
| --- | --- | --- | --- | --- |
| **Broken Caravan / Roadbreaker Captain** | Scout crossing and cargo condition | **Safe Pass:** fewer early charges / **Fast Pass:** faster objective, higher convoy pressure | **Brace Wagons:** protective telegraph / **Disrupt Raiders:** earlier vulnerability window | **Escort Integrity** begins at 100. Telegraph a raider charge and cargo breach. Verified supplies improve defense; damage and Tank/Support effects help, but a common-route counter is available to any party. |
| **Nightfall Hunt / Nightfall Alpha** | Trace tracks and identify a den | **Clear Trail:** predictable howl / **Shadow Trail:** extra opening, harder howl | **Hold Ground:** mitigate fear / **Hunt the Alpha:** extend exposure window | **Tracking Marks:** howl warnings and bounded vulnerability windows. Specialist supplies or route choices soften pressure; no mandatory interrupt class. |
| **Broken Wards / Unbound Guardian** | Survey damaged runestones | **Ground the Spires:** smaller pulse / **Charge the Sigils:** stronger short burst window | **Protect Wards:** stabilize / **Overload Wards:** faster shield-break | **Ward Stability** begins at 100. Telegraph energy pulse; defensive preparation and optional script action reduce stability loss. No required dispel class. |
| **Lost Reliquary / Reliquary Sentinel** | Map archives and find a seal | **Quiet Passage:** steadier seals / **Deep Passage:** stronger opening against boss | **Preserve Seals:** longer safe window / **Break Seals:** faster but harsher exposed phase | **Seal Pressure** begins at 0. Telegraph rising pressure and guardian sweep; pressure relief comes from a generic objective, shielding or timely damage. |

### Twelve variations — controlled cue differences

- **Broken Caravan:** Bandits Crossing = formation charge; Fogbound Trail = delayed visibility warning; Collapsed Crossing = bridge-integrity cue.
- **Nightfall Hunt:** Moonfang Pack = split howl; Hollow Stag = moving exposure window; Ashclaw Behemoth = larger, slower telegraphed stomp.
- **Broken Wards:** Overgrown Runestones = root binding; Stormward Spires = chained storm pulse; Blighted Roots = accumulating blight release.
- **Lost Reliquary:** Sunken Archive = rising-water seal pressure; Vault of Echoes = mirrored sweep; Starlit Crypt = constellation glyph sequence.

### Boss event cue contract, per ≤90-second tier (not live engine output)

| Family | Early warning | Middle mechanic | Late pressure | Authoring guard |
| --- | --- | --- | --- | --- |
| Caravan | ~12s raider charge warning (3s telegraph) | ~36s cargo breach (4s) | ~65s final charge | Escort pressure must never be an instant untelegraphed wipe |
| Nightfall | ~15s howl warning (4s) | ~40s tracking window | ~67s second howl | Interrupted/howl-missed paths both playable |
| Wards | ~18s charged rune (4s) | ~42s stability pulse | ~70s overcharge | Any role can contribute through supply or generic response |
| Reliquary | ~16s seal pulse (3s) | ~39s mirror/curse sweep | ~68s seal overload | Pressure is bounded; no all-or-nothing class ability |

The cue offsets are **draft authoring targets**, not verified engine times. Implement using deterministic server-owned event IDs/seeds and actual available combat event types, keeping normal hits between warnings. Role bonuses may change how much help a counter gives, **never whether the counter exists**. The chosen voting strategy should change expected tier outcome by **no more than one tier** against comparable gear/party composition after calibration, without creating a single mathematically dominant choice.

## 4. Resource economy and preparation

**Preserve the existing required budgets:** Standard 90 min/member; Veteran 120; Heroic 150. Optional: 45 / 60 / 75 minutes/member. For 2 / 3 / 4 members, multiply linearly; stages use 40% / 40% / 20% of required gather-equivalent value. These are economy **time-equivalents**, not a timer players must wait through; verified inventory materials are burned permanently once donated. A future Player Market may provide optional acquisition, not exclusive access.

**Existing live-model buffs from completed orders only:** each of three complete required stages grants +1.5% outgoing, damage reduction, healing, shields. Optional **Reinforced:** +8% mitigation and +10% shielding; **Provisions:** +12% healing, +8% shielding, +4% HP; **Specialist:** +8% outgoing damage. Do not apply partial-order bonuses or let a large donation replace the other required categories. In the final stage, three complete required stages contribute **+4.5%** each before optional bonuses.

**Economic polish proposals:**
1. Run the canonical item catalog against actual server gather rates, loot distributions, unlocks, skilling speed, current manufacturing/Alchemy costs and market price corridors. The existing 11-item `secondsPerUnit` policy is a **placeholder**, not a reliable market price.
2. Keep the server-only rule that every selected required item is gatherable by the enrolled roster's common unlocked skills in v1 of the mode. If that is too restrictive for a mixed-level roster, offer **fixed alternatives before enrollment**; never swap orders mid-event or let a client supply item rates.
3. Keep approximately 65% common / 25% uncommon / 10% advanced by gather-equivalent cost **only where actually unlocked**; cap generated order rounding drift to a proposed **±10%** of budget. Do not require duplicate rare drops or unique boss loot.
4. Display **owned**, **required**, **donated**, and the individual members' verified contributions. Allow 25% / 50% / Max donation presets. Always confirm irreversible consumption. A backend error does not reduce inventory client-side.
5. For prelaunch economy QA, compare total consumed resource value against regular equipment crafting, Guild Projects, and available resource income. Do not invent a tradable Party Token currency. Ensure participation is possible without using Player Market.

## 5. Boss scaling and meaningful performance

The current prototype starts with **party size × 5,400 × max(0.045,medianLevel/25)** boss HP, and applies tier growth **HP ×1.22**, **Attack ×1.14**, **Defense ×1.11** each successive tier. The boss also scales via a difficulty factor and fights each tier separately for up to **90 seconds**. These are **code constants**, not proof of fair boss outcomes.

**v2 recommended median:**

```text
levels = sort(verifiedFrozenRosterCharacterLevels)
midpointMedian = round((levels[floor((n-1)/2)] + levels[floor(n/2)]) / 2)
levelScale = max(0.045, midpointMedian / 25)
```

This uses the true middle for 3-player parties and the midpoint for 2- and 4-player parties. It prevents a level-1 partner from making a level-100 duo face a level-1-scaled boss. Keep scaling based on level **not gear** so real crafted equipment, quality, class identity, companions and support give an honest advantage. Test extreme level spreads and never treat a new numerical anchor as calibrated just because it is monotonic.

**Difficulty model recommendation:** Standard **1.00×**, Veteran **1.20×**, Heroic **1.40×** boss HP/Attack/Defense. Align the dormant `weeklyPartyBudget` multiplier before launch; no live code change is part of this design. The reward value multiplier remains **1.00× / 1.20× / 1.35×**. Stage objectives or choice paths must not secretly double-count the difficulty scale.

**Tier performance bands:** Keep the existing six-tiered bounded reward formula `min(6, floor((tiersCleared + failedTierDamageFraction)/2) + 1)`. Partial damage affects **one** resulting band at most through this formula and is never transformed into a live player-DPS race. Every eligible member shares the same band independent of role. Show each member's *effective* damage, healing, actual shield absorption, defensive damage intercepted and successful interrupts separately; do not score a player higher merely for taking avoidable damage or over-healing. The currently private leaderboards may show aggregate statistics only when a separate Leaderboards gate releases, always split by difficulty and ideally party size.

### Proposed calibration gates — not measurements

- Run **nine classes × Standard/Veteran/Heroic × 2/3/4 players × four families × T1–T4 gear cohorts × low/median/high character levels**, with all-DPS, no-healer, no-Tank, balanced, and mixed-level rosters. Vary random deterministic seeds.
- Provisional **Standard-tier-1 usability target:** ≥95% clears for correctly equipped entry-level groups across fair compositions. More difficult events can require better preparation. This target is a design criterion, **not a claimed pass rate**.
- Provisional **role spread target:** comparable, legal groups should generally land within **two cleared tiers** of the reference team after matching level/gear/supply prep; verify this is practical before enforcing it.
- Any family-specific hazard must provide a meaningful generic counter. No one class, potion, companion or optional supply may be a hidden prerequisite to reach the first tier.
- Run server runtime and cost benchmarks: 12 × 90-second *simulated* fights per party may create significant backend work. Use one frozen result and replay/cache it; no recalculation from client opening the results screen.

## 6. Partial events, absent players and snapshot lifecycle

**New proposed state machine:** `enrolled → active_stage_1 → active_stage_2 → active_stage_3 → ready_for_finale → frozen → boss_settled → reward_pending → claimed/expired`. If the event closes before preparation is complete, go `frozen_partial → boss_settled_partial → participation_pending`. `boss_settled` means **a real deterministic battle result was committed**, whether or not the first tier was defeated. It does not mean `boss_won`.

**Roster resilience:** Event member IDs remain snapshotted even if a player leaves the normal Party or the leader becomes inactive. Prevent joining another event in the same cycle. New normal Party members cannot alter the frozen event's difficulty, required supplies or leaderboard bracket. An event may continue from surviving members; do **not** silently reduce the target/resource budget after enrollment (would invite strategic downsizing). If a player is removed or their account is inaccessible, exclude rewards only according to the verified original member entitlement—not by deleting prior contributions.

**Default snapshot:** On enrollment save a server-owned legal default for each member; every member may overwrite their own loadout until close. Use last **verified** save, not whatever is currently equipped after freeze. Snapshot errors become visible, actionable `Save loadout` warnings during the week; a corrupt/missing snapshot triggers an idempotent settlement **exception/retry**, not an invented NPC substitute and not a fabricated reward.

**Proposed partial-reward policy (requires approval and backend contract update):**

| Close state | Day 8 result | Personal entitlement | Party Renown | Purpose |
| --- | --- | --- | --- | --- |
| All EP, required orders and votes ready | Full boss tiers 1–12 | ≥15 EP: one Warrior/Artisan/Companion cache; 5–14: participation Gold | Full cache only | Reward real full cooperation |
| Stage 1 complete; later stage incomplete | Boss still calculated with **only earned** buffs; historical depth displayed | ≥5 EP: **participation Gold**, capped at a low performance band; no full choice cache | 0 | Respect time spent without bypassing resource sink |
| Stage 1 incomplete but ≥5 personal EP | Optional limited boss attempt / incomplete history (server cost policy pending) | Participation Gold only | 0 | Do not erase all progress for an occasional party |
| No verified participation (<5 EP) | May retain a nonrewarding history record | None | 0 | Prevent no-op event farms |

Do not let a strong party skip all supplies and collect the same full cache just because its boss dealt large damage. Conversely, an inactive teammate should not confiscate *already earned* participation Gold from someone who logged valid activity. The **exact partial payout** is a product decision, **not implemented**, and should be simulated against potential farming abuse before approval.

**Day 8 worker rules:** exactly-once `(event_id,roster_hash,boss_version)` settlement; loadout ownership/revision/hash and resources verified server-side; one service-only result insert; reward entitlements stored by account/event; never grant directly from an untrusted replay; permanent idempotency keys, retry/backoff, poison-message diagnostics, transactionally safe economy grant. Stage 3 must never call reward delivery before `boss_settled`.

## 7. Compact mobile-first screen design

**Entry:** The existing Party home gets one `Party Event` compact row only after an explicit feature gate. During 14-day breaks it shows `Next adventure` and the last result rather than a new tab. Never surface Party Event badges, route polling or notification traffic while the gate is off.

**Event Hub, above the fold:** pixel-art family icon/banner and `6d 12h left`; segmented three-stage strip; one actionable current objective; thin `EP 46/100` progress bar; **Contribute** / **Prepare** buttons; four small roster portraits showing EP and saved-loadout readiness. Expand mechanics only through `?` context guide.

**Contribute modal:** resource image, `owned / remaining`, quantity stepper plus 25% / 50% / Max buttons, server-confirmed irreversible donation, stage grouping, optional orders collapsed beneath required; completed order shows its granted bonus inline. Never make material donations a dropdown buried inside a long event page.

**Vote modal:** two balanced cards with simple icons, 1-line risk/reward, 6-hour clock, member count, one locked vote per player, timely fallback text. No duplicate leader-only approval buttons.

**Boss Prep modal:** choose `Save current setup`; display weapon, class role, 1 companion, full effective stat preview, saved timestamp and `Ready`/`Needs attention`/`Frozen` state. Explicit note: **equipment changes after event close do not affect this fight**. No mandatory gear swapping from the event screen.

**Day 8 results:** `Tier 5 cleared` headline, 12-step progress rail with failed tier's **actual remaining HP**, one replay action per tier, compact contribution metrics (damage, healing, shields, protected damage, interrupts), and three mutually exclusive reward cache cards. Label replay **Recorded battle**, not real-time combat. After a claimed reward, show stored event history and disable repeated claims.

**Tutorial + accessibility:** a short contextual first-run guide when enrolling, donating, voting and saving a loadout; no tutorial paragraphs in the persistent Hub. Color must not be the sole signal for readiness. Localize time labels, currency, error states and all four families. Never display fake hit-progress copy such as `damage updates on hit` from live combat.

**Art:** four family thumbnails, four boss portraits, three supply emblems; variations may use palette/environmental overlays of one family banner. Veldryn's existing pixel-art palette and 256px item/monster icon conventions apply. **Not generated or approved** in this design revision.

## 8. Release gating and implementation passes

| Pass | Work | Acceptance gate |
| --- | --- | --- |
| 1. Decision reconciliation | Approve partial rewards, canonical difficulty scale, true median, special objectives, vote timing | Reviewed decision ledger; no live code modification yet |
| 2. Economy calibration | Verify source drop rates, skill unlocks, scarcity, order rounding and material alternatives | No required unknown/locked items, ±10% budget drift target, 2/3/4-party supply feasibility |
| 3. Hidden stage encounters | Four server-authoritative special actions, two votes, four family cue models and 12 variants | Deterministic, class-neutral, idempotent receipts and vote closure tests |
| 4. Hidden boss and snapshots | Default legal snapshot, corrected level anchor, canonical difficulty, frozen roster, deterministic Day 8 compute | No client-submitted damage or after-close substitutions; replay parity and throughput tests |
| 5. Rewards / Inbox | Single authoritative economy transaction across XP, Essence, Gold, gems, Bondstones, Renown; entitlement and history | No partial claim or duplicate grant on process kill, retries, double taps |
| 6. Polished UI and artwork | Hub, donation/vote/loadout/results sheets, translations, mobile screen QA | Pixel-art visuals, safe areas, 2× text scaling, Android back, offline recovery |
| 7. Staging rollout | Apply and validate private SQL migrations in staging, schema/RLS tests, two rest weeks, scheduling, feature flags | Separate release approval needed; **Leaderboards remains independently disabled** |

### High-priority QA cases

- **2p 1+100** level pair does not produce a level-1-scaled boss; same seed/snapshots always identical outcome.
- **2p lower activity:** each earns 20 special + 30 verified activity EP; 100 total meets the party gate with no daily action.
- **4p no healer / all-DPS / all-Support** receives meaningful boss results and generic hazard counterplay; one role is not mandatory.
- **Sunday 23:59 UTC vote:** cannot remain open past event cutoff; default selection persisted exactly once; historical vote cannot be changed afterward.
- **Stage 3 before Day 8:** `ready_for_finale` is allowed, `completed`/reward claim is not; no synthetic victory.
- **Missing or corrupt snapshot:** remediation visible before cutoff; worker records recoverable exception, no client-selected NPC or reward forgery.
- **Duplicate or out-of-order EP receipts / donation submissions / boss jobs:** same final balances and receipts as one successful call.
- **Offline/slow connections / background app / accessibility:** never double credit or falsely mark rewards claimed.
- **Feature disabled:** no UI entry, event creation, public RPC or leaderboard access; no scheduler side effects.

## 9. Decision ledger: keep approval explicit

| ID | Decision | State |
| --- | --- | --- |
| PE-01 | 21-day cycle, seven days active, fourteen rest; Day 8 resolution | **Approved baseline** |
| PE-02 | 2–4 existing Party members; flexible class composition | **Approved baseline** |
| PE-03 | 100/135/170 EP; 40 verified EP + up to 20 special/member; 90/120/150 required gather-equivalent minutes | **Existing hidden rules** |
| PE-04 | Four 5-EP, once-only Scout/Secure/Support/Prepare actions | **v2 proposal; needs authorization/implementation** |
| PE-05 | Stage 2/3 votes open immediately and auto-resolve by event close | **v2 proposal; fixes late-vote edge case** |
| PE-06 | Boss median is midpoint for even-size rosters | **v2 proposal; fixes low-level anchor exploit** |
| PE-07 | Difficulty boss multiplier 1.00/1.20/1.40, reward multiplier separate | **v2 proposal; reconciles existing drift** |
| PE-08 | Stage 3 `ready_for_finale`; only a settled Day 8 result permits completion | **v2 proposal; fixes circular gate** |
| PE-09 | Partial event grants participation-only, no full cache/Party Renown | **v2 proposal; needs product approval** |
| PE-10 | Four boss hazards / 12 bounded variations; no class-locked counters | **v2 proposal; not coded** |
| PE-11 | Server-owned default snapshots and frozen-party history | **v2 proposal; implementation missing** |
| PE-12 | Private Leaderboards until independent feature launch | **Existing approved safeguard** |
| PE-13 | No market-only resources, new Party Token currency, daily obligations or fake live replay | **Approved direction + guardrails** |
| PE-14 | No public activation, SQL migrations, worker schedule or reward payouts in design phase | **Current safety requirement** |

**Bottom line:** v2 resolves design contradictions and adds explicit encounter/counterplay details, but the numeric fight outcomes, economy affordability and class fairness are still **unmeasured proposals** until the actual Veldryn combat engine and server inventory model are calibrated. A merged *design* document is not an implemented event.