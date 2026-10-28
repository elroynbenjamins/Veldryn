# VELDRYN — COMPREHENSIVE COMPETITOR RESEARCH & PRODUCT OPPORTUNITIES

**Research date:** 28 October 2026 (Europe/Amsterdam)  
**Recent-user-feedback window:** 30 July–28 October 2026 (rolling ~90 days). Older references identified explicitly.  
**Application:** VELDRYN — Android-first, mobile UI-heavy, pixel-art idle MMORPG.  
**Intended audience:** Players who enjoy RuneScape-style skills, collecting/crafting, offline progress and social RPGs in short phone sessions; co-op/guild players without real-time movement requirements.  
**Geography:** Public English-language/global Android games, including EU availability where listed. Specific VELDRYN launch-country priorities are **not fixed by audited code**; do not assume an NL-only launch.  
**Platform scope:** Android primary; iOS/web/PC competitors included where their design patterns are transferable.  
**Source-of-truth code baseline:** `main` @ `eb70bb3321964c824d4e4307c413bb8971745666` as captured by [CODEBASE_INVENTORY.md](CODEBASE_INVENTORY.md) on this date. The subsequent inventory-doc-only commit was `846713850f5c1b9576cf04c4db8f882612919a61`.

**Classification and evidence code:** **D** = direct competitor, **A** = adjacent transferable reference, **E** = emerging/preview. **V** = verified in official product docs/store listing/changelog or directly in source; **R** = self-selected user review/community report (not a measured population rate); **I** = inference/design recommendation, not observed game behavior; **U** = not publicly verified during this research. Product claims use direct URL sources [S01]–[S36]. Link directly before implementation.

> **Research limitations:** This is a public-web and current-code research study, not installation/interactive testing of 14 paid or live games. No competitor app account, subscription, battle, purchase, private Discord, physical-device trace or internal roadmap was accessed. Google Play/Steam/Apple listings are developer claims; screenshots may reflect older versions. Public reviews are sampled and non-random; **no invented review totals, satisfaction percentages or precise current IAP prices**. Presence of a feature on a store listing does not validate its actual reliability. The VELDRYN audit likewise does not grant full end-to-end verification to every authored subsystem.

---

## 1. Executive summary: what matters for VELDRYN

**Market position:** VELDRYN can occupy a valuable middle ground: substantial **server-authoritative idle-MMORPG progression** (unlike largely solo incremental games), **mobile-first low-friction controls** (unlike PC interfaces ported into phones), **visible combat and social activity** (unlike text-only menus), and **cosmetics-first monetization without a player marketplace or gacha power economy**.

**Highest-value findings and implications:**

1. **Queues are now table stakes among close competitors.** Idle Clans released online/offline queues, skill-training auto-advancement, active-quest queue insertion and backup tasks on **20 Oct 2026** [S01,S02]. VELDRYN already has Home/Skills Action Queue code; improve presets, blocked-step explanations, quantity reservation and safe handoff instead of replacing the engine.
2. **A more complex automation workflow can reduce usability.** A contemporary negative Idle Clans Steam review explicitly says the new 6-slot queue adds manual work to a previous automatic quest process, while another criticizes small-clan quest pacing [S25]. This supports **one-tap plans and non-destructive defaults**, not automatic “add many screens/options.”
3. **IdleMMO's Oct 2026 direction is moving from timers toward visible activity.** Its developer announced animated work scenes, nearby player silhouettes, illustrated micro-tutorials, refined bank/inventory and consistent interaction patterns for v0.84, originally scheduled 19 Oct [S03,S04]. Distinguish **announced/scheduled** from independently verified deployed behavior. VELDRYN's CompanionTrialStage already contains battle playback code: the gap is first-class entry, discovery and presentation polish, not necessarily a missing battle engine.
4. **Reliable touch interaction and quick resume are defensible advantages.** 2026 OSRS mobile changelog and independent threads report touch/scroll/menu issues [S15,S26], and player reports cite IdleOn crash-at-claim [S27] and Melvor login/offline loading [S28,S29]. These are incidents, not measured rates; nevertheless VELDRYN must harden Android and preserve earned rewards through retry.
5. **Clear “what can I do now?” is as important as more content.** Farm RPG users request contextual indicators, remembered tracked goals and transparent bottlenecks [S23]; its official October update adds item quick-open and automatic floor advancement as optional QoL [S24].
6. **High production art is useful if it explains real events.** AFK Journey is a benchmark for clear party formation and readable battle outcomes, not for copying its large cinematic map/gacha economy [S16,S30,S31].
7. **Player-market mechanics are optional, not required for multiplayer.** Idle Clans, IdleMMO and SimpleMMO have trading markets [S05,S06,S07]. VELDRYN deliberately retired its player market; its unique positioning should instead emphasize parties, guilds, progression, cosmetic identity and shared challenges.
8. **Trustworthy release gating matters more than expanding feature count.** VELDRYN's latest mobile CI baseline fails at starter-companion test/type mismatch and its staging/production versions differ; see [CODEBASE_INVENTORY.md](CODEBASE_INVENTORY.md). New features should follow a stabilization gate, never bury failed existing tests.

**Recommendation:** Spend the next improvement cycle on (1) Android/CI readiness, (2) visible and one-tap Companion Trials, (3) Action Queue and resource planning, (4) item safety/claims and (5) guild/social discoverability. Later pursue small-scale animated profession scenes, goal intelligence and low-pressure event progression.

---

## 2. VELDRYN current product vs intended scope

### Verified or structurally present now

- **Core:** six mobile primary tabs (`Home / Character / Skills / World / Inventory / More`); classes, combat/hunting, gathering, processing, alchemy, crafting, equipment sets, socket gems, quests, regions and World; local save and server command architecture. [V01,V02]
- **Idle execution:** `src/core/activity-queue.ts`, `src/components/HomeQueueComposer.tsx`, `ActionQueuePanel.tsx` and explicit online `queue_add/queue_set_goal` commands; region/target safety rules documented. Build/device quality **not completely verified**.
- **Companions:** `CompanionsScreen.tsx`, `CombatCompanionPanel.tsx` (Collection, Training, Sanctuary, Trials and Expeditions); `CompanionTrainingV50Panel.tsx`; `CompanionTrialStage.tsx` **already contains event playback, hits and formation visual UI**. The current training selector draws broadly from codex-known companions, not an obviously owned-first/rarity/class-filtered roster. No claim that the existing trial stage is impossible to reach or reliably functional without device QA.
- **Multiplayer:** persistent parties/social/guilds, chat, co-op Q-Mode, Echo publishing/NPC fallback, live queue and ready check, dungeon runs and claims implemented in online transport, backend and DB. Hosted functions active; device end-to-end remains unverified.
- **Events/retention:** `EventScreen`, reward trails, seasonal calendar, event candies, daily supplies, collections/pets, achievements, profiles/skins. `EVENTS_RELEASED=true`; no broad claim that all seasonal rewards, bulk claims or candy target-selection experiences are polished.
- **Store/identity:** Google Play billing/entitlements, VIP/VIP+/Supporter model, customizable cosmetic profile, classes and 5-character account progression. Player market retired; no paid currency by design.
- **Not released:** `ARENA_RELEASED=false`, `RANKINGS_RELEASED=false`. Screen components do not mean these are live.

### Architecture/product constraints to preserve

- Use **authoritative server events/reward receipts** for outcomes; visual animation is client-side playback of results, never source of random numbers, damage or entitlements.
- Preserve low-touch idle play, **cosmetics-first** monetization, no pay-to-win advantages in competitive modes, no mandatory PvP, no reinstated open player market or paid virtual currency.
- Treat **mobile release and schema parity** as dependencies: the preceding inventory found a TypeScript CI failure and production/staging deployment drift; neither is solved by competitor research.
- Keep pixel-art sprites plus compact responsive native UI; no demand for 3D or continuous character movement to qualify as an MMO.

Primary source references: [V01] inventory baseline; [V02] code routes, [V03] companion UI, [V04] queue status and [V05] co-op status (full URLs in sources).

---

## 3. Competitor landscape — 14 researched products

| Competitor | Role | Why included | Primary transferable benchmark |
| --- | --- | --- | --- |
| **Idle Clans** | D · established | Persistent skill/crafting/clan idle MMORPG; updated Oct 20 | Offline task queue, guild recruitment, scalable weekly quests |
| **IdleMMO** | D · established | Closely matched skilling/loot/guild/dungeon loop | Mobile inventory UI, animated skill scenes, micro-tutorials |
| **Legends of IdleOn** | D · established | Multiple independently working characters and evolving class web | Account-level synergies, long-term goals; caution on UI overload |
| **Melvor Idle** | A · market leader | Dense RuneScape-inspired idle skills; bank and mastery | Progress transparency, goal planning, saves; caution on loading |
| **SimpleMMO** | D/A | Minimal tap-based pixel MMO with active guild/world social systems | One-action navigation and approachable surface complexity |
| **Farm RPG** | A · highly rated | Menu-centric economy, inventory, requests, mastery and social | Contextual crafting readiness, links to sources, daily pacing |
| **Corah** | D · smaller | Semi-idle online 2D class/guild/party MMO | Lightweight visual multiplayer and mobile management |
| **Hero of Aethric** | A · visual/party | Pixel fantasy, raid and turn-based RPG depth | Class silhouettes, enemy identity and group battle clarity |
| **Orna: GPS RPG** | A | Related developer; quests/raids/gear and world content | Rich monster/boss presentation; not geolocation |
| **Old School RuneScape Mobile** | A · market leader | Very broad skills/social MMO and modernized mobile UI | Configurable shortcuts, minimized chat, interaction safety |
| **Nordicandia** | A · niche | Semi-idle combat/loot/action/crafting game | Readable auto-combat, item comparison and disassembly |
| **AFK Journey** | A · visual leader | Hero formation, battle clarity, narrative and seasonal cadence | Formation previews, battle feedback, premium art direction |
| **Idle Slayer** | A · retention | Pixel incremental progression and active/offline rewards | Small feedback loops, upgrade anticipation, boss telegraphs |
| **Melvor Idle 2** | E · forthcoming | A modernized successor demo appeared Oct 19, 2026 | Modern onboarding, story-linked idle skills, updated presentation |

