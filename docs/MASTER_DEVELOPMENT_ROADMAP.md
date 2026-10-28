# VELDRYN — MASTER DEVELOPMENT ROADMAP

**Status:** Canonical forward-looking development plan; **planning only, no application implementation**.  
**Created:** 28 October 2026, Europe/Amsterdam.  
**Current main at planning start:** [`822e5397eb5758dd04828072a1ffed8e25e7b109`](https://github.com/elroynbenjamins/Veldryn/commit/822e5397eb5758dd04828072a1ffed8e25e7b109) (research-document update only).  
**Most recent application-code baseline actually audited:** [`eb70bb3321964c824d4e4307c413bb8971745666`](https://github.com/elroynbenjamins/Veldryn/commit/eb70bb3321964c824d4e4307c413bb8971745666); later known commits up to this planning start alter documentation, not app code. **Recheck this assumption on every future session.**  
**Application:** Expo SDK 57 / React Native / TypeScript Android-first UI-heavy pixel-art idle MMORPG; Supabase Auth/Postgres/RPC/Edge Functions, Google Play commerce.  
**Audience/strategy:** Short-session and AFK players who enjoy RuneScape-style professions, character equipment, collecting, guilds, persistent parties, and real co-op without full-time manual movement. Mobile Android 1.0 first; international English-first release surfaces, locale-aware UI.

## 0. Operating contract for future implementation agents

1. **First read [CODEBASE_INVENTORY.md](CODEBASE_INVENTORY.md) and [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md).** Those are evidence snapshots, not promises that every feature was device tested. Verify today's `main` SHA, changes since the code baseline, GitHub Actions and hosted target before starting any ticket.
2. **Status vocabulary:** `VERIFIED` = evidence from current source *and* relevant executed test/deployment/device proof; `SOURCE-PRESENT` = implementation visible but not fully exercised; `PARTIAL` = known journey incomplete/uncertified; `BROKEN` = reproduced failing invariant; `DEFERRED` = deliberately not in 1.0; `SUPERSEDED` = historical recommendation replaced by newer evidence. An older document's “done” means done at *its SHA*, not necessarily at today's head.
3. **This roadmap is not a bug diagnosis or permission to modify production.** Check whether a reported gap still reproduces before changing code. Apply small, reversible PRs with relevant tests, known migrations, rollout gate, rollback and a changelog for affected player behavior. No blanket rework.
4. Preserve **server-authoritative outcomes** for XP, loot, guild/party rights, dungeon/companion battles, event entitlements, currency, billing and claims; immutable command request IDs, replay-safe receipts, account isolation, per-session validation, and a no-client-trust boundary. Replay visuals must never invent or change damage/rewards.
5. Preserve **player Market removal** (NPC selling, Event and Guild Shops remain); no paid currency, no gacha power, no mandatory PvP, no required GPS or 3D world. Co-op Live composition stays **one Tank, two Damage, one Support**, with 4-player party boundaries; no duplicate DPS when the restriction applies. Do not remove Guest login.
6. **Monetization precision:** current VIP/VIP+/Supporter actually grant convenience and some rate/drop bonuses; they are *not purely cosmetic*. Preserve existing entitlements unless a separately approved commercial-policy change is made; do not market the live app with a false “100% cosmetics only” claim. Future offers must avoid pay-to-win competitive advantages. Play Console controls regional prices.
7. **AFK cap conflict:** latest README and Oct21 release-hardening document say **8h initial, 24h free progression, 30h current hard maximum**, but older V40–V51 reconciliation says **24h base / 36h maximum**. Treat README/active constants/tests as provisional higher priority than old branch documents, and verify actual server, account entitlement and UI arithmetic before modifying any cap; do not accidentally substitute historical numbers.
8. **Navigation conflict:** older V52 reconciliation names five tabs, but actual `apps/mobile/App.tsx` defines six `Home / Character / Skills / World / Inventory / More`. Preserve the current working route until a separately reviewed navigation proposal is implemented. Legacy `Account` references are historical terminology, not evidence Home should be removed.
9. **Release gates:** `EVENTS_RELEASED=true` with date/authority gates; `ARENA_RELEASED=false`, `RANKINGS_RELEASED=false`. Exclude unreleased modules from marketing and mandatory 1.0 scope. Physical Android AAB QA and Google Play update eligibility are required; source/tests alone do not certify a release.
10. **Source precedence:** current active code + versioned migrations + deployed API grants → executed CI/hosted evidence → newer scoped status docs → archived branch/old workbook/ZIP. Never drop migrations or rewrite production history to make docs agree.

## 1. Reconciled present reality (28 October 2026)

| System | Verified/current evidence | Status and next decision |
| --- | --- | --- |
| App architecture | `apps/mobile/App.tsx` (~699 lines); `src/core`, `src/online`; 34 mobile screen files; Expo/React Native; Supabase clients | **SOURCE-PRESENT**; reduce coupling only after app-stability measurements; not a rewrite |
| Solo/AFK gameplay | Combat, professions, mastery, tools, equipment, queues, crafting, inventory/bank/overflow, character roster; multiple tests | **SOURCE-PRESENT**; system exists; certify exact offline caps, queue handoffs, split stacks and materials |
| Online authority | Supabase gameplay Edge v37, co-op v18 on production; protected transactions/receipts documented | **SOURCE-PRESENT / hosted-deployed**; independently prove claim replay, account separation and real-device behavior |
| Co-op | Live matchmaking/ready/vote/chat and offline QMode with Echo/NPC fallback, recovery, claims | **PARTIAL acceptance**, not an absent feature: hosted functionality present, 2–4-device QA unresolved |
| Companions | Collection/Training/Sanctuary/Trials/Expeditions, 30-floor monthly Trials, technique/bond, actual `CompanionTrialStage` event playback | **SOURCE-PRESENT**; top-level flow and owned-first roster need UX; no replacement battle engine |
| Guilds/social/chat | Guild Hall and board, live parties, recruitment, World/Guild/Party messages, 25-message recent window, cached feed/Realtime | **SOURCE-PRESENT**; Oct26 guild UI fixes exist; verify native keyboard/read cursor and channel auth under 2 users |
| Events | Event calendar, event-track (Veilbreak 20,000 milestone), candies, shops, date-gated startup art | **SOURCE-PRESENT**; end-to-end date, reward and claim QA; avoid unconditional event splash |
| Inventory/gear art | 10 slots, tier sets, item sources, icons/art resolver, equipment/gems, bulk actions | **SOURCE-PRESENT**; verify actual missing art and rarity clipping per active catalog before drawing replacements |
| Account/billing | Guest/email/Google auth, Play Games integration, verified billing model, VIP/VIP+/Supporter offers | **SOURCE-PRESENT**; external Play Console provisioning, test purchase/restore/refund/update still gates |
| Release controls | Current event on; Arena and Rankings disabled | **VERIFIED flags**; don't re-enable for 1.0 because UI scaffolding exists |
| CI on application baseline | [mobile core run #40591520567](https://github.com/elroynbenjamins/Veldryn/actions/runs/40591520567) **FAILED** starter companion TS contract (11 errors); [economy run #40591520391](https://github.com/elroynbenjamins/Veldryn/actions/runs/40591520391) **PASSED** | **BROKEN mobile gate**; subsequent mobile tests were skipped; economy pass does not cure it |
| Database release | Production 277 migrations, staging 186; active gameplay and co-op Edge versions differ; 10 migration identity mismatches despite 277 repo files vs prod records | **HIGH-RISK parity gap**, not proof of production corruption; reconcile with forward-only ledger |
| Supabase security/perf | 130 unindexed FK advisories, 117 RLS initplan, 132 authenticated-executable SECURITY DEFINER, 275/276 public tables RLS-on | **REVIEW QUEUE**, not proven exploit. One RLS-off public table had no anon/auth SELECT grant during read-only audit |
| Device performance | Browser and isolated layout test evidence; `docs/NETWORK_REQUEST_QA_BASELINE.md` explicitly **Not measured** for Android | **UNVERIFIED** on-device; no numeric before/after performance claim |
| Documentation/history | Root `MVP_SCOPE.md` and `PROTOTYPE_ROADMAP.md` describe a much smaller earlier offline slice. `V40_V51_RECONCILIATION.md` predates current six-tab UI | **HISTORICAL**; keep archives, mark superseded in this plan |

### 1.1 Earlier findings reconciled; do not blindly reimplement them

- **17 Oct T9 “unreachable level 110/104” is superseded as a code value:** current `src/content/equipment-recipes-v33.ts` sets T9 character/craft floors to **100/97**, while `src/core/progression.ts` caps levels at 100. **Still needed:** automated end-to-end reachable recipe / ingredient dependency tests; don't reintroduce the old values or claim all T9 equipment is now craftable without executing them.
- **17 Oct event-popup “no scroll” is superseded in current code:** `EventStartPopup.tsx` now renders a `ScrollView` and generic “Open {event}” action. **Still needed:** keyboard/large-font/short viewport and once-per-event QA; do not revert to fixed 94%-height modal.
- **22 Oct action queue bugs about reached goals and wrong-region requests were addressed** in `QUEUE_RELIABILITY_AUDIT_2026_10_22.md`, with new checks in direct and online paths. Confirm test results on today's source, then focus on actual late-claim handoff and resource timing; don't clone a second queue.
- **19 Oct online button loading pass exists** in `docs/implementation/online-loading-feedback-2026-10-19.md`; don't add another generic busy overlay. Check individual remaining anomalies and asynchronous lifetime.
- **26 Oct Guild layout and role gating were implemented** in `docs/implementation/guild-screen-review-2026-10-26.md`, not just concept art. Native Samsung keyboard/real-client acceptance is still open.
- **GuildChat missing ChatViewport claim is disproved at the audited SHA:** `src/components/ChatViewport.tsx` exists. Chat reliability remains a QA task, not a missing-import repair.
- **Old Expo Doctor blocker in Oct22 queue notes was cleared on Oct27 baseline CI**, which reached mobile TypeScript. The current verified blocker is the **starter-companion compile/test interface**, not the older expo mismatch. Re-run Expo Doctor each release because package versions change.
- **Legacy separate Market, archive companion schema v13 and old offline-only milestone** should not be revived. The current companion state remains integrated into account/character ownership and current Supabase authority.
- **Performance refinements already committed** (chat refresh cache, profile asset handling, menu/busy feedback, downscaled sprites) are **not** considered accomplished at the user-experience level until measured on a release device.
- **Old `docs/implementation/TESTING_READINESS.md` Sep24 reports** party-credit SQL and fresh-chain bootstrap problems. Newer hosted integration claims success in narrower suites; retain a **fresh-full-chain and concurrency certification task**, not a categorical claim that every old SQL bug is still present.

## 2. Mature-product quality assessment

| Dimension | Assessment based on evidence, not a fabricated rating | 1.0 quality gate |
| --- | --- | --- |
| Functional completeness | Strong breadth, many authored systems; some journeys lack physical-device and multi-account proof | Contract/smoke fixtures for every advertised core loop |
| UX | Compact navigation exists; companion/trial and planner actions still demand too much screen navigation | Main actions visible without scrolling through informational sections |
| Visuals | Substantial pixel-art catalog and event art; equipment catalog may have unresolved placeholder coverage, combat spectacle inconsistent | Art inventory by active ID, no cropped/missing/low-resolution critical icons |
| Performance | Several optimizations present, **no measured Android before/after** | Startup, navigation, guild/chat, bank, profile and reward baseline against agreed thresholds |
| Reliability | One known failing mobile typecheck; recovery/idempotency mechanisms present but device proof incomplete | All mandatory CI + destructive/replay/AFK/device tests pass |
| Security | Server-first design; substantial function privilege/advisor surface needs triage | No unauthorized cross-account claims, function grants verified; no critical/unknown security blockers |
| Scale | Supabase and cached feeds support current concept; high DB object count and index advisories | Query plans and concurrent live-party/chat soak measured at modest representative load |
| Accessibility | Tokens, some labels and reduced motion present; narrow/large-text native check unfinished | Screen reader, scaling, touch targets and motion alternatives validated |
| Onboarding | Guest-first, character naming and basic guided play present | New account can reach meaningful first reward and understand unlocks |
| Retention | Guilds, companions, weekly goals and events are authored | Explain next actionable goal without coercive daily chores |
| Competition | Systems rival Idle Clans/IdleMMO, with distinctive server-co-op and pixel identity | Smooth queued progression + real battle feedback, not feature-count race |
| Maintainability/tests | Large test footprint and release workflows; monolithic orchestration, generated Edge bundles, historical exports | Canonical source/CI/test manifest, safe migration plan and focused regression tests |

### 2.1 Baseline scoring and release decision

Each ticket is scored on **Impact (I), Frequency (F), Reliability/security (R), Competitive relevance (C), Confidence of evidence (Q), Effort (E), Regression risk (G)**, each **1–5** (5 = greatest; effort/risk are penalties). **Weighted planning score = `3I + 2F + 3R + C + Q − 2E − G`**. A score is a **relative prioritization aid**, not a user research statistic or software-estimation promise. **P0** always overrides score when a security/data-integrity/build/release gate is violated. Scores are revisited after reproductions and scope reduction. See Section 9 scorecard.

**Effort tags:** S = isolated surface/limited tests; M = focused multi-file change with regression suites; L = cross-client/server/data or substantial UI/art; XL = new platform/system. No calendar dates are implied. **Confidence:** H = current code/CI/hosted evidence, M = historical or sampled evidence plus source, L = proposal needing tests.

## 3. Implementation discipline and acceptance contract

**Every ticket below has an ID, objective, current behavior, target, user harm, entrypoint/code references, minimal implementation direction, dependencies, objective acceptance, required test evidence, regression watch and size/priority.** `apps/mobile/` and `backend/` paths are relative to repo root. Missing exact filenames in hypothetical future subsystems must be discovered by source search rather than guessed. No ticket is “complete” solely because a branch builds.

**PR closure packet for every ticket:** base SHA/new SHA; before behavior or failing repro; affected commands/tables/releases; deterministic test list + results; Android screenshot/video if UI, or RPC/transaction log if backend; migration/RLS outcome; AAB/backend version if deployed; rollback path; acceptance checklist. Do not edit tests to hide a failing real behavior; fix stale test assertions only with a documented changed contract.

**Source vs planned:** Tickets below describe **future desired changes**; status remains `PLANNED` until evidence is attached. A task may close as “already implemented and verified” with citations and no code delta.

---

# Phase A — Critical stabilization

**Objective:** no broken gates, no reward/entitlement loss or privilege ambiguity, and reproducible Android distribution before additional large features. All A tickets are **Required before 1.0** unless an explicit closure investigation proves inapplicable.

### A01 · Restore green mobile contract / CI (**P0 · S–M · H**)
- **Objective:** eliminate the proven failing TypeScript core gate before unrelated gameplay changes.
- **Current:** Oct27 mobile validation run #40591520567 reports 11 errors in `apps/mobile/tests/starter-companion-choice.ts` due missing `chooseStarterCombatCompanion`, `starterCombatCompanionChoicePending`, `starterCombatCompanionChoices` exports from `src/core/combat-companions.ts`, missing starter companion state fields and implicit-any parameters.
- **Desired:** a documented single starter-companion choice contract shared by actual UI/state/tests; no invented migration of real characters.
- **User:** current source may fail shipping build; choice/ownership could be inconsistent.
- **Code:** those files, `src/core/types.ts`, character creation/recovery route and online command validators.
- **Approach:** decide from active gameplay whether the test refers to a removed feature or source regression; restore correct typed contract or update stale test plus migration reasoning; validate default/legacy saves and onboarding.
- **Dependencies:** pin base SHA; record intended starter policy and active behavior first.
- **Acceptance:** both core/full mobile TS green and starter selection/restore behaves as documented.
- **Tests:** `pnpm run typecheck:core`, `pnpm run typecheck`, starter-companion/onboarding/online save tests, full CI.
- **Regression watch:** new guests, existing accounts, equipped role restrictions, account roster, legacy-save migrations.

### A02 · Reconcile staging/prod schema and migration ledger (**P0 · L · H**)
- **Objective:** safely restore a reproducible production-equivalent test target.
- **Current:** 277 applied prod vs 186 staging migrations, 10 filename/version identity mismatches, production gameplay/coop v37/v18 vs staging v2/v11; no equivalent billing functions listed staging.
- **Desired:** signed environment matrix of Git migration identities, applied versions, function deployment SHAs, grants, secrets/config presence and migration order; disposable fresh-chain environment green; isolated staging aligned through reviewed forward-only deploy.
- **User:** staging results do not protect purchases, progress and co-op production.
- **Code:** `backend/supabase/migrations/`, `backend/supabase/functions/`, `backend/online/`, `docs/implementation/ONLINE_STAGING_RELEASE_CHECKLIST.md`.
- **Approach:** first export read-only hashes/version mappings and dependency order; reconcile remote-history names without destructive resets; apply in controlled staging with transaction tests; use explicit change window and rollback for production. Never copy prod user data casually.
- **Dependencies:** backend maintainer review, fresh isolated project, service-role access restricted; **not** A01 completion.
- **Acceptance:** a fresh test chain and staging run produce documented equivalent expected objects/grants; all 10 mismatches explained; no production data reset.
- **Tests:** `supabase db lint`, migration-version checks, all relevant 24 SQL suites, schema diff, co-op/billing/guest smoke, clean rollback simulation.
- **Regression watch:** historical migration identifiers, RLS, monetary receipts, service functions, foreign keys, legacy players.

### A03 · Security and authorization audit of deployed RPCs (**P0 review · L · H**)
- **Objective:** prove no access to cross-account/private/privileged state; fix confirmed violations, not raw advisory counts.
- **Current:** 132 authenticated-executable SECURITY DEFINER warnings, two multiple-permissive-policy chat alerts and several anon-related warnings; 275/276 public tables RLS-enabled, the one exception lacked anon/auth SELECT grant in audited database.
- **Desired:** audited threat model for every external command and service boundary, versioned allowlist/denied roles, no leaked tokens/hidden Echo outcomes.
- **User:** compromised progress, player privacy or shop economy.
- **Code:** `backend/supabase/migrations/`, `backend/supabase/tests/`, `backend/online/edge.ts`, `coop-edge.ts`, billing functions, chat RLS.
- **Approach:** enumerate effective EXECUTE/USAGE/SELECT grants for anon/auth/service role and definer search_path; test ownership/membership/deleted-account access. Classify accepted advisories vs verified exposure individually. Patch grants via additive migration only.
- **Dependencies:** A02 environment/prod version ledger.
- **Acceptance:** zero known unauthorized privilege path in covered commands; review register with owner and evidence for each flagged function/policy class; any real critical defect blocks 1.0.
- **Tests:** SQL impersonated-role denied/allowed fixtures, hostile request payloads, role changes, multi-tenant read/write denial, statement-timeout checks.
- **Regression watch:** Guest/anon login, legitimate guild chat/reward reads, billing service handlers, co-op queue workers.

### A04 · Atomic rewards, retry and economy integrity (**P0 · L · H/M**)
- **Objective:** no duplicate/lost claims across offline wakeups, reconnections and rapidly repeated taps.
- **Current:** idempotency tokens and pending-command replay are implemented; Oct21 release helper hardening passed selected economy suites, not full production transaction races.
- **Desired:** authoritative monotonic settlement and exactly-once *entitlements* under duplicate/reordered requests, with safe errors and pending recovery.
- **User:** lost event/skill progress, unearned currency, duplicate premium items.
- **Code:** `src/online/gameplay.ts`, `src/core/online-game-repository.ts`, `src/core/game.ts`, `backend/online/edge.ts`, SQL gameplay/commerce receipt functions.
- **Approach:** create concurrent same/different request-ID and payload mismatch matrix for activity claim, crafting, dungeon, companion, event, guild shop, redemption and billing; enforce receipt-before-public-projection and account-scoped commits.
- **Dependencies:** A02, A03; no direct prod mutation outside approved test accounts.
- **Acceptance:** duplicate request returns same stable receipt/outcome; conflicting payload rejected; single entitlement ledger transition; no hangs after network uncertainty.
- **Tests:** SQL concurrent transactions, backend authority tests, mobile pending-queue mocks, authenticated two-device retry and reconnect flows.
- **Regression watch:** refunds, consumable reservation, overflow refunds, event cap, co-op ready deadline and monthly UTC reset.

### A05 · Signed AAB, native identity and Play upgrade certification (**P0 · M–L · H**)
- **Objective:** ship a valid upgradeable Play artifact on supported Android devices.
- **Current:** code documents SDK57/Google Sign-In/Play Games/billing; previous Play Console releases encountered versionCode and supported-device downgrade failures; no complete current device sign-off.
- **Desired:** release manifest with native package `com.elroybenjamins.veldryn`, monotonic versionCode, tested signing lineage, update from last public AAB and measured device retention.
- **User:** installation failure, inability to update, broken login and purchases.
- **Code:** `apps/mobile/app.json`, `app.config.*` if present, `android/app/build.gradle`, `eas.json`, `package.json`, `.easignore`, `README.md`.
- **Approach:** read effective native versionCode/package/signing rather than app.json alone when native Android exists; compile production AAB, compare Play device set/manifest, install old→new on real test device, exercise recovery and store metadata.
- **Dependencies:** A01, A02; actual Play Console credentials/test tracks and owners.
- **Acceptance:** EAS production artifact accepted by internal test, old users upgrade, login linking works, supported-device loss explained and approved.
- **Tests:** Expo Doctor, Gradle/EAS checks, Play internal test install/upgrades, Android API/density matrix, fresh and previous-version DB states.
- **Regression watch:** app data ownership, notification config, deep links, SDK requirements, Google verification/package signing fingerprints.

### A06 · Freeze an honest 1.0 launch-content and entitlement manifest (**P0 · M · H**)
- **Objective:** marketing, feature gates, UI and deployment describe the same shipped game.
- **Current:** Arena/Rankings authored but off; event runtime flag on with date gates, V52 nav/hours docs conflict; VIP tiers contain speed/drop benefits despite “cosmetics-only” aspirations.
- **Desired:** one per-build `release-manifest` document/check describing enabled screens, cap, tier reachability, trial/dungeon event windows, store benefits, missing art, level locks, languages and API versions.
- **User:** false promises, inaccessible features, currency policy confusion.
- **Code:** `src/core/release-flags.ts`, `src/core/feature-unlocks.ts`, `README.md`, `docs/implementation/GOOGLE_PLAY_BILLING_V1.md`, Play description and event catalog.
- **Approach:** compare authoritative code/constants vs documented claims and hosted entitlements; maintain explicit deferrals; add checked release-data assertions for flags, durations, product IDs, season/time windows.
- **Dependencies:** A02 for server state, B07 for end-to-end reward scope.
- **Acceptance:** no unshipped Arena/Rankings entry advertised; VIP copy exactly matches active bonuses; actual 8/24/30h (or revised verified) matches everywhere; 1.0 named content listed accurately.
- **Tests:** release-manifest schema assertions, Play products cross-check, all launch content reachability, localizations, event timezone gates.
- **Regression watch:** event blackout dates, VIP stacking, calendar rollovers, build profile env switches.

### A07 · Verify queue handoff, idle caps and crafting resource invariants (**P0 · M–L · M**)
- **Objective:** prove returning late never discards eligible time or spends more than actual resources.
- **Current:** Oct17 reproduced timed Alchemy handoff losing nine of ten elapsed minutes, but Oct22 documentation reports follow-up queue hardening. Current bug status **requires fresh reproduction**; reached-goal and region checks already implemented.
- **Desired:** settle finite activity at its real completion boundary, advance next eligible queue work using remaining single capped elapsed window; never count the same time or ingredients twice.
- **User:** idle progress seems unfair; cooking/fishing/smelting stacks or production quantities appear wrong.
- **Code:** `src/core/game.ts`, `src/core/activity-queue.ts`, `src/core/alchemy.ts`, `src/core/processing.ts`, `src/components/ActionQueuePanel.tsx`, server command validators.
- **Approach:** first run exact late-claim reproducer for both local and online; if fixed close as verified. Otherwise correct settlement boundary and reservation accounting without widening queue to Cooking/Forge. Test bank + inventory + overflow scope against actual accessible-resource policy.
- **Dependencies:** A01, A04; verified AFK cap policy A06.
- **Acceptance:** 1-minute reservation followed by 9 minutes gathering credits within one valid cap; no double credit after repeated claim; blocked entry explains why.
- **Tests:** fake-clock late returns, partial stacks 6+full+full, goal already surpassed, right/wrong region, network retry, cap boundary, multiple finite handoffs.
- **Regression watch:** food/combat recovery, reserve refunds, no-auto-travel/no-silent-interruption policy, multi-character switching.

### A08 · Establish release smoke matrix and rollback readiness (**P0 · M · H**)
- **Objective:** stop “passes one subset” from being treated as release readiness.
- **Current:** 10 workflows, hundreds of tests, but latest mobile full checks skipped after first TS failure; device and traffic baselines absent.
- **Desired:** pinned SHA+Edge+schema+AAB evidence, pass/fail owner for every critical journey, reproducible setup and known recovery procedure.
- **User:** regressions after updates, lost “good” build state.
- **Code:** `.github/workflows/`, `apps/mobile/package.json`, `backend/package.json`, `docs/implementation/`, `docs/NETWORK_REQUEST_QA_BASELINE.md`.
- **Approach:** create release-verification checklist/coverage ledger (not duplicate runner), ensure mobile full TS, Expo Doctor, backend release economy, SQL/chat/QMode, Play and Android regression are required or explicitly waived with evidence.
- **Dependencies:** A01/A02/A03/A04/A05.
- **Acceptance:** published build points to a single immutable manifest showing green gates or approved justified exclusion, with rollback procedure and prior AAB ID.
- **Tests:** dry-run the checklist on a candidate, deliberate “broken contract” CI gate check, upgrade/rollback via test tracks, migration rollback simulation in staging.
- **Regression watch:** slow CI, flaky unrelated tests, artifact retention, Play staged rollouts and migrations that cannot simply reverse.

---

# Phase B — Complete the core journeys

**Objective:** finish what players already see. B01–B10 are planned **1.0 completion or acceptance** items. No new companion schema, guild game, battle engine or player Market is proposed.

### B01 · Make Companion Trials a one-screen, two-tap start (**P1 · M · H**)
- **Objective:** remove the Challenges & Rewards → formation → scroll-to-fight journey.
- **Current:** `CombatCompanionPanel` has Trials, challenge/boss/team sheets and `CompanionTrialStage`; a battle can already render but main action hierarchy is cumbersome.
- **Desired:** “Current formation” and primary Start/Resume Trial pinned near top, followed by challenge/reward/season detail below.
- **User:** players think the battle is server-only or cannot find Start.
- **Code:** `src/components/CombatCompanionPanel.tsx`, `CompanionTrialStage.tsx`, companion commands and trials projections.
- **Approach:** reuse existing team editing and stage; route first-time empty team into formation sheet and return to Start; show blocking role/availability reasons inline.
- **Dependencies:** A01, B02 stage truth; no new server combat system.
- **Acceptance:** valid player starts from Trials in ≤2 taps without scrolling; invalid team receives direct actionable explanation; Resume persists after relaunch.
- **Tests:** role restrictions, occupied companions, re-entry, month reset, 320px/large-text, online replay, component interaction.
- **Regression watch:** accidental battle start, changed teams mid-run, recovery timers and mission assignment.

### B02 · Complete event-accurate Companion Trial hit/heal visuals (**P1 · M · H**)
- **Objective:** give every meaningful hit, shield, miss, crit, heal and victory readable feedback.
- **Current:** `CompanionTrialStage.tsx` already renders units/HP/arena/combat feed and time-based authoritative event playback.
- **Desired:** clear own-side/enemy-side silhouettes, incoming/outgoing numbers/status effects, 1×/2×/Skip and reduce-motion with stable reward display.
- **User:** without feedback, fights feel like an invisible calculation.
- **Code:** `src/components/CompanionTrialStage.tsx`, companion replay/presentation modules, server trial events and shared art resolver.
- **Approach:** improve rendering of existing ordered immutable events, never invent damage or RNG; add fallback icons for absent VFX, cap animations for long fights.
- **Dependencies:** A04 reward safety, event payload audit; B01 entry integration.
- **Acceptance:** event count/totals/HP and final rewards exactly match server projection at all playback speeds; skip cannot bypass claim rules.
- **Tests:** fixed battle fixtures, damage/heal/shield/reflection, death/revive, huge event count, reduced motion, foreground/background restart.
- **Regression watch:** battery/drain, timer drift, duplicate reward banners, screen readers.

### B03 · Companion Training: owned-first roster with role and rarity filters (**P1 · S–M · H**)
- **Objective:** shorten daily upgrade workflows.
- **Current:** `CompanionTrainingV50Panel.tsx` roster maps codex-known `COMBAT_COMPANIONS`; it is not owned-first and has no verified role/rarity filter there.
- **Desired:** Owned first (Equipped → Favorites → Available), Discover separate; role and rarity chips, visible clear filters and ownership badges.
- **User:** searching a growing collection and accidentally choosing an unowned unit wastes taps.
- **Code:** `src/components/CompanionTrainingV50Panel.tsx`, `CombatCompanionPanel.tsx`, companion rarity/ownership presenter.
- **Approach:** deterministic derived filtered list from current authoritative view, no duplicate saved owned data; preserve selection after leveling.
- **Dependencies:** none beyond A01 typed state.
- **Acceptance:** all owned listed first by default; empty filter explains why; switching preserves previous progress/selection.
- **Tests:** all rarity/role combinations, 0/1/24 owned, favorites, locked codex entries, theme/translation snapshots.
- **Regression watch:** spoiler unlock flags, unstable list keys, avatar asset fallback.

### B04 · Certify World/Guild/Party chat and its 25-message cache (**P0 acceptance · M · H/M**)
- **Objective:** make chat dependable instead of re-creating the view on every channel change.
- **Current:** `GuildChat.tsx`, existing `ChatViewport.tsx`, `src/online/useChatFeed.ts` shared cache with Realtime, fallback polling and read cursors; Oct26 dropdown/keyboard changes.
- **Desired:** same 25 recent server messages across reconnect/channel change, correct newest ordering, unread state and no messages lost/duplicated on rapid sends.
- **User:** conversations vanish, send button seems broken, chat keyboard obscures text.
- **Code:** `src/components/GuildChat.tsx`, `ChatViewport.tsx`, `src/online/useChatFeed.ts`, chat SQL/RPC and `docs/implementation/guild-screen-review-2026-10-26.md`.
- **Approach:** two-account/two-client matrix under World/Guild/Party membership switches; compare cache revision and server cursor; preserve draft per channel and verify account isolation.
- **Dependencies:** A02/A03; genuine Android keyboard.
- **Acceptance:** exact last 25 accessible, no cross-guild history bleed, retries don't double-post, channel switching doesn't pop unwanted reward UI.
- **Tests:** SQL RLS membership, 25/26/50-message paging, online/offline recovery, slow Android keyboard/hitbox tests, emoji/emote cap.
- **Regression watch:** realtime vs fallback duplicate reads, viewport scroll restoration, moderator blocks and draft leakage.

### B05 · Prove end-to-end Live and Q-Mode on real accounts (**P0 acceptance · L · M/H**)
- **Objective:** make deployed co-op a reliably playable 1.0 feature.
- **Current:** production coop Edge v18, matchmaking/ready/roster/votes/live combat, offline QMode, NPC fallback/Echo share and claims have hosted/source support; physical-device proof remains open.
- **Desired:** exact four-role Live group starts/finishes/claims under real membership, two-client reconnect, abandoned ready slot, QMode without Echo and with consenting shared Echo.
- **User:** long queue and unrecoverable run or hidden rewards undermine multiplayer trust.
- **Code:** `src/screens/CoopExpeditionScreen.tsx`, `src/components/coop/*`, `src/online/coop-client.ts`, `src/core/coop-qmode.ts`, `backend/online/coop-edge.ts`.
- **Approach:** scripted multi-account hosted test plus native run; capture revisions and deterministic run IDs, explicit “AI substitution” player messaging, no disclosure of private Echo owner state.
- **Dependencies:** A02/A03/A04/A05 and testers.
- **Acceptance:** correct 1T/2D/1S ready roles, safe recovery, unique reward receipt per account, resumed route voted identically; QMode can start through intended NPC fallback when needed.
- **Tests:** hosted SQL concurrency, 2–4 device integration, ready deadline, party invite/chat link, reconnect mid-vote, event gates, privacy/role spoof tests.
- **Regression watch:** party persistence vs temporary roster, realtime subscriptions, server deadlines and gold/material reward multiplication.

### B06 · Inventory/Bank/Crafting quantity, protection and bulk acceptance (**P0 acceptance · M–L · H/M**)
- **Objective:** never miscount stacks or silently destroy valuable owned equipment.
- **Current:** bank/sell/withdraw, overflow, bulk actions and crafted-equipment ranks exist; historical player reported 6 Silverfin fish plus two full stacks but UI displayed few materials.
- **Desired:** consistent accessible source counts; explicit recipe execution batch maximum; safe optional lowest-quality auto-sell for mass crafting beyond per-item cap, preserving favorites/protected.
- **User:** resource shortfall and accidental gear loss.
- **Code:** `src/screens/InventoryScreen.tsx`, `src/core/game.ts`, `src/core/inventory-view.ts`, equipment instance/bulk validators and backend gameplay commands.
- **Approach:** distinguish stack count vs quantity, accessible Inventory/Bank/Overflow and reserved quantities; preview all destructive outcomes and revalidate atomically server-side; respect the approved “7 equipment types” limit only after checking actual current policy.
- **Dependencies:** A04/A07; agree on item protection/autosell semantics.
- **Acceptance:** two full stacks + six cook correct feasible batches; no protected gear removed; bulk operation inventory sum and gold exactly match receipts.
- **Tests:** split/full stacks, simultaneous cooking and crafting, insufficient fuel, bank/overflow scopes, mass craft 7-type threshold, duplicate command, cancel/error UI.
- **Regression watch:** item instance IDs, account bank shared across characters, rarity tie-break sorting, overflow refunds.

### B07 · Certify event lifecycle, Veilbreak rewards and time gates (**P0 acceptance · M–L · H/M**)
- **Objective:** all visible event milestones and shops claim correctly when active and disappear when not.
- **Current:** events released flag, Veilbreak 20,000 milestone and 3 companions (2 milestone, 1 shop) documented; event startup artwork date-gated, event calendars/reward UI and candies present.
- **Desired:** versioned event manifest with real UTC boundaries, preview/grace/expiry, complete 20,000 track, valid shop currency and first-time/return player behavior.
- **User:** missed reward, shop spending on wrong item, off-season splash.
- **Code:** `src/components/EventStartPopup.tsx`, `EventAdditionalRewards.tsx`, `EventCandyPanel.tsx`, `src/core/live-events.ts`, event content, SQL event claims.
- **Approach:** simulate before/during/after each event at server clock; verify account-bound event currencies/claim-once receipts, milestones and the special companion sources. New content from design workbook must match canonical IDs.
- **Dependencies:** A02/A04/A06; final art mapping.
- **Acceptance:** wrong date never shows Veilbreak start screen; during event all 20,000 milestone rewards and three designed companion sources work exactly once; expired states explain next steps.
- **Tests:** frozen UTC clock transitions, time-zone display, claim collision, duplicate milestone receipt, restarted app, event reward exceptions and short modal geometry.
- **Regression watch:** month/season rollover, cross-character event progression, repeatable post-cap track and launch marketing.

### B08 · Guest, recovery, Google, Play Games, commerce end-to-end (**P0 acceptance · L · H/M**)
- **Objective:** guarantee account continuity and paid entitlement truth.
- **Current:** Guest-first, email verification, password recovery, Google native linking, Play Games and server-verified billing authored; read-only purchase entitlements and RTDN deployed on production.
- **Desired:** no orphaned guests; clear verify-email/open-mail UX; password visibility toggle; identity binding never creates new account accidentally; validated VIP/VIP+/Supporter purchases and restorations.
- **User:** lost character, failed verification, paid product inaccessible.
- **Code:** `src/online/` auth clients and account screens, `src/screens/SettingsScreen.tsx`, Play Billing handlers, `docs/implementation/GOOGLE_PLAY_BILLING_V1.md`.
- **Approach:** test real Play Console license test users and linked Google service configs; verify account ID/version before applying late auth or billing responses; add targeted inline error states where needed.
- **Dependencies:** A02/A03/A04/A05; Play and Google Cloud provisioning.
- **Acceptance:** Guest→verified and Guest→Google preserve exact character/owned balances; restore after reinstall works; refund/revoke removes only the affected product; Play Games failure doesn't block normal game login.
- **Tests:** cold/warm link, failed email, invalid recovery link, account switch mid-flight, purchase pending/refunded/renewal/cancel, Play PubSub RTDN auth, upgrade old AAB.
- **Regression watch:** account merging, Google app signing IDs, accidental subscriptions, stale cached paid flags.

### B09 · New-character, early-game and quest-to-unlock certification (**P1 · M · M/H**)
- **Objective:** player reaches meaningful activity/reward without a confusing first session.
- **Current:** class/sex choice, required typed name, guest flow, starter weapon, first crafted armor, quest/progression unlocks and tutorials exist.
- **Desired:** straightforward first 10-minute arc: name → skill → claim → craft/equip → unlock feedback; guide appears on relevant tab only and can be dismissed/reopened.
- **User:** first-time players cannot tell where progress happens; reward popups interrupt basic navigation.
- **Code:** `src/screens/HomeScreen.tsx`, `CharacterScreen.tsx`, `src/core/feature-unlocks.ts`, onboarding/tutorial modules, `src/core/navigation-notifications.ts`.
- **Approach:** scripted first-run tree across all nine classes, guest/recoverable, low-level event accessible without early mandatory dialogs; ensure no “Adventurer” placeholder or unwanted name suggestions.
- **Dependencies:** A01/B07/B08; current story/content availability.
- **Acceptance:** onboarding works with no prior save and reaches first craft/reward without dead end; optional tutorials and no out-of-season announcement.
- **Tests:** fresh character, no internet/online gates, all classes, canceled login, small phone, TalkBack, large text, name validation and 5-character slot unlock boundaries.
- **Regression watch:** legacy saves, class role restrictions, account-level XP, event unlock level and paid-product visibility.

### B10 · Release content reachability, balance and asset truth (**P1 acceptance · L · M**)
- **Objective:** prevent inaccessible item tiers, recipe chains, missing art and misleading material rarity.
- **Current:** older audit reported T9 110/104 (now code 100/97), T3/T4 alchemy prerequisites above region level, 82 equipment set art gaps at 17 Oct; changes may have occurred since.
- **Desired:** all advertised 1.0 recipes achievable by intended character/profession caps, their ingredients sourced by reachable areas, art mapped at adequate quality, rare chances accurately communicated.
- **User:** progression dead ends and inconsistent visuals.
- **Code:** `src/content/equipment-recipes-v33.ts`, `src/core/progression.ts`, `src/content/herbalism.ts`, `src/theme/equipment-assets.ts`, `src/components/ItemArtwork.tsx`.
- **Approach:** build/read full dependency graph by actual item IDs, level/region/drop probabilities, minimum resources and visual existence; report tier-specific reachable/non-reachable rows before any rebalance.
- **Dependencies:** A06 launch tier scope and A07 item reservations.
- **Acceptance:** 100% of *advertised 1.0 tier* recipes have plausible obtainable materials and registered artwork or documented intentional generic; no hidden impossible level locks.
- **Tests:** catalog graph traversal, XP cap and all T1–T9 threshold assertions, alchemy supply chains, asset file resolver, character role/region and Play build asset inclusion.
- **Regression watch:** equipment economy inflation, monster drop weight, appearance clipping, recipe generated source conflicts.


# Phase C — Refinement, UX and presentation

**Objective:** professional clarity, consistent interaction hierarchy, responsive/accessible pixel art, and pleasant return sessions. These changes are **recommended 1.0 polish** where tagged, not automatic release blockers unless they impede the critical journey. Always verify native behavior before replacing components already refined in October.

### C01 · Normalize navigation, shortcuts and intent preservation (**P1 · M · H**)
- **Objective:** players get directly from a notification/item/source to their intended destination without losing state.
- **Current:** live route is Home / Character / Skills / World / Inventory / More with top-right shortcuts and Command Deck; older V52 “Account” naming lingers in docs. `App.tsx` still centrally dispatches many intents.
- **Desired:** consistent back stack, shortcut targets, deep-link context and preserved search filters; no unexpected modal dismiss/trigger.
- **User:** repeated taps and confusing return destinations.
- **Code:** `apps/mobile/App.tsx`, `src/components/PrimaryNavigation.tsx`, `src/screens/MoreScreen.tsx`, `src/core/navigation-notifications.ts`.
- **Approach:** inventory all tab/modal return flows; retain six-tab contract; standardize route destination payload and quick-bar defaults, ensuring shortcuts aren't accidentally tied to false “Account” route.
- **Dependencies:** B01/B04/B09, no broad navigation redesign.
- **Acceptance:** 20 common routes preserve intended target and correct back behavior; shortcut reset remains available; Home command sheet never silently starts an activity.
- **Tests:** UI navigation matrix, Android hardware back and swipe, multitap, keyboard open, deep-link dungeon invite.
- **Regression watch:** in-flight command navigation, chat dock placement and event-return flow.

### C02 · Quiet, accurate return and notification hierarchy (**P1 · M · H/M**)
- **Objective:** surface important rewards while eliminating false/repeated celebration.
- **Current:** Welcome Back, reward notification infrastructure and event-start popup exist; unwanted reward popups were previously reported after changing chat channel/profile customization.
- **Desired:** routine reward summary, rare/first-ever celebrations and actionable errors are distinct; per-account per-event acknowledgment and minimal intrusive notifications.
- **User:** repeated interruptions undermine trust in rewards.
- **Code:** `src/core/navigation-notifications.ts`, `src/components/EventStartPopup.tsx`, Welcome Back/claim components, online result dispatch in `App.tsx`.
- **Approach:** trace notification origin to authoritative reward event IDs, not arbitrary state diff; persist event acknowledgment and suppression preferences; never suppress actual claim history.
- **Dependencies:** A04/B07.
- **Acceptance:** chat channel/profile edits cause no reward celebration; event intro shown once per event version/date; earned rare finds remain visible in log.
- **Tests:** exact event IDs, multiple navigation cycles, pending retry receipts, reconnect, time rollover, reduced motion.
- **Regression watch:** first-time unlocks, bulk claims, ephemeral snackbar states and silent loss of valuable notice.

### C03 · Accessibility, typography and translations as first-class QA (**P1 · M–L · M**)
- **Objective:** every major path remains operable on small Android phones and with assistive settings.
- **Current:** themes and labels exist; older audit found 7–8px secondary text and Oct26 localization noted a missing Settings “What's New & Updates” string; native TalkBack/text scaling not fully verified.
- **Desired:** legible minimum-size hierarchy, semantic labels/headings, status announcements, color-independent rarity cues, reachable controls and non-truncated localized text.
- **User:** unreadable stats or unreachable battle/claim button.
- **Code:** `src/theme/theme.ts`, `src/components/GameModalSurface.tsx`, `src/screens/BestiaryScreen.tsx`, `SettingsScreen.tsx`, i18n translation catalogs and common buttons.
- **Approach:** audit touch targets/focus order, use theme tokens not one-off tiny labels, define min widths and empty/long-text states; complete five-language message catalogs before claiming localization completeness.
- **Dependencies:** B/C screen stabilization first.
- **Acceptance:** primary actions reachable under 200% font scale, TalkBack announces controls/health/rewards, themes pass contrast inspection; no known catalog placeholders.
- **Tests:** Android TalkBack, bold/large font, 320px and short-height windows, three themes, five locales, dynamic content and emoji.
- **Regression watch:** compact density, art crops, modal scroll traps and accessibility focus on battle animation.

### C04 · Audit and normalize art quality, sizing and icon clipping (**P1 · L (art-dependent) · M**)
- **Objective:** consistent polished sprite identity across actual launch-visible items/classes.
- **Current:** active equipment art registry resolves many sets; Oct17 count had 82 missing sets (not assumed current), asset downscale work and three class-icon remasters discussed since; native image quality unverified.
- **Desired:** canonical sprite ledger by current item/icon/rarity/zoom, consistent target sizes, runtime borders only, crisp 256×256 icons and skins without huge empty margins.
- **User:** blurry or clipped high-value gear undermines earned progression.
- **Code:** `src/theme/equipment-assets.ts`, `src/components/ItemArtwork.tsx`, class icon/skin mappings under `apps/mobile/assets/`, asset optimization reports.
- **Approach:** generate manifest of active catalog IDs versus registered runtime art; inspect source and multiple Android densities; replace **only** missing/low-quality visible art; do not reuse review exports as app source.
- **Dependencies:** B10 asset/reachability audit and A05 AAB size checks.
- **Acceptance:** all launch-visible critical class/profile/T1–Tlaunch icons consistent and unclipped; fallback usage documented and explicitly accepted.
- **Tests:** asset resolver and dimensions/integrity, screenshot grids per rarity, small/large density visual QA, Metro export/no missing require.
- **Regression watch:** extra bundle bytes, atlas aliasing, right-aligned bow strings, item grip orientation, theme-colored borders.

### C05 · Bank/recipe/source presentation and safe action affordances (**P1 · M · H**)
- **Objective:** turn deep item systems into straightforward decisions.
- **Current:** bank, crafting list, source chain, dropdown filters, item previews and favorites exist; some old “Ready to brew” status labels disguised an immediate spend action.
- **Desired:** explicit **Craft / Brew / Sell / Protect** verbs, source/requirements breakdown and batch maximum preview; preserve search/filter when opening item modal.
- **User:** fear of tapping ambiguous actions and not knowing missing prerequisites.
- **Code:** `src/screens/InventoryScreen.tsx`, recipe browser/cards, `src/components/RecipeCard.tsx`, `src/core/inventory-screen-state.ts`.
- **Approach:** align action labels with real side effects, use reusable source/ownership panels and confirmations only for destructive or high-stakes actions; don't add full-screen steps for routine tasks.
- **Dependencies:** B06 and B10 content source truth.
- **Acceptance:** each button describes transaction before spending; blocked recipe names exact missing amount/source; selection preserved after successful transfer.
- **Tests:** components with ready/blocked/reserved ingredients, long names, partial bank loads, rapid taps, asynchronous failures.
- **Regression watch:** unintended extra confirmations and duplicated state/hidden recipe list.

### C06 · Unified loading, error and empty states; no whole-screen lock (**P1 · M · H**)
- **Objective:** show honest confirmation of each async action and a retry path.
- **Current:** `online-loading-feedback-2026-10-19.md` records widespread promise-aware busy buttons and removal of full-screen blocking overlay; individual screens may still have detached loading flags.
- **Desired:** every network action has a distinct Pending / Confirmed / Recoverable failure state and prevents same-tick duplicates; offline activities remain responsive.
- **User:** uncertain whether a sell/claim/bank transfer succeeded.
- **Code:** `src/components/GameButton.tsx`, `SocialActionButton.tsx`, `src/screens/InventoryScreen.tsx`, `src/online/`, error boundary and common modal.
- **Approach:** trace remaining void-discarding callbacks; explicitly await server receipt in local surface; distinguish optimistic spinner from authoritative confirmation; preserve idle/scroll during a save.
- **Dependencies:** A04, B06/B08.
- **Acceptance:** all critical actions complete or recover without lost UI; error message gives next safe action; unrelated state rerender never clears an unfinished operation.
- **Tests:** deferred Promise rejection/resolution, double-taps, account switch while loading, timeout/retry, event notification races.
- **Regression watch:** retry duplication, stale component unmount, disabled actions and old test timing.

### C07 · Guild daily board and recruitment screen native refinement (**P1 · M · H**)
- **Objective:** guild users see today’s objective, identity, raid, Hall and chat without scroll fatigue.
- **Current:** Oct26 `guild-screen-review` reports a working Home/Raid/Activities/Hall/Chat hub, role-gated controls, player count and shorter chat viewport; browser captures passed, native validation unresolved.
- **Desired:** layout hierarchy works for non-member/member/officer/leader and at Android keyboard heights; accurate contribution/cooldown progress in one glance.
- **User:** complex guild board and chat obstruct frequent social tasks.
- **Code:** `src/components/OnlineGuildManagement.tsx`, Guild Hall/PvE/Shop/UI components, `src/components/GuildChat.tsx`, social/role screens.
- **Approach:** native QA of real components under each role, refine only confirmed density/hitbox gaps; no duplicate guild dashboard.
- **Dependencies:** B04/B05 and A03 role boundary.
- **Acceptance:** key role actions are findable and only authorized; member never sees leader controls; keyboard doesn't cover message composer.
- **Tests:** multi-role screenshots, 320/390 phone layouts and large fonts, guild leave/rejoin, failure to load own membership, browser vs native comparison.
- **Regression watch:** privacy/authorization, chat unread state, Hall progress and low-bandwidth load.

### C08 · Replayable contextual onboarding and next-step hints (**P1 · M · M**)
- **Objective:** teach functionality in the moment rather than dumping large tours or mandatory text.
- **Current:** per-tab tutorial modules and guest-first first-run exist; skill/party/companion unlock messages are dense and differ by progression.
- **Desired:** optional micro-guides with correct buttons and one immediate example, visible “Guide” replay, consistent first-party tooltips and no forced companion lesson before unlock.
- **User:** a deep mobile idle RPG feels overwhelming in early sessions.
- **Code:** `src/core/feature-unlocks.ts`, onboarding components, `HomeScreen.tsx`, `CompanionsScreen.tsx`, `SettingsScreen.tsx`.
- **Approach:** build small reusable guided overlays using real target IDs and dismissal persistence, validate after every navigation redesign.
- **Dependencies:** B09 and B01/B03.
- **Acceptance:** player can dismiss/reopen each guide, skip every optional tour, and never see a prompt for inaccessible systems.
- **Tests:** fresh/legacy accounts, role variations, event-level exceptions, restored guest, large text, guide target missing fallback.
- **Regression watch:** tutorial pointer overlays blocking controls, time-based events, save schema and locale.

### C09 · Main combat readability, art and action feedback (**P1 · M–L · M**)
- **Objective:** improve moment-to-moment ordinary hunting appearance without misleading a server-side idle simulation.
- **Current:** equipment, target/monster portraits, health, tactics, activity and loot screens exist; combat visuals vary by screen and class.
- **Desired:** consistent ally/enemy sides, visible HP/food/status/damage cues where actual combat telemetry exists, distinctive class and monster portraits, short boss entry/reward moments.
- **User:** combat feels more like forms and numbers than an RPG.
- **Code:** `src/screens/CombatScreen.tsx` if present (verify current screen route), `src/components/ActivityCard.tsx`, monster art resolver, `src/core/combat-*.ts`, combat backend.
- **Approach:** first inventory actual combat route/components and authoritative event availability; add client illustration tied to server state, not speculative hit roll; complement rather than replace Trial stage.
- **Dependencies:** B02 replay architecture, A05 asset budget.
- **Acceptance:** readable battle state and role identity in a common hunt and boss encounter, with reduced-motion alternative; XP/rewards unaffected.
- **Tests:** combat event fixtures, class/monster combinations, low HP/food, forced foreground/background, pixel resolution QA.
- **Regression watch:** UI ticking too frequently, battery, race against authoritative health and claim animations.

---

# Phase D — Performance, architecture, security optimization

**Objective:** measured improvements in responsiveness and hosting efficiency, without premature refactors or destructive database “lint cleanups.” Critical performance faults discovered by profiling can move to Phase A; otherwise these are **recommended 1.0 / post-launch 1.1**.

### D01 · Instrument and establish actual Android network baseline (**P1 · M · H**)
- **Objective:** quantify repeated loads, latency, errors and unneeded requests.
- **Current:** `docs/NETWORK_REQUEST_QA_BASELINE.md` defines four scenarios but records “Not measured”; shared chat cache and timer tuning are implemented without measured before/after.
- **Desired:** device-measured cold launch, tab switch, Guild/chat channel, profile icon customization, open/close dungeon and bank flows, with request/bytes/latency counts from comparable APKs.
- **User:** laggy tap navigation, slow avatars, unnecessary data consumption.
- **Code:** `src/online/`, `src/online/useChatFeed.ts`, `src/core/chat-feed-cache.ts`, `App.tsx`, QA instrumentation document.
- **Approach:** opt-in QA-only request capture with personal/sensitive payload redaction; pin network profile and state. Diagnose top requests before adding caching/batching.
- **Dependencies:** A05 test AAB; A08 reproducible scenarios.
- **Acceptance:** measured baseline in repo with device/backend/build IDs, p50/p95 navigation times and network totals; no invented optimization percentages.
- **Tests:** scenarios A–D repeated, offline reconnect, expired auth, background/foreground, same-vs-new account.
- **Regression watch:** logging tokens/chat content, extra instrumentation traffic and stale cached roles.

### D02 · Profile and virtualize high-cardinality inventory surfaces (**P2 · M · M**)
- **Objective:** maintain smooth storage browsing for mature accounts.
- **Current:** `InventoryScreen.tsx` already imports `FlatList` and `ScrollView`; Oct17 audit claimed all-tile `ScrollView` rendering, which may have changed. **Do not assume virtualization absent.**
- **Desired:** visible-only card rendering, stable keys/layout, cheap filter/sort/pagination and retained scroll after modal close.
- **User:** bank tabs stutter as stored gear grows.
- **Code:** `src/screens/InventoryScreen.tsx`, `src/core/inventory-view.ts`, item artwork renderer.
- **Approach:** inspect the actual render branch and profile 50/500/2,000 instances on Android; if needed virtualize only nonvirtual branches or memoize stable card props.
- **Dependencies:** D01 profiling and B06 source-count consistency.
- **Acceptance:** no visually lost items and agreed smooth scroll/device memory at large test inventory; search updates remain correct.
- **Tests:** list key/reference identity, large sorted/filtered bank, platform layout and return position, favorite/autosell.
- **Regression watch:** nested scrollviews, modal snap/keyboard, inventory selection state.

### D03 · Index immutable catalogs and cache only safe derivations (**P2 · M · M**)
- **Objective:** cut repeated `O(n)` catalog scans and expensive readiness recalculations without stale resources.
- **Current:** Oct17 source audit measured `itemDef` as linear scan of 2,185 items and `CraftingRecipeBrowser` readiness for all matching recipes; current implementation needs checking.
- **Desired:** immutable id→definition maps for items/recipes/monsters, memoized static filter lists and state-version-scoped inventory readiness.
- **User:** laggy recipe search and equipment preview.
- **Code:** `src/content/items.ts`, `src/components/CraftingRecipeBrowser.tsx`, item/recipe query helpers, `src/core/inventory-view.ts`.
- **Approach:** microbenchmark lookup hot paths and dependency invalidation; introduce one canonical map per content source; avoid memoizing mutable economy totals across command revisions.
- **Dependencies:** D01; B10 canonical content IDs.
- **Acceptance:** lookup invariants exactly match pre-change behavior and measured reduced lookup/render cost.
- **Tests:** all catalog IDs, duplicate definitions, hot-reload content changes, inventory quantity updates and comparative microbench.
- **Regression watch:** cached stale recipe affordability, generated catalog duplicates and memory cost.

### D04 · Release bundle/asset size and Android startup pass (**P1 · M–L · H**)
- **Objective:** faster cold boot and smaller compatible distribution, preserving art quality.
- **Current:** `apps/mobile/assets` tracked runtime assets ~489MB and historical art-review/exports much larger; `.easignore` already excludes many. No evidence that Git checkout size equals actual AAB.
- **Desired:** record real AAB/APK split delivery bytes, source asset usage and cold-start p50/p95, optimize only actual packaged critical path.
- **User:** long splash, storage cost, startup hangs and device support loss.
- **Code:** `apps/mobile/assets/`, `apps/mobile/.easignore`, `.easignore`, `app.json`, startup/theme asset resolver.
- **Approach:** inspect bundle graph and Play bundle explorer, catalog unused imports, tune sprite WebP/PNG transparencies and progressive resource loading without cropping art.
- **Dependencies:** A05; D01; C04 art manifest.
- **Acceptance:** reproducible build-byte and cold-start baselines plus verified improvement vs prior signed AAB, no loss of supported devices without approval.
- **Tests:** Android small/older device, Expo asset resolver and visual checksum, offline startup, theme switch, resume memory.
- **Regression watch:** image aliasing, opaque icon backgrounds, missing dynamic requires, Google Play compatibility and build IDs.

### D05 · Database query plans, RLS cost and indexes by measured need (**P2 · L · H**)
- **Objective:** remove excessive server work and contention without weakening authorization.
- **Current:** prod advisors list 130 FKs without matching indexes, 117 RLS `auth_rls_initplan`, 57 unused indexes and chat multiple-permissive policies.
- **Desired:** query inventory with actual `EXPLAIN (ANALYZE, BUFFERS)` from safe representative data and top slow commands, additive index/policy improvements based on observed workload.
- **User:** slow queue, bank, social and claim operations at scale.
- **Code:** `backend/supabase/migrations/`, `backend/supabase/tests/`, gameplay/chat/guild query paths and Supabase advisor ledger.
- **Approach:** prioritize critical FKs and `auth.uid()` wrapping where correct, review duplicate policies individually, retain essential indexes until safe workload analysis. Never drop 57 “unused” indexes from advisor count alone.
- **Dependencies:** A02/A03; D01 command trace.
- **Acceptance:** each migration includes before/after plan, RLS semantics unchanged, cost/latency improvement under controlled concurrency.
- **Tests:** auth role RLS parity, rollback, live query timeout, 2–100 concurrent command synthetic loads and migration replay.
- **Regression watch:** transaction locks, index write amplification, function SECURITY DEFINER invocation and storage cost.

### D06 · Contain orchestration and generated backend without broad rewrite (**P2 · L · H**)
- **Objective:** lower regressions caused by centralized UI/domain switch logic and duplicated version snapshots.
- **Current:** `App.tsx` ~699 lines, `src/core/game.ts` >100KB and generated Edge bundles are MB-scale; tracked historical snapshots/older equipment variants and exports complicate contributor context.
- **Desired:** boundaries for navigation/commands/async results, canonical source-to-generated mapping and a documented retain/archive/delete inventory (no runtime behavior changed).
- **User:** slower safe iterations cause more bugs and lost work.
- **Code:** `apps/mobile/App.tsx`, `src/core/game.ts`, `backend/online/{edge,coop-edge}.ts`, `tools/build-online.mjs`, `output/` and historical exported folders.
- **Approach:** use import/reachability scan, snapshot tests and minimal extract-module passes; keep generated Edge output deterministic; never remove Git history/migrations or unreferenced art without signed manifest.
- **Dependencies:** A08 CI contract, D01 profiling; avoid large simultaneous refactor.
- **Acceptance:** new modules have stable pure API contracts and equal runtime snapshots; generated bundles reproducible and archived files classified.
- **Tests:** mobile/core, backend full build, bundle hash determinism, all imports valid and AAB asset checks.
- **Regression watch:** circular imports, server/client shared-domain drift, breaking class command dispatch or accidental loss of assets.

### D07 · Trustworthy operational telemetry and failure response (**P2 · M–L · M**)
- **Objective:** diagnose player-facing failures without excessive logs, privacy risk or performance overhead.
- **Current:** server logging and QA capture exist; older user concerns about database volume and popup/log spam have not been measured.
- **Desired:** sampled error codes, request ID, latency, command/receipt outcome and environment/build provenance with retention policy; no chat bodies, secrets or private Echo IDs in logs.
- **User:** invisible errors and delayed fixes.
- **Code:** `backend/online/`, Edge logging wrappers, mobile online error surfaces, `docs/ADMIN_QA_TESTING.md`.
- **Approach:** define redacted observability schema, rates/budgets, alert thresholds for billing/claim/chat failures, compare log volume pre/post; explicitly guard log payloads.
- **Dependencies:** D01, A03/A04.
- **Acceptance:** one simulated failed command is traceable across client/server without personal data; no explosion in log writes; alert owner and response runbook clear.
- **Tests:** redaction snapshot, load/rate-limit simulation, retried claim ID correlation, failure in unauthenticated context.
- **Regression watch:** request latency, leaked PII, accidental vendor spend and false positives.


# Phase E — High-value competitive improvements

**Objective:** take high-ROI ideas from [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md), especially Idle Clans' Oct20 queue and IdleMMO's Oct5 visual/UX direction, without copying systems or worsening VELDRYN's idle simplicity. **Default launch placement: v1.1**, except an improvement that resolves a certified 1.0 blocker.

### E01 · Queue “plan my next goal” and optional backup activity (**P2 · M–L · M**)
- **Objective:** make idle planning powerful without forcing players into more micromanagement.
- **Current:** `HomeQueueComposer` supports combat/gathering/Alchemy, 30-minute handoff and guarded queues; Faith/Exploration supported in Skills; forge/cooking intentionally excluded. Idle Clans introduced a queue/Train mode/backup on 20 Oct, with mixed player reaction.
- **Desired:** a single suggested next-unlock plan with clear material/time estimate, user-confirmed steps, optional capped backup activity and explicit paused reason.
- **User:** too many choices for straightforward progression, idle sessions stall unexpectedly.
- **Code:** `src/components/HomeQueueComposer.tsx`, `ActionQueuePanel.tsx`, `src/core/activity-queue.ts`, `src/core/working-toward*.ts` if present.
- **Approach:** reuse canonical `queue_add`/`queue_set_goal`; show preview and blockers, default to current region, no automatic teleport, no mandatory queue reset and no purchased slot pressure.
- **Dependencies:** A07 and D01 baseline, C05 recipe source truth.
- **Acceptance:** one-tap proposal + explicit confirm, never destroys previous queue, never starts invalid/out-of-region work, backup opt-in only.
- **Tests:** 0/full queue, materials gained during earlier step, stale goal, 30h cap, no food, account switch and retry.
- **Regression watch:** Idle Clans-style added busywork, AFK double credit and silent player intent overrides.

### E02 · Safe Claim All for routine event and milestone rewards (**P2 · M · H/M**)
- **Objective:** remove repetitive low-value reward collection.
- **Current:** EventAdditionalRewards, achievement/inbox and event milestone claim paths exist; no universal atomic Claim All certified.
- **Desired:** one action for all **currently claimable, choice-free** rewards, with item/currency summary and clear exclusions needing a decision.
- **User:** many taps for a simple return session.
- **Code:** `src/components/EventAdditionalRewards.tsx`, event reward/inbox components, gameplay/receipt RPC functions.
- **Approach:** query authoritative claim readiness, preview list, submit stable batch request or independently idempotent claims, exclude choice-dependent/expired/capped entries.
- **Dependencies:** A04 and B07.
- **Acceptance:** 10 ready safe rewards result in 10 unique receipts and exact totals with one confirmation; failures leave unresolved rewards claimable.
- **Tests:** concurrent requests, partial success/retry, expired event boundary, zero ready, post-cap bonus, multiple characters.
- **Regression watch:** claim choices, inventory overflow, server time, reward animation overload.

### E03 · Spend companion event consumables on any eligible owned companion (**P2 · S–M · M**)
- **Objective:** stop unnecessary equip switching to apply a companion-focused candy/boost.
- **Current:** `EventCandyPanel.tsx` exposes `onUse(kind)` without a target parameter at UI boundary; actual backend target policy must be inspected before changing it.
- **Desired:** a selection sheet showing owned/eligible companions, Bond/level progress and cap; equipped preselected, not required.
- **User:** event collection progress is tedious and can disrupt active companion use.
- **Code:** `src/components/EventCandyPanel.tsx`, companion inventory/state, event candy command and SQL RPC.
- **Approach:** trace current command payload, add server-validated target ID only if missing; no client-written Bond or duplicate consumption.
- **Dependencies:** B03 roster list and A04 replay protection.
- **Acceptance:** eligible unequipped companion receives effect exactly once; invalid/expedition-locked target displays reason; equipment unchanged.
- **Tests:** bound/unbound, all companion roles, cap, consume once, account switch, stale selection.
- **Regression watch:** legacy command compatibility and event-time restrictions.

### E04 · Social recruitment filters that help casual guilds (**P2 · M · M**)
- **Objective:** help players find compatible real communities rather than the most populated guild.
- **Current:** `OnlineGuildManagement`, Guild recruitment, LFG and 26 Oct role-aware screens exist; Idle Clans 20 Oct introduced language/region/activity filters.
- **Desired:** filter by language, time zone, level band, activity expectation, open slot and newcomer-friendly, with fair mixed-size discovery.
- **User:** hard to find a guild where players are online at similar hours.
- **Code:** `src/components/OnlineGuildManagement.tsx`, social recruitment panels, guild metadata/RLS queries.
- **Approach:** allow optional validated guild declarations and filter persistence; use privacy-safe activity bands (not individual member schedules); ensure no “fake online” states.
- **Dependencies:** B04/C07 and A03 privacy review.
- **Acceptance:** a no-guild user can find/apply to a compatible small guild in a short journey; joined member does not see irrelevant join prompts.
- **Tests:** empty filter, permission/leader/officer role, language/region strings, absent metadata, 12→20 guild cap transitions.
- **Regression watch:** exclusion bias, data scraping, misleading member activity and cold-start guild visibility.

### E05 · Normalize guild weekly contribution difficulty fairly (**P2 · L · M**)
- **Objective:** avoid punishing small friendly guilds while keeping large guild progression meaningful.
- **Current:** Guild quest/Shop/Hall progression exists; specific current fairness across active 2-person and full 20-member guilds needs testing. Idle Clans users criticized small-clan quest burden.
- **Desired:** goals scaled to an accountable recent active-contributor snapshot, bounded minimum, overfill cap and no join/leave reset exploit.
- **User:** small groups abandon weekly tasks or feel forced to recruit.
- **Code:** `backend/src/server/guild*` (discover actual modules), guild SQL functions/migrations, Guild board presentation.
- **Approach:** run Monte Carlo or deterministic effort model using legitimate contribution rates, simulate 2/4/12/20-member guilds and exploit cases; implement only if disparity confirmed.
- **Dependencies:** A03/A04 and C07, agreement on weekly reward economy.
- **Acceptance:** documented target-effort bands compare fairly across guild sizes with no reset manipulation; current legitimate progress survives season change.
- **Tests:** active-membership snapshots, date rollovers, contribution overfill, leader transfer, churn and multiple same-activity reward submissions.
- **Regression watch:** guild-shop currency inflation and runaway level progression.

### E06 · Home “Working Toward” smart next-action card (**P2 · M · M**)
- **Objective:** give a useful immediate choice without adding another main tab.
- **Current:** Working Toward, class mastery, journal, rare discoveries, weekly orders and milestone cards are implemented, but scattered.
- **Desired:** optional Home compact panel offering one current target, one nearest unlock and one time-limited eligible social/event action, each with a source/navigate link.
- **User:** deep MMORPG progression hides next meaningful action.
- **Code:** `src/screens/HomeScreen.tsx`, `src/core/feature-unlocks.ts`, Working Toward/Journal modules and Command Deck.
- **Approach:** derive suggestions only from authoritative state and verified content graph, cache by revision, allow pin/dismiss and clearly mark optional; avoid duplicating queue.
- **Dependencies:** B10, C01/C05, D03 readiness cache.
- **Acceptance:** no stale locked suggestion; card fits on 320px and can be hidden; routing preserves intended goal.
- **Tests:** new/endgame character, fully complete region, new UTC week, locked event, multiple languages.
- **Regression watch:** noisy recommendations, server calls on every render and false promise of guaranteed rare rewards.

### E07 · Contextual formation advice and battle-preview identity (**P2 · M · M**)
- **Objective:** help new Trial players select an eligible Tank/Damage/Support team.
- **Current:** existing companion trial role/affinity and team-power helpers, boss preview and formation sheets; recommendations not verified as prominent at battle entry.
- **Desired:** preflight formation with role coverage and descriptive “why suggested” hints, enemy silhouette/affinity, rewards and difficulty cues.
- **User:** poor team selection can feel arbitrary, especially during first Trial.
- **Code:** `src/components/CombatCompanionPanel.tsx`, `CompanionTrialStage.tsx`, `src/core/companion*.ts`, server trial season models.
- **Approach:** heuristic recommendations from **owned** eligible companions, not a guaranteed victory simulator; server still validates battle and owns outcomes.
- **Dependencies:** B01/B02/B03.
- **Acceptance:** recommendations always satisfy role and availability rules where possible, and gracefully explain when impossible; no fake battle probability.
- **Tests:** missing Tank or Support, all roles, affinities, busy/training companions, seasonal boss cycle, new account.
- **Regression watch:** spoiler content, promise of success, unintended companion auto-switching.

---

# Phase F — Future innovation and longer-term differentiation

**Objective:** optional experiments that strengthen identity only after v1.0 baseline and v1.1 usability prove healthy. **None required for 1.0.**

### F01 · Living profession scenes with event-aligned pixel animation (**P3 · L/XL · M**)
- **Objective:** make AFK work visibly alive, aligned to IdleMMO's announced Oct 2026 direction.
- **Current:** static/activity imagery, timers and item rewards; visual coverage varies; no verified complete animated profession-stage system.
- **Desired:** compact fishing, woodcutting, mining, smithing, cooking and alchemy stages with class-aware interaction and paused/reduced-motion fallback.
- **User:** idle progression feels like a series of static forms.
- **Code:** `src/components/ActivityArtwork.tsx`, `ActivityCard.tsx`, theme/asset registry, `src/core/game.ts` read-only view models.
- **Approach:** build a 2-profession prototype, reuse sprite atlas/idle frames; animate client-only on true activity state, no fake gathered quantity and no new server request per frame.
- **Dependencies:** D01/D04 and C04 art guidelines.
- **Acceptance:** pilot scenes improve usability feedback without exceeding agreed startup, frame or memory budget; reduced motion loses no status.
- **Tests:** 30/60fps profiling, inactive background behavior, image density screenshots, energy use and resume under app throttling.
- **Regression watch:** massive art workload and animation over server progress claims.

### F02 · Lightweight privacy-first presence in regions and guilds (**P3 · L · L/M**)
- **Objective:** make an idle world feel shared without full real-time movement.
- **Current:** social identity, party rosters, world feeds and chat already supply some connection; no guaranteed visible “people working here” stage.
- **Desired:** optional low-rate avatar cards of consenting party/guild players within a shared activity context, with cached daily profile icon and clear “last seen” semantics.
- **User:** MMO world feels lonely between co-op sessions.
- **Code:** social profile projection and cache, `src/screens/WorldScreen.tsx`, region activity UI, guild privacy controls and Edge.
- **Approach:** prototype with only consenting guild/party users; no real location or surveillance; fetch bounded snapshots, no live position tracking.
- **Dependencies:** A03 privacy, D01 budget, E04 community discoverability.
- **Acceptance:** no nonconsenting profile exposed and no “online now” claim inferred from stale data; smooth offline/solo fallback.
- **Tests:** consent revocation, guild leave, account switch, stale cache, 0/100 nearby entries, network privacy.
- **Regression watch:** stalking risk, moderation and extra traffic.

### F03 · Narrative event and boss identity expansion (**P3 · L · M**)
- **Objective:** give VELDRYN distinctive seasonal stories, bosses and earned cosmetics without growing permanent systems.
- **Current:** authored events, milestone companions, live event shops and age/weather visuals exist.
- **Desired:** bounded event mini-arc with three meaningful checkpoints, short boss intro/encounter, lore/cosmetic consequences and no mandatory competitive leaderboard.
- **User:** event rewards can feel disconnected from a living world.
- **Code:** `src/content/live-events.ts`, `EventStartPopup.tsx`, event milestone UI, co-op/companion event claim and art assets.
- **Approach:** pilot one event on existing generic event framework and verified calendar windows; no new currency unless approved and no repeated popup loop.
- **Dependencies:** B07 and C02/B02; event analytics.
- **Acceptance:** event can be previewed, enjoyed, completed and expired cleanly without affecting core progress claims.
- **Tests:** dates, alternate locales, relaunch mid-event, milestone companions, purchase restriction and disabled events.
- **Regression watch:** content localization burden, overlapping dates, large sprite downloads.

### F04 · Optional PC/web companion client only after strong mobile retention (**P3 · XL · L**)
- **Objective:** eventually let users check progress across devices without compromising authoritative ownership.
- **Current:** React Native Android primary, some platform-agnostic gameplay domain; no verified production web/PC client parity.
- **Desired:** low-friction account dashboard/planner with view, claim and allowed scheduling using same server commands; not a second local source of rewards.
- **User:** long idle sessions are easier to plan on desktop for part of the audience.
- **Code:** `apps/mobile`, shared TypeScript core, `backend/online/`, auth/access control and future client package.
- **Approach:** validate demand first; build limited authenticated read model and server-owned actions instead of porting entire UI simultaneously.
- **Dependencies:** stable A/B, D06 boundaries and support capacity.
- **Acceptance:** no cross-device duplicate claims, logout/account isolation and consistent queue state; clear platform support policy.
- **Tests:** cross-device session/race, browser auth, reconnect and secure token storage, compatibility, screen reader.
- **Regression watch:** multi-platform maintenance overhead and more auth surface.

### F05 · Future companion showcase and optional cooperative collections (**P3 · L · L/M**)
- **Objective:** deepen cosmetics and player-to-player identity without gacha or power creep.
- **Current:** companion Codex, showcase slots, profile styling, guild cosmetics and collection milestones exist; expanded optional sharing is not certified.
- **Desired:** earned companion portrait/showcase sets, themed guild collection goals and optional profile comparisons with transparent privacy.
- **User:** rare unlocks deserve social visibility beyond small inventory entries.
- **Code:** `src/components/CombatCompanionPanel.tsx`, Collections/Profile screens, social projection and Guild Shop authority.
- **Approach:** discover which showcase features already exist, run consent/privacy review, design cosmetic-only short loops.
- **Dependencies:** C04/E04 and A03.
- **Acceptance:** only owned cosmetics displayed, no combat advantages, disabled sharing fully respected, profile loads cheaply.
- **Tests:** privacy/public projections, revoked cosmetics, inherited account ownership, empty codex, old profile cache.
- **Regression watch:** pay-for-status pressure, data expansion and profile rendering latency.


## 7. Release planning and cut lines

**These are capability categories, not release dates or a commitment to launch every idea.** Each required item can close as “existing behavior verified” without modifying code. Only essential defects are fixes; otherwise no accidental scope expansion.

### 7.1 REQUIRED before version 1.0 — no-go if not accepted

**Release/platform gate:** A01 (green mobile CI), A02 (safe staging/prod ledger and target compatibility), A03 (no untriaged critical authorization exposure), A04 (claim/transaction integrity), A05 (signed upgradeable Android artifact), A06 (truthful launch content, gates, entitlements and AFK policy), A07 (single capped offline/queue accounting, if repro), A08 (auditable release checklist). **D01** and **D04** require only **measured baseline and delivery-footprint evidence** here; the optimization projects can follow 1.0 unless thresholds reveal a release-blocking fault.

**Player-functional gate:** B04 (chat/social continuity) and B05 (real Live/QMode co-op) **if promoted as 1.0 features in A06**; B06 (accessible resource totals, safe destructive actions; optional auto-sell expansion can be deferred if risky), B07 (events accurately gate and settle if released), B08 (guest/Google recovery and real paid entitlements), B09 (new player loop), B10 (all catalog/art/recipe dependencies in the *advertised launch tier*). **C03 minimum accessibility and reachability** is a release gate; wider design-system overhaul is not.

**Scope-switch option:** If a complex peripheral online mode **cannot pass** its required acceptance despite reasonable focused repair, the project owner can explicitly disable it for 1.0 via launch manifest/flags/UI and remove it from marketing, provided it cannot strand purchased content or existing player entitlements. Do not silently leave a dead-end button.

**Go/no-go decision sheet must contain:**
- Artifact: immutable Git SHA, production AAB versionCode, native Android package, signing fingerprint/build ID, installed upgrade path and current Play supported-device diff.
- Backend: Supabase target, schema ledger hash, Edge deployment versions/commit, external Play service config status, RLS/EXECUTE review, latest migration dry-run.
- CI: current Expo Doctor, **both** mobile TS checks, focused and wider core tests, backend typecheck/economy/co-op/security SQL smoke and clean deployment checks; record every failed/skipped step.
- Journeys: create guest, claim progress after max AFK, cook split stacks, bank/overflow, equip, craft, queue, link Google/email, send/receive chat between accounts, start/finish/claim Live and QMode if advertised, redeem event rewards, purchase/restore/refund in Play testing.
- Native UX: at least one representative recent phone and a lower-memory/small-window Android, TalkBack and large text, keyboard open/close chat, dark/light, multi-hour background/resume and saved draft.
- Owner approval: unresolved risks, excluded features, rollback, version increment and store wording. A red gate blocks launch; signed exclusions require specific reason and mitigation.

### 7.2 Recommended for version 1.0 if stabilization capacity permits

**B01** pinned formation/start, **B02** battle playback clarity, **B03** owned-first training, **C01** predictable navigation, **C02** quiet reward notifications, **C04** consistent launch-scope art, **C05** explicit recipe actions, **C06** individual loading/error states, **C07** native Guild screen density and **C08** short contextual guides.

**Order within the companion cluster:** B03 owned-first roster → B01 start/formation shell → B02 authoritative replay fidelity → E07 advanced formation hints (later). B01 and B02 can be built separately but release integration should check them together.

**Keep 1.0 surgical:** avoid adding new species/skills/events to compensate for unclear UI. If B01/B02/C polish cannot be finished, preserve currently functioning Trials, verify their claims, label battle presentation as a follow-up and ensure no unreachable UI.

### 7.3 Version 1.1 — focused improvements, conditional on metrics

E01 recommended bounded queue planning, E02 claim-all, E03 owned companion candy targeting, E04 guild discovery; C09 ordinary combat art/feedback, D02 large-list virtualization **only if profiling proves needed**, D03 catalog indexing **only if worthwhile**, D05 top DB bottlenecks **only after authorization review**, D07 redacted operational telemetry. Continue work on cosmetic completeness and per-screen QA.

**Do not automatically ship every “1.1” ticket**: prioritize proven high-usage pain from release analytics and support. B06 auto-sell beyond current mass-craft safeguards belongs here if its live migration/race risk is high. E05 scaling enters 1.1 only if actual guild effort inequity is confirmed.

### 7.4 Medium-term product evolution

E05 contribution fairness if measured, E06 useful Home goal card, E07 smarter formation advice, D06 small internal source organization and production-like load testing. Update remaining tier sprite inventory as actual progression opens, not as a single oversized art requirement. Release cadence should follow content/test capacity rather than a declared calendar.

### 7.5 Long-term experimental / explicitly deferred

F01 living work scenes, F02 voluntary social presence, F03 deeper narrative event arcs, F04 desktop/web client, F05 additional cosmetic companion showcase. These need measured demand, battery/asset/hosting budget and privacy review.

**Explicitly postpone/reject:** unplanned MMO open player market; freely tradeable equipment; mass simultaneous offscreen character farms; paid power/gacha; forced daily chores/PvP/leaderboard ladder; GPS/3D realm; giant event-exclusive progression currency ecosystem; auto-travel activity queue; global always-on avatar polling; second duplicated inventory/companion authoritative database; separate battle RNG engine; sweeping DB index removal; replacing the entire app navigation during release hardening. Arena and Rankings remain release-flagged off until independently scoped/reviewed.

### 7.6 Incremental engineering work packages

| Package | Independently verifiable unit | Dependencies | Expected outcome |
| --- | --- | --- | --- |
| R0 | A01 starter contract and green CI rerun | Current `main` | Known build gate cleared or accurately scoped |
| R1 | A02 schema/version export and additive staging parity plan | Supabase access | Safe target for hosted acceptance |
| R2 | A03 auth-grant audit + A04 replay/race probes | R1, test identities | Security/accounting decisions based on evidence |
| R3 | A05/A08 signed device matrix | R0–R2 | Upgradeable and auditable AAB |
| R4 | B06/A07 split-stacks, offline cap and queue handoff fixtures | R0, R2 | No silent idle resource/reward loss |
| R5 | B04/B05 multi-account chat/co-op and Echo flows | R1–R3 | Multiplayer accepted or explicitly gated off |
| R6 | B07/B08 commerce/event date and payment QA | R1–R3 | Correct entitlements, event milestones |
| R7 | B09/B10 first-session and content reachability proof | R0, R4 | Honest core product |
| R8 | B03→B01→B02 companion usability | R0, R2, R7 | Owned roster, easy start, visible battle |
| R9 | C01–C08 targeted interaction/visual cleanup | R3, relevant R4–R8 | Polished mobile navigation, chat and rewards |
| R10 | D01/D04 baseline and resulting measured optimization | R3 | Proven performance outcomes, not assumptions |
| R11 | E-series experimental user-value tickets | 1.0 shipped, feedback | Focused, validated 1.1 improvements |

Parallelize only independent PRs. Never update production migrations and simultaneous paid-claim UI/handlers without coordination. Use feature flags and staged deployments where behavior/authority changes.

---

## 8. Dependency graph, verification gates and team ownership

### 8.1 Critical path (read as prerequisite -> dependent)

```text
Current source SHA + code inventory
  ├─ A01 failing starter type contract -> all broad mobile tests -> A05 AAB
  ├─ A02 staging / migration ledger -> A03 SQL auth -> A04 receipt integrity
  │                                   ├─ B04/B05 real multiplayer
  │                                   └─ B07/B08 event + commerce
  ├─ A06 release policy / AFK / flags -> A07/B10 launch-content truth
  └─ A08 repeatable QA manifest <- A05 / A02 / A03 / A04

A07 queue/resource truth + B06 storage correctness -> E01 queue suggestions
B03 owned roster + B01 pinned Trials + B02 real battle event playback -> E07 hints
B04/C07 guild membership truth + A03 privacy -> E04 discovery -> E05 fair quests
D01 on-device trace + D04 bundle trace -> optional D02/D03/D05 optimizations
Stable v1.0 + measured interest -> F01–F05 innovation experiments
```

### 8.2 Responsible specialties (roles, not assigned individuals)

| Discipline | Accountable deliverables |
| --- | --- |
| Release engineer | A01/A05/A08, manifest, Play test-track results and signed rollback |
| Backend/database owner | A02/A03/A04, server migration/receipt matrices, D05 |
| Gameplay systems | A07/B06/B07/B10, source-of-truth balances, catalog progression |
| Mobile/UX owner | B01/B02/B03/C01–C09, Android screenshots, input and TalkBack |
| Multiplayer/social owner | B04/B05/C07, two-account chats, rosters and private Echo boundaries |
| Commerce/identity owner | B08, secure linking, purchases/restores/RTDN |
| Art/localization/QA | C03/C04/B09, asset inventory and end-to-end first sessions |
| Product owner | A06 release scopes, monetization truth, what to defer, accept-risk signoffs |

### 8.3 Required test layers and scope

1. **Fast source checks:** TypeScript core/full mobile; Expo Doctor; backend typecheck/build; content/asset integrity and translations.
2. **Deterministic state tests:** offline clock/cap, queue, finance/production inventory, equipment stat seeds, Trial playback and reward fixture parity.
3. **Server/SQL access:** under anon/auth/service/test-account roles test claims, rejection of untrusted client values, guild/party membership, database idempotency and fresh migration chain.
4. **Hosted integration:** production-like separate staging accounts; cold/warm/reconnect, simultaneous claims, matchmaking/ready/votes and purchase verification with Google test accounts.
5. **Native acceptance:** signed Android AAB on target API/density/support devices; 320px/large font/TalkBack/keyboard, startup, motion reduction, image clipping.
6. **Performance:** opt-in QA capture and production-safe aggregate metrics, representative state sizes and before/after evidence; not synthetic “improved 30%” claims.
7. **Store/update:** old-version to new-version app data retained, credentials/manifest correct, Play supported-device warnings explained.

**Stop-the-line classes:** lost player progress, double-spend/claim, privilege escalation, account mixup, broken paid restore or false VIP entitlement, invalid upgrade path, missing critical assets preventing launch UI, release build CI failure, and visibly blocked required core action. Other issues can be triaged by severity and advertised scope rather than postponing release indefinitely.

---

## 9. Prioritization scorecard (planning scores, not observed usage statistics)

**Inputs 1–5 each:** I = user impact; F = frequency for affected player; R = reliability/data/security importance; C = competitive relevance; Q = evidence strength; E = implementation effort (1 localized, 5 major); G = regression probability/blast radius (1 narrow, 5 large). **Score = `3I + 2F + 3R + C + Q - 2E - G`.** Thus broad integrity risks can rank high even when ordinary users seldom trigger them. Values are expert estimates based on inspected source and qualitative market research, **not measured population data**. P0 release gates override numeric order. The Evidence H/M/L label is judgment of verification quality, not statistical confidence.

### Overall high-value tickets by calculated priority (excluding experiments)

1. **A01** — score **40**, 1.0 Required; priority P0 stability.
2. **A08** — score **40**, 1.0 Required; priority P0 stability.
3. **A05** — score **39**, 1.0 Required; priority P0 stability.
4. **A07** — score **39**, 1.0 Required; priority P0 stability.
5. **B04** — score **39**, 1.0 Required; priority Core experience.
6. **C06** — score **39**, 1.0 Recommended; priority Polish.
7. **A06** — score **38**, 1.0 Required; priority P0 stability.
8. **D01** — score **38**, 1.0 Required baseline; priority Optimization.
9. **B07** — score **37**, 1.0 Required; priority Core experience.
10. **B06** — score **36**, 1.0 Required; priority Core experience.
11. **C03** — score **36**, 1.0 Required safety; priority Polish.
12. **A04** — score **35**, 1.0 Required; priority P0 stability.
13. **B08** — score **35**, 1.0 Required; priority Core experience.
14. **A02** — score **34**, 1.0 Required; priority P0 stability.

**Quick wins:** A01 contract resolution once behavior is decided; B03 owned-first filter; C02 event acknowledgment/false reward trigger elimination; C05 explicit button labels; C06 remaining promise-aware action states; B01 top-level Trial Start UI. “Quick” means bounded code scope, **not guaranteed low test risk**.

**High-value investments:** A02–A05 environment/authority/Android acceptance, B05/QMode real-player journey, B06 resource safety, B02 true Trial playback, B10 launch-catalog reachability, D01 device measurement. These improve players' trust and VELDRYN's credibility more than new systems.

**Poor cost/benefit pre-1.0:** F02 large-scale presence/streaming, F04 web/PC parity, simultaneous character auto-farms, new 3D world renderer, open market/PvP economy and a wholesale React Native navigation rewrite. These multiply surface area before baseline reliability is known.

### Phase A — scorecard

| Ticket | I | F | R | C | Q | E | G | Score | Release | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| A01 | 5 | 4 | 5 | 3 | 5 | 2 | 2 | **40** | 1.0 Required | H |
| A08 | 5 | 4 | 5 | 3 | 5 | 2 | 2 | **40** | 1.0 Required | H |
| A05 | 5 | 5 | 5 | 4 | 5 | 3 | 4 | **39** | 1.0 Required | H |
| A07 | 5 | 5 | 5 | 5 | 4 | 3 | 4 | **39** | 1.0 Required | M |
| A06 | 5 | 4 | 4 | 4 | 5 | 2 | 2 | **38** | 1.0 Required | H |
| A04 | 5 | 5 | 5 | 4 | 4 | 4 | 5 | **35** | 1.0 Required | M |
| A02 | 5 | 4 | 5 | 4 | 5 | 4 | 5 | **34** | 1.0 Required | H |
| A03 | 5 | 3 | 5 | 4 | 5 | 4 | 5 | **32** | 1.0 Required | H |

### Phase B — scorecard

| Ticket | I | F | R | C | Q | E | G | Score | Release | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| B04 | 5 | 5 | 5 | 5 | 4 | 3 | 4 | **39** | 1.0 Required | H |
| B07 | 5 | 4 | 5 | 5 | 4 | 3 | 4 | **37** | 1.0 Required | M |
| B06 | 5 | 5 | 5 | 5 | 4 | 4 | 5 | **36** | 1.0 Required | M |
| B08 | 5 | 4 | 5 | 5 | 5 | 4 | 5 | **35** | 1.0 Required | H |
| B05 | 5 | 4 | 5 | 5 | 4 | 4 | 5 | **34** | 1.0 Required | M |
| B01 | 5 | 4 | 2 | 5 | 5 | 2 | 2 | **33** | 1.0 Recommended | H |
| B09 | 4 | 5 | 3 | 4 | 4 | 2 | 2 | **33** | 1.0 Required | M |
| B02 | 5 | 3 | 3 | 5 | 4 | 3 | 3 | **30** | 1.0 Recommended | H |
| B03 | 4 | 4 | 2 | 4 | 5 | 2 | 1 | **30** | 1.0 Recommended | H |
| B10 | 5 | 3 | 4 | 4 | 4 | 4 | 4 | **29** | 1.0 Required scope | M |

### Phase C — scorecard

| Ticket | I | F | R | C | Q | E | G | Score | Release | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| C06 | 5 | 5 | 4 | 4 | 5 | 2 | 3 | **39** | 1.0 Recommended | H |
| C03 | 5 | 5 | 4 | 4 | 4 | 3 | 3 | **36** | 1.0 Required safety | M |
| C05 | 4 | 5 | 3 | 5 | 4 | 2 | 2 | **34** | 1.0 Recommended | H |
| C02 | 4 | 5 | 3 | 4 | 4 | 2 | 3 | **32** | 1.0 Recommended | M |
| C07 | 4 | 4 | 3 | 3 | 5 | 2 | 2 | **31** | 1.0 Recommended | H |
| C01 | 4 | 5 | 2 | 4 | 4 | 2 | 2 | **30** | 1.0 Recommended | H |
| C08 | 4 | 4 | 2 | 4 | 4 | 2 | 2 | **28** | 1.0 Recommended | M |
| C04 | 5 | 4 | 2 | 5 | 3 | 4 | 3 | **26** | 1.0 Recommended scope | M |
| C09 | 4 | 4 | 2 | 5 | 3 | 3 | 3 | **25** | 1.1 Recommended | M |

### Phase D — scorecard

| Ticket | I | F | R | C | Q | E | G | Score | Release | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| D01 | 5 | 4 | 4 | 4 | 5 | 2 | 2 | **38** | 1.0 Required baseline | H |
| D04 | 4 | 4 | 4 | 4 | 5 | 3 | 4 | **31** | 1.0 Required baseline | H |
| D05 | 4 | 3 | 5 | 4 | 5 | 4 | 5 | **29** | 1.1 conditional | H |
| D07 | 4 | 3 | 4 | 3 | 4 | 3 | 4 | **27** | 1.1 | M |
| D02 | 4 | 4 | 2 | 3 | 4 | 2 | 3 | **26** | 1.1 Conditional | M |
| D03 | 4 | 4 | 2 | 3 | 3 | 2 | 3 | **25** | 1.1 Conditional | M |
| D06 | 3 | 3 | 3 | 3 | 5 | 4 | 5 | **19** | Medium-term | H |

### Phase E — scorecard

| Ticket | I | F | R | C | Q | E | G | Score | Release | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| E02 | 4 | 4 | 4 | 4 | 4 | 2 | 4 | **32** | 1.1 | M |
| E01 | 5 | 5 | 3 | 5 | 4 | 4 | 5 | **30** | 1.1 | M |
| E03 | 4 | 3 | 3 | 3 | 4 | 2 | 3 | **27** | 1.1 | M |
| E04 | 4 | 4 | 2 | 5 | 4 | 3 | 3 | **26** | 1.1 | M |
| E05 | 4 | 3 | 4 | 4 | 3 | 4 | 5 | **24** | Medium-term conditional | M |
| E06 | 4 | 4 | 2 | 4 | 3 | 3 | 3 | **24** | Medium-term | M |
| E07 | 3 | 3 | 2 | 4 | 3 | 2 | 2 | **22** | Medium-term | M |

### Phase F — scorecard

| Ticket | I | F | R | C | Q | E | G | Score | Release | Evidence |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| F01 | 4 | 4 | 2 | 5 | 3 | 5 | 4 | **20** | Long-term experiment | M |
| F02 | 3 | 3 | 4 | 4 | 2 | 4 | 5 | **20** | Long-term experiment | L |
| F03 | 4 | 3 | 2 | 5 | 3 | 4 | 4 | **20** | Long-term experiment | M |
| F04 | 3 | 3 | 4 | 3 | 2 | 5 | 5 | **17** | Long-term experiment | L |
| F05 | 3 | 2 | 2 | 4 | 2 | 4 | 4 | **13** | Long-term experiment | L |


### 9.1 Evidence/score update rules

- A confirmed failing CI gate has high evidence; a historical report of a bug **that current source already changed** loses confidence and becomes a **verification task**, not an automatic fix.
- When native analytics show a journey seldom used, lower F unless it is a required safety/security case; use crash/claims support incidents to raise R rather than fabricate retention rates.
- If a ticket includes an optional big feature along with core verification, **split it**: e.g. B06 core stack correctness is 1.0-required, advanced auto-sell expansion can be 1.1.
- Re-score after scope and dependencies are broken into small PRs. Do not use this relative number as a mandated release-date forecast.

---

## 10. Canonical decision history and supersession register

| Previous reference / assertion | Current reconciliation | Keep, defer or supersede |
| --- | --- | --- |
| `MVP_SCOPE.md`, `PROTOTYPE_ROADMAP.md` | Smaller **offline Fallen Knight prototype** than current production online RPG | **SUPERSEDED for launch completeness**; keep as historical milestone |
| `docs/V40_V51_RECONCILIATION.md` five-tab nav | `App.tsx` current six-tab Home/Character/Skills/World/Inventory/More | **SUPERSEDED** as current layout, keep migration record |
| V40–V51 24h-base/36h-max AFK claim | Oct21 release hardening and current README state 8h initial/24h free/30h max | **SUPERSEDED pending runtime test A06/A07**; don't choose hours from memory |
| `screen-code-audit-2026-10-17.md` T9 110/104 unreachable | Current equipment source reads 100/97, skill caps 100 | **SUPERSEDED as exact defect**; B10 prove all ingredients reachable |
| Oct17 fixed-height Event popup/no scroll | Current component contains `ScrollView` and generic CTA | **SUPERSEDED**; C02/C03/B07 confirm real native behavior |
| Oct17/older general loading/busy issues | Oct19 app-wide promise-aware loading work exists | **PARTIALLY RESOLVED**; C06 only confirmed holes |
| Oct22 queue reached-goal/wrong-region issues | Shared queue validation implemented and documented | **IMPLEMENTED, VERIFY REGRESSION**; A07 specifically tests late claims/time |
| “Missing GuildChat `./ChatViewport` causes broken build” | Actual `ChatViewport.tsx` present on audited main | **FALSE FOR AUDITED BASELINE**; verify actual chat at B04 |
| V52 “Guild board still concepts” | Oct26 Guild daily board/roles/chat changes live in source | **SUPERSEDED**; C07 Android acceptance, not full redesign |
| Older co-op concepts/non-NPC QMode assumptions | Production coop v18 with live rosters and NPC fallback/Echo logic | **SOURCE-PRESENT**; B05 needs devices and hosted concurrency |
| “Arena and Rankings are ready for public release” inferred from screen files | Both flags currently false | **DEFERRED**; not counted as launch features |
| “Pay only for cosmetics” simplification | VIP/VIP+/Supporter have rate/convenience entitlements per billing docs/README | **CORRECT MARKETING**; no false claim, no ad/gacha power additions |
| “Production RLS-off table is publicly accessible” inferred from one RLS-off | Auditor found no anon/auth SELECT privilege for this public table | **UNPROVEN** exposure; A03 checks full effective privileges |
| Supabase 57 unused indexes = 57 safe drops | Usage/advisor is insufficient for concurrent, maintenance, disaster queries | **REJECT mass dropping**; D05 per-index measured review |
| Tracked repo historical output = same size as AAB | `.easignore` excludes many; actual AAB bytes unmeasured | **REJECT equivalence**; D04 measure bundled size |
| Visual Trial battle missing completely | `CompanionTrialStage.tsx` has authoritative event playback | **SUPERSEDED**; B01 entry and B02 quality finish |
| Legacy Market and alternate companion schema from attached archive | Current source has server-owned social and account companion state, Market removed | **RETIRED**, keep migration history, never reimport archive tables |

**No historical document is deleted by this plan.** Any future status revision may add `Superseded by MASTER_DEVELOPMENT_ROADMAP.md at SHA ...` to older docs after approval; do not rewrite old release evidence as if it had always said the new truth.

---

## 11. Risk register, release guardrails and measurement

| ID | Risk | Severity | Detection | Mitigation / owner |
| --- | --- | --- | --- | --- |
| R-01 | CI compilation missing starter companion exports | **Blocking known** | Run Mobile core validation | A01 mobile/core |
| R-02 | Staging is not representative of production | **High known** | Migration/version/Edge hashes | A02 backend/release |
| R-03 | Incorrect RLS or definer function grant | **High potential, not proven breach** | SQL impersonation and production grant audit | A03 DB/security |
| R-04 | Lost/duplicate currency, XP or claims | **Critical potential** | Two-client duplicate/idempotency matrix | A04 gameplay/backend |
| R-05 | Invalid Play upgrade/identity/purchase recovery | **Critical potential** | Licensed tester, prior-build upgrades | A05/B08 release/commerce |
| R-06 | AFK/queue finite handoff discards eligible time | **High historical repro; current status unknown** | Late claim and split-stack fixtures | A07 gameplay |
| R-07 | Live/QMode appears present but fails on real clients | **High unverified** | Multi-device 1T/2D/1S, reconnect, Echo QA | B05 multiplayer |
| R-08 | Native keyboard/accessibility clips controls | **High UX potential** | 320px + 200% text + TalkBack QA | C03/C07 mobile QA |
| R-09 | Large assets/network requests create lag/compat regression | **Medium unmeasured** | Signed AAB size and request baseline | D01/D04 performance |
| R-10 | Monetization message contradicts entitlements | **High trust** | Play product ID/benefit truth table | A06/B08 product/commerce |
| R-11 | Future “clever” queue causes more work than it saves | **Medium product** | Steps/taps, cancel and opt-out telemetry | E01 UX/product |
| R-12 | More features push test/document migration drift | **High maintainability** | Release manifest and PR closure pack | A08/D06 engineering |

**Proposed UX measurement targets (agree after baseline):** first valid Trial from tab ≤2 taps without mandatory scroll; first easy craft and reward in a guided first session; no redundant reward popup after non-reward settings/chat actions; correct last 25 chat messages; one confirmation for all safe post-cap event claims. Hard numeric latency, frame-rate and crash-free percentage targets must be set from real baseline **before** evaluating optimizations; never assert targets have been achieved because of source review.

**Monetization integrity rule:** The user's product direction favors a friendly non-P2W environment, but the *existing effective* VIP and VIP+ advantages must be described accurately. Changing those is a product/economy migration requiring separate approval, backward compatibility and purchaser rights.

---

## 12. Sources, audit boundaries and durable handoff

### 12.1 Primary evidence (latest, then specific historical)

- [**Current repo / main**](https://github.com/elroynbenjamins/Veldryn) — inspect branch and SHA every session.
- [**CODEBASE_INVENTORY.md**](CODEBASE_INVENTORY.md) — comprehensive structural/read-only repository, production/staging and CI audit **28 Oct 2026**; source SHA `eb70bb3`.
- [**COMPETITOR_RESEARCH.md**](COMPETITOR_RESEARCH.md) — 14 competitor profiles, sample-limited dated reviews, feature matrix and 20 research opportunities **28 Oct 2026**. Its source register contains direct official, review and community links.
- [**README.md**](../README.md) — current technical/product/Android build description as of **Oct 2026**; self-described features need acceptance verification.
- [**QUEUE_RELIABILITY_AUDIT_2026_10_22.md**](QUEUE_RELIABILITY_AUDIT_2026_10_22.md) and [**QUEUE_CURRENT_HANDOFF_V1.md**](QUEUE_CURRENT_HANDOFF_V1.md) — repaired reached goals/region rules, 30-minute handoff.
- [**HOME_COMMAND_DECK_V1.md**](HOME_COMMAND_DECK_V1.md) — Home shortcuts/composer behavior and deliberate queue exclusions.
- [**NETWORK_REQUEST_QA_BASELINE.md**](NETWORK_REQUEST_QA_BASELINE.md) — defined but **unmeasured** Android scenario baseline.
- [**COMPANIONS_CURRENT_STATUS.md**](implementation/COMPANIONS_CURRENT_STATUS.md), [**COOP_CURRENT_STATUS.md**](implementation/COOP_CURRENT_STATUS.md), [**ONLINE_GAMEPLAY_STATUS.md**](implementation/ONLINE_GAMEPLAY_STATUS.md) — implementation/deployment boundaries and incomplete device validation.
- [**RELEASE_1_HARDENING.md**](implementation/RELEASE_1_HARDENING.md) — Oct21 backend claim validation, offline cap correction, remaining device/payment work.
- [**GOOGLE_PLAY_BILLING_V1.md**](implementation/GOOGLE_PLAY_BILLING_V1.md) — authoritative commerce product IDs, verification, refund/RTDN rules.
- [**guild-screen-review-2026-10-26.md**](implementation/guild-screen-review-2026-10-26.md) — current guild layout/role/chat refinements and lack of native QA.
- [**online-loading-feedback-2026-10-19.md**](implementation/online-loading-feedback-2026-10-19.md) — promise-aware busy feedback already built.
- [**screen-code-audit-2026-10-17.md**](implementation/screen-code-audit-2026-10-17.md) — historical verified defects, some now superseded by current code.
- [**V40_V51_RECONCILIATION.md**](V40_V51_RECONCILIATION.md) — retained historical branch milestones; old offline cap and navigation are not authoritative today.
- [**Mobile failed CI run**](https://github.com/elroynbenjamins/Veldryn/actions/runs/40591520567) and [**backend economy passed run**](https://github.com/elroynbenjamins/Veldryn/actions/runs/40591520391), both associated with app source baseline, checked **28 Oct 2026**.
- Direct competitor/source evidence is maintained in the source register of [**COMPETITOR_RESEARCH.md**](COMPETITOR_RESEARCH.md); its public research is sampled, not in-app usage proof.

### 12.2 Status ledger template for future agents

For **every** ticket, append or maintain a closeout entry in this file or linked release-tracking doc:

```text
Ticket: A01
Status: PLANNED | IN_PROGRESS | VERIFIED | BLOCKED | SUPERSEDED | DEFERRED
Start SHA / end SHA:
Owner (role):
App/backend schema/Edge/AAB versions:
Exact current-state repro:
Code changed (or no change required):
Unit/integration/SQL/device test commands + results:
User acceptance evidence (screen capture, transaction receipt, linked CI):
Open bugs / accepted risks / feature flag:
Documentation and migration compatibility updated:
Next dependent ticket:
```

**Start every coding session** by reading Sections 0–3 and then the relevant ticket. Fetch **today's actual files**; establish a failing test/reproduction; verify environment and dependencies; implement **only** that ticket's least invasive change; test; update ticket status/evidence; then choose the next unblocked dependency. If behavior is already correct, record a no-change `VERIFIED` result and move on. Do not assume any roadmap item has been implemented merely because this document was committed.

### 12.3 Research/deployment limitations

This roadmap is based on current GitHub source and documentation, the read-only codebase audit of production and staging, reviewed CI outcome and dated public competitor research. **No new application tests, Android builds, Supabase writes, production claims or paid purchases were executed for this roadmap.** Some previous tests and deployment claims are narrower than full functional sign-off. All effort/risk/impact scoring is relative engineering judgment. On-device, user and load findings must be measured before treating performance or conversion hypotheses as proven.

**Roadmap definition of success:** A stable, upgradeable and secure Android idle MMORPG whose normal activities, guild/co-op, companions, event rewards and purchase recovery are understandable and trustworthy—with mature pixel-art feedback and clear progression—rather than the largest quantity of partially finished systems.


### Companion layout design proposal — 2026-10-28 (not implemented)

- **PROPOSED, pending product review:** [COMPANION_UX_REDESIGN.md](COMPANION_UX_REDESIGN.md) proposes four direct player-intent tabs **Roster / Trials / Expeditions / Sanctuary**, moves Training/Bond/Ascension/Techniques and personal Quarters into a selected companion detail, keeps Codex one tap from Roster, puts the Trials formation and Start action above the tower/reward text, consolidates Expedition team/food/setup and uses compact Sanctuary facility tiles.
- The proposal updates the **implementation sequencing** of B01/B02/B03/C05/C07 but **does not change their verified status or claim any code has been implemented**. Consult the UX spec *before* merging draft [PR #617](https://github.com/elroynbenjamins/Veldryn/pull/617), whose legacy Training-tab UI would otherwise become a competing layout. Reuse its pure roster selector/tests where useful.
- **Do not implement as a single rewrite.** Capture Android baseline; extract one screen at a time preserving all server-owned commands, roles, economy, month/event gates and local navigation. A01 CI and production/staging integrity remain release priorities.

### Mobile Guild/Chat compiler restoration — 2026-10-28 (review branch)

- **IMPLEMENTED IN DRAFT PR #621; VERIFICATION PENDING:** restored `ChatOverlay.initialChannel` (including Guild membership loading handoff), Guild role/recruitment context helpers, management-link permission prop, dev-only preview wrapper, and ten social translation keys. New typed Guild social regression test registered. **No merge, deployment, SQL or gameplay changes.**
- **Evidence:** First CI of PR #621 eliminated the original 16 Guild/Chat TypeScript errors, exposing only a duplicated `GuildManagementRole` alias in the fix. The duplicate was corrected in commit `72426519`; subsequent latest-SHA compilation must be read before marking successful. Backend/SQL integrity passed in run `40675228729`. See [MOBILE_GUILD_CHAT_TYPECHECK_2026_10_28.md](implementation/MOBILE_GUILD_CHAT_TYPECHECK_2026_10_28.md).
- **Still blocked (A01):** Eleven TS errors in `starter-companion-choice.ts` reference absent core APIs/account fields. Do not treat that future-choice specification as shipped or suppress failures. Design/implement an approved, migration-safe role-aware starter behavior **or explicitly reconcile the test with canonical gameplay through separate reviewed work** before claiming core validation is green.
- **Branch relationships:** Guild/Chat fix #621 is independent of Companion UI #619. Do not merge overlapping branches by manual file overwrite or report #619 as buildable until it includes an approved compatible fix and CI runs on the combined head.
