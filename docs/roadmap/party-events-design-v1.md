# Veldryn — Party Events v1: Expanded adventure and encounter design

**Date:** 2026-11-10  
**Status:** DESIGN DRAFT — no player-facing activation, database deployment, reward grants, or scheduler.  
**Companion workbook:** `Veldryn_Party_Events_Design_v1_2026-11-10.xlsx` (standalone workbook in `docs/roadmap/spreadsheets/`).  
**Existing hidden implementation:** `backend/src/server/party/weekly-party-*v2.ts` and PR #958 (merged into code, feature disabled).  
**Scope:** Expands already agreed gameplay rather than modifying the production client/backend.

## 1. Confirmed baseline vs new proposal

### Confirmed player decisions and existing gated model
- A **seven-day active Party Event every three weeks**; the next fourteen days have no active Party Event. Monday UTC boundary, with a calendar anchor of 2026-11-09 that is *not* a launch date. Three sequential, progress-gated stages may all be advanced during the same seven-day week. No required daily login or daily donation.
- **Two to four players** from a persistent party; no mandatory tank, damage, support, dungeon unlock, or other level gate for participating. Event setup locks one account into one party/event for the cycle; party membership is verified by the server. Standard, Veteran and Heroic difficulties are selected for the event, not freely retried for extra rewards.
- Verified combat/skilling settlement contributes at most **40 Activity EP per member per event**, at **1 EP per 15 min** of authoritative activity (carry partial seconds); a separate **20 Special EP/member** budget exists in the hidden model but its real objective emitters need implementation. No EP is awarded merely for donating resources.
- Total party EP targets: **100 / 135 / 170** at **2 / 3 / 4** members; stage fractions **25% / 50% / 25%** of party target. Each stage also requires its own *actual, consumed* supply orders. Votes are permitted for Stages 2 and 3, with majority or a deterministic **six-hour** timeout default.
- Required supply acquisition-time budgets per member: **90 / 120 / 150 minutes** (Standard/Veteran/Heroic); optional supply budgets **45 / 60 / 75 min** per member. These are *estimated gathering equivalents*, NOT compulsory online play time, and stored materials or market purchases can satisfy orders once inventory custody is verified. Required stage allocation: **40% / 40% / 20%**; resource item tiers approximately **65% common / 25% uncommon / 10% advanced** when unlocked.
- Stage supply bonuses: each complete required stage +1.5% each outgoing, mitigation, healing and shielding (three-stage maximum). Fully completed optional orders: **Reinforced** +8% damage reduction/+10% shields; **Provisions** +12% healing/+8% shields/+4% maximum HP; **Specialist** +8% outgoing damage. Buffs are earned from actually completed orders, never from raw client declarations.
- **Day 8**, after a one-hour authoritative settlement grace, automatically uses frozen, server-owned party-member combat loadouts. Saved loadouts can be changed during Days 1–7, then lock at close. Boss scales with roster size, median character level and selected difficulty; up to **12 rising tiers**, at most 90 seconds per tier in the current hidden simulator. Results record actual damage, healing, shields, absorbed damage, interrupts and depth. Six performance reward bands. Rank tables are server-only and must remain invisible until an independent global **Leaderboards** release gate opens.
- Reward eligibility: **0–4 personal EP: none; 5–14: modest participation Gold; 15+: choose one full cache**—Warrior (combat XP, Gold, Gem Dust), Artisan (skilling XP, Gold, Gem Dust) or Companion (Essence, limited Bondstones, Gold)—based on the same party performance band, not role/DPS. Party Renown is non-spendable progression/prestige, **not a Party Token shop**. All amounts in hidden code are provisional. The existing generic Inbox cannot atomically pay every kind of reward; **no actual rewards are granted yet**.