**Selection caveat:** These are not necessarily VELDRYN's top 14 downloads in Netherlands; they are a purposeful design/market comparator set, not a market-share ranking. RPG MO, IdleArc and other niche games were considered but not expanded into full profiles to keep research focused and verifiable.

## 4. Detailed competitor profiles

Each profile covers the 15 requested dimensions compactly: core/advanced game systems; onboarding/navigation; customization, reporting, automation; engagement, offline/sync; accessibility/performance; monetization/ecosystem; 2026 development; and limits/unverified claims. Links point to official product documents when possible.

### 4.1 Idle Clans — closest direct blueprint [D,V]

**Mechanics:** One persistent shared world; 20+ combat/gather/crafting skills, equipment production and market trading, clan upgrades, shared housing/vaults, group bosses and raids. Supported work advances offline within time/supply limits, with a return summary [S05,S06]. User's intended action is selected from a task, not direct avatar control. Guilds/raids offer collaboration without required realtime overworld movement.

**Navigation, onboarding, customization, automation:** Official Oct 20 release added a home `Task behaviour` queue (default 6 slots, upgradeable 16), automatic Train-skill selection, quest insertion and a fallback task that can activate retroactively on idle logout; optional pet fallback [S01,S02]. The same update reworked clan recruitment with language/region/category filters, eligibility filtering, member activity, posts and expiring applications. It made clan quests weekly, scaled tasks to membership and allowed leaders to select time-limited buffs on completion. More focused achievement tiers/titles shipped Sep 9 [S08]. Its beginner guide was revised Oct 20 [S09].

**UX/reporting/retention:** Visible clan task progress and achievement titles motivate, while combat loot events get distinct visual emphasis. Offers task modifiers and queue status. The game supports PC/Android/iOS in a shared world [S06]. Formal screen-reader support/latency metrics not verified.

**Monetization:** Store lists IAP and an “contains ads” label [S10]; developer's actual ad usage, purchase currencies and premium feature fairness not independently audited. **Do not copy** market trading, capacity upsells or performance-affecting monetization into VELDRYN.

**Important counterexample:** New automation generated extra steps for some quest players and concern about small-clan burden [S25]. VELDRYN needs short defaults and a small-guild-friendly contribution formula.

### 4.2 IdleMMO — closest mobile UI/product direction [D,V/announcement]

**Mechanics:** Combat, map progression, professions, item rarity/bank/gear, group dungeons, guilds, world bosses and offline advancement, plus market/trading; official store pitches no ads and membership earnable through play [S07]. Current live behavior was not independently exercised.

**October 2026 developer plan:** v0.84 blog (Oct 5; deployment **planned for Oct 19**, not independently confirmed in this report) described Forge Lessons where broad resources become Forge XP instead of crafted gear, animated skilling scenes, visible nearby players/party/guild as lightweight visual bubbles, short replayable illustrated per-system tutorials, new mobile menu sheet, avatar-based character switching, loading indicators, customizable bank/inventory order, search/sort, grid/table view and multi-select locking [S03,S04]. Wiki now documents filter/sort, persistent item ordering, 50-item bulk selection, preview warnings and “inspect where it drops” [S11,S12]. These are **mechanism-level** benchmarks.

**Presentation and engagement:** The developer explicitly called out the problem of feeling like a menu simulator [S03]. This aligns with VELDRYN's desire for player-visible skilling/trial combat. Small animation is sufficient when it represents actual authoritative events.

**Sentiment:** A dated 19 Oct 2026 Google Play review on third-party mirror reports 1–2 second delays on tab changes and concern over a short idle cap; **one identifiable review**, not a latency measurement [S22]. App Store dated Sep 4 reviewer enjoys simple UI but wants more to do while active [S34]. Other individual ratings vary. There are 204 total reviews on the mirror at collection, **not 204 reviews from the last 90 days**.

**Monetization/unknown:** IAP/membership exist; no precise current regional prices or premium entitlements verified. No independent production performance or accessibility audit.

### 4.3 Legends of IdleOn — multi-character systems leader [D,V]

**Mechanics:** Developer describes an account full of characters who keep working while the player is away; dozens of classes and hundreds of unique abilities with interdependent professions and bosses [S13]. Unlike VELDRYN's single active character plus account character roster, simultaneous specialist production is a core feature.

**UI/onboarding/progression:** Dense equipment, attributes, character/world panels and high-branching skill trees; visually readable sprites and humorous enemies. Its complexity creates powerful optimization goals but substantial onboarding friction. A July 2026 independent review describes monetized convenience, auto-loot and storage expansions as stronger-than-cosmetic advantages [S35]. Public release roadmap and full a11y testing were not verified.

**Retention/automation:** Multi-character idle tasks, inter-skill crafting needs and continual world systems motivate long stays. **Do not copy multi-character continuous farms without new integrity/economy design**: VELDRYN's combat, companion, queue and cloud settlement semantics currently differ.

**Reviews/performance:** Aug 7 2026 mobile crash-on-return thread reports affected users and inconsistent workarounds, not a measured crash rate [S27]; Sep 9 Reddit reports a text-triggered crash for one player [S36]. VELDRYN should optimize progress settlement and high-frequency navigation before broadening character automation.

### 4.4 Melvor Idle — pure idle progression and inventory benchmark [A,V]

**Core:** RuneScape-inspired interlinked skills and combat, broad bank/items and account mastery; Google Play listing describes 1,100+ tracked items and cloud saves across platforms [S14]. It is primarily a single-player skill-management experience rather than VELDRYN's shared co-op world. Most value comes from task choice, production chains, mastery and long-term goals.

**UX/reporting/customization:** Dense left-hand skill selection, tables, equipment/bank views, performance math and consumable decisions. Store description is official; direct screenshots were located from third-party public editorial pages but **not** revalidated in the October build. It uses a free entry/full-game/expansion purchase structure, subject to region/store variation. No exhaustive accessibility or ecosystem integration evaluation.

**Offline nuance:** Google Play listing says internet is needed to play [S14]. Community posts in Oct 2026 describe an optional/beta offline client and local-save workarounds, including a report that some TestFlight builds failed to launch [S28]. **Do not claim default universal offline login works.** Another Oct 22 post reports very long processing after uncapped offline activity, with replies identifying the standard 24-hour cap and a mod [S29]. This suggests that an idle-cap display and “what will settle” preview should be explicit in VELDRYN.

**2026 new development:** The original received Android compatibility updates Sept 3; separate successor Melvor Idle 2 has a public Steam demo (see 4.14), but original's live features should not be mixed with sequel announcements.

### 4.5 SimpleMMO — reducing actions to essentials [D/A,V]

**Core:** Text-forward pixel MMO where a single step button initiates travel/progress, alongside quests, jobs, guild wars, PvP, boss participation, collectibles/loot, leaderboard, market and avatar styling [S17]. Lightweight navigation and very short optional sessions are the main transferable elements.

**Engagement/visuals:** Character and gear/cosmetic presentation plus event collectables; little need for a 3D world. Complex subsystems can hide behind easy first actions.

**Recent development:** Official Aug 12 patch added item locking, countdowns, a customization preference refinement and UI/gameplay fixes [S18]; Sep 10 patch added missing-material quantities on craft amount changes and chat scroll work; Oct 20 fixed a duplicate message sender display bug [S19]. These are instructive for VELDRYN's bank/craft and chat QA.

**Economics/availability:** Free mobile presence, optional IAP; Google Play metadata says “Contains ads” while the game's own description claims “Completely ad-free” [S17]. This **metadata/marketing conflict** is not resolved; do not assert a verified no-ads architecture. No accessible 90-day quantitative review cohort inspected.

**Fit:** Take one-tap transitions and clear notifications; not PvP, player market or obligatory social pressure.

### 4.6 Farm RPG — information architecture, recipes and social kindness [A,V]

**Core:** Crafting, farming, fishing, exploring, mining, pets, workshop, quests/townsfolk requests, collections and item mastery. Official Play listing describes the system as relaxed, menu-based, ad-free and free of competitive pressure [S20]. Crafting workshops and contextual item actions/requirements are primary screens; older editorial screenshots show red missing-material text and favorite recipe lists [S37].

**UX/automation:** Workshop favorites and resource prerequisites are visible before executing. Farm/event calendars and skill mastery create long retention. October 16 official/community update introduced a quick-open from item details and opt-out auto-advance to next mining floor [S24]. The community feedback board carries 2026 dated suggestions for color-coded claim status, item-to-source links, full-inventory warnings, mastery tracker presets and material-source alternatives [S23]. These are **requests**, not confirmed shipped features.

**Sentiment:** Sep 26 Reddit poster praises the game shortly after starting while struggling with inventory capacity; multiple commenters provide progression help [S32]. That is one thread; community and official suggestions are not representative samples.

**Monetization/integration:** Gold support packs/IAP and optional Patreon exist, no ads per developer claim [S21]. Paid Gold/convenience is not a good monetization fit for VELDRYN. Multi-platform access (mobile/web) is valuable but not a launch prerequisite.

