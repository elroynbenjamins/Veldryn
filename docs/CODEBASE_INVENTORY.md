# VELDRYN — CODEBASE INVENTORY & FEATURE AUDIT

**Audit date:** 2026-10-28 (Europe/Amsterdam)  
**Repository:** [elroynbenjamins/Veldryn](https://github.com/elroynbenjamins/Veldryn)  
**Source baseline:** main @ [eb70bb3321964c824d4e4307c413bb8971745666](https://github.com/elroynbenjamins/Veldryn/commit/eb70bb3321964c824d4e4307c413bb8971745666), committed 2026-10-27 22:01 UTC  
**Mode:** Read-only application audit. This Markdown inventory is the only repository change.  
**Priorities:** Actual source > present deployment/schema > test execution evidence > documentation > design workbooks.

> **Verification boundary.** This is a structural repository-wide inventory with selective source-level tracing, a read-only inspection of connected production and staging Supabase projects, and inspection of the latest GitHub Actions runs. It is **not** a complete line-by-line audit of every source file, a security penetration test, a full database-function audit, or device acceptance testing. No test command, app build, live write, or player transaction was initiated during this audit. Treat identified verification gaps as open. “Source present” never proves a user can operate a feature.

## 1. Executive summary

VELDRYN is a React Native / Expo mobile-first idle MMORPG with a substantial shared TypeScript gameplay domain, a server-authoritative online mode, Supabase Auth, PostgreSQL migrations/RPCs, Edge Functions, optional legacy offline/local play, realtime and cached social chat, and a Google Play billing integration. The codebase is much larger than the original prototype and includes many retained historical outputs.

**Immediate release blocker (F-01):** The GitHub Actions run [Mobile core validation #40591520567](https://github.com/elroynbenjamins/Veldryn/actions/runs/40591520567) on the baseline commit **failed** in the core TypeScript step. The file apps/mobile/tests/starter-companion-choice.ts expects three exports missing from apps/mobile/src/core/combat-companions.ts, and fields not defined on account-state types. The job logged 11 TypeScript diagnostics and exited 2. Later steps, including full mobile typecheck, billing checks and broad core/onboarding/co-op tests, were skipped. The separate [Release economy validation #40591520391](https://github.com/elroynbenjamins/Veldryn/actions/runs/40591520391) **passed** its own backend typecheck, release-economy test and two backend smoke tests; this does not clear the mobile blocker.

**Release-state distinction (F-02):** Production and staging are materially divergent, not equivalent deployment targets: production has 277 applied migrations and Edge gameplay v37 / coop v18 / billing v8 / billing RTDN v10, whereas staging has 186 migrations and gameplay v2 / coop v11, with no billing Edge Functions in its active function listing. Staging coverage cannot be generalized to production without explicit version parity tests.

**Schema-history distinction (F-03):** The main repository and production each list 277 migrations, but 10 version+name identities appear only on each side. Most are history-reconciliation filename changes; the Q-Mode NPC fallback carries a different version identifier. Do not blindly replay or rename migrations.

**Feature availability distinction (F-04):** Source files and screen classes exist for Arena and Rankings, but apps/mobile/src/core/release-flags.ts explicitly sets ARENA_RELEASED=false and RANKINGS_RELEASED=false. MoreScreen disables Arena and filters Rankings. They must not be counted as released.

**Known resolved suspicion (F-05):** GuildChat.tsx imports ./ChatViewport, and apps/mobile/src/components/ChatViewport.tsx **does exist** in the inspected baseline. The previously suggested missing-module error is not present at this path on the baseline commit. Actual sending, socket and history UI still require live device validation.

**Operational/performance unknowns (F-06):** The repository contains request-metrics instrumentation and caching improvements, but docs/NETWORK_REQUEST_QA_BASELINE.md explicitly records no measured Android before/after network traffic. Live chat/socket, performance and screen-transition benefits are not established by the unit tests or static source alone.

**Database advisory findings (F-07):** Production Supabase advisors report 130 unindexed foreign keys (INFO), 117 RLS initial-plan optimizations (WARN), 57 unused-index notices (INFO), two multiple permissive policy warnings for public.chat_messages (WARN), and 132 authenticated-executable SECURITY DEFINER function warnings. Each requires threat-model and query-plan review; counts are **not** proven breaches or instructions to automatically add/drop indexes or change RPC privileges. Guest sign-in is intentionally supported and makes some anonymous-role warnings context-dependent.

## 2. Evidence hierarchy, status definitions and audit coverage

- **Complete and verified:** Has demonstrated working implementation and relevant executed automated or hosted/device behavior evidence for its stated scope. **None of the broad end-to-end feature groups below are awarded this label unconditionally** based solely on source or prior claims.
- **Implemented but requiring refinement:** Code/UI/backend exists in one or more traced paths; at least one integration, quality or release gate remains unverified.
- **Partially implemented:** Some layers, workflows or boundary conditions exist while another required layer is missing, disabled or not demonstrated.
- **Broken or unreliable:** Directly observed failing gate or demonstrably inconsistent source contract. Scope the defect precisely.
- **Planned but not implemented:** Design/spec or scaffolding only, or explicitly unreleased feature.
- **Deprecated or unused:** An explicit retirement signal, feature flag, old migration or archive; not a claim that every reference is dead.
- **Duplicated or conflicting:** Multiple source versions, reference assets or conflicting documentation require dependency checks before removal.

**Inspected directly:** Repository metadata/branch/commit; recursive trees for mobile, mobile/src, mobile tests, backend, backend/src, backend/online, backend/supabase, migrations and workflows; selected App.tsx ranges, entrypoints, gameplay/online repositories, QMode, chat, billing, release flags, queue docs, backend release docs, EAS/Metro configuration, backend and mobile package scripts, CI step/log output, live Supabase schemas/migrations/functions/advisors; mounted historical design workbooks as reference.

**Indexed/covered by tree only, not read line-by-line:** the majority of 857 mobile source files, 303 mobile test files, 383 backend server source files, 277 migration SQL bodies, over 1,000 art assets, control-center and guild-shop packages, most documentation, marketing and legacy versions. Individual feature-row test names indicate an **existing test file or suite**, not necessarily a test executed in this audit.

**Not inspected/verified:** production player flows with authenticated user sessions; RLS adversarial tests; native runtime, physical Android/iOS screens, AAB signing or Play Console upgrade acceptance, runtime profiling, full query EXPLAIN plans, production logs and every stored function body, transactional payment/restore, complete asset reference graph, and exhaustive unused-code reachability. Staging/production data inspection was read-only. The locally supplied historical ZIP is not treated as equal to HEAD.

## 3. Architecture and application boot

### 3.1 Main execution paths

1. **Native entry:** apps/mobile/index.js → apps/mobile/App.tsx. The application wraps auth, player-badge and party-social providers, selects a startup scene, uses explicit tab state and conditionally renders screen components. There is no evidence in this entrypoint of a file-based routing framework; navigation is driven by App.tsx, primary-tab-routing.ts, MoreScreen.tsx, and early feature gates.
2. **On-device/local gameplay:** apps/mobile/src/storage/async-storage-repository.ts and apps/mobile/src/core/game.ts / game-commands.ts / types.ts store and execute normalized state locally when server gameplay is disabled. Save import/export routes exist and are explicitly blocked from replacing online server-owned progress.
3. **Online gameplay:** apps/mobile/src/online/AuthSessionProvider.tsx → useOnlineGame.ts → online/gameplay.ts → core/online-game-repository.ts → authenticated GET/POST to /functions/v1/gameplay. Pending commands carry request IDs, expected versions and local retry state. Successful server response is authoritative.
4. **Trusted server:** backend/online/edge.ts and backend/online/gameplay.ts dispatch commands; backend/online/coop-edge.ts, coop.ts and related files handle dungeon modes, Echo, LFG, matching, ready and shared run behavior. Service-role RPCs, PostgreSQL state/receipts and database clocks are the trusted authority.
5. **Build artifact generation:** tools/build-online.mjs bundles the tested backend/online Edge entrypoints using esbuild into backend/supabase/functions/gameplay/index.ts and coop/index.ts; both generated files exist and are multi-megabyte blobs. GitHub file-preview endpoint returned empty for these large blobs, **not** evidence of empty source. The build process and hashes require release verification.
6. **Social/realtime:** apps/mobile/src/online/supabase.ts configures a publishable Supabase client; useChatFeed.ts opens scoped Realtime channels and uses authoritative history reads, shared in-memory caches and scheduled fallback/watchdog refresh.
7. **Commerce:** apps/mobile/src/online/play-billing.ts and commerce UI integrate Google Play purchases; billing and billing-RTDN Edge Functions contain verification logic. Current production function listings show them active; actual purchases and restores were not exercised.

### 3.2 Frameworks and key configuration

| Component | Verified evidence | Notes |
| --- | --- | --- |
| Mobile | apps/mobile/package.json, App.tsx, app.json | Expo / React Native / TypeScript; package name veldryn-offline-prototype 1.0.1; Android package com.elroybenjamins.veldryn; portrait |
| Navigation | App.tsx, src/core/primary-tab-routing.ts, src/screens/MoreScreen.tsx | Bottom routes Home / Character / Skills / World / Inventory / More; manual secondary navigation/history |
| State/repository | src/core/types.ts, game-commands.ts, online-game-repository.ts, useOnlineGame.ts | Shared offline game state and server-authoritative command flow |
| Backend domain | backend/src/server/** and backend/online/** | TypeScript gameplay/co-op/combat/equipment/companions/social domains |
| Database | backend/supabase/migrations/*.sql and live Supabase | PostgreSQL 17, RPCs, RLS, receipts, worker/settlement tables |
| Edge Functions | backend/supabase/functions/**, backend/online/edge.ts, coop-edge.ts | Four active production functions; backend bundling pipeline |
| Authentication | src/online/supabase.ts, AuthSessionProvider.tsx, account.ts, google-signin.ts | Supabase Auth, PKCE, guest bootstrap, SecureStore chunking |
| Payments | src/online/play-billing.ts; backend/supabase/functions/play-billing/** | Google Play one-time and subscription handling surfaces |
| Build/distribution | apps/mobile/eas.json, metro.config.js, .easignore, app.json, .github/workflows/*.yml | EAS profiles, monorepo shared backend source, Metro guard, CI |
| Assets/localization | apps/mobile/assets/**, src/theme/**, src/i18n/** | Large art library, theme/i18n systems; runtime import completeness not exhaustively checked |
| Auxiliary tooling | control-center/**, packages/guild-shop/**, tools/** | Existence verified structurally; deployment/usage not exhaustively traced |

**Potential architectural constraints:** App.tsx is 699 lines and coordinates routing, persistence, timers, tutorials, UI state, rewards and the online path. Several domains have parallel versions (equipment screen v24/v31/v32/v33, historical events, older schema references); do not delete anything until runtime imports and data dependencies are mapped. The online gameplay branch maps allowed state modifications to commands and rejects arbitrary local mutations (App.tsx commit path).

## 4. Frontend routes and UI accessibility

The **34 existing screen source files** in apps/mobile/src/screens are: AccountBonuses, Achievements, ActivityOverview, AdminQa, AdventurersJournal, Arena, Bestiary, Character, ClassSelect, Collections, Combat, Companions, CoopExpedition, CoopUiGallery, DailySupplies, Event, Friends, Guild, Home, Inventory, MasteryHall, More, PetBonusOverview, ProfileCustomize, Profile, Quest, Rankings, RewardsInbox, Settings, Skills, Social, Store, WorldMilestoneFeed and World.

- **Primary visible navigation:** Home, Character, Skills, World, Inventory, More; App.tsx constructs this explicitly.
- **Secondary/navigation-driven:** Combat, Coop, Events, Guild, Social/Party, Quests, Daily Supplies, Account Bonuses, Collections, Companions, Settings, Profile, profile customization and other destinations are routed through App.tsx and MoreScreen; individual unlock gates and account state determine visibility.
- **Store:** MoreScreen maps its Store destination into Settings with section=store, rather than necessarily rendering a standalone StoreScreen. This matters for audits that count screen files as accessible routes.
- **Admin QA:** account app_metadata and internal UI conditions control access. Existence of AdminQaScreen does not imply general player exposure.
- **Arena:** present as disabled “In Development”; ARENA_RELEASED=false and ArenaScreen renders a future-feature view.
- **Rankings:** RANKINGS_RELEASED=false; MoreScreen filters it and App.tsx guards the rendered route.
- **Co-op UI Gallery:** development/internal UI, not production gameplay evidence.
- **Account/guest:** an anonymous user is bootstrapped on launch in online mode if not already signed in. Payment flow requires a secured, non-anonymous account; this is an intentional product rule.

**UI end-to-end verification** requires actual Android tests for scroll, compact density, modal flow, screen transitions, network/retry states, accessibility and save/restore. Component presence is supporting, not conclusive.

## 5. Major feature inventory

**Legend:** UI = visibly routed/conditionally routed, Dev = development-only, Gate = disabled, Unknown = not demonstrated. “Test evidence” means available source/test surface unless specifically labelled executed in CI. Layer descriptions are observed integration paths rather than blanket production sign-off.

| Subsystem / intended feature | Implementation / UI and backend linkage | Status | Coverage and unresolved checks |
| --- | --- | --- | --- |
| Startup, version gate, update notice | App.tsx, StartupScreen.tsx, UpdateRequiredScreen.tsx, src/online/app-version-gate.ts, WhatsNewModal.tsx | Implemented but requiring refinement | Version-gate tests exist; cold launch, update redirect and real-device startup not tested here |
| Guest, password, account linking and recovery | AuthSessionProvider.tsx, src/online/account.ts, account-recovery.ts, core/auth-account-link.ts; Supabase Auth | Implemented but requiring refinement | auth-account-link.cjs and online docs; email/PKCE recovery on device unverified |
| Character creation / roster / identity | ClassSelectScreen.tsx, ActivityOverviewScreen.tsx, core/character-creation.ts, account-roster.ts, name logic, online gameplay | Implemented but requiring refinement | Onboarding/roster tests exist; live name uniqueness, guest conversion and deletion unverified |
| Main navigation, top activity bar, shortcuts | App.tsx, PrimaryNavigation.tsx, GameTopBar.tsx, ActiveActivityBar.tsx, primary-tab-routing.ts | Implemented but requiring refinement | Runtime route wiring seen; device tap/back-swipe, a11y and navigation performance unverified |
| Home overview / Command Deck | HomeScreen.tsx, HomeCommandDeck.tsx, HomeQueueComposer.tsx, core/dashboard.ts | Implemented but requiring refinement | Home visible; Home handoff and UX contract tests exist; device behavior unverified |
| Combat hunting / regions / tactics | CombatScreen.tsx, core/combat-*.ts, backend/src/server/combat/**, backend/online/regional-combat.ts | Implemented but requiring refinement | Backend smoke and combat tests exist; balance, server/device reconciliation and effects need full runtime checks |
| Gathering and professions | SkillsScreen.tsx, core/game.ts, processing.ts, regional-gathering.ts, backend/server activities/crafting and authoritative commands | Implemented but requiring refinement | Numerous core tests; activity count vs stacks, storage ownership and long AFK session need scenario QA |
| Action Queue and stop conditions | core/activity-queue.ts, activity-stop-presentation.ts, game-commands.ts, ActionQueuePanel.tsx, HomeQueueComposer.tsx | Implemented but requiring refinement | docs/QUEUE_RELIABILITY_AUDIT_2026_10_22.md; action queue tests exist, but current broader mobile CI stops before test:core |
| Local idle/offline settlement and welcome-back | core/game.ts, idle-rules-v40.ts, welcome-back-v46.ts, storage/async-storage-repository.ts | Implemented but requiring refinement | Local settlement and save tests exist; offline cap, focus/resume and long sleep not verified on device |
| Online authoritative progress/reward settlement | online/gameplay.ts, online-game-repository.ts, backend/online/gameplay.ts, Supabase RPCs | Implemented but requiring refinement | Production Edge gameplay v37 active, server receipts exist; authenticated hostile/replay smoke not executed in this audit |
| Inventory / stack operations / Bank | InventoryScreen.tsx, core/inventory-bulk.ts, core/game.ts, backend server inventory/economy RPCs | Implemented but requiring refinement | Inventory and bank tests exist; actual split-stack, cap, bank sell/withdraw and concurrent sessions need verification |
| Equipment, generated instances, crafting queues | CharacterScreen.tsx, equipment UI/core versions, backend/server/equipment/**, item instances and socket tables | Implemented but requiring refinement | Many crafting/instance/gem tests; mass-craft retention limit, on-device renders and online schema parity require testing |
| Stat & effect gems / sockets | core/gem-progression-v1.ts, equipment enhancements, GemArtwork.tsx, backend equipment/combat | Implemented but requiring refinement | Gems regression suites exist; verify server ownership, upgrade/salvage and all rarity boundary cases |
| Food, cooking, alchemy, processing | Skills/inventory UI; core/alchemy.ts, processing.ts, crafting-catalog.ts; server commands | Implemented but requiring refinement | Recipes and resources authored; evaluate ingredients across inventory+bank+overflow and multi-job quantity checks |
| Story/quests/contracts/weekly orders | QuestScreen.tsx, QuestBoard.tsx, core/quest-*, weekly-orders-v41.ts, server online game | Implemented but requiring refinement | Tests for quests/weekly orders; claim idempotency/locked contracts and world unlocks need device confirmation |
| Faith/exploration and professions mastery | core/faith.ts, long-term-progression-runtime.ts, MasteryHallScreen.tsx, ProfessionMasteryPanel.tsx | Implemented but requiring refinement | Test files and content exist; verify unlocks, offline progress and account-wide effect end to end |
| Pets, cosmetics and collectibles | CollectionsScreen.tsx, PetBonusOverviewScreen.tsx, core/pet-collection.ts, collectibles.ts, profile UI | Implemented but requiring refinement | Core pets/collectible tests exist; equip vs passive bonuses, icon/art policy and event source limits unverified |
| Combat companions / growth / sanctuary | CompanionsScreen.tsx, core/combat-companions.ts, backend/server/companions/** | **Broken or unreliable (starter-choice contract); other companion systems implemented** | F-01: starter-companion-choice.ts uses missing exported APIs/state fields; CI core compilation fails. Do not infer all companion gameplay broken |
| Squad/companion-only future competitive modes | core/arena-squad.ts, backend/server/squads/**, ArenaScreen.tsx | Planned but not implemented (player-facing release) | ARENA_RELEASED=false; source scaffolding and tests do not constitute a launched, authenticated Arena |
| World progression, weather, world bosses | WorldScreen.tsx, world-weather.ts, regional-content-v21.ts, shared-world-v19.ts, backend/server/shared-world/** | Implemented but requiring refinement | Backend domain and migration surfaces; timing, encounter availability, reward authorization not live tested |
| Live calendar/event hub, limited-time rewards | EventScreen.tsx, core/live-events.ts, rotating-events-v50.ts, backend/online/event-expedition-runtime.ts, Supabase live_events | Implemented but requiring refinement | EVENTS_RELEASED=true, live_events table populated; every event's active date/gating/reward claim not verified |
| Seasonal event co-op expeditions | CoopExpeditionScreen.tsx, backend/online/event-expedition-runtime.ts, docs/implementation/COOP_CURRENT_STATUS.md | Partially implemented / release gate not independently verified | Oct25 docs call some routes preview-only; later transport source exists. Must inspect current handler, entitlements and hosted end-to-end before status change |
| Co-op Q-Mode, Echo sharing and NPC fallback | CoopExpeditionScreen.tsx, src/online/coop-qmode-source.ts, backend/online/qmode-runtime.ts, coop-entry.ts; published Echo / coop snapshots | Implemented but requiring refinement | Current CI NPC composition and online typecheck steps passed; production coop Edge v18; physical mode start/recruit/claim not tested |
| Live dungeons, matchmaking, ready and voting | LiveDungeon* UI, backend/online/live-queue.ts, live-ready.ts, live-runtime.ts and Supabase coop tables | Implemented but requiring refinement | Dedicated co-op backend suites and previous hosted claims; user count/role/refill/reconnect/timeout physical QA remains |
| Co-op LFG, loadout/readiness | backend/online/coop-lfg.ts, coop-loadout.ts, coop-entry.ts, mobile coop client and presentation | Implemented but requiring refinement | Server entry derives role and stats, not client; UI recruitment and TTL checks need live verification |
| Parties, contracts and ranked mini-events | SocialScreen.tsx, PartyHubPanel.tsx, src/online/party-social.ts, backend party/social/RPC schema | Implemented but requiring refinement | Tables, domain and UI exist; party activity progress/expired posts/rewards not user-session tested |
| Friends/blocks/invites | FriendsScreen.tsx, src/online/social*.ts, notification counts, Supabase friend requests and friendships | Implemented but requiring refinement | Database and UI paths exist; privacy, caching and race conditions require live multi-account tests |
| World, guild and party chat | ChatOverlay.tsx, ChatLog.tsx, GuildChat.tsx, ChatViewport.tsx, useChatFeed.ts, database chat_messages | Implemented but requiring refinement | Confirmed import path exists; SQL chat retry/read-cursor CI step passed; message rendering, 25-message cap, realtime and member privacy require device tests |
| Guild management, chat, projects and PVE | GuildScreen.tsx, OnlineGuild* panels, backend/server/guild/**, guild RPCs | Implemented but requiring refinement | DB tables and many test surfaces; verify invitations, member controls, raid claims and member-scope RLS |
| Guild token shop, cosmetics and construction | GuildTokenShopView.tsx, GuildShopPanel.tsx, backend/online/guild-shop-read.ts, packages/guild-shop/** | Implemented but requiring refinement | Active gameplay Edge routes; SQL and UI tests exist; catalogue/reward source, balances and entitlement reconciliation require hosted checks |
| Profile styling, portraits, cosmetics and public power | ProfileScreen.tsx, ProfileCustomizeScreen.tsx, profile components, online/profile-extension-v43.ts and coop public power | Implemented but requiring refinement | Multiple profile controls and policies; verify saved changes, recipient restrictions, cache invalidation and lag on real devices |
| Rankings/prestige boards | RankingsScreen.tsx, backend rankings sources, mobile/core/release-flags.ts | Planned but not implemented (player-facing release) | RANKINGS_RELEASED=false; More hides route |
| Achievements/records/journal | AchievementsScreen.tsx, AdventurersJournalScreen.tsx, BestiaryScreen.tsx, core achievements/journal/mastery | Implemented but requiring refinement | Backend achievement modules and mobile tests; UI route and claim reconciliation vary by section, requiring reachability check |
| Daily Supplies / account benefits / rewards inbox | DailySuppliesScreen.tsx, AccountBonusesScreen.tsx, RewardsInboxScreen.tsx, backend rewards/ledger | Implemented but requiring refinement | Claim interfaces and online state; concurrent claims and receipt-driven UI transitions need verification |
| VIP/VIP+/Supporter; purchase and restore | Settings store, GooglePlayCommercePanel.tsx, online/play-billing.ts, Supabase play-billing and RTDN functions | Implemented but requiring refinement | Production functions ACTIVE; guest restriction in code; current mobile billing CI skipped; sandbox purchase, refund, renewal, RTDN and restore untested |
| Settings, localization, themes, accessibility | SettingsScreen.tsx, src/theme/**, src/i18n/**, core/save-normalization.ts | Implemented but requiring refinement | Many locale files and tests; all screens/theme states and text-scale clipping not exhaustively verified |
| Admin QA, telemetry and liveops | AdminQaScreen.tsx, core/network-request-metrics.ts, backend/server/control-center/**, control-center/** | Implemented but requiring refinement | Opt-in HTTP counter exists; Admin QA authorization and control-center runtime deployment not fully inspected; no device baseline traffic measured |
| Discord announcements and operations | backend/src/server/discord/**, backend/README.md | Partially implemented / deployment not verified | Publisher source and CLI guide exist, but no bot deployment/runtime evidence in this audit |
| Legacy player Market / auction concepts | Old migration 20260831000900_market.sql, later remove_player_market migrations, design workbook | Deprecated or unused (intended current player-facing Market) | No MarketScreen in inspected 34 screens; new gameplay policy removed player market. Do not delete historical SQL or dependent code |
| Retained historical versions and generated exports | apps/mobile/.*-export, art-review, backend/data recipe versions, migration reconciliation stubs | Duplicated or conflicting candidates | Many generated bundles/art archives; no complete import/reference analysis, so no deletion authorization |

**UI/backend/database reconnection caveat:** Current live database table presence or active Edge Function status is deployment evidence, not proof that every row above has complete bidirectional UI/API/RPC/settlement behavior. The feature rows intentionally avoid “Complete and verified” when that proof is absent.

## 6. Database, migrations and security

### 6.1 Hosted database facts (read-only queries, 28 Oct 2026)

Production project nyjwigipamnvpdvpauuv: ACTIVE_HEALTHY, PostgreSQL 17.6, 276 public base tables and 30 private base tables, 376 public and 16 private functions, 277 applied migrations. RLS enabled on 275/276 public tables and 25/30 private tables. The one public table without RLS, public.event_expedition_daily_clears, has **no SELECT privilege for anon or authenticated** in the checked catalogue; do not characterize it as exposed without testing other privileges, grants and RPC paths. Production has active Edge Functions gameplay v37, coop v18, play-billing v8 and play-billing-rtdn v10.

Staging project iqfmmpvwanvvmxcftfxw: ACTIVE_HEALTHY, 252 public tables, 186 applied migrations, active gameplay v2 and coop v11 in its function list. This is non-parity with production and invalidates blanket “staging passed, production is identical” assumptions.

### 6.2 Migration-history identity drift

The checked-in directory backend/supabase/migrations contains 277 SQL files; hosted production lists 277 applied migrations, but comparing the full version+name identities yields 10 repository-only and 10 production-only entries.

| Repository-only filename stem | Production-only filename stem | Interpretation |
| --- | --- | --- |
| 20261002072017_reconciled_remote_history | 20261002072017_staff_account_social_isolation | Same version, different label |
| 20261002194315_reconciled_remote_history | 20261002194315_guild_standard_eight_hour_effort | Same version, different label |
| 20261002204048_reconciled_remote_history | 20261002204048_veilbreak_october_release | Same version, different label |
| 20261002214431_reconciled_remote_history | 20261002214431_restore_commerce_redemption_codes | Same version, different label |
| 20261004215500_reconciled_remote_history | 20261004215500_online_game_commerce_projection | Same version, different label |
| 20261005060028_reconciled_remote_history | 20261005060028_coop_profile_icons | Same version, different label |
| 20261005065933_reconciled_remote_history | 20261005065933_chat_delivery_read_cursors | Same version, different label |
| 20261029000100_reconciled_remote_history | 20261029000100_veilbreak_dungeon_rewards | Same version, different label |
| 20261040000000_reconciled_remote_history | 20261040000000_guild_marks_shop | Same version, different label |
| 20261104000000_qmode_npc_fallback | 20261027220131_qmode_npc_fallback | **Different version**, matching descriptive name; must compare actual effects and order |

Some names are non-calendar pseudo-versions; PostgreSQL records migration IDs as strings. No migration was modified/applied during this audit. Determine whether these represent approved historical repairs and verify actual function/schema definitions, checksums and deploy chronology rather than reapplying them based on filenames.

### 6.3 Supabase advisor audit queue

| Advisor | Prod count | Interpretation / appropriate next test |
| --- | ---: | --- |
| Unindexed foreign keys | 130 | INFO: inspect actual JOIN/DELETE workloads and EXPLAIN before adding indexes |
| RLS initial-plan optimization | 117 | WARN: consider policy expression evaluation and plan cost, verify equivalence/security |
| Unused indexes | 57 | INFO: low traffic can produce false-positive “unused”; do not auto-drop |
| Multiple permissive policies on chat_messages | 2 | WARN: audit SELECT policy OR semantics, membership changes and anonymous guest behavior |
| SECURITY DEFINER executable by authenticated | 132 | WARN: highest security review priority: restrict execution/validate actor, ownership, search_path and idempotency per RPC |
| RLS enabled without policy | 172 | INFO: often desired for private/service-role-owned tables; verify direct API grants rather than adding policies blindly |
| Anonymous sign-in RLS role warnings | 125 | WARN context-dependent: anonymous users are authenticated-role guests; audit privileged capability policies |
| Leaked-password protection | 1 | Check hosted Auth setting; improve independently of gameplay as appropriate |

Reference: [Supabase database linter](https://supabase.com/docs/guides/database/database-linter); [SECURITY DEFINER advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable); [RLS init-plan advisor](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan).

**No security failure is claimed solely from an advisor count.** The database allows guest sessions, uses server-owned private tables, and relies on numerous protected RPCs; concrete privilege proofs are mandatory before changing policy.

### 6.4 Data ownership and network behavior

- online-game-repository.ts keeps uncertain commands in a device-persisted pending store, enforces account identity and server revision acceptance, and queues command execution. Confirm uncertain POST replay against hosted receipts, not only TypeScript.
- online/gameplay.ts sends authenticated requests with a 25-second abort and uses server response state. App.tsx refuses local JSON replacement in online mode except mapped profile/settings/stop routes.
- online/useChatFeed.ts uses a per-account cache, foreground socket, queued change batching, 15-second disconnected refresh, 60-second subscribed watchdog and old-entry eviction. Verify no repeated channel subscriptions, stale membership leak or increased battery/network use on actual devices.
- core/network-request-metrics.ts and docs/NETWORK_REQUEST_QA_BASELINE.md define safe HTTP sampling, but do not include real measurements. Realtime websocket frames are excluded.

## 7. Test inventory and observed execution

### 7.1 Test surface

- **Mobile:** 303 direct test files under apps/mobile/tests; commands include test:core, test:onboarding, test:online, test:companions, test:pets, test:collectibles, test:gems-v1, test:rankings, test:localization, test:guild-ui and others in apps/mobile/package.json. Tests span activities, queues, gameplay, UI contracts, payments, events and assets.
- **Backend:** numerous tests under backend/src/server/**/__tests__, backend/online/tests and backend/supabase/tests (24 SQL test files in tree). backend/package.json exposes backend smoke, co-op phases, release economy, backend online and targeted suites.
- **CI:** 10 workflows in .github/workflows; coverage differs by path filters and workflow step order, so one passing workflow is not a universal release gate.

### 7.2 Latest executed GitHub Actions evidence (baseline SHA)

| Run | Actual outcome | Executed evidence | Gaps |
| --- | --- | --- | --- |
| [Mobile core validation #40591520567](https://github.com/elroynbenjamins/Veldryn/actions/runs/40591520567) | **FAILURE** | Dependency install, Expo Doctor, backend QMode NPC composition check, online backend typecheck, recent SQL migration ID validation, PostgreSQL chat retry/read-cursor validation, regional cadence migration validation **passed** | Failed at mobile core TypeScript; full mobile typecheck, Play Billing checks, broad tests and later co-op tests **skipped** |
| [Release economy validation #40591520391](https://github.com/elroynbenjamins/Veldryn/actions/runs/40591520391) | **SUCCESS** | Install, backend typecheck, test:release-economy, backend-pass-smoke and production-smoke steps passed | Does not cover Android runtime or skipped mobile core |

**Exact failure evidence:** apps/mobile/tests/starter-companion-choice.ts imports chooseStarterCombatCompanion, starterCombatCompanionChoicePending and starterCombatCompanionChoices from apps/mobile/src/core/combat-companions.ts; current target module does not export these. Related account state lacks starterCombatCompanionId, starterFollowupCombatCompanionId and starterThirdCombatCompanionId as expected by test, and two row callbacks fail implicit-any checks. CI produced 11 TypeScript diagnostics and stopped. This is directly verified **contract inconsistency**; it does **not** demonstrate that every companion operation is broken.

The baseline Expo Doctor step passed in this specific run. Earlier documentation citing older Expo patch drift is historical and cannot be used to claim the present Doctor gate still fails.

**Tests personally executed during this audit: none.** Existing CI logs are external executed evidence attributed to GitHub Actions, not re-run by the auditor.

## 8. Technical-debt and maintenance candidates

### T-01. Very large tracked build/review snapshots — Confirmed source footprint, runtime impact unknown

Recursive Git tree inspection found 10,798 tracked blobs under apps/mobile. The assets directory contains 1,413 files (~489 MB of raw Git blob sizes); art-review contains ~460 files (~709 MB), and several tracked export directories each contain ~880 blobs (~246 MB). Copies include duplicate generated Hermes outputs/assets. These increase repository checkout/search/review cost. Both root and mobile .easignore explicitly exclude many generated/review folders from EAS upload; **do not** attribute their full tracked byte count to AAB size or delete before identifying which raw assets are referenced and which exports must be retained for regression evidence.

### T-02. Centralized orchestration and deeply coupled game state — Candidate

apps/mobile/App.tsx (699 lines) performs routing, online/offline state selection, save commit mapping, UI feedback, timer/foreground settlement, profile state, tutorials, chat modal and shortcuts. src/core/game.ts, game-commands.ts and large backend gameplay files have extensive domain coupling. The architecture merits import graph, render profiling and command-contract boundary review; no blanket rewrite recommendation without measurements.

### T-03. Parallel domain and archive versions — Candidate

Files and directories include equipment screen versions, migration reconciliation placeholders, older equipment catalog/recipe JSON versions (backend/data), previously authored prototype and generated artifacts. The codebase may retain necessary data migration/reconciliation references. Catalogue full import-graph and data retention before marking code dead or reducing version families.

### T-04. Release flags and mismatch between authored functionality and live availability — Confirmed

Arena and Rankings have implementation scaffolding but are intentionally disabled in src/core/release-flags.ts. Document a per-release feature-manifest contract, ideally derived from actual flags and live backend readiness, rather than counting TypeScript modules.

### T-05. Backend schema footprint and privilege surface — Confirmed scale, security interpretation pending

276 public tables and 376 public functions alongside service-role gateway and SECURITY DEFINER RPCs create a substantial review surface. Prioritize high-risk write/entitlement functions and request-auth boundaries; avoid changing RLS or grants without role/access matrix and regression fixtures.

### T-06. Production/staging drift, migration history aliases — Confirmed

Production and staging differ drastically in applied migrations and functions. Provide a deterministic, read-only parity report before testing deployment changes on staging. Verify migration identity equivalence via SQL/function definitions and documented version aliases.

### T-07. Performance/telemetry without measured baseline — Confirmed missing measurement

docs/NETWORK_REQUEST_QA_BASELINE.md includes “Not measured” placeholders, and mobile only instruments Supabase HTTP, not Realtime or native requests. Real-device captures, CPU/memory, slow-query statistics, startup and asset rendering metrics are required before claiming navigation latency improvements.

### T-08. Chat regression risk — Candidate, not confirmed broken

The reported GuildChat missing import is false for baseline HEAD. Actual useChatFeed cache/realtime changes, read cursors and policy authorization do have complex failure modes. Verify real 25-message history, sending, account switching, Guild removal, retry after transient failure, badge counts and socket lifecycle; use two test accounts and no fabricated traffic.

### T-09. Generated Edge bundles and checked-in snapshots — Candidate

tools/build-online.mjs generates large function entrypoints. Verify reproducible bundle builds in CI and compare deployment artifact fingerprints/hash for current HEAD. File preview tooling cannot return full multi-megabyte source and must not be interpreted as proof of empty bundles.

## 9. Documentation and historical reference audit

- **Current code precedence:** apps/mobile/src/core/release-flags.ts disables Arena and Rankings regardless of roadmap language. apps/mobile/src/screens/MoreScreen.tsx represents this as development/unavailable.
- **Superseded feature:** docs/ONLINE_COMPATIBILITY.md discusses an eventual auction house/market, while removal migrations 20260915004600_remove_player_market_v33.sql and 20260918004500_remove_player_market_v52.sql exist. Treat market as retired for the current release, not an active subsystem.
- **Co-op status:** docs/implementation/COOP_CURRENT_STATUS.md (updated Oct25) lists hosted co-op acceptance evidence while acknowledging unfinished physical Samsung S24+ testing and some event expeditions as preview-only. Newer QMode NPC source/commit may supersede specifics; test the live version before marking completely released.
- **Online gameplay:** docs/implementation/ONLINE_GAMEPLAY_STATUS.md is an extensive chronology and explicitly warns that earlier deployment/bundle descriptions are historical. The earlier internal Android APK with co-op disabled is not a current release acceptance artifact.
- **Queue:** docs/QUEUE_RELIABILITY_AUDIT_2026_10_22.md lists intended safeguards and regression coverage, including manual travel and current-region rules, but does not independently prove the latest on-device behavior or availability through the current broken mobile CI gate.
- **Network metrics:** docs/NETWORK_REQUEST_QA_BASELINE.md is a reproducible protocol and results template with no measured device values.
- **Mounted supplementary design:** VELDRYN_Master_Design_Database_v4.5 and VELDRYN_Progression_Social_Systems_v3 contain broad intended systems; features therein are **design intent only** unless traced through active code, UI and deployed services. Historical veldryn_backend_v2.1 ZIP is not the branch HEAD backend and must not overwrite current architectural findings.

## 10. Specific findings / risk register

| ID | Priority | Verified finding / consequence | Evidence | Acceptance requirement |
| --- | --- | --- | --- | --- |
| F-01 | P0 | Mobile core CI broken on starter companion test/source contract | latest mobile-core run; tests/starter-companion-choice.ts; core/combat-companions.ts | Reconcile desired game design and implementation; compile full core+mobile and run broad tests; ensure unrelated behavior unchanged |
| F-02 | P0 | Production and staging not feature/schema equivalent | read-only Supabase project introspection; Edge versions | Generate explicit migration/function parity report and choose staging baseline |
| F-03 | P0/P1 | Ten migration identities differ each side despite equal total count | backend/supabase/migrations and hosted migrations listing | Confirm migration aliases, SQL effects and correct histories before any db push |
| F-04 | P1 | Arena/Rankings authored but intentionally unreleased | src/core/release-flags.ts, MoreScreen.tsx, ArenaScreen.tsx | Keep classified as future/non-player-facing until gated service, auth and UX ship |
| F-05 | Resolved suspicion | ChatViewport import path exists at HEAD | components/GuildChat.tsx and components/ChatViewport.tsx | No “missing file” patch; test actual chat functionality separately |
| F-06 | P1 | No measured mobile network/perf baseline | docs/NETWORK_REQUEST_QA_BASELINE.md | Capture device sessions for navigation, social, chat, activity and background/resume |
| F-07 | P1 | SECURITY DEFINER / RLS/foreign-key advisor reviews outstanding | Supabase advisor read-only snapshot, 28 Oct | Review high-privilege RPC auth tests and EXPLAIN, fix proven issues |
| F-08 | P1 | Full Android physical co-op, billing, AAB upgrade validation absent from this audit | co-op release docs, current CI step scope, no device run | Test current signed production-equivalent build and record exact build + backend deployed versions |
| F-09 | P2 | Multi-gigabyte Git history/large checked-in exports | Git recursive tree sizes, .easignore | Build reference/dependency matrix and non-destructive archive policy |
| F-10 | P2 | Multiple older source/data versions complicate agent handoff | backend/data, equipment versions, snapshots, docs | Create active implementation source map before deduplication |
| F-11 | P1 | Seasonal expedition advertised status not firmly linked to new transport code and hosted release | co-op docs vs backend/online/event-expedition-runtime.ts and coop.ts | Trace current routes, entitlements and public gate; hosted test before marking available |
| F-12 | P1 | Guest-to-linked account and saved purchases require explicit recovery test | account/auth provider, online/play-billing.ts | Device PKCE, purchase refusal/restore, account isolation and session lifecycle tests |

**Risk vocabulary:** Verified finding = direct code/deployment/CI evidence. Candidate = plausible consequence that still needs measurement or a failing test. Report never treats a missing test as proof a feature is broken.

## 11. Next audit / development passes (no code changed during current audit)

1. **Restore a green mobile gate first.** Decide the intended starter-companion selection contract with product requirements; reconcile tests/source/types, then execute typecheck:core, full mobile typecheck, test:core, companion/onboarding, billing, co-op and EAS/Expo validation. Record exact commands and outputs. This step is a future implementation task, not performed here.
2. **Prove live source/deploy parity.** Produce production and staging schema migration diff, Edge bundle fingerprint and generated output comparison against HEAD; resolve historical migration identity mapping before applying anything.
3. **Close critical user journeys with production-equivalent test identities:** guest → linked verified email → character creation; idle progress and claim; queue/handoff; inventory/bank/cooking; chat send/read/rejoin; Echo publish → QMode NPC/real Echo → reward; Live match and reconnect; Guild shop and contribution; Google Play license test purchase/restore/cancel.
4. **Run complete regression suites** and stage SQL transaction/rollback tests; check current CI test filter paths and ensure important runtime changes are not tested only on manual workflow dispatch.
5. **Security and economy audit:** inventory write RPCs with SECURITY DEFINER, auth.uid and role checks; run hostile-client/ownership tests; validate chat membership policies, reward idempotency, billing token/RTDN auth and callback boundaries.
6. **Device performance baseline:** reproduce the documented QA routes and network sequences on small and large Android; capture HTTP and Realtime separately, startup latency, JS render/CPU, memory and database slow queries. Do not report improvements without comparative observations.
7. **Data and source consolidation only after reachability inventory:** map runtime imports, generated exports, EAS ignore behavior, active asset hashes and archive evidence; create retention plan before any deletions/refactors.
8. **Update canonical status docs and planned roadmaps** from executed tests, current source and hosted deployment evidence. Do not replace accurate historical notes; mark them historical and link this baseline inventory.

## 12. Next-session handoff and evidence links

**Pin before doing work:** Confirm main branch head has not advanced beyond [baseline eb70bb3](https://github.com/elroynbenjamins/Veldryn/commit/eb70bb3321964c824d4e4307c413bb8971745666). This inventory references **that commit**, not whatever future main becomes. Keep source code unchanged unless a separate implementation task explicitly authorizes changes.

**Entry points to read first:**

- [apps/mobile/App.tsx](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/apps/mobile/App.tsx), [mobile/package.json](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/apps/mobile/package.json), [mobile/eas.json](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/apps/mobile/eas.json), [mobile/release-flags.ts](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/apps/mobile/src/core/release-flags.ts).
- [mobile/online-game-repository.ts](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/apps/mobile/src/core/online-game-repository.ts), [mobile/gameplay transport](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/apps/mobile/src/online/gameplay.ts), [Supabase client](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/apps/mobile/src/online/supabase.ts).
- [backend/online/edge.ts](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/backend/online/edge.ts), [backend/online/coop.ts](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/backend/online/coop.ts), [backend/online/qmode-runtime.ts](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/backend/online/qmode-runtime.ts), [bundle generator](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/tools/build-online.mjs).
- [companion regression test](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/apps/mobile/tests/starter-companion-choice.ts), [companion source](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/apps/mobile/src/core/combat-companions.ts), [mobile CI workflow](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/.github/workflows/mobile-core-validation.yml).
- [GuildChat.tsx](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/apps/mobile/src/components/GuildChat.tsx), [ChatViewport.tsx](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/apps/mobile/src/components/ChatViewport.tsx), [useChatFeed.ts](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/apps/mobile/src/online/useChatFeed.ts).
- [co-op status](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/docs/implementation/COOP_CURRENT_STATUS.md), [online status](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/docs/implementation/ONLINE_GAMEPLAY_STATUS.md), [queue audit](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/docs/QUEUE_RELIABILITY_AUDIT_2026_10_22.md), [network QA baseline](https://github.com/elroynbenjamins/Veldryn/blob/eb70bb3321964c824d4e4307c413bb8971745666/docs/NETWORK_REQUEST_QA_BASELINE.md).

**Recommended coverage ledger for future audits:**

| Pass | Coverage | Current result | Remaining scope |
| --- | --- | --- | --- |
| A — Repository shape, build and tests | Entire trees and selected manifests | Completed structural pass | Full dependency reachability, actual test run |
| B — Mobile/UI and domain | 34 screen paths indexed, core/component/online trees, representative entrypoints traced | Partial deep audit | Each of 34 screens & 254 components behavior, UI screenshots and accessibility |
| C — Backend/DB/deployment | Backend domains indexed, active Edge entrypoints traced, production/staging introspected | Partial deep audit | All ~392 PostgreSQL routines, 277 SQL bodies and role grants; deployed bundle code parity |
| D — Regression and release | Latest baseline CI step/logs inspected | Evidence recorded; mobile gate failing | Complete rerun, signed AAB and device acceptance |
| E — Operations/security/performance | Live advisors and documented QA instrumentation | Triage complete, verification outstanding | Query plans, production logs, security role matrix and device metrics |
| F — Historical/documentation | Key release docs and workbook intent contrasted with source | Partial | Remaining docs and all deprecated/archive import references |

**End of 2026-10-28 baseline report.** Update this file by adding a new dated verification pass and exact commit/test evidence rather than silently converting inferred behavior into “verified” functionality.