### New design proposals in this version (not approved or implemented)
1. Give each stage a **short thematic objective**: Stage 1 scout/route; Stage 2 voted threat or support operation; Stage 3 voted final tactic and defense. Decisions alter the Day 8 replay/encounter cues and limited tactical modifiers; *do not* multiply EP, change resource quantity after enrollment, or override mandatory stage completion.
2. Make **four unique, server-verifiable special objectives** available to each player over the active week, each worth 5 Special EP, capped at 20 personal EP. They may be done at any time while the relevant stage is active and are never gated by a daily reset. Suggested categories: Scout, Secure, Support, Prepare. No arbitrarily repeatable timer or self-reported result.
3. Define a **safe Day 8 fallback**: on enrollment save a verified default legal loadout; explicit player saves replace it. If a snapshot fails validation or a member never taps Save, resolve using the last valid owned snapshot, flag degraded status for telemetry, and avoid client-side auto-gear substitution after freeze. Current private code still needs the repository/writer and default-save bridge.
4. **Graceful partial adventures:** The boss is queued on Day 8 for enrolled parties with eligible verified snapshots even if later stage goals were not completed; only actually completed supply buffs count. A genuine settled fight grants a low-band participation outcome, while *full event completion* and full-cache eligibility need policy reconciliation with the current Stage III `finaleCleared` gate. This is a proposal, **not existing behavior**. Never invent a Day 8 victory or mint resources to compensate for failed gates.
5. Private history first, public leaderboard later. Party naming currently does not exist in the source schema; historical labels use the leader's character name + "'s Party" until real names are implemented. Never publicly expose private ranking/score endpoints before global Leaderboards is released.

## 2. Three stages and meaningful activities

| Stage | Player-facing objective | Verified contribution | Decision | Support effect |
| --- | --- | --- | --- | --- |
| 1. Expedition | Scout route, clear immediate hazards, stock the camp | Ordinary activity EP + unique Scout/Secure objectives; required stage-1 donations | Route preview only; avoid punitive choice before the party understands the event | Required order completion yields first +1.5% four-way combat bonus; route outcome can affect narrative/escort integrity, not EP |
| 2. Confrontation | Open a threat path, defend an asset or stabilize a mechanism | Verified stage encounters + unique Support objective + stage-2 donations | **Vote** between two story approaches; six-hour fallback, clear consequences before vote | Fully donated Reinforced/Provisions/Specialist orders unlock their fixed bonuses; faction-specific environmental objectives provide cosmetic replay cues |
| 3. Final Preparations | Repair defenses, rally the group, save boss loadouts | Unique Prepare objective + stage-3 donations + final party EP | **Vote** final approach (defense / assault / control), without an exclusive class requirement | Stage-3 required buff +1.5%; saved snapshot receipt for each roster member; Day 8 preview of projected strategy |
| Day 8. Resolution | Server automatically calculates increasing boss tiers | No late donations, no post-close loadout improvements; one authoritative fight | Choose one of three cache categories after settlement (if eligible) | One frozen result, replay/highlights, reward entitlement and eventual private ranking projection |

**Special EP design safety:** 4 independently tracked source events/member × 5 EP = 20. Event emitters require server-owned encounter completion, one receipt per `(event,account,objective)` and stage eligibility. Earned EP cannot exceed party cap; a late player can still contribute in Stages 2/3 via remaining actions. **40 Activity + 20 Special is an upper bound, not a promise of 60 awarded.** Balancing should stress-test 2-player Standard feasibility (party target 100 vs 120 theoretical maximum), as well as overfilled 4-player parties.

## 3. Four families (12 authored variations)

Each family has a consistent core mechanic but three story variants (deterministic server seed); variations affect assets, enemy abilities and objective cues, **not** a hidden power lottery. Every role can help, with supplies and counterplays available for role-poor compositions.

| Event family | Variants already defined | Theme/unique boss | Proposed shared mechanic | Fair counterplay |
| --- | --- | --- | --- | --- |
| **The Broken Caravan** | Bandits Crossing / Fogbound Trail / Collapsed Crossing | Roadbreaker Captain | Escort **Integrity**; telegraphed raider charges threaten cargo before the boss enrages | Tanks absorb, damage classes break raider formations, support shields, Reinforced supplies protect integrity |
| **The Nightfall Hunt** | Moonfang Pack / Hollow Stag / Ashclaw Behemoth | Nightfall Alpha | **Tracking marks** reveal an interruptible fear howl and short vulnerable window | Interruption, applied pressure, restorative Support, or Specialist scout preparation; no mandatory interrupt class |
| **The Broken Wards** | Overgrown Runestones / Stormward Spires / Blighted Roots | The Unbound Guardian | **Ward Stability** declines when charged runes are missed; a scripted pulse is telegraphed | Wards can be stabilized by verified preparatory action, shields, defensive gameplay, or specialist damage during opening |
| **The Lost Reliquary** | Sunken Archive / Vault of Echoes / Starlit Crypt | Reliquary Sentinel | **Seal Pressure** builds, forcing sustain and staggered targeting | Any composition gets an accessible seal-clearing objective; supports heal/shield; damage classes accelerate safe windows |