### 4.7 Corah — smaller semi-idle direct competitor [D,V]

**Core:** Four classes, management-led idle hunting with visible 2D online play, pets/gear, guild raids, parties, chat, friends and direct trading; Play listing explicitly requires an active network connection despite semi-idle play [S38]. It is a useful “simple old-school MMO” mobile positioning reference, not a verified best-in-class product.

**UX/onboarding:** Initial class selection and character/skill management are core; precise tutorial steps, custom dashboards, auto-navigation and analytics are **U**. Store listing says no ads and IAP. Latest listing shows Sep 1 2026 update, about 2.42K all-time reviews and ~3.3 rating at time crawled; not a recent-cohort sentiment score.

**Transferable idea:** Small group identity and visible shared battle presence with minimal movement. **Avoid:** assuming live multiplayer graphics always improve latency or should drive VELDRYN toward 3D.

### 4.8 Hero of Aethric — pixel-party battle reference [A,V]

**Core:** Fantasy/pixel turn-based combat, 50+ classes, loot/gear buildcraft, online raids, dungeon bosses and town building [S39]. Orna's non-GPS sibling shares deep strategic class archetypes and boss identity without requiring walking around in the real world [S40].

**UX:** Clear enemy roles, distinctive art silhouettes, turn-by-turn consequences and group/team presentation matter. Its combat is not idle-style server event playback, so copy only patterns of information hierarchy and hit/health/buff readability. Public promo materials don't establish charting/custom dashboards or accessibility support (**U**).

**Release/pricing:** Store last updated Sep 3 2026, free with IAP; exact offers not inspected. No independent reliable Oct 2026 changelog or recent review cohort found for this study. Avoid claiming new content beyond the listing.

### 4.9 Orna: GPS RPG — systems and boss reference [A,V]

**Core:** Real-world location-anchored exploration combined with pixel-art turn-based combat, many classes, items, raids, guilds, dungeons and PvP [S40,S41]. This proves visual RPG depth can coexist with relatively small sprites; **GPS, PvP territory control and travelling in the real world are not transferable to VELDRYN**.

**UX/monetization:** Region and boss identity, guild raid status and encounter previews are useful. Exact offline support is **U**, and GPS reliance makes it a poor benchmark for offline behavior. Android listing last updated Sep 3 2026 and contains IAP; premium details not independently checked.

**Feature gap relevance:** Present monster weakness, boss ability cues, rewards and combat states clearly in compact cards and trial playback.

### 4.10 Old School RuneScape Mobile — interface controls and regression warning [A,V]

**Core:** Skill-heavy shared MMO, chat, inventories, gear, quests and combat on mobile. Jagex introduced customizable Side Stones, >25 available hotkey targets and three UI profiles in Nov 2024 [S15]; OSRS Wiki documents compact chat, popout panels, minimized filters and menu-entry reordering [S16]. These mechanics have direct utility for VELDRYN's five quick shortcuts and collapsible chat.

**What to borrow:** Context-aware quick navigation and three optional player-designed loadouts (e.g. Skilling, Dungeons, Social) if they make routine tasks materially faster. **What not to borrow:** overly complex menu-reordering interactions that can create accidental actions.

**Recent reliability:** Sep 2026 changelog lists fixes to touch scroll, menus, channel buttons and contextual interactions [S16]. Two Sep 29 Reddit threads report a mobile long-press inventory issue with users indicating an app update fixed it [S26]; Sep 9 users reported hitbox problems [S33]. These are multiple discussion threads, not a valid incident frequency statistic.

**Monetization/sync:** OSRS is a free/membership MMO with desktop/mobile accounts; its revenue model and full 3D runtime are fundamentally different. No accessibility compliance or frame-time measurements directly observed.

### 4.11 Nordicandia — combat visualization and loot refinement [A,V]

**Core:** Automatic movement/attacks with optional active skills, equipment merging, essence upgrades, disassembly, bosses and offline play after data download; supports Warrior/Hunter/Mage and customizable stat/mastery paths [S42]. This is an especially useful reference for **showing active-looking battle while gameplay progression can be passive**.

**UX/engagement:** Actual combat representations matter; concise loot quality, dismantling and trade-off surfaces could enhance VELDRYN's item instance UI. No verified social party features or public roadmap in this study; do not mark live raids/guilds as present without proof.

**Availability/revenue:** Play listing updated Aug 26 2026, contains ads/IAP; ratings are all-time context, not recent reviews. The game is partly playable offline, unlike authoritative multiplayer co-op in VELDRYN.

### 4.12 AFK Journey — visual polish and formation clarity [A,V]

**Core:** Illustrated fantasy RPG with story, automated battles after formation/position choice, collectable heroes, guild co-op and seasonal systems. Sep 22–23 patch information describes a gated new season, guild modes and new characters; release details come primarily from patch-aggregator coverage [S30,S31]. Google Play explicitly labels in-app purchases including randomized items [S43].

**UI/visuals:** Big character art, readable battlefield and highly visible roster-selection/final battle button can be used as **interaction hierarchy references**, not copied graphic assets or formations. Unlike VELDRYN, AFK Journey uses gacha hero acquisition and far larger art/runtime footprint. Independent screenshot review from a 2024 article illustrates a roster over a battlefield with a prominent Battle action [S44]; this is historical imagery, **not claimed current Oct 2026 UI**.

**Reviews:** Oct 18 Reddit quitting post praises story but criticizes leaderboard pressure and spending competition [S45]; Oct 19 ad-marketing thread criticizes ad style despite praise for original gameplay/art [S46]. Contemporary mirrored Google Play reviews contain both beauty/polish praise and freezes/large-size/pricing complaints [S47]. No inference that all players agree. A third-party aggregator samples 166 most recent US reviews and reports 72% 4–5 stars but **does not prove those 166 all fall within 90 days** [S48].

**Fit:** Learn battle staging, feedback, narrative transitions; reject expensive hero-duplicate monetization, ranking pressure and gigantic onboarding footprint.

### 4.13 Idle Slayer — compact reward and telegraph UX [A,V]

**Core:** Pixel incremental RPG with timed progress, upgrades, bosses, prestige/retention loops and offline gains. Google Play describes gear upgrades and offline idle progress; Aug 2026 notes mention redesigned roulette, boss telegraphs, bestiary icons and ensuring active temporary bonuses apply appropriately to offline earnings [S49]. Third-party Play tracker records updates in Sept/Oct 2026 [S50].

**UX insight:** Reward visibility, boss attack anticipation and consistency between offline/online benefits produce satisfying short check-ins without needing full 3D animation. Distinctive pixel art fits VELDRYN more than a 3D cinematic style.

**Trade-offs:** Contains ads and IAP; a Sep 2026 review complains about an ad/chest reward interaction, while another user praises years of continued updates [S50]. These are individual reviews, not precise cohort sentiment.

### 4.14 Melvor Idle 2 — forthcoming adjacent challenger [E,V for demo; U for final game]

**Confirmed as of Oct 28:** Official Melvor site announced a Steam Next Fest demo on **19 Oct 2026**, playable with a level-60 cap, skill systems and Act 1 story, with demo saves planned to carry forward to Early Access; the Steam page still describes a future 2026 Early Access launch [S51,S52]. Developer September update discusses improving visuals, performance/QoL and new Combat Mastery Guild plus story [S53].

**Roadmap uncertainty:** Android/iOS ports are **planned** after the initial Steam early-access phase, not an accessible verified current Android game [S54]. Public article contains an internal discrepancy about the demo skill count (22/25 headline vs 21 text); avoid presenting either as audited implementation inventory.

**Relevance:** VELDRYN should pair a succinct first-ten-minutes “what do I do?” journey and progress guidance with low-resource pixel identity. Do not delay mobile 1.0 to compete with an unshipped game feature.

---

## 5. UX/visual benchmarking and screen patterns

**Sources inspected:** official Idle Clans press/screenshots [S06], 2026 IdleMMO blog and wiki [S03,S11,S12], OSRS mobile docs [S15,S16], public editorial screenshots of Melvor bank [S55], Farm RPG workshop [S37], IdleMMO inventory [S56] and AFK Journey formation [S44]. Screenshots shown on editorial pages can predate Oct 2026: analyse persistent patterns, **not exact current button placements**.

| Design dimension | Observed pattern | VELDRYN fit and exact change |
| --- | --- | --- |
| First-screen density | Idle Clans/Melvor present high information density; IdleMMO wants to move beyond purely static cards | Keep compact top bar and activity strip, but show one primary current goal and one next action above advanced stats |
| Navigation | OSRS assignable hotkey layouts; IdleMMO new sheet/quick character-switch proposal | Retain six-tab VELDRYN layout; add optional presets for five top-right shortcuts, with safe reset and per-account persistence |
| Inventory | IdleMMO search/sort/grid/table/bulk and item lock; Farm RPG favorites/missing-resource color | Inventory+Bank+Overflow count label, protected-item confirmation and per-item Source/Use/Need actions; maintain existing bulk selection |
| Visual battle clarity | AFK Journey positions team before battle; Nordicandia visibly auto-attacks | Show current formation at top of Trial; battle screen displays resolved hits, misses, health and status icon feedback from server-authoritative event payload |
| Reward timing | Idle Clans rare loot held longer, notifications queued; Idle Slayer boss telegraphs | Distinguish “rare and worth attention” from routine reward toast; suppress non-reward popups for chat/channel/customization changes |
| Gradual disclosure | IdleMMO micro-tutorial slides, Farm RPG manageable beginner actions | One optional step per screen tied to actual button; re-openable Guide; compact default, expand for advanced attributes |
| Event interface | Farm RPG explicit event expiry/window; AFK Journey season onboarding | Clear date/time, claim-all if safe, collected/remaining counters, no repeated entry popup after acknowledged |
| Progress reporting | Idle Clans achievements tier categories, Farm RPG masteries and help requests | Account goals: just-completed, currently active, next unlocked, source chains, guaranteed vs chance drops separated |
| Social | Idle Clans language/region guild filters, nearby identity planned by IdleMMO | Guild search with time-zone/language, member count/activity and newbie-friendly tags; lightweight “party nearby” artwork without real map server |
| Text/touch/a11y | OSRS touch-target regressions are independently reported | Prevent overlapping hitboxes, ensure gesture and modal boundaries; optional larger text and reduced motion with no functional loss |
| Offline/resume | Melvor offline recovery friction and Idle Clans fallback tasks | Declare settlement window/cap and explicit saved queue stop reasons; avoid hidden retroactive rule changes without clear confirmation |

