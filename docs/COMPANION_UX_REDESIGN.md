# VELDRYN — Companion UI Simplification & Layout Redesign

**Date:** 28 October 2026  
**Status:** **PROPOSED — design only; not implemented, tested on device, or approved**.  
**Source baseline:** `main` `cb975ecb0ea5ba85c7aaeb3d8b5b740172a06290` (app source last audited at `eb70bb3`).  
**Related:** [MASTER_DEVELOPMENT_ROADMAP.md](MASTER_DEVELOPMENT_ROADMAP.md) B01–B03/C03/C04/C05; [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md), [CODEBASE_INVENTORY.md](CODEBASE_INVENTORY.md); draft [PR #617](https://github.com/elroynbenjamins/Veldryn/pull/617) currently improves the legacy **Training** tab and should not be merged as the final navigation architecture before this decision is made.

## 1. User problem / diagnosis from *actual code*, not imagined screenshots

The current UI is a rich implementation organized around mechanics, rather than the 4 player intents: **manage a companion, fight a Trial, send an Expedition, upgrade shared facilities**.

**Code observed on main:**

- `apps/mobile/src/screens/CompanionsScreen.tsx` wraps the whole companion surface in one `ScrollView` and adds another “Companion actions ready” text summary.
- `apps/mobile/src/components/CombatCompanionPanel.tsx` is ~60KB / 198 mostly long TSX lines. It declares five equally weighted tabs `Collection / Training / Sanctuary / Trials / Expeditions` and a separate `Codex` view. It owns collection selection, companion detail modal, team, mission, multiple Trial sheets, claims, Sanctuary, the Codex and button busy state.
- **Collection** has a long unlock advice card, full roster grid, five-option filter menu and a companion detail modal. Inside detail are a prominent long progression roadmap (power path and Bond path), unlock requirements, lore, ascension materials and housing descriptions.
- **Training** repeats the selected companion hero/stats, “NEXT LEVEL,” a comparison card, ingredient breakdown, equip controls, and three nested subtabs/sheets `Bond / Abilities & Techniques / Materials & Ascension`, plus another “Change companion” roster picker.
- **Trials** shows monthly rotation header, team picker, best-floor counters, Challenges & Rewards, a full tower, Encounter details, recovery, boss/theme paragraphs and the primary Start/Fight **after** the tower and supporting information. The separate `trialSheet` state includes `team | boss | season | challenges | battle`. `CompanionTrialStage.tsx` already supports real event playback; **do not build a second combat engine**.
- **Expeditions** prints introductory text, Active list, mission dropdown, selected portraits, suggested team button, base rewards/cost/stamina status, `Mission Details` disclosure repeating the rewards/cost, food controls, then a separately nested `Choose Team` disclosure and send requirements. Core mechanics exist but information hierarchy is long.
- **Sanctuary** shows the selected companion's quarters and five global facilities with description, level, materials and repeated upgrade buttons. Players may confuse companion training with building Training Ground.
- **Codex** includes owned/bond/mastered/event totals, favorite/showcase, discovery status, unlock targets, mastery targets, challenge details and several reward lists; this is useful specialist content, not a daily home tab.

**Limitations of review:** Source-level screen composition and logic were inspected; **no actual October 28 Android screenshots, TalkBack session, FPS trace or user research recordings** were directly examined. Claims about visual crowding describe the JSX hierarchy/text volume, not measured pixel occupancy. Existing native behavior should be video-captured before refactoring.

## 2. Design decision: four direct destinations, no extra navigation depth

**Propose main companion navigation: `Roster | Trials | Expeditions | Sanctuary`** (four recognizable icon/label destinations, one tap each).

- **Remove Training as a global tab.** Training belongs to the *selected companion detail*. Bond, Ascension, Techniques and personal Quarters live there too.
- **Keep Roster as the landing page.** Owned companions are the default, then optional Discover/Codex. The player owns specific characters; the UI should start with those, not a game-system menu.
- **Keep Trials and Expeditions direct** instead of nesting them in a new “Adventures” menu; these are frequent player journeys and should not take an additional tap.
- **Keep Sanctuary** only for **shared global facilities** (Training Ground, Essence Basin, Bond Hall, Expedition Pens, Mastery Chamber), with personal housing linked from companion detail.
- **Codex** becomes one secondary “Collection book” action reachable from Roster, not a fifth main tab. Preserve all codex milestones, challenges, reward receipts and privacy of unknown Prestige identities.
- **No changes** to the global game navigation, bottom bar, companion unlocks, role rule, economy, live Trial fights, monthly reset or expedition allocation.

### Primary object model

| Player object | Primary screen/action | Detail only |
| --- | --- | --- |
| My owned companions | Roster grid / tap portrait | Training, Equip, Bond, Ascension, Techniques, personal Housing, Lore |
| Yet-to-own companion | Roster → Discover or Codex | Requirements / source chain / unknown Prestige silhouette |
| Trial formation & run | Trials → current 3-slot formation + Start/Fight | Team builder, boss info, season rules, tower/history, challenges |
| Away companions & missions | Expeditions → Ready/Active + choose mission | Eligible team, food, bonuses, mission history/requirements |
| Shared Sanctuary buildings | Sanctuary → compact 2-column facility grid | Exact resource costs and upgrade confirmation |

**Principle:** One thing to do first, one line why blocked, details one tap away. Never show the same data multiple times on a screen.

## 3. Wireframes — target at 360–400dp mobile width

These are **information-layout sketches, not renderings of current Android UI**. Keep VELDRYN's existing responsive game themes, sprites, runtime rarity borders and typography tokens.

### 3.1 Roster — make ownership and identity immediately visible

```text
COMPANIONS                          [Codex ⧉]
Essence 2,420 · Bondstones 36             (i)
[ ROSTER ] [ TRIALS ] [ EXPEDITIONS ] [ SANCTUARY ]

ASSISTING   [Hound portrait] Ironwood Hound Lv.18
             Damage · Bond 4   [Change]

[Owned 12] [Discover]       [☷ Role] [◇ Rarity]
┌──────────┐ ┌──────────┐ ┌──────────┐
│  ART     │ │   ART    │ │   ART    │
│ Lv.18 ⚔  │ │ Lv.12 ◆  │ │ Lv.8 ✦   │
│ Hound ✓  │ │ Sentry   │ │ Sprite   │
└──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│  ART     │ │   ART    │ │   ART    │
│ Lv.7 ⚔   │ │ Lv.5 ✦   │ │ Lv.5 ◆   │
└──────────┘ └──────────┘ └──────────┘
       (more roster rows / scrolling)
```

**Required:** Each portrait tile has the companion's real art, one short label, level, a role icon **with accessible text**, rarity border, and optional Equipped/Favorite/Busy indicators. Do not print `Lv. 18 · Bond 4 · Ascension II · Affinity ...` on every tile. Use 2 columns when font scaling/width demands it; 3 columns only at ordinary phone scale after testing. Keep locked/unknown entries out of default Owned and preserve Codex gating. The assisting card is context, not a second parallel equipment control system.

### 3.2 Tap portrait → full-height companion detail (not three nested menus)

```text
← My Companions                      ☆ Favorite

                [ LARGE PIXEL ART ]
IRONWOOD HOUND       Damage · Standard · equipped
[ Level 18 ▰▰▰▰▱ ] [ Bond 4 ▰▰▱ ]  Ascension I

NEXT UPGRADE
Level 18 → 19             + Power change
120 Gold  ·  18 Essence
[ Train +1 ]        [ Equip / Unequip ]

  [ Ascend ]   [ Bond ]   [ Techniques ]   [ Quarters ]
  (cards show ✓ ready, current tier, or an icon)

[Details ▾]  Affinity · Ability text · Lore · Sources
```

**Behavior:** The default detail shows only what helps act: name, art, status, level/Bond/Ascension overview, available next upgrade with its *full exact cost*, Train +1 and Equip actions. A short row of four compact actions opens **single focused detail sheets**; these replace the nested `Bond / Skills / Materials` modal hierarchy. For unowned companions, main action becomes `How to unlock` with current progress and one next target; there are **no fake Train/Equip buttons**.

**Preserve:** all original upgrade requirements, maximum level, housing cap, chosen technique, Bond rewards, availability/role restrictions, provenance and stats. The UI reads existing `combatCompanionUiModel`/presentation calculations; no power projection should be guessed from art.

### 3.3 Trials — playable-first, formation at top, fixed action at bottom

```text
TRIAL TOWER           This month: Floor 8 / 30
[ mini tower progress ━━━◆━━━━━━━ ] [All floors]

YOUR FORMATION                         [Edit]
┌────────┐  ┌────────┐  ┌────────┐
│ ◆ Tank │  │ ⚔ DPS  │  │ ✦ Heal │
│  Lv22  │  │  Lv24  │  │  Lv18  │
└────────┘  └────────┘  └────────┘

NEXT: Floor 9
[ ENEMY / BOSS PORTRAIT ]  Danger: Medium
Reward: Essence · Bondstones          [i]

[ Challenges & Rewards ]              2 ready

┌───────────────────────────────────────┐
│          FIGHT FLOOR 9                │ sticky
└───────────────────────────────────────┘
```

**Actual hierarchy:** Next encounter + team + **Start / Fight next floor / Resume** visible on the first viewport. Existing Season Info, boss abilities, full 30-floor tower and monthly challenge specifics are accessible through `info`/`All floors`/`Challenges`, but no longer pushed above Start. Team still means **one Tank, one Damage, one Support** and is *locked once a run starts*.

**Flow:** New player with no valid team taps `Build Team` → team picker with three **role slots** and owned eligible companions; if one role missing, show the exact reason and direct unlock route. Player with valid formation taps `Fight` from this screen. Server command resolves, then automatically open existing `CompanionTrialStage` playback showing authoritative event hits, healing, health, win/loss and reward. `Continue` returns to Trials with updated floor. `Skip` affects animation only.

**Sticky-CTA caution:** Companion screen currently lives in an outer `ScrollView`. Implement sticky action **outside** the Trials content scroller with proper safe-area/bottom navigation clearance; do not overlay keyboard, sheets or content on small screens. Disabled Fight explains **which** role/status/recovery gate blocks it and whether there is a safe suggestion. Do not automatically start a paid, inventory-consuming or irreversible action.

### 3.4 Expeditions — claim-first when ready, select mission, one confirmation

```text
EXPEDITIONS
READY TO CLAIM
[ Scout Mission      ✓ Complete        CLAIM ]

ACTIVE
[ Mountain Patrol       1h 26m left   ⏳ ]

AVAILABLE MISSIONS                         [All]
[Portrait] Forest Scout   2h   +Essence    [Choose]
[Portrait] Mountain Run   4h   +Bond XP   [Choose]

(selected mission setup sheet)
FOREST SCOUT                  2h
[ companion ][ companion ][ + ]
Team power 620 / Recommended 500
Stamina: ✓ Auto-select food · 4 fish
Cost: 100 Gold  ·  2 Supplies
Reward: Essence · XP · Bond
[ SEND EXPEDITION ]
[Detailed requirements / bonuses ▾]
```

**Hierarchy:** Ready-to-claim and active assignments first; a concise rotating mission list second. Selecting a mission opens **one** setup sheet that combines recommended team, eligibility, food, actual costs and Send. Remove duplicated `Mission Details` and `Choose Team` disclosures; detailed reward rules/bonuses remain behind one expansion. Ensure auto-food is **previewed and clearly confirmed**; do not silently consume it. Expedition team cannot include the character's equipped assistant, already busy companions or units locked in an active Trial. Preserve weekly Monday 00:00 UTC mission rotation and old assignments claimability.

### 3.5 Sanctuary — facility management, not another tutorial

```text
SANCTUARY                          Level 3 (example)
[ Essence 2,420 ] [ Bondstones 36 ]

┌────────────────────┐ ┌──────────────────┐
│ Training Ground    │ │ Essence Basin    │
│ [pixel illustration]│ │ [art]            │
│ Level 2 / 5        │ │ Level 1 / 5      │
│ [Upgrade ✓]        │ │ [Need material]  │
└────────────────────┘ └──────────────────┘
┌────────────────────┐ ┌──────────────────┐
│ Bond Hall          │ │ Expedition Pens  │
│ Level 1 / 5        │ │ Level 2 / 5      │
└────────────────────┘ └──────────────────┘
┌────────────────────────────────────────┐
│ Mastery Chamber     Level 1 / 5         │
└────────────────────────────────────────┘
```

One compact icon/art, level, benefit-in-**one line**, status and Upgrade for each global facility. Tap into exact material/Gold requirement. Individual Quarters stay on companion detail. Remove repeated facility explanation paragraphs from overview; keep an `i` for players who want detailed formulas.

## 4. Text and information-density rules

**Default first screen of each destination:** maximum one short explanatory line; no instructional paragraph when meaningful player content is available; no repeated section heading that only restates the tab name. Use familiar vocabulary and one primary CTA per view.

**Hierarchy:**
1. `What is this?` — name/portrait or floor/mission, shown visually.
2. `What is my status?` — level, timer, ready/blocked, team slots.
3. `What can I do right now?` — clear primary verb and full cost if transactional.
4. `Why can't I?` — a short specific blocker beside/under CTA, with actionable route.
5. `How does it work?` — optional detail sheet, tooltip or Codex; comprehensive information is **retained**, not deleted.

**Redundancy eliminations:**
- No second hero, repeated “Training Grounds” introduction or long “how to grow” copy above every upgrade.
- No multi-row `Level · Bond · Ascension · Role · Rarity · Affinity · Origin` on **every** roster tile; render full facts only once in detail.
- No repeated Expedition `BASE REWARDS / COST / STAMINA` between summary and Mission Details.
- No full 30-floor Trial tower between formation and Fight.
- No three simultaneously visible paragraphs of unlock guidance when one exact next-step link is enough.
- No redundant nav rail of five 62pt-height tiles when four concise icon tabs suffice.
- Keep status via **icon + short label**, not color alone, because accessibility matters.

**Estimated text reduction goal:** Aim to remove at least one-third of *visible overview copy* on the 4 top-level destinations **without removing detailed information**; this is a future screenshot/content audit target, **not measured result**. Do not shorten mandatory risks/costs/ownership constraints just to meet a count.

## 5. Lifecycle and edge-case UX rules

| Case | Desired user-facing behavior |
| --- | --- |
| No owned companion | Roster shows a clear first unlock/quest and Discover/Codex, not blank 0/0 and an unusable Train button |
| Equipped vs selected | Equipped has an explicit badge; viewing another companion must **not silently equip** it |
| Companion same role as character | Equip disabled with “Same role as your character”; Trials team building remains companion-only and follows its own role restrictions |
| Companion on Expedition | Visible Away/status/time, training/Equip disabled with specific explanation; can inspect progression |
| Companion locked in active Trial | Formation locked, correct resume/abandon pathway; no team edit action that falsely implies immediate change |
| Affinity challenge | Optional details explain exact condition and show valid current team status; fight control reflects authoritative requirements |
| No food/Gold/Essence/material | Main cost shows owned/required shortfall and `Find materials`; no false enabled Start/Upgrade |
| Mission rotation while active | Old assignments remain visible, finish/claim normally |
| Monthly Trial reset 1st 00:00 UTC | Clearly reset *seasonal* progress; preserve permanent companion level/Bond as today |
| New/unknown Prestige | Silhouette and authorized discovery copy, never reveal hidden identity through source-based roster defaults |
| Many claimable rewards | Show badge count and direct claim in context, never issue a reward before explicit server-confirmed action |
| No connection or pending claim | Preserve in-flight state, explicit retry, no duplicate reward animation; never fabricate confirmed result |
| Large font/TalkBack/reduced motion | 2-column grid when needed, logical navigation order, role+rarity spoken, static Trial event log and readable buttons |
| Return from source/guide | Restore selected companion and prior navigation; deep link to focused detail rather than silently resetting to default |
| Google Play/Guest state | No companion surface changes to identity or entitlements |

## 6. Visual system

- Keep VELDRYN's pixel-art fantasy identity and runtime rarity borders; do not borrow AFK Journey's specific copyrighted design/assets or gacha visual economy. Its useful transferable pattern is **formation above a conspicuous Battle action**.
- Illustrations must dominate *identity*, not obscure interaction: a **large companion portrait** in detail, small but crisp cards in roster, real enemy/boss art in Trials, modest illustrated facility art. Avoid giant art headers on every tab.
- **Four evenly spaced icon tabs** with readable labels; normal selection via border/background plus text weight; do not require color perception. Keep global app navigation separate.
- Use the existing compact `GameButton`, `CompanionHero` or lighter portrait variant, `CompanionTeamPortraits`, `GameModalSurface`, `CompanionTrialStage`, theme tokens and shared icon resolver; avoid creating a parallel design system.
- Motion: restrained, meaningful XP bar increment, level-up and battle impact. Do not animate dozens of roster cards continuously.
- Layout target: 320dp and up, 200% font setting, light/dark, 4–5 locales in actual UI. Content must be scrollable; sticky CTA always reserves its own height outside scroll.

## 7. Implementation plan (small reviewable PRs; existing architecture preserved)

| Work | Scope | Existing file to inspect/reuse | Acceptance/tests | Size/risk |
| --- | --- | --- | --- | --- |
| **UX-01** · Document + screenshot current baseline | Record 5-tab flows/tap count and native viewport before edits | `CompanionsScreen.tsx`, `CombatCompanionPanel.tsx` | 320/390 width, 200% text, TalkBack; no source mutation | S / low |
| **UX-02** · Extract pure view-model projections | Single owned/status, Trial and Expedition *presentation-only* summaries | `companionView`, `combatCompanionUiModel`, `companionAvailability`, suggested team | Fixtures of owned/unowned, blocked statuses, room to grow | M / low |
| **UX-03** · Roster + focused detail | Four-tab shell and owned grid, companion detail handles Train/Bond/Ascend/Techniques/Quarters | `CombatCompanionPanel.tsx`, `CompanionTrainingV50Panel.tsx`, `CompanionPresentation.tsx` | All original actions and Codex reachable, no training modal chain, save ownership unaffected | M–L / medium |
| **UX-04** · Trials landing + persistent primary action | Current trio, next floor/boss, pinned Start, one team editor, existing replay | `CompanionTower.tsx`, `CompanionTrialStage.tsx`, trialSheet and commands | Valid Trial ≤2 taps from tab; invalid role gets direct guidance; real events and claims unchanged | M–L / medium |
| **UX-05** · Expedition ready-first list and single setup | Combine mission details, suggestions and food into one sheet | `CompanionExpeditionsV50Panel.tsx` and mission validator | Claim from first viewport, no duplicated cost panel, all selection constraints remain | M / medium |
| **UX-06** · Sanctuary compact facility grid | Shared 5 facilities, costs and material source disclosure | `CompanionFacility`, `COMPANION_SANCTUARY_CONFIG`, personal housing UI | All building upgrades work; personal quarters still discoverable | S–M / low |
| **UX-07** · Consolidate/release | Localization, touch, saved navigation, CI and role/device acceptance | `CompanionsScreen.tsx`, existing i18n/catalog/test runners | Full core/app typecheck, hosted commands and on-device tests green | M / medium |

**Refactor tactic:** Do **not** replace the 60KB panel in one PR. First add a container for the new navigation and extract one pure panel at a time, retaining the existing underlying command callbacks. Maintain a **temporary old/new route or component-level feature gate** until each action has acceptance coverage. Do not add new database tables, change companion ownership or duplicate server battle state.

**Draft PR #617 treatment:** Its pure owned-first selection helper and tests are relevant and can be **reused for the new Roster view**; the Training-tab-specific UI should **not be merged into main merely to reintroduce navigation we're proposing to remove**. Review/rebase and extract that isolated helper if approved. Keep #617 draft until choice made; do not silently merge/close.

**Releases:** UX-01/02 can be done alongside stabilization but **A01 failing mobile CI, A02 environment parity and mobile release gates still take precedence**. UX-03 and 04 are highest impact when implementation resumes; remainder can be staged after 1.0 only if current flows are at least playable and reliable.

### Non-goals and deferred ideas

No new companion type, rarity, skill, Trial floor, Expedition mission, queue automation or game currency in this UX pass. No player market, pet redesign, new combat RNG, gacha monetization, full 3D visual world, new backend source of truth or forced formation auto-equip. This is **simpler access to existing depth**, not content expansion.

## 8. Acceptance measurements and design review

- Current baseline **to measure**, not claim: number of taps and vertical swipes to (a) Train an owned companion, (b) Equip, (c) Start a valid Trial, (d) Claim a completed Expedition, (e) Send an Expedition, (f) Upgrade a facility, (g) open Codex unlock.
- Targets: Train ≤2 taps after opening Roster if companion visible; valid Trial ≤2 taps after opening Trials and **no required scroll**; Claim Expedition ≤2 taps after entering Expeditions; Send with suggested team/food ≤3–4 deliberate taps after selecting a mission. Account for confirmations necessary to spend resources.
- Render and record screenshot/video for starter, low-progress, full-roster, active run, all-busy, zero supplies, seasonal rollover, and largest readable typography.
- Test on Android using actual data, not demo-only HTML. Verify visible reading order and pressed/busy feedback, that every old action still exists, and that popups do not reappear on normal navigation.
- Do a post-implementation text audit: *visible top-level overview text*, number of buttons and scroll distance before first primary action. Preserve detailed explanations one tap away. Don't declare “50% simpler” without a baseline.

## 9. Research references

- [IdleMMO developer v0.84 UX direction, 5 October 2026](https://www.galahadcreative.com/blog/idlemmo-v0-84-ui-improvements-forge-lessons-quality-of-life-and-much-more/) — developer says it seeks to feel less like a “menu simulator,” emphasizing visible gameplay and shorter tutorials; planned/announced features, not independently verified production screens.
- [AFK Journey original battle preparation (2024 editorial screenshot)](https://www.mmorpg.com/editorials/afk-journey-impressions-a-new-idle-obsession-on-the-rise-with-a-big-catch-pax-east-2000131010) — older illustration of party portraits before a prominent `Battle` action, not claimed October 2026 UI.
- [IdleMMO pet-management overview (2025)](https://www.galahadcreative.com/blog/idlemmo-a-year-in-review-2025/) — historical grid/progress/action sections, not a copy target.
- See [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md) for broader confirmed/uncertain competitor descriptions, review sample limits and visual design findings.

**Final design principle:** A player should *see their companions, choose an action and play* immediately. Explanations and mastery depth remain accessible without getting in the way. This document contains no implementation and authorizes no merge or deployment.