**Tactical design boundary:** The current hidden boss implementation has a common Slam, Rising Threat pulse, and 35%-HP enrage, not yet these four specialized mechanics. Unique hazards and stage encounter effects are **new proposals requiring combat scripting, telemetry and extensive parity tests**. No new artwork or assets should be considered finished from this brief alone.

## 4. Party sizes, economy, and feasibility

| Members | Party EP target | Stage EP shares | Required Std / Vet / Heroic (gather-equivalent minutes) | Optional Std / Vet / Heroic (minutes) | Absolute EP ceiling |
| ---: | ---: | --- | --- | --- | ---: |
| 2 | 100 | 25 / 50 / 25 | 180 / 240 / 300 | 90 / 120 / 150 | 120 |
| 3 | 135 | 34 / 68 / 33 | 270 / 360 / 450 | 135 / 180 / 225 | 180 |
| 4 | 170 | 43 / 85 / 42 | 360 / 480 / 600 | 180 / 240 / 300 | 240 |

Budgets should adapt to actual validated member skill unlocks and item acquisition rates. Prefer common materials as the sink and never silently require locked advanced resources, uncraftable items, premium items, party-exclusive drops, or external market access. **Donated stock is burned server-side** (the v2 hidden atomically verified RPC exists but production deployment is not established); no refund on success, no double-spend, no donated item counted twice for separate orders, no extra supply grant through replay. Market-purchased inventory remains valid as long as custody is verified, giving future Player Market a demand sink without making it mandatory.

### Economy balancing before release
- Verify the 11-item canonical resource policy against current real gathering speeds, bonuses, rare resource access and regional material supply; the hidden `secondsPerUnit` values are preliminary estimates.
- Simulate 2-, 3- and 4-person parties at low/median/high skill unlocks for all 12 variations and all difficulties, including a full week of low-intensity background skilling.
- Ensure each event targets useful *ordinary* materials without exhausting materials needed to beat the first chapter boss; offer server-catalog-alternative orders **before enrollment only**, not client-controlled substitutions mid-event.
- Test economic displacement versus Guild Projects, companion upgrades and Tier 2–4 crafting; do not inject scarce Bondstones or Gem Dust at a faster rate than corresponding sinks can sustain.
- Individual donation history and top contributors should be visible, but **party rewards cannot be proportional to donations or damage alone**. Personal EP threshold protects against completely inactive members.

## 5. Escalating boss and role balance

Current private formula: Tier `t` boss base HP scales by `1.22^(t-1)`, attack by `1.14^(t-1)` and defense by `1.11^(t-1)`; starting budgets also scale by roster size, median level and Standard/Veteran/Heroic difficulty. It runs separate deterministic fights for tiers 1–12 with a 90-second maximum per tier and authentic combat events. The formula and success rates must be calibrated using the *live* class and gear distribution, not this workbook's projections alone.

Proposed readability changes: a short **12-tier track**, per-tier defeat/wipe markers, boss HP and party health bars for the selected replay, and a compact contribution summary for *damage, mitigation, healing, shielding and interrupts*. Don't show realtime percentages/progress text that suggests the Day 8 offline replay is a live fight. Explain that combat was calculated from the **frozen Day 7 loadouts and completed preparations**.

Current bands follow `min(6, floor((tiersCleared + partialFinalTierFraction)/2) + 1)`; this is not a guarantee that a 12-tier sweep is achievable. Higher tiers should grant **diminishing, bounded** rewards, not twice the economy volume for small increases in damage. Do not rank Support/Tank by raw DPS. For future Leaderboards, private metrics already include total boss damage, depth, support, shielding/absorption and interrupts, scoped by event + difficulty with optional 2/3/4-person brackets. Public party-name rankings must remain hidden until Leaderboards releases.

## 6. Proposed compact screens and notifications

**Party home**: small **Party Event** row, event theme thumbnail, three-week countdown/status, and `View event`. Hide the entire row until the release gate is explicitly enabled. During the 14-day rest, show next-event preview rather than a full empty tab once launched.

**Single Event Hub**: title/background, remaining time, three-step horizontal progress, current objective card, paired `Contribute` and `Manage Loadout` actions, and a compact roster strip with each member's donated resource/EP totals and last saved loadout status. Put mechanics, drop details and explanation in a `?` guided tour/modal, not on the primary screen.