### Proposed VELDRYN “not a menu simulator” visual language

Use **one reusable pixel-art stage** with three sizes: (1) compact 80–120 px active work tile, (2) half-screen combat/Trial stage with team/enemy sides, (3) full-page boss intro/outcome when earned. Scene animation must derive from authoritative action state, while real combat hits use stored replay events and no simulated damage. Fallback static art must work offline/under reduced motion. Render only visible surfaces and honor device-level battery/memory budget; do not animate every background card simultaneously.

**Visual design principles:** Distinctive class silhouettes; consistent icon pixel density; numerical stats near the visual cause; restrained rarity flashes; banners/sounds only for meaningful outcomes; touch targets large enough for Android; label both empty and loading states; no globally forced “full-screen cinematic” for every tiny claim.

---

## 6. User sentiment: what public feedback actually supports

### Sampling rules

- Date window: **30 July–28 Oct 2026** unless labelled historical.
- Each item below is one **independently located post/thread or individual store review**; multiple commenters within a thread are **not** independent evidence of market-level frequency. No vote-count-to-user-count translation.
- Store rating totals are **all-time snapshots**. Third-party review mirrors may have selection bias and dynamic pagination, so a website's total listing count is not a rigorously sampled 90-day cohort.
- “Pattern” means seen in **at least two distinct sources**, not proven widespread prevalence. “Request” means a user asked for it, not necessarily that the publisher lacks it in all versions.

| Evidence / actual date | Sentiment and user problem | Confidence / sample limitation | VELDRYN implication |
| --- | --- | --- | --- |
| Idle Clans: Oct 20 Steam user reviews [S25] | Queue requires manual re-add after formerly automatic daily quests; small-clan weekly task balance disliked | **2 specifically identified negative review excerpts**, non-random | Plan one-tap quest add without changing existing automation; scale group challenges fairly |
| Idle Clans: Oct 20 Reddit patch thread [S57] | Praise for much-requested features; comments cite initial guild quest progress bug | **1 thread**, mixed comments | Add test fixtures for partial guild progress, reward readiness and post-release patches |
| IdleMMO: Oct 19 Google Play mirror [S22] | Slow menu transition 1–2 s; perceived short idle cap | **1 dated review**, subjective timing | Measure and prioritize screen navigation; show AFK limit clearly |
| IdleMMO: Sep 4 Apple review [S34] | Appreciates simple UI but finds active play limited, cosmetic acquisition unclear | **1 review**, non-random | Keep short check-in loop and optional meaningful active Trials |
| Farm RPG: Sep 26 Reddit [S32] | New player loves game, struggles with inventory capacity | **1 thread** | Show storage plan and safe autosell decisions from day one |
| Farm RPG: Sep–Oct feedback board [S23] | Requests clearer notifications, materials source links, saved mastery-tracking presets, resource bottleneck relief | Several independent named suggestions, **not implemented feature evidence** | Build source-chain/Goal Center and a player-controlled alert system |
| Farm RPG: Oct 16 official community notes [S24] | Quick-open and opt-out auto-advance shipped/announced | Developer release claim, not feedback survey | Direct item actions and bounded progress chaining |
| Melvor: Oct 23 Reddit [S28] | Offline startup failing under weak network; beta/offline build advice debated | **1 thread**, multiple comments; conflicting platform/version conditions | Honest connectivity labeling; no fragile startup; separate progress collection from sign-in errors |
| Melvor: Oct 22 Reddit [S29] | Large saved idle duration processes slowly after mod | **1 thread**, modded use case | Preflight large settlement, chunk/snapshot if needed; don't silently promise uncapped AFK |
| IdleOn: Aug 7 Reddit [S27] | Crash at return/collection; workaround differs per character | **1 thread** | Device stress test of long offline reward claims and multiple character switching |
| IdleOn: Sep 9 Reddit [S36] | Mobile text popups can crash one reporter's session | **1 reporter/thread**, not systemic conclusion | Text scale/modal rendering regressions |
| OSRS Mobile: Sep 9 + Sep 29 threads [S33,S26] | Broken hitboxes / long-press inventories; one version update resolved reports | **3 discussion threads** (two Sep 29 plus Sep 9), heterogeneous versions | Preserve touch-target accuracy during UI polish, smoke test post-AAB upgrade |
| AFK Journey: Oct 18 Reddit [S45] | Enjoys story, dislikes leaderboard/spending competition | **1 quitting thread**, not all players | Competitive modes must be opt-in and fair under cosmetics-only policy |
| AFK Journey: Oct 19 Reddit [S46] | Ad creative damages trust even for existing art/gameplay fans | **1 promotional controversy thread** | Honest storefront/trailer representation and no misleading graphics |
| AFK Journey: Oct 2026 mirrored reviews [S47] | Praise art/story, complaints storage, freezing and purchase intensity | Multiple dated snippets; mirror not systematic random sample | Quality and build size count as polish, not only graphic quality |
| Idle Slayer: Aug/Sept/Oct 2026 tracker reviews [S50] | One recent long-term praise and an ad reward complaint | **2 individually cited reviews**, anecdotal | Avoid ad-driven reward disappointment |

### Cross-title themes, with certainty limits

**Repeated across independent products (qualitative):** slow/fragile menus and Android touch bugs (IdleMMO, OSRS, Melvor, IdleOn); inventory/resource discoverability (Farm RPG, IdleMMO developer design work, SimpleMMO release notes); demand for contextual automation **without more micromanagement** (Idle Clans review, Farm RPG feature requests); visual engagement without reducing optional idle play (IdleMMO own rationale, AFK Journey/art praise, Nordicandia gameplay model). This is enough to prioritize **UX hypotheses and QA tests**, not enough to produce market-wide numeric rates.

**Conflicting views:** AFK Journey reviews praise beauty while others report loading and monetization frustration; Melvor players value 24-hour idle but some experiment with unlimited/offline beta; Idle Clans update delivered desired queue tools yet disrupted quest convenience. Product decisions must optimize for VELDRYN's policy rather than simply counting feature adoption.

**Unverified/low sample:** Corah, Hero of Aethric, Orna, Nordicandia and SimpleMMO did not yield representative dated 90-day app-review samples in this audit. Do not label their sentiment positive or negative beyond official ratings and cited discrete reports.

---

## 7. Most relevant recent product developments

| Date | Publisher/game | Confirmed or announced development | Strategic interpretation |
| --- | --- | --- | --- |
| **18 Aug 2026** | Idle Clans | Carpentry and social/systems update [S08] | Idle MMORPG depth continues expanding |
| **9 Sep 2026** | Idle Clans | Achievements, categories and earned player titles [S08] | Long-tail goals + cosmetic identity |
| **10 Sep 2026** | SimpleMMO | Material quantity warnings and crafting input improvements [S19] | Prevention of confusing resource shortages |
| **3/10 Sep 2026** | OSRS Mobile | Menu-entry rewrite and touch/scroll fixes [S16] | Personalization must be regression-tested |
| **19 Sep 2026 etc.** | Idle Slayer | Third-party tracker records multiple Sept releases; Play notes list updated boss cues and offline modifiers [S49,S50] | Small practical reward refinements over giant feature additions |
| **22–23 Sep 2026** | AFK Journey | Patch v1.8.1 / Veil of Memories story, guild modes and collectible units [S30,S31] | Season narrative and group progression need clarity |
| **29 Sep 2026** | Melvor Idle 2 | Official progress update on visuals/performance/story [S53] | Entrant aims to modernize dense idle presentation |
| **5 Oct 2026** | IdleMMO | v0.84 developer preview with planned 19 Oct rollout [S03] | Animated scenes, bank protection, micro-tutorials; rollout not independently confirmed |
| **16 Oct 2026** | Farm RPG | October event, item quick-open, auto-floor QoL [S24] | Event timing plus directly actionable source links |
| **19 Oct 2026** | Melvor Idle 2 | Steam demo announced live; full release not yet [S51,S52] | Benchmark new-player journey rather than copy unreleased systems |
| **20 Oct 2026** | Idle Clans | Task queue/backup, recruitment, weekly clan quests, reward presentation [S01] | VELDRYN's highest-priority direct comparator |
| **20–21 Oct 2026** | SimpleMMO | Chat sender bug and world boss timer wording fixes [S19] | Trust in real-time multiplayer messaging |
| **23–31 Oct 2026** | Farm RPG | Event live dates/bonuses per published Oct16 notes [S24] | Event hub should state claim, timer and end dates accurately |

Future claims must be checked again before implementation: especially Melvor 2 Early Access timing and IdleMMO v0.84 production rollout.

---

