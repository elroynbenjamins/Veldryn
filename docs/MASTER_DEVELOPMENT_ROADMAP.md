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