**Contribution sheet**: resource icon, **have / needed**, planned quantity slider or presets, confirmed irreversible `Donate` action, progress bar, category grouping (wood/ore/herbs); separate Completed and Optional orders. Allow donation across several visits and aggregate verified receipts. Never show client price or allow item deletion until server confirms atomic consumption.

**Vote sheet**: two story options with a concise tactical preview and a six-hour expiration, ballot status 0/2, 1/3, etc; majority early resolution or deterministic timeout. If the choice remains open in the background, the rest of the app is usable.

**Loadout sheet**: a visible `Saved for Day 8` status for every party member; show own class, companion, key gear and last save; `Save current setup` replaces only own verified snapshot. At close, show `Locked` timestamp. No one should need to reopen the app to trigger the fight.

**Day 8 Results**: 12-tier timeline, highest cleared tier, partial boss damage, thematic highlight, personal role contribution metrics, rewards summary, and `Choose reward` (Warrior / Artisan / Companion). Claim must be truly atomic across Gold, XP, materials, Essence, Bondstones and Party Renown. Do not display `Claimed` until server confirms the whole bundle. Save completed run to History after true server settlement.

**Notifications:** one optional vote reminder near the six-hour deadline (only for a member who has not voted), one loadout reminder before end of active week, and one settlement/reward-ready inbox notification. No daily nagging and no leaderboard CTA before Leaderboards launches.

**Art backlog:** four family banners, four boss portraits, three supply preparation emblems; reuse existing weapon/role, resources and progress icons. Generate/approve in Veldryn's pixel-art style before wiring to UI. Prefer existing sprite assets over duplicate image sets.

## 7. Technical gates and rollout order

1. **Design and economy calibration**: verify canonical item costs, 2–4 member feasibility, new stage objective sources and outcome fairness. Scope all calculations to server-owned event definitions. Document explicit version numbers.
2. **Hidden stage gameplay**: implement authenticated activity/encounter receipts for special actions, branch choices, no double-credit, and `Stage III` consistency with Day 8 partial outcomes. Harden permanent party membership/account-week lock and vote timeout policies.
3. **Snapshots and Day 8 worker**: connect server-owned save/default snapshot writer, immutable freeze at close, one-hour grace, deterministic boss run, atomic result insert and durable retry/dead-letter handling. Never trust client combat stats or damage reports.
4. **Rewards**: a *single* idempotent entitlement claim across all reward types using the correct specialized economy handlers; Inbox receives a useful notification only after successful account/currency/item write. Replay and duplicate client submissions must deliver nothing extra. Test partial failures, interrupted claims and concurrent retries.
5. **UI and localization**: compact Event Hub, donate/vote/loadout/results sheets, accessible status summaries, tutorial and 4-family artwork. Initially show it only in controlled staging with an explicit feature gate.
6. **Staging and release audit**: check all migrations in a staging transaction, actual deployed schema/RLS, service-only RPC permissions, 21-day UTC calendar boundaries, 14-day quiet periods, partner party history and missing snapshot fallbacks. Only after completion and approval should the private release gate, scheduler and player navigation be enabled. **Keep Leaderboards a separate disabled gate.**

## 8. Open decisions for next design pass

| Decision | Recommendation | State |
| --- | --- | --- |
| Incomplete final stage on Day 8 | Resolve one fair boss attempt from verified preparation, with limited rewards; Stage III `finaleCleared` rule must be reconciled | Proposed |
| Two-player feasibility | Ensure a 100-EP target can be reached without a daily schedule or forced role; keep 20 special EP per member meaningful | Proposed |
| Event difficulty selection | Select once at enrollment; no changes after any verified progress/donation | Proposed, compatible with server contract |
| Auto-loadout save | Always create a valid server-snapshotted default at enrollment; allow edits to close | Proposed, required for reliability |
| Stage vote effects | Distinct scripted counterplay, never exclusive class gating and never free boss power for a particular role | Proposed |
| Ranking prestige | Historical naming and private ranked metrics now; visible only after separate Leaderboards release | Confirmed |
| Economy payout | No partial multi-currency Inbox delivery; no new spendable Party Tokens | Confirmed safeguard |

**All values are subject to closed-loop deterministic simulation, UX testing and real server economy calibration.** Design draft != live feature and merged source code != deployed migrations.