## 8. Competitor capability matrix vs VELDRYN (implementation quality not assumed)

**Legend:** **Yes*** = subsystem code+UI present but not certified end to end; **Partial** = interaction or deployment incomplete/needs test; **No** = not in release or expressly excluded; **?** = not independently established. Complexity is design-estimate S/M/L/XL, not delivery time.

| Capability | Representative competitors and how it works | VELDRYN now / quality | Demand basis | Differentiation / effort |
| --- | --- | --- | --- | --- |
| Continuous AFK work | Idle Clans, Melvor, IdleMMO schedule progress under caps/supplies | Yes*; current offline/online settlement QA needed | Core genre, store messaging | Clear cap/preflight, M |
| Multi-step action queue | Idle Clans Oct20 ordered tasks, skill mode and backups | Yes* (Home/Skills queue); usability gaps | 2026 launch + mixed reviews [S01,S25] | Single-tap recommended plan; M |
| Skill auto-next when unlocked | Idle Clans Train mode | Partial/strict queue targets; no validated equivalent dynamic progression preset | Direct rival update | Guarded “Train to next unlock”; M |
| Direct quest-to-queue | Idle Clans quest UI adds tasks directly | Partial: weekly-order queue integration exists | Rival plus review critique | Keep one-step queue add, S–M |
| Backup idle task | Idle Clans default fallback | Partial; queue behavior exists, no verified unified fallback UX | Explicit competitor feature | Opt-in resource-safe fallback, M |
| Craft resource previews | Farm RPG workshop, SimpleMMO missing quantity count | Yes* ingredients shown; bank/overflow edge unverified | Requests and changelog [S19,S23] | Unified source reservation, M |
| Inventory sort/search/filter | IdleMMO grid/table, saved order, inspect | Yes* basic inventory/bulk; full advanced comparisons incomplete | Official product direction | Search + protected bulk preview, M |
| Lock/favorite gear | IdleMMO item-lock, SimpleMMO lock; prevents accidents | Partial: favorites present; destructive action policy must be tested | Official updates | Protected rare/locked items, S–M |
| Item source-chain & goals | IdleMMO inspect drop, Farm RPG item links requested | Yes* source-chain/craft browser; completeness unknown | Support feedback | Contextual “Get missing” across UI, M |
| Interactive visual skilling | IdleMMO v0.84 announced characters working | Partial: region/activity art, not confirmed per-profession live animation | Developer UX rationale [S03] | Event-driven pixel stage, L |
| Animated combat/Trials | Nordicandia auto attacks; AFK Journey formation | Partial: CompanionTrialStage already implements playback | High cross-title design value | Surface and polish current event playback, M |
| Save/default formation | AFK Journey pre-battle roster; various team builds | Partial: Trials have team sheet and team state | UX friction, direct design analogy | Persistent current formation atop Trial, M |
| Guild discovery language/timezone | Idle Clans recruitment filters and intro | Yes* Guild browser; filter depth unknown | Official Oct20 change | Region/language/activity tags, M |
| Guild scalable quests | Idle Clans scales weekly quest to member strength | Yes* Guild quest/progress; fairness not confirmed | Small-clan review criticism | Contribution-balanced scaled objectives, L |
| Guild rewards/showcase | Idle Clans titles/selected weekly buffs | Yes* Guild shop and cosmetics | Current 2026 feature trend | Cosmetic status identity, M |
| Social presence scenes | IdleMMO animated nearby players proposed | Partial: online presence, chat; no established shared-scene display | Announced visual differentiation | Async avatars/ghosts w/ opt-out, M–L |
| Event seasonal hubs | AFK Journey season, Farm RPG festival, SimpleMMO cards | Yes* event hub; claim-all and repeat popup need audit | Engagement and own observed friction | Once-per-event acknowledgment, M |
| Claim-all routine rewards | Many menu games offer group collection; individual implementations vary | Partial/unknown: reward inbox exists, postcap bulk not verified | Repeated manual taps in VELDRYN use | Server atomic receipt/batch, M |
| Player markets/trading | Idle Clans, IdleMMO, SimpleMMO; price discovery between players | No—intentionally removed | Not a VELDRYN goal | Reject; XL + abuse/economy cost |
| Ranked PvP/Arena | OSRS PvP, Orna PvP, AFK Journey arena | No (Arena release flag false) | Other-audience only | Post-1.0 optional; not essential |
| In-game milestones/achievement titles | Idle Clans Sept9, Farm mastery | Yes* achievements/milestones & profile | Long-term engagement | Progress next-action and earned cosmetics, S–M |
| Dynamic icon/chat controls | OSRS configurable hotkeys and chat collapse | Yes* top shortcuts / chat dock | High-frequency usability and mobile bugs | Profile presets and hitbox QA, S–M |
| Cross-device web/PC | Idle Clans, Melvor, IdleMMO and Farm RPG | No verified web/PC VELDRYN release | Convenience demand [S28] | Future platform parity after mobile stability, XL |
| Cosmetics-only/no paid power | Several rivals use subscription, convenience, ads, or gacha | VELDRYN direction: cosmetics-focused VIP/Supporter | Fairness objections [S45] | Clear non-P2W differentiation, M |
| Large 3D visual maps | AFK Journey | No; not desired | Different audience/footprint | Explicitly reject; XXL |

This matrix **does not** mean a feature is absent simply because no example was inspected, or implemented well simply because a VELDRYN source file exists. It identifies what to verify next.

---

## 9. Product opportunities — proposed solutions with architecture, risk and evidence

**Prioritization framework:** **P0** release blocker/protect progress; **P1** high-frequency usability or compelling differentiation; **P2** worthwhile post-stabilization polish; **P3** opt-in future enhancement. Complexity = estimated engineering scope relative to existing TypeScript/Expo/Supabase design (S=small, M=medium, L=large, XL=major cross-system). Expected value is a product hypothesis until measured in VELDRYN analytics/device tests. Each item deliberately includes risks.

### O01 — One-tap Companion Trial with persistent current formation (**P1 · M**)

**Problem:** Trial fight appears to require Challenges & Rewards → formation sheet → scroll to bottom → start. **Evidence:** Existing VELDRYN component contains `trialSheet`, trial sections and `CompanionTrialStage` replay; formation preview clarity in AFK Journey [S44]. **Solution:** Put “Current formation” and primary **Start Trial** at top of Trials tab. Tap formation mini-roster to edit; remember valid lineup. If no valid formation, the Start action opens the editor directly and returns to immediate Start without extra back navigation. Show current trial, likely enemies, reward charges and status above secondary cards. **Architecture:** `CombatCompanionPanel.tsx` + existing team management API, `CompanionTrialStage.tsx`. **Risk:** stale/invalid team after companion expedition/role changes; revalidate server-side just before start. **Acceptance:** starting a valid trial requires ≤2 deliberate taps from Trials; no scrolling prerequisite; existing challenge/season cards remain accessible.

### O02 — Make actual Trial combat visibly useful, not decorative (**P1 · M–L**)

**Problem:** A server-resolved battle feels invisible or arbitrary. **Evidence:** VELDRYN's stage already reads events and displays team/enemy units; IdleMMO wants visible work, Nordicandia auto-attacks [S03,S42]. **Solution:** Consume authoritative ordered hit, miss, critical, blocked, heal, status and damage events; animate impact direction and show damage taken, HP loss and winner. Add 1×/2×/Skip and reduced-motion versions, event log and retained outcome/loot. Avoid fake hits. **Architecture:** extend existing `CompanionTrialStage.tsx` and `companion-trial-playback` tests instead of a second engine. **Risk:** replay desync, battery, accessibility. **Acceptance:** identical fixed fixture settles same rewards regardless of speed/skip; visual events match server combat feed.

### O03 — Owned-first training roster and rarity/role filters (**P1 · S–M**)

**Problem:** Browsing non-owned codex entries before upgradeable companions increases effort. **Evidence:** `CompanionTrainingV50Panel.tsx` loops codex-known companions; training selection built separately. **Solution:** Show **Owned** tab first sorted Equipped → Favorites → Available; second tab **Discover**; chips Role (Tank/Damage/Support) and Rarity (Standard/Rare/Elite/Prestige); saved filter per account. Never hide acquired companions behind default filters. **Risk:** empty filter confusion and codex spoiler handling. **Acceptance:** owned companions appear first, filter reset visible, selected item stays stable across upgrades.

### O04 — Action Queue “Recommended Plan” with safe validation (**P1 · M–L**)

**Problem:** Goal chains require detailed player knowledge and wrong-region/insufficient-resource queues can stall. **Evidence:** VELDRYN Home queue safeguards; Idle Clans train/backup modes and criticism of added work [S01,S25]. **Solution:** From Skills/Contracts show **Plan my next unlock** and **Add current objective** with preview “what will run, expected time, material consumption and what pauses it.” Keep manual goal and protected no-auto-travel rule. Add optional fallback only after explicit enabling; never charge premium for basic queue usefulness. **Architecture:** shared activity queue validation and server `queue_add`, schedule normalization, Home Command Deck; no client-run server rewards. **Risk:** non-deterministic drop probabilities and changing bank contents; label estimates and revalidate each handoff. **Acceptance:** plan creation ≤2 taps, no silent queue slot consumption or auto-travel.

### O05 — Inventory and Bank “Safe Actions” + source-aware quantities (**P1 · M**)

**Problem:** Accidental selling/salvage and confused stack counts destroy player trust. **Evidence:** IdleMMO locks and 50-item bulk preflight [S11,S12], SimpleMMO item lock [S18], Farm RPG inventory feedback [S32]. **Solution:** Preserve existing favorites and bulk controls, add clearly visible **Protected** state to valuable equipment and an atomic bulk-review sheet showing **will sell / excluded / why excluded / expected gold**. Display Inventory + Bank + Overflow totals with breakdown. Ensure cooking/crafting count feasible actions using actual combined accessible resources and reservations. **Architecture:** `inventory-bulk.ts`, `game.ts`, gameplay server command/ledger. **Risk:** database instance ownership and race with active craft; validate on authoritative commit. **Acceptance:** no protected item is destroyed via mass action; same counts appear in recipe preview and execution.

### O06 — Direct “Where to get it” links for every missing material (**P1 · M**)

**Problem:** Players abandon crafts when prerequisites require multiple screens. **Evidence:** Farm RPG requests item icons linking to item pages, missing resources in screenshots and SimpleMMO missing-mats improvement [S23,S19,S37]. **Solution:** Each missing ingredient shows “Need 8 / Have 2 (Bank 5) / Get 1 more” plus a source list (gather, monster drop, shop/event/guild). Tap source to switch to the correct region/skill without auto-travelling; option to pin “Working toward.” **Architecture:** use VELDRYN `material-acquisition-plan.ts`, source-chain UI and `working-toward` navigation. **Risk:** contradictory drop tables and stale generated equipment recipes; add content provenance/checksum tests. **Acceptance:** no dead-end crafting requirement in the launch catalog.

### O07 — Event rewards: one Claim All plus clearly ended post-cap track (**P1 · M**)

**Problem:** Multiple low-value repeated taps obscure collected/post-cap state. **Evidence:** Existing `EventAdditionalRewards.tsx`, live event reward surfaces and direct developer UX friction; Farm RPG event calendar and source windows [S24]. **Solution:** Show milestone progress, post-cap repeatables, available count, claimed vs unclaimed and end time in one header. Add **Claim all available** with authoritative idempotent batch or sequential receipts protected from duplicate taps; animate only summary when many. **Risk:** claims with different choices, caps or currencies cannot be blindly combined; exclude those with explicit reasons. **Acceptance:** 10 ready routine rewards can be claimed with one confirmation without duplicates or unintended missed choices.

### O08 — Companion candy targets all owned, not only equipped (**P1 · S–M**)

**Problem:** A companion reward should not force equip switching merely to spend a consumable. **Evidence:** `EventCandyPanel.tsx` currently exposes `onUse(kind)` and selected target isn't an explicit parameter at this UI layer; requests to target owned companions require command/schema check. **Solution:** Opening companion candy shows owned companions, role and bond progress; default equipped but allow any eligible owned. Server validates ownership and caps; do not reorder equipment. **Risk:** hidden legacy command assumptions may apply only to equipped unit; requires paired RPC migration if necessary. **Acceptance:** using candy on an owned, unequipped valid companion works and increments the correct target exactly once.

### O09 — Once-per-event welcome + durable attention preferences (**P1 · S–M**)

**Problem:** Repeated event modals and reward popups after unrelated actions feel spammy. **Evidence:** `EventStartPopup.tsx` with event announcement storage; Farm RPG opt-out automations [S24], Idle Clans soft-notification queue [S01]. **Solution:** Store per-account per-event welcome acknowledgment; do not reopen after the event hub has been visited that event unless a critical rule changes. Allow settings for routine toasts vs rare items vs claims; always persist actual rewards. **Risk:** suppressing a truly new event/version announcement, or losing unlock communication. **Acceptance:** reopening Event tab doesn't show event-start modal; new event IDs display once; important warning remains.

### O10 — Guild discovery that matches people's real play sessions (**P1 · M**)

**Problem:** New casual players cannot tell which guild suits their language/time zone or pace. **Evidence:** Idle Clans Oct20 recruitment filter and player-listing approach [S01], VELDRYN existing Guild browser. **Solution:** Language, time zone, “casual/active/newcomer” and roster capacity chips; show recent activity bands (privacy-preserving), guild role summary and one application action. Do not show fake “online now” counts; avoid exposing member private activity. **Risk:** cold-start guilds get excluded and activity can bias large groups. **Acceptance:** eligible smaller active guilds remain discoverable through a diversity mix and clear opt-in labels.

### O11 — Small-guild-friendly contribution and weekly challenge pacing (**P1 · L**)

**Problem:** Group goals tuned to large guilds punish small friendly teams. **Evidence:** critical Oct20 Idle Clans review [S25]; VELDRYN currently targets compact guild membership. **Solution:** Scale eligible weekly guild objectives to recent **active contributors**, with min/max floors, antiexploit snapshots and optional stretch goals. Treat the contribution milestone reward as a guild achievement/cosmetic first, not uncapped permanent power. **Architecture:** server-owned guild project ledger and rank/claim receipts. **Risk:** players hopping guilds to game dynamic targets. **Acceptance:** two-member and full guild fixtures achieve reasonable comparable time-per-member; no retroactive target exploit.

### O12 — Living skills: restrained pixel-work tiles and presence (**P2 · L**)

**Problem:** AFK activity can feel like a static stopwatch. **Evidence:** IdleMMO Oct 5 scene/presence proposal [S03], user demand for greater battle visuals. **Solution:** Add small looping class-aware work animations (fishing cast/bite, chopping hit, mining strike, smelting hammer) for currently active activity; optionally show a few anonymized “other adventurers here” avatars refreshed on a low-frequency policy, not real-time GPS or streaming presence. **Risk:** art scope, asset bloat, battery and falsely suggesting live synchronous interaction. **Acceptance:** crisp pixel art on several Android density classes, 30/60fps target when active, no idle-server extra traffic during animations.

### O13 — Goal Center: actionable next milestone without another giant tab (**P2 · M**)

**Problem:** Long-term systems across Mastery, Collections, Events, Guild and Companion obscure the next meaningful action. **Evidence:** Idle Clans achievement tiers and Farm RPG mastery tracker requests [S08,S23]. **Solution:** A **small Home card** recommends three goals: Near unlock, Current plan, Optional social event; one action to pin and route. Explain prerequisite chain and current bank amounts. Keep it optional, never build a parallel planner duplicating queue. **Risk:** repetitive bad suggestions and expensive recomputation. **Acceptance:** recommendations update only when meaningful authoritative state changes; player can mute or replace suggestions.

### O14 — Source-of-truth build and Android performance release gate (**P0 · M–L**)

**Problem:** Broad feature polish is invisible if current mobile CI fails and saved progress cannot be trusted. **Evidence:** [CODEBASE_INVENTORY.md](CODEBASE_INVENTORY.md) confirms starter-companion TS contract mismatch, source/staging drift and no measured navigation latency; IdleMMO/OSRS/IdleOn players report responsiveness problems [S22,S26,S27]. **Solution:** Resolve companion test/source contract first; establish SHA-tagged production-equivalent AAB + Android smoke matrix (cold start, navigation, co-op, return after AFK, chat, storage, purchase restore). Add navigation HTTP/realtime counters and image/bundle size budgets. **Risk:** temporarily reduces feature velocity. **Acceptance:** all required CI checks green and physical test record attached to exact SHA/build/back-end versions.

### O15 — Progress-feedback hierarchy and concise rewards log (**P2 · M**)

**Problem:** Too many routine popups compete with high-value rare discoveries. **Evidence:** Idle Clans rare-drop presentation and queued soft notices [S01]; Idle Slayer telegraph/reward refinements [S49]. **Solution:** Distinguish passive activity feed (no popup), normal reward summary (small toast), collection first-time (celebration), and truly rare/boss (expanded event). “Recent rewards” stores last session's claims for later inspection. **Risk:** if players turn off effects they might miss critical drops. **Acceptance:** notification preferences never alter reward accounting; event badges/log show claims when animations disabled.

### O16 — Trials formation preview and role/affinity suggestions (**P2 · M**)

**Problem:** Players need to understand a team before starting, especially casual players. **Evidence:** AFK Journey roster-first positioning [S44]; VELDRYN's current companion roles, affinities, Trial season and team power helpers. **Solution:** Suggest a valid owned 1x Damage/Tank/Support formation when role restrictions apply, show boss affinity hints and current/next-stage rewards, optionally “Practice” as a non-reward preview if computationally safe. **Risk:** accidental claims of guaranteed victory and client-side simulated combat leakage. **Acceptance:** all recommendations specify heuristic reason and never determine real reward or roll.

### O17 — A beginner 10-minute “first loop” and replayable guides (**P2 · M**)

**Problem:** Heavy idle RPGs can lose players who do not know which button to tap first. **Evidence:** IdleMMO announced short re-openable illustrated tutorials [S03]; Melvor Idle 2 demo uses quest-based first-act progression [S51]. **Solution:** New user flow: create character/name, one visible activity, claim result, obtain material, equip crafted first armor, visit one guided world screen, optional party/companion preview when unlocked. Short guided overlays; never lock long game systems behind lengthy tours. **Risk:** burden on returners/migrated saves and locale copy. **Acceptance:** tutorial can always be dismissed/replayed; QA walkthrough on small/large font settings.

### O18 — Honest, calm storefront and cosmetics identity (**P2 · M**)

**Problem:** Players distrust inflated rewards, gacha competition, confusing ad promises and unfair purchased power. **Evidence:** AFK Journey recent Reddit monetization/advertising critiques [S45,S46], SimpleMMO store metadata contradiction [S17]. **Solution:** Explain VIP/VIP+/Supporter benefits in a single table; label bonuses transparently and carefully check cosmetics-first promise against actual stats; prioritize skins, profile cosmetics, cosmetic guild affiliation and no deceptive progress claims. **Risk:** current benefits include gameplay convenience or rate modifiers; positioning must be reviewed for truth before marketing as “purely cosmetic.” **Acceptance:** public monetization copy exactly matches server entitlements, with no ranked paid advantage.

### O19 — More credible companion collectibility and cosmetic Codex (**P3 · M–L**)

**Problem:** Collecting many companions is less valuable if ownership/status is hard to browse. **Evidence:** Idle Clans achievement titles [S08], Farm RPG mastery/collections [S20], VELDRYN's own companion codex. **Solution:** Owned silhouettes, “next to discover” source, rarity/role gallery and optional profile showcase; do not turn into gacha power acquisition. **Risk:** content/art overhead and reveal spoilers. **Acceptance:** collection state derived from owned records, filters accessible and UI remains fast at large rosters.

### O20 — New social check-in cards without pressure (**P3 · M**)

**Problem:** People want to feel MMO-connected during 5-minute sessions but not chase mandatory daily competitions. **Evidence:** IdleMMO proposed visible same-area players [S03], AFK Journey pressure complaint [S45], Farm RPG friendly cooperative identity [S20]. **Solution:** Optional lightweight guild/party summary: “2 friends contributed,” “party contract ready,” “guild reward claimable” with one tap, capped update frequency. **Risk:** social activity surveillance or FOMO. **Acceptance:** no notifications if opted out, no fabricated participants and no automatic reward write on navigation.

---

## 10. Ranked roadmap: what to ship and what to avoid

| Rank | Opportunity | Phase | Why now / dependency | Effort | Completion metric |
| --- | --- | --- | --- | --- | --- |
| 1 | O14 Android/typecheck/production-equivalent verification | Release gate | Current mobile baseline broken | M–L | All target CI/tests green; device smoke by SHA |
| 2 | O01 Trial top-level formation + start | 1.0 polish | Biggest companion navigation friction | M | ≤2 taps to start valid Trial |
| 3 | O02 Real event-driven Trial playback polish | 1.0 polish | Existing stage should be surfaced, not duplicated | M–L | Fixture-perfect events/results and skip/reduce motion |
| 4 | O03 Training owned-first role/rarity filters | 1.0 polish | High-frequency roster management | S–M | Owned shown first; no lost selection |
| 5 | O05 Inventory/bank protection and quantity accounting | 1.0 stabilization | Prevent destructive errors; resource trust | M | Zero irreversible bulk mistakes in fixtures |
| 6 | O07 Event post-cap Claim All | 1.0 polish | Direct repetition without depth | M | One confirmation for safe bulk claims |
| 7 | O09 One-time event notice and quiet claims | 1.0 polish | Reduce interruptions | S–M | No reopened event popup after acknowledgment |
| 8 | O04 Queue recommended plan + bounded backup | 1.0 or 1.1 | Recent rival release, existing queue engine | M–L | ≤2 taps, safe preflight and explicit stop |
| 9 | O06 Material source-chain links | 1.1 | Strong menu-RPG value | M | No dead-end prerequisite |
| 10 | O08 Candy on any owned companion | 1.1 | Direct collectible UX improvement | S–M | Server validates target |
| 11 | O10 Guild discovery refinements | 1.1 | Oct20 rival update; strong social relevance | M | Eligible compact guilds remain visible |
| 12 | O11 Scaled guild objectives | 1.1 | Avoid small-guild grind trap | L | Equivalent effort per active member |
| 13 | O15 Game-feel feedback hierarchy | 1.1 | Supports visual/sound polish | M | No duplicate claims/toast spam |
| 14 | O17 Replayable contextual onboarding | 1.1 | Activation and feature discoverability | M | QA first session works under font scaling |
| 15 | O13 Home next-goal intelligence | Post-1.0 | Needs clean stable source chain first | M | Recommended card gets useful click-through |
| 16 | O12 Restrained living profession pixel scenes | Post-1.0 | Art and device profiling dependency | L | Measured frame/memory/network budgets |
| 17 | O16 Formation strategy guidance | Post-1.0 | Beneficial when Trials robust | M | Valid suggestions, honest probabilities |
| 18 | O18 Store trust and cosmetic identities | Release + ongoing | Always uphold monetization claim | M | Entitlements copy accurate |
| 19 | O19 Companion collection Codex | Future | UI scale + art content | M–L | Large roster remains performant |
| 20 | O20 Casual social check-ins | Future | Strong privacy and preference rules | M | Muted/presence rules respected |

**Excluded or deferred — product-fit decisions:** no mandatory player-run market (deprecated), no pay-to-win equipment/consumable purchases, no paid premium currency/gacha duplicates, no forced advertisements, no real-world GPS requirement, no always-rendering 3D world, no obligatory PvP/leaderboards, and no giant new quest/character system until critical release gates pass. They may be successful for particular rivals; they do not serve VELDRYN's chosen promise.

**Research-backed differentiation statement to test:** “A living pixel-art idle MMORPG: build your hero, plan meaningful offline progress, and experience real companion/co-op battles — without pay-to-win pressure or endless menu chores.” This is a proposed marketing hypothesis, **not** a verified complete launch claim.

---

## 11. Implementation notes and objective validation plan

**Do not duplicate already implemented gameplay.** Trace VELDRYN `CombatCompanionPanel.tsx` → `CompanionTrialStage.tsx` → trial playback/test fixture, and `HomeQueueComposer.tsx` → shared `activity-queue.ts` → server command before creating new infrastructure. A feature being hard to use does not mean it is unimplemented.

**Telemetry proposals:** Median taps from Companions home to first valid Trial; Trial abandonment/skip after fight vs before fight; average seconds to find owned companion in Training; percent failed queue preflight by reason; recipe-opening-to-source-navigation ratio; event ready claims requiring 2+ taps; chat/channel navigation request count; physical Android cold-start/return/crash-free sessions. Aggregate privacy-preserving metrics only, no chat/personal contents.

**Acceptance tests:** One controlled low-level character, one long-returning character, one account with no eligible owned companion, full companion roster, two guild sizes, split inventory stacks (including full stack plus remainder), offline queued transition across a new unlock, expired event after notification seen, double-tap Claim All, concurrent login/command retry, dark/light/reduced-motion/large-font Android QA.

**Anti-hype:** Compare VELDRYN performance only after live device benchmarks. Do not claim another game has bad retention or is failing from isolated reviews. Do not set VELDRYN download and retention targets using unverified competing MAU figures.

---

## 12. Source register (direct links and research dates)

All public sources accessed on 28 Oct 2026 unless otherwise stated. **Source publication date is distinct from crawl time**. Store descriptions, producer blogs and wikis may change after audit; link to direct page before using as current evidence.

### Current, official competitor product and development documents

- **[S01]** Idle Clans, *20 October 2026: Task queue, clan quest rework, recruitment and more* (developer-maintained wiki): https://idleclans.wiki/w/20/10/2026_-_Task_queue%2C_clan_quest_rework%2C_clan_recruitment_improvements%2C_audio_update_%26_more — **20 Oct 2026**.
- **[S02]** Idle Clans, task queue and Train/backup mechanics: https://idleclans.wiki/w/Task_queue — inspected **28 Oct 2026**.
- **[S03]** Galahad Creative, IdleMMO v0.84 developer announcement (animated scenes, tutorials, item safety, bank): https://www.galahadcreative.com/blog/idlemmo-v0-84-ui-improvements-forge-lessons-quality-of-life-and-much-more/ — **5 Oct 2026**, slated 19 Oct; deployment not independently retested.
- **[S04]** IdleMMO developer page, relevant mobile/inventory feature section: same S03 URL.
- **[S05]** Idle Clans press kit (guilds, 20+ skills, raids, offline/market): https://www.idleclans.com/press — accessed **28 Oct 2026**.
- **[S06]** Idle Clans official homepage and cross-platform description: https://www.idleclans.com/ — accessed **28 Oct 2026**.
- **[S07]** IdleMMO Google Play listing: https://play.google.com/store/apps/details?id=dawsn.idlemmo — Play listing updated **19 Apr 2026** when crawled.
- **[S08]** Idle Clans official patch history: https://idleclans.wiki/w/Patch_Notes — dates **18 Aug, 9 Sep, 20 Oct 2026**.
- **[S09]** Idle Clans beginner guide: https://idleclans.wiki/w/Beginner%27s_Guide — revised **20 Oct 2026**.
- **[S10]** Idle Clans Google Play listing: https://play.google.com/store/apps/details?id=com.idleclans.temsoft — accessed **28 Oct 2026**.
- **[S11]** IdleMMO official inventory mechanics: https://wiki.idle-mmo.com/items/inventory — accessed **28 Oct 2026**.
- **[S12]** IdleMMO official bank mechanics: https://wiki.idle-mmo.com/items/bank — accessed **28 Oct 2026**.
- **[S13]** Legends of IdleOn official homepage: https://www.legendsofidleon.com/ — accessed **28 Oct 2026**.
- **[S14]** Melvor Idle Google Play listing: https://play.google.com/store/apps/details?id=com.malcs.melvoridle — updated **3 Sep 2026** when crawled.
- **[S15]** Jagex, OSRS mobile interface and hotkeys launch: https://www.jagex.com/news/old-school-runescape-celebrates-six-year-mobile-anniversary-with-major-new-features-mobile-ui-update — **6 Nov 2024** (historical baseline).
- **[S16]** OSRS Wiki mobile platform, controls and changelog: https://oldschool.runescape.wiki/w/Mobile — Sep 2026 entries; accessed **28 Oct**.
- **[S17]** SimpleMMO official/about and Google Play marketing: https://simple-mmo.com/about and https://play.google.com/store/apps/details?id=dawsn.simplemmo — accessed **28 Oct 2026**.
- **[S18]** SimpleMMO official update history, **12 Aug 2026**: https://simple-mmo.com/updates .
- **[S19]** SimpleMMO official update history, **10 Sep and 20–21 Oct 2026**: https://simple-mmo.com/updates .
- **[S20]** Farm RPG Google Play description: https://play.google.com/store/apps/details?id=com.firestream.farmrpg — accessed **28 Oct 2026**.
- **[S21]** Farm RPG official Patreon about (free, no ads, paid support): https://www.patreon.com/farmrpg/about — accessed **28 Oct 2026**.
- **[S23]** Farm RPG public product suggestions, dated Sep–Oct 2026: https://improveloop.com/loop/farmrpg — **9 Sep–26 Oct 2026**.
- **[S24]** Farm RPG Oct16 developer/community update with QoL and event schedule: https://www.reddit.com/r/FarmRPG/comments/1x7nu8q/october_16th_2026_update/ — **16 Oct 2026**.
- **[S30]** AFK Journey patch v1.8.1 aggregator detail: https://www.afk.global/afk-journey/patch-notes/1-8-1 — **22 Sep 2026** (third party).
- **[S31]** AFK Journey patch / new season coverage: https://www.afk.global/afk-journey/news/patch-1-8-1-opens-veil-of-memories-with-aster-and-senea-on-23-september — **22 Sep 2026**.
- **[S38]** Corah Google Play listing: https://play.google.com/store/apps/details?id=com.coorangar.corah — updated **1 Sep 2026**.
- **[S39]** Hero of Aethric Google Play listing: https://play.google.com/store/apps/details?id=com.avalon.rpg — updated **3 Sep 2026**.
- **[S40]** Orna and Aethric official description: https://aethric.com/ — accessed **28 Oct 2026**.
- **[S41]** Orna Google Play listing: https://play.google.com/store/apps/details?id=playorna.com.orna — updated **3 Sep 2026**.
- **[S42]** Nordicandia Google Play listing: https://play.google.com/store/apps/details?id=com.IterativeStudios.Nordicandia — updated **26 Aug 2026**.
- **[S43]** AFK Journey Google Play listing: https://play.google.com/store/apps/details?id=com.farlightgames.igame.gp — accessed **28 Oct 2026**.
- **[S49]** Idle Slayer Play listing and update notes: https://play.google.com/store/apps/details?id=com.pabloleban.IdleSlayer — includes 2026 notes; accessed **28 Oct**.
- **[S51]** Melvor Idle 2 demo announcement: https://news.melvoridle.com/the-melvor-idle-2-demo-is-now-live/ — **19 Oct 2026**.
- **[S52]** Melvor Idle 2 Steam page, Early Access marked upcoming: https://store.steampowered.com/app/3218350/Melvor_Idle_2/ — inspected **28 Oct 2026**.
- **[S53]** Melvor Idle 2 official development update: https://news.melvoridle.com/melvor-idle-2-development-progress-update-september-2026/ — **29 Sep 2026**.
- **[S54]** Melvor Idle 2 mobile plans (older developer FAQ): https://news.melvoridle.com/what-weve-been-up-to-with-melvor-idle-2/ — **2025, historical roadmap**.

### Dated user review/community evidence and independent analysis

- **[S22]** IdleMMO Google Play review mirror: https://chrome-stats.com/d/dawsn.idlemmo/reviews — individual review **19 Oct 2026**; site reports 204 all-time mirrored entries.
- **[S25]** Idle Clans Steam community negative reviews of Oct20 queue and small-clan quests: https://steamcommunity.com/app/2103530 — **20 Oct 2026**; dynamic page.
- **[S26]** OSRS Reddit Sept29 inventory long-press discussion: https://www.reddit.com/r/2007scape/comments/1wtay2j/new_mobile_bug_after_icon_update/ and https://www.reddit.com/r/2007scape/comments/1wtjxsx/mobile_bug_or_user_error/ — **29 Sep 2026**.
- **[S27]** IdleOn Reddit mobile return/collect crash thread: https://www.reddit.com/r/idleon/comments/1vib9op/game_crashing/ — **7 Aug 2026**.
- **[S28]** Melvor Reddit offline travel/startup issues: https://www.reddit.com/r/MelvorIdle/comments/1xdhfye/offline_play_during_travel/ — **23–25 Oct 2026**.
- **[S29]** Melvor Reddit large offline-processing hang (mod-dependent): https://www.reddit.com/r/MelvorIdle/comments/1xcdh12/loading_time_takes_ages/ — **22–25 Oct 2026**.
- **[S32]** Farm RPG new player and inventory thread: https://www.reddit.com/r/FarmRPG/comments/1wqvcp5/downloaded_this_game_on_a_whim_24hrs_in_and_im/ — **26 Sep 2026**.
- **[S33]** OSRS Mobile Reddit touch hitbox thread: https://www.reddit.com/r/OSRSMobile/comments/1wbnjpq/is_this_a_known_issue/ — **9 Sep 2026**.
- **[S34]** IdleMMO App Store ratings/reviews: https://apps.apple.com/us/app/idlemmo-online-idle-rpg/id6469646231?platform=iphone&see-all=reviews — Sep 4 2026 visible individual reviewer, no verified rolling count.
- **[S35]** IdleOn independent review of complexity/monetization: https://www.leetdom.com/reviews/legends-of-idleon — **Jul 2026**, review perspective not proof of full live entitlement rules.
- **[S36]** IdleOn Reddit mobile text/popups crash report in removed thread: https://www.reddit.com/r/idleon/comments/1wbcuf9/removed/ — **9 Sep 2026**, one surviving comment, original removed.
- **[S37]** Farm RPG older workshop screenshot/editorial: https://minireview.io/role-playing/farm-rpg — older illustrative interface, not Oct2026 live screenshot.
- **[S44]** AFK Journey formation editorial screenshot: https://www.mmorpg.com/editorials/afk-journey-impressions-a-new-idle-obsession-on-the-rise-with-a-big-catch-pax-east-2000131010 — 2024 illustration.
- **[S45]** AFK Journey Reddit pressure/competition quitting discussion: https://www.reddit.com/r/AFKJourney/comments/1x8wiip/quitting/ — **18 Oct 2026**.
- **[S46]** AFK Journey Reddit marketing/creative criticism: https://www.reddit.com/r/AFKJourney/comments/1xab43k/im_deleting_this_game_yall/ — **19–21 Oct 2026**.
- **[S47]** AFK Journey mirrored recent reviews, performance/price/size: https://chrome-stats.com/d/com.farlightgames.igame.gp/reviews — visible **19–23 Oct 2026**.
- **[S48]** AFK Journey sampled recent US Play cohort (166 records; unknown review dates window): https://appinsider.io/apps/afk-journey-1628970855 — accessed **28 Oct 2026**; not treated as 90-day statistically representative.
- **[S50]** Idle Slayer tracker store review excerpts and version timeline: https://www.appbrain.com/app/idle-slayer-pixel-rpg/com.pabloleban.IdleSlayer — Sep/Oct 2026, third-party.
- **[S55]** Melvor Idle older UI/editorial screenshots: https://minireview.io/role-playing/melvor-idle-idle-rpg — historical visual only.
- **[S56]** IdleMMO older UI/editorial screenshot: https://minireview.io/incremental/idlemmo-online-idle-rpg — historical visual only.
- **[S57]** Idle Clans Reddit Oct20 update discussion: https://www.reddit.com/r/idleclans/comments/1xanhpr/20th_of_october_updates_task_queue_clan_quest/ — **20–22 Oct 2026**.

### VELDRYN reference links

- **[V01]** Internal codebase inventory dated Oct28: [docs/CODEBASE_INVENTORY.md](CODEBASE_INVENTORY.md).
- **[V02]** Main mobile routes / gate flags: [apps/mobile/App.tsx](../apps/mobile/App.tsx), [release-flags.ts](../apps/mobile/src/core/release-flags.ts).
- **[V03]** Companion existing UI: [CombatCompanionPanel.tsx](../apps/mobile/src/components/CombatCompanionPanel.tsx), [CompanionTrainingV50Panel.tsx](../apps/mobile/src/components/CompanionTrainingV50Panel.tsx), [CompanionTrialStage.tsx](../apps/mobile/src/components/CompanionTrialStage.tsx).
- **[V04]** Queue project history: [docs/QUEUE_RELIABILITY_AUDIT_2026_10_22.md](QUEUE_RELIABILITY_AUDIT_2026_10_22.md).
- **[V05]** Dungeon implementation/deployment notes: [docs/implementation/COOP_CURRENT_STATUS.md](implementation/COOP_CURRENT_STATUS.md).

---

## 13. Research maintenance and next-session handoff

**Snapshot only:** 28 October 2026. At the next cycle, revalidate major developer pages because Idle Clans and IdleMMO are actively iterating, check the Melvor Idle 2 release state, review current 90-day Play/Apple review cohorts with accessible raw dated reviews, and compare latest VELDRYN branch/commit. Do not promote an **announced** competitor feature to a verified shipped feature without direct evidence.

**Priorities:** The highest leverage is not shipping 20 features at once. Restore build confidence, finish one smooth visual Companion Trial loop, create a safe one-step plan/claim experience, then refine social discovery and optional living pixel scenes. Use feedback in this report to shape hypotheses; use VELDRYN analytics/device QA to decide whether each actually improves first-session completion, weekly return, reward understanding and long-term enjoyment.

**No source code, database or deployment changes were authorized or made by this research.**